// api/prep-dashboard/orders.js
// Orders aggregation endpoint for Park Avenue Bakery Prep Dashboard

import crypto from 'crypto';

// ============================================
// AUTHENTICATION HELPERS
// ============================================

function generateSessionToken(password) {
    const secret = process.env.SESSION_SECRET || 'park-avenue-bakery-2026';
    return crypto.createHmac('sha256', secret).update(password).digest('hex');
}

function verifySessionToken(token) {
    const password = process.env.DASHBOARD_PASSWORD;
    if (!password) return false;
    const expectedToken = generateSessionToken(password);
    return token === expectedToken;
}

function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;

    cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        if (key && value) {
            cookies[key] = value;
        }
    });

    return cookies;
}

// ============================================
// PRODUCT CATEGORIZATION
// ============================================

const BREAD_KEYWORDS = [
    'loaf', 'bread', 'baguette', 'ciabatta', 'focaccia', 'sourdough',
    'boules', 'epi', 'ficelli', 'jocko', 'blackfoot', 'challah',
    'norwegian', 'multigrain', 'grain', 'rolls', 'dough'
];

const BAR_KEYWORDS = [
    'bar', 'brownie', 'brownies', 'lemon bar', 'caramel', 'samoa',
    'revel', 'turtle', 'truffle', 'pumpkin bar', 'raspberry crumble'
];

const COOKIE_KEYWORDS = [
    'cookie', 'snickerdoodle', 'molasses', 'monster', 'peanut butter cookie',
    'sugar cookie', 'chocolate chip cookie', 'oatmeal cookie', 'carrot coconut'
];

function categorizeProduct(productName) {
    const nameLower = productName.toLowerCase();

    // Check bars first (more specific)
    for (const keyword of BAR_KEYWORDS) {
        if (nameLower.includes(keyword)) {
            return 'bars';
        }
    }

    // Check cookies
    for (const keyword of COOKIE_KEYWORDS) {
        if (nameLower.includes(keyword)) {
            return 'cookies';
        }
    }

    // Check breads
    for (const keyword of BREAD_KEYWORDS) {
        if (nameLower.includes(keyword)) {
            return 'breads';
        }
    }

    // Default to breads for bakery items
    return 'breads';
}

// ============================================
// DATE HELPERS
// ============================================

function getMountainTime() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
}

function formatDateForClover(dateString) {
    // Convert YYYY-MM-DD to timestamp range for Clover API
    const date = new Date(dateString + 'T00:00:00');
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return {
        start: startOfDay.getTime(),
        end: endOfDay.getTime()
    };
}

function formatTime12Hour(time24) {
    if (!time24) return 'N/A';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes || '00'} ${ampm}`;
}

// ============================================
// CLOVER API INTEGRATION
// ============================================

async function fetchCloverOrders(targetPickupDate) {
    const CLOVER_API_KEY = process.env.CLOVER_API_KEY;
    const CLOVER_MERCHANT_ID = process.env.CLOVER_MERCHANT_ID;

    if (!CLOVER_API_KEY || !CLOVER_MERCHANT_ID) {
        throw new Error('Clover credentials not configured');
    }

    // Fetch orders from past 14 days to capture advance orders
    // Orders placed up to 2 weeks ago might have a pickup date of today or future
    const today = new Date();
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const startTime = twoWeeksAgo.getTime();
    const endTime = today.getTime() + (24 * 60 * 60 * 1000); // Include today

    // Fetch orders from Clover with line items expanded
    const url = `https://api.clover.com/v3/merchants/${CLOVER_MERCHANT_ID}/orders?expand=lineItems&filter=payType!=null&filter=createdTime>=${startTime}&filter=createdTime<=${endTime}&limit=500`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${CLOVER_API_KEY}`,
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Clover API error:', response.status, errorText);
        throw new Error(`Clover API error: ${response.status}`);
    }

    const data = await response.json();
    return data.elements || [];
}

// ============================================
// ORDER PROCESSING
// ============================================

function processOrders(orders, targetDate) {
    const bakeList = {
        breads: {},
        bars: {},
        cookies: {}
    };

    const pickupSchedule = {};
    const sameDayOrders = [];
    let totalItems = 0;
    let filteredOrderCount = 0; // Count only orders matching target pickup date

    const today = getMountainTime();
    const todayStr = today.toISOString().split('T')[0];
    const isToday = targetDate === todayStr;

    orders.forEach(order => {
        // Extract pickup time from order - check multiple sources
        let pickupTime = null;
        let pickupDate = null;

        // FIRST: Check line items for hidden pickup info (most reliable)
        // Format: "[PICKUP: YYYY-MM-DD @ HH:MM]"
        if (order.lineItems && order.lineItems.elements) {
            for (const item of order.lineItems.elements) {
                const pickupItemMatch = (item.name || '').match(/\[PICKUP:\s*(\d{4}-\d{2}-\d{2})\s*@\s*(\d{1,2}:\d{2})\]/i);
                if (pickupItemMatch) {
                    pickupDate = pickupItemMatch[1];
                    const timeParts = pickupItemMatch[2].split(':');
                    pickupTime = timeParts[0].padStart(2, '0') + ':' + timeParts[1];
                    break;
                }
            }
        }

        // SECOND: Check order note (legacy format)
        // Format: "Pickup: YYYY-MM-DD at HH:MM"
        if (!pickupTime) {
            const noteText = order.note || '';
            const pickupMatch = noteText.match(/Pickup:\s*(\d{4}-\d{2}-\d{2})\s*at\s*(\d{1,2}:\d{2})/i);
            if (pickupMatch) {
                pickupDate = pickupMatch[1];
                const timeParts = pickupMatch[2].split(':');
                pickupTime = timeParts[0].padStart(2, '0') + ':' + timeParts[1];
            }
        }

        // FALLBACK: Use order creation time converted to Mountain Time
        // Only use this fallback for orders without explicit pickup info
        if (!pickupTime && order.createdTime) {
            const createdDate = new Date(order.createdTime);
            // Convert to Mountain Time
            const mtTime = new Date(createdDate.toLocaleString('en-US', { timeZone: 'America/Denver' }));
            const hours = mtTime.getHours().toString().padStart(2, '0');
            const minutes = mtTime.getMinutes().toString().padStart(2, '0');
            pickupTime = `${hours}:${minutes}`;
            // Get date in YYYY-MM-DD format
            const year = mtTime.getFullYear();
            const month = (mtTime.getMonth() + 1).toString().padStart(2, '0');
            const day = mtTime.getDate().toString().padStart(2, '0');
            pickupDate = `${year}-${month}-${day}`;
        }

        // FILTER: Only include orders for the target pickup date
        if (pickupDate !== targetDate) {
            return; // Skip this order - wrong pickup date
        }

        // Count this order (it passed the filter)
        filteredOrderCount++;

        // Check if this is a same-day order (placed today for today)
        if (isToday && pickupDate === todayStr) {
            const orderTime = new Date(order.createdTime);
            const hour = orderTime.getHours();
            // Orders placed after 10am for same-day pickup are flagged
            if (hour >= 10) {
                // Count items excluding hidden pickup metadata
                const realItems = order.lineItems?.elements?.filter(
                    item => !item.name?.startsWith('[PICKUP:')
                ) || [];
                sameDayOrders.push({
                    id: order.id,
                    time: formatTime12Hour(pickupTime),
                    items: realItems.length
                });
            }
        }

        // Aggregate pickup schedule by time slot (30-min buckets)
        if (pickupTime) {
            const [hours, minutes] = pickupTime.split(':');
            const bucket = `${hours}:${parseInt(minutes) < 30 ? '00' : '30'}`;
            if (!pickupSchedule[bucket]) {
                pickupSchedule[bucket] = { time: bucket, orderCount: 0, itemCount: 0 };
            }
            pickupSchedule[bucket].orderCount++;
        }

        // Process line items
        if (order.lineItems && order.lineItems.elements) {
            order.lineItems.elements.forEach(item => {
                const name = item.name || 'Unknown Item';

                // Skip hidden pickup info items (they're metadata, not real products)
                if (name.startsWith('[PICKUP:')) {
                    return;
                }

                // Clover stores unitQty as quantity * 1000 (so 1 item = 1000)
                // Use unitQty/1000 if available, otherwise fall back to quantity field
                let quantity = 1;
                if (item.unitQty !== undefined && item.unitQty !== null) {
                    quantity = Math.round(item.unitQty / 1000);
                } else if (item.quantity !== undefined && item.quantity !== null) {
                    quantity = item.quantity;
                }
                // Ensure quantity is at least 1
                quantity = Math.max(1, quantity);

                const category = categorizeProduct(name);

                // Add to bake list
                if (!bakeList[category][name]) {
                    bakeList[category][name] = 0;
                }
                bakeList[category][name] += quantity;
                totalItems += quantity;

                // Update pickup schedule item count
                if (pickupTime) {
                    const [hours, minutes] = pickupTime.split(':');
                    const bucket = `${hours}:${parseInt(minutes) < 30 ? '00' : '30'}`;
                    if (pickupSchedule[bucket]) {
                        pickupSchedule[bucket].itemCount += quantity;
                    }
                }
            });
        }
    });

    // Convert bake list objects to sorted arrays
    const sortedBakeList = {
        breads: Object.entries(bakeList.breads)
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        bars: Object.entries(bakeList.bars)
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        cookies: Object.entries(bakeList.cookies)
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => a.name.localeCompare(b.name))
    };

    // Convert pickup schedule to sorted array
    const sortedPickupSchedule = Object.values(pickupSchedule)
        .sort((a, b) => a.time.localeCompare(b.time))
        .map(slot => ({
            ...slot,
            displayTime: formatTime12Hour(slot.time),
            hasSameDayAlert: sameDayOrders.some(o => o.time === formatTime12Hour(slot.time))
        }));

    // Calculate totals (using filteredOrderCount, not all fetched orders)
    const totals = {
        orders: filteredOrderCount,
        items: totalItems,
        breads: sortedBakeList.breads.reduce((sum, item) => sum + item.quantity, 0),
        bars: sortedBakeList.bars.reduce((sum, item) => sum + item.quantity, 0),
        cookies: sortedBakeList.cookies.reduce((sum, item) => sum + item.quantity, 0)
    };

    return {
        bakeList: sortedBakeList,
        pickupSchedule: sortedPickupSchedule,
        totals,
        alerts: {
            sameDayOrders: sameDayOrders.length,
            sameDayOrdersList: sameDayOrders
        }
    };
}

// ============================================
// MOCK DATA FOR DEVELOPMENT/DEMO
// ============================================

function getMockOrders(date) {
    // Generate realistic mock data for testing
    const mockOrders = [
        {
            id: 'mock-001',
            createdTime: new Date(date + 'T06:30:00').getTime(),
            note: `Pickup: ${date} at 08:00`,
            lineItems: {
                elements: [
                    { name: 'Sourdough', quantity: 2 },
                    { name: 'Baguette', quantity: 3 },
                    { name: 'Lemon Bars', quantity: 4 }
                ]
            }
        },
        {
            id: 'mock-002',
            createdTime: new Date(date + 'T07:15:00').getTime(),
            note: `Pickup: ${date} at 09:00`,
            lineItems: {
                elements: [
                    { name: 'Norwegian Farm', quantity: 1 },
                    { name: 'Ciabatta', quantity: 2 },
                    { name: 'Snickerdoodle', quantity: 6 }
                ]
            }
        },
        {
            id: 'mock-003',
            createdTime: new Date(date + 'T08:00:00').getTime(),
            note: `Pickup: ${date} at 10:00`,
            lineItems: {
                elements: [
                    { name: 'Blackfoot', quantity: 2 },
                    { name: 'Flourless Brownies', quantity: 3 },
                    { name: 'Brown Butter Chocolate Chip Cookie', quantity: 12 }
                ]
            }
        },
        {
            id: 'mock-004',
            createdTime: new Date(date + 'T09:30:00').getTime(),
            note: `Pickup: ${date} at 11:30`,
            lineItems: {
                elements: [
                    { name: 'Focaccia', quantity: 2 },
                    { name: 'Salted Caramel Bars', quantity: 6 },
                    { name: 'Molasses Cookie', quantity: 8 }
                ]
            }
        },
        {
            id: 'mock-005',
            createdTime: new Date(date + 'T10:45:00').getTime(),
            note: `Pickup: ${date} at 14:00`,
            lineItems: {
                elements: [
                    { name: 'Sourdough Rustic Loaf', quantity: 1 },
                    { name: 'Demi Baguette', quantity: 4 },
                    { name: 'Turtle Brownie', quantity: 2 }
                ]
            }
        }
    ];

    return mockOrders;
}

// ============================================
// API HANDLER
// ============================================

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify authentication
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies['dashboard_session'];

    if (!sessionToken || !verifySessionToken(sessionToken)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get date parameter (default to today in Mountain Time)
    const today = getMountainTime();
    const todayStr = today.toISOString().split('T')[0];
    const date = req.query.date || todayStr;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    try {
        let orders;

        // Try to fetch from Clover, fall back to mock data if unavailable
        try {
            orders = await fetchCloverOrders(date);
        } catch (cloverError) {
            console.warn('Clover API unavailable, using mock data:', cloverError.message);
            // Use mock data for development/demo
            orders = getMockOrders(date);
        }

        const result = processOrders(orders, date);

        return res.status(200).json({
            success: true,
            date,
            generatedAt: new Date().toISOString(),
            ...result
        });

    } catch (error) {
        console.error('Error processing orders:', error);
        return res.status(500).json({
            error: 'Failed to fetch orders. Please try again.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
