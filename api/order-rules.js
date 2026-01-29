// api/order-rules.js
// Park Avenue Bakery - Order Guardrails Middleware
// Controls availability, lead times, daily limits, and pickup slots

// ============================================
// CONFIGURATION - Easy to adjust
// ============================================

const CONFIG = {
  // Cutoff time for next-day specialty orders (24-hour format)
  specialtyCutoffHour: 17, // 5:00 PM

  // Cutoff time for same-day regular orders
  sameDayCutoffHour: 10, // 10:00 AM

  // Timezone
  timezone: 'America/Denver', // Montana is Mountain Time
};

// ============================================
// SPECIALTY BREAD SCHEDULE (Day-Specific)
// ============================================
// Days: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

const SPECIALTY_BREAD_SCHEDULE = {
  'bread-16': { // norwegian-farm
    name: 'Norwegian Farm',
    availableDays: [1], // Monday only
    dailyLimit: 8,
    cutoffDaysBefore: 1,
    cutoffHour: 17 // Order by Sunday 5pm
  },
  'sourdough-rye': {
    name: 'Sourdough Rye',
    availableDays: [2], // Tuesday only
    dailyLimit: 8,
    cutoffDaysBefore: 1,
    cutoffHour: 17
  },
  'bread-17': { // old-world-italian
    name: 'Old World Italian',
    availableDays: [3, 5], // Wednesday & Friday
    dailyLimit: 8,
    cutoffDaysBefore: 1,
    cutoffHour: 17
  },
  'bread-4': { // blackfoot
    name: 'Blackfoot',
    availableDays: [3], // Wednesday only
    dailyLimit: 8,
    cutoffDaysBefore: 1,
    cutoffHour: 17
  },
  'bread-13': { // golden-raisin-pecan
    name: 'Golden Raisin Pecan',
    availableDays: [4], // Thursday only
    dailyLimit: 8,
    cutoffDaysBefore: 1,
    cutoffHour: 17
  },
  'challah': {
    name: 'Challah',
    availableDays: [5], // Friday only
    dailyLimit: 8,
    cutoffDaysBefore: 1,
    cutoffHour: 17
  },
  'bread-7': { // cranberry-wild-rice
    name: 'Cranberry Wild Rice',
    availableDays: [5], // Friday only
    dailyLimit: 8,
    cutoffDaysBefore: 1,
    cutoffHour: 17
  },
  'bread-20': { // rustic-multigrain
    name: 'Rustic Multigrain',
    availableDays: [6], // Saturday only
    dailyLimit: 8,
    cutoffDaysBefore: 1,
    cutoffHour: 17
  }
};

// ============================================
// EVERYDAY BREADS (Available Daily)
// ============================================

const EVERYDAY_BREADS = {
  'bread-21': { // sourdough
    name: 'Sourdough',
    dailyLimit: 10,
    sameDayAllowed: true,
    sameDayCutoffHour: 10
  },
  'bread-22': { // sourdough-rustic-loaf
    name: 'Sourdough Rustic Loaf',
    dailyLimit: 10,
    sameDayAllowed: true,
    sameDayCutoffHour: 10
  },
  'bread-2': { // baguette
    name: 'Baguette',
    dailyLimit: 15,
    sameDayAllowed: true,
    sameDayCutoffHour: 10
  },
  'bread-8': { // demi-baguette
    name: 'Demi Baguette',
    dailyLimit: 20,
    sameDayAllowed: true,
    sameDayCutoffHour: 10
  },
  'bread-10': { // ficelli
    name: 'Ficelli',
    dailyLimit: 15,
    sameDayAllowed: true,
    sameDayCutoffHour: 10
  },
  'bread-9': { // epi
    name: 'Epi',
    dailyLimit: 12,
    sameDayAllowed: true,
    sameDayCutoffHour: 10
  },
  'bread-5': { // boules
    name: 'Boules',
    dailyLimit: 10,
    sameDayAllowed: true,
    sameDayCutoffHour: 10
  },
  'bread-6': { // ciabatta
    name: 'Ciabatta',
    dailyLimit: 12,
    sameDayAllowed: true,
    sameDayCutoffHour: 10
  },
  'bread-15': { // mini-ciabatta
    name: 'Mini Ciabatta',
    dailyLimit: 24,
    sameDayAllowed: true,
    sameDayCutoffHour: 10
  },
  'bread-12': { // french-pan-loaf
    name: 'French Pan Loaf',
    dailyLimit: 8,
    sameDayAllowed: true,
    sameDayCutoffHour: 10
  },
  'bread-11': { // focaccia
    name: 'Focaccia',
    dailyLimit: 8,
    sameDayAllowed: true,
    sameDayCutoffHour: 10
  },
  'bread-1': { // 7-grain-pan-loaf
    name: '7 Grain Pan Loaf',
    dailyLimit: 8,
    sameDayAllowed: true,
    sameDayCutoffHour: 10
  },
  'bread-14': { // jocko
    name: 'Jocko',
    dailyLimit: 8,
    sameDayAllowed: true,
    sameDayCutoffHour: 10
  },
  'bread-3': { // big-sky-country-loaf
    name: 'Big Sky Country Loaf',
    dailyLimit: 6,
    sameDayAllowed: false, // Needs advance notice
    minLeadTimeDays: 1
  },
  'bread-18': { // pizza-dough
    name: 'Pizza Dough',
    dailyLimit: 10,
    sameDayAllowed: true,
    sameDayCutoffHour: 10
  },
  'bread-19': { // potato-rolls
    name: 'Potato Rolls',
    dailyLimit: 8,
    sameDayAllowed: true,
    sameDayCutoffHour: 10
  },
  'test-1': { // Staff test item
    name: 'Test Item',
    dailyLimit: 999,
    sameDayAllowed: true,
    sameDayCutoffHour: 23 // Available until 11 PM
  }
};

// ============================================
// BARS
// ============================================

const BARS = {
  'bar-1': { name: 'Flourless Brownies', dailyLimit: 12, sameDayAllowed: true },
  'bar-2': { name: 'Lemon Bars', dailyLimit: 12, sameDayAllowed: true },
  'bar-3': { name: 'Chocolate Chip Peanut Butter Bar', dailyLimit: 12, sameDayAllowed: true },
  'bar-4': { name: 'Pumpkin Bars', dailyLimit: 12, sameDayAllowed: true },
  'bar-5': { name: 'Raspberry Crumble Bars', dailyLimit: 12, sameDayAllowed: true },
  'bar-6': { name: 'Revel Bars', dailyLimit: 12, sameDayAllowed: true },
  'bar-7': { name: 'Salted Caramel Bars', dailyLimit: 12, sameDayAllowed: true },
  'bar-8': { name: 'Samoa Bars', dailyLimit: 12, sameDayAllowed: true },
  'bar-9': { name: 'Truffle Brownies', dailyLimit: 12, sameDayAllowed: true },
  'bar-10': { name: 'Turtle Brownie', dailyLimit: 12, sameDayAllowed: true }
};

// ============================================
// COOKIES
// ============================================

const COOKIES = {
  'cookie-1': { name: 'Brown Butter Chocolate Chip Cookie', dailyLimit: 24, sameDayAllowed: true },
  'cookie-2': { name: 'Carrot Coconut Cookie', dailyLimit: 24, sameDayAllowed: true },
  'cookie-3': { name: 'Coconut Oatmeal Cookie', dailyLimit: 24, sameDayAllowed: true },
  'cookie-4': { name: 'Flourless Peanut Butter Chocolate Chip', dailyLimit: 24, sameDayAllowed: true },
  'cookie-5': { name: 'Molasses Cookie', dailyLimit: 24, sameDayAllowed: true },
  'cookie-6': { name: 'Monster Cookie', dailyLimit: 24, sameDayAllowed: true },
  'cookie-7': { name: 'Peanut Butter Cookie', dailyLimit: 24, sameDayAllowed: true },
  'cookie-8': { name: 'Snickerdoodle', dailyLimit: 24, sameDayAllowed: true },
  'cookie-9': {
    name: 'Sugar Cookies – Assorted',
    dailyLimit: 18, // Lower limit - hand decorated
    sameDayAllowed: false,
    minLeadTimeDays: 1, // Need 24 hour notice
    maxPerOrder: 24 // Bulk orders need inquiry
  }
};

// ============================================
// PICKUP SLOT CONFIGURATION
// ============================================

const PICKUP_SLOTS = {
  // Monday - Friday
  weekday: {
    slots: [
      { time: '07:00', maxOrders: 4 },
      { time: '07:30', maxOrders: 4 },
      { time: '08:00', maxOrders: 5 },
      { time: '08:30', maxOrders: 5 },
      { time: '09:00', maxOrders: 5 },
      { time: '09:30', maxOrders: 5 },
      { time: '10:00', maxOrders: 5 },
      { time: '10:30', maxOrders: 5 },
      { time: '11:00', maxOrders: 3 }, // Lunch rush - tighter cap
      { time: '11:30', maxOrders: 3 },
      { time: '12:00', maxOrders: 3 },
      { time: '12:30', maxOrders: 3 },
      { time: '13:00', maxOrders: 4 },
      { time: '13:30', maxOrders: 4 },
      { time: '14:00', maxOrders: 5 },
      { time: '14:30', maxOrders: 5 },
      { time: '15:00', maxOrders: 5 },
      { time: '15:30', maxOrders: 5 },
      { time: '16:00', maxOrders: 4 },
      { time: '16:30', maxOrders: 4 },
      { time: '17:00', maxOrders: 3 },
      { time: '17:30', maxOrders: 3 }
    ]
  },
  // Saturday (busier mornings)
  saturday: {
    slots: [
      { time: '07:00', maxOrders: 3 }, // Tighter morning caps
      { time: '07:30', maxOrders: 3 },
      { time: '08:00', maxOrders: 3 },
      { time: '08:30', maxOrders: 3 },
      { time: '09:00', maxOrders: 3 },
      { time: '09:30', maxOrders: 4 },
      { time: '10:00', maxOrders: 4 },
      { time: '10:30', maxOrders: 4 },
      { time: '11:00', maxOrders: 3 },
      { time: '11:30', maxOrders: 3 },
      { time: '12:00', maxOrders: 3 },
      { time: '12:30', maxOrders: 3 },
      { time: '13:00', maxOrders: 4 },
      { time: '13:30', maxOrders: 4 },
      { time: '14:00', maxOrders: 5 },
      { time: '14:30', maxOrders: 5 },
      { time: '15:00', maxOrders: 5 },
      { time: '15:30', maxOrders: 5 },
      { time: '16:00', maxOrders: 4 },
      { time: '16:30', maxOrders: 4 },
      { time: '17:00', maxOrders: 3 },
      { time: '17:30', maxOrders: 3 }
    ]
  },
  // Sunday (shorter hours)
  sunday: {
    slots: [
      { time: '08:00', maxOrders: 3 },
      { time: '08:30', maxOrders: 3 },
      { time: '09:00', maxOrders: 3 },
      { time: '09:30', maxOrders: 3 },
      { time: '10:00', maxOrders: 4 },
      { time: '10:30', maxOrders: 4 },
      { time: '11:00', maxOrders: 3 },
      { time: '11:30', maxOrders: 3 },
      { time: '12:00', maxOrders: 3 },
      { time: '12:30', maxOrders: 3 },
      { time: '13:00', maxOrders: 4 },
      { time: '13:30', maxOrders: 4 }
    ]
  }
};

// ============================================
// BLACKOUT DATES (No Online Ordering)
// ============================================

const BLACKOUT_DATES_2026 = [
  // Thanksgiving week
  '2026-11-24', '2026-11-25', '2026-11-26',
  // Christmas
  '2026-12-24', '2026-12-25',
  // New Year
  '2026-12-31', '2027-01-01',
  // Easter 2026
  '2026-04-05',
  // Mother's Day weekend 2026
  '2026-05-09', '2026-05-10',
];

// Reduced capacity dates (50% of normal limits)
const REDUCED_CAPACITY_DATES = [
  '2026-11-27', // Day after Thanksgiving
  '2026-12-26', // Day after Christmas
  '2027-01-02', // Day after New Year
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function getMountainTime() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: CONFIG.timezone }));
}

function getDateString(date) {
  return date.toISOString().split('T')[0];
}

function getDayOfWeek(date) {
  return date.getDay(); // 0=Sun, 1=Mon, etc.
}

function isBlackoutDate(dateString) {
  return BLACKOUT_DATES_2026.includes(dateString);
}

function isReducedCapacityDate(dateString) {
  return REDUCED_CAPACITY_DATES.includes(dateString);
}

function isPastCutoff(cutoffHour) {
  const now = getMountainTime();
  return now.getHours() >= cutoffHour;
}

// ============================================
// MAIN AVAILABILITY FUNCTIONS
// ============================================

/**
 * Check if a specialty bread is available for a given pickup date
 */
function isSpecialtyBreadAvailable(itemId, pickupDate) {
  const item = SPECIALTY_BREAD_SCHEDULE[itemId];
  if (!item) return { available: false, reason: 'Item not found' };

  const pickup = new Date(pickupDate);
  const pickupDay = getDayOfWeek(pickup);
  const pickupDateStr = getDateString(pickup);

  // Check blackout
  if (isBlackoutDate(pickupDateStr)) {
    return { available: false, reason: 'Online ordering unavailable on this date' };
  }

  // Check if pickup day matches available days
  if (!item.availableDays.includes(pickupDay)) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const availableDayNames = item.availableDays.map(d => dayNames[d]).join(' & ');
    return {
      available: false,
      reason: `${item.name} is only available on ${availableDayNames}`
    };
  }

  // Check cutoff time
  const now = getMountainTime();
  const cutoffDate = new Date(pickup);
  cutoffDate.setDate(cutoffDate.getDate() - item.cutoffDaysBefore);
  cutoffDate.setHours(item.cutoffHour, 0, 0, 0);

  if (now > cutoffDate) {
    return {
      available: false,
      reason: `Order cutoff for ${item.name} has passed (${item.cutoffHour > 12 ? item.cutoffHour - 12 : item.cutoffHour}pm the day before)`
    };
  }

  return { available: true };
}

/**
 * Check if an everyday item is available for a given pickup date
 */
function isEverydayItemAvailable(itemId, pickupDate, category = 'breads') {
  let itemList;
  switch(category) {
    case 'bars': itemList = BARS; break;
    case 'cookies': itemList = COOKIES; break;
    default: itemList = EVERYDAY_BREADS;
  }

  const item = itemList[itemId];
  if (!item) return { available: false, reason: 'Item not found' };

  const pickup = new Date(pickupDate);
  const pickupDateStr = getDateString(pickup);
  const now = getMountainTime();
  const today = getDateString(now);

  // Check blackout
  if (isBlackoutDate(pickupDateStr)) {
    return { available: false, reason: 'Online ordering unavailable on this date' };
  }

  // Check if same-day order
  if (pickupDateStr === today) {
    if (!item.sameDayAllowed) {
      return {
        available: false,
        reason: `${item.name} requires at least ${item.minLeadTimeDays || 1} day advance notice`
      };
    }

    if (item.sameDayCutoffHour && isPastCutoff(item.sameDayCutoffHour)) {
      return {
        available: false,
        reason: `Same-day orders for ${item.name} must be placed before ${item.sameDayCutoffHour}am`
      };
    }
  }

  return { available: true };
}

/**
 * Get available items for a specific pickup date
 * Returns only items that can be ordered for that date
 */
function getAvailableItems(pickupDate) {
  const available = {
    breads: [],
    bars: [],
    cookies: []
  };

  // Check specialty breads
  for (const [id, item] of Object.entries(SPECIALTY_BREAD_SCHEDULE)) {
    const check = isSpecialtyBreadAvailable(id, pickupDate);
    if (check.available) {
      available.breads.push({
        id,
        ...item,
        category: 'specialty-bread'
      });
    }
  }

  // Check everyday breads
  for (const [id, item] of Object.entries(EVERYDAY_BREADS)) {
    const check = isEverydayItemAvailable(id, pickupDate, 'breads');
    if (check.available) {
      available.breads.push({
        id,
        ...item,
        category: 'everyday-bread'
      });
    }
  }

  // Check bars
  for (const [id, item] of Object.entries(BARS)) {
    const check = isEverydayItemAvailable(id, pickupDate, 'bars');
    if (check.available) {
      available.bars.push({ id, ...item });
    }
  }

  // Check cookies
  for (const [id, item] of Object.entries(COOKIES)) {
    const check = isEverydayItemAvailable(id, pickupDate, 'cookies');
    if (check.available) {
      available.cookies.push({ id, ...item });
    }
  }

  return available;
}

/**
 * Get available pickup slots for a specific date
 */
function getAvailablePickupSlots(pickupDate, existingOrders = {}) {
  const pickup = new Date(pickupDate);
  const dayOfWeek = getDayOfWeek(pickup);
  const pickupDateStr = getDateString(pickup);

  // Check blackout
  if (isBlackoutDate(pickupDateStr)) {
    return { available: false, slots: [], reason: 'Online ordering unavailable on this date' };
  }

  // Determine which slot configuration to use
  let slotConfig;
  if (dayOfWeek === 0) {
    slotConfig = PICKUP_SLOTS.sunday;
  } else if (dayOfWeek === 6) {
    slotConfig = PICKUP_SLOTS.saturday;
  } else {
    slotConfig = PICKUP_SLOTS.weekday;
  }

  // Check reduced capacity
  const capacityMultiplier = isReducedCapacityDate(pickupDateStr) ? 0.5 : 1;

  // Build available slots
  const availableSlots = slotConfig.slots.map(slot => {
    const bookedCount = existingOrders[slot.time] || 0;
    const maxOrders = Math.floor(slot.maxOrders * capacityMultiplier);
    const remainingSlots = maxOrders - bookedCount;

    return {
      time: slot.time,
      available: remainingSlots > 0,
      remainingSlots: Math.max(0, remainingSlots),
      maxOrders
    };
  }).filter(slot => slot.available);

  return {
    available: availableSlots.length > 0,
    slots: availableSlots
  };
}

/**
 * Validate an entire order before submission
 */
function validateOrder(order) {
  const errors = [];
  const warnings = [];

  const { pickupDate, pickupTime, items } = order;
  const pickupDateStr = getDateString(new Date(pickupDate));

  // Check blackout date
  if (isBlackoutDate(pickupDateStr)) {
    errors.push('Online ordering is not available on this date. Please call the bakery.');
    return { valid: false, errors, warnings };
  }

  // Validate each item
  for (const item of items) {
    // Check specialty breads
    if (SPECIALTY_BREAD_SCHEDULE[item.id]) {
      const check = isSpecialtyBreadAvailable(item.id, pickupDate);
      if (!check.available) {
        errors.push(check.reason);
      }

      // Check quantity limit
      const rule = SPECIALTY_BREAD_SCHEDULE[item.id];
      if (item.quantity > rule.dailyLimit) {
        errors.push(`Maximum ${rule.dailyLimit} ${rule.name} can be ordered online. For larger orders, please call the bakery.`);
      }
    }

    // Check everyday breads
    else if (EVERYDAY_BREADS[item.id]) {
      const check = isEverydayItemAvailable(item.id, pickupDate, 'breads');
      if (!check.available) {
        errors.push(check.reason);
      }

      // Check quantity limit
      const rule = EVERYDAY_BREADS[item.id];
      if (item.quantity > rule.dailyLimit) {
        errors.push(`Maximum ${rule.dailyLimit} ${rule.name} can be ordered online. For larger orders, please call the bakery.`);
      }
    }

    // Check bars
    else if (BARS[item.id]) {
      const check = isEverydayItemAvailable(item.id, pickupDate, 'bars');
      if (!check.available) {
        errors.push(check.reason);
      }

      // Check quantity limit
      const rule = BARS[item.id];
      if (item.quantity > rule.dailyLimit) {
        errors.push(`Maximum ${rule.dailyLimit} ${rule.name} can be ordered online. For larger orders, please call the bakery.`);
      }
    }

    // Check cookies
    else if (COOKIES[item.id]) {
      const check = isEverydayItemAvailable(item.id, pickupDate, 'cookies');
      if (!check.available) {
        errors.push(check.reason);
      }

      // Check max per order for decorated cookies
      const rule = COOKIES[item.id];
      if (rule.maxPerOrder && item.quantity > rule.maxPerOrder) {
        errors.push(`Maximum ${rule.maxPerOrder} ${rule.name} per order. For larger orders, please use our custom order form.`);
      }
      if (item.quantity > rule.dailyLimit) {
        errors.push(`Maximum ${rule.dailyLimit} ${rule.name} can be ordered online. For larger orders, please call the bakery.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================
// API ENDPOINT HANDLER
// ============================================

export default async function handler(req, res) {
  // CORS headers
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://park-avenue-bakery.vercel.app';
  const requestOrigin = req.headers.origin;

  if (requestOrigin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;

  // GET: Fetch available items/slots for a date
  if (method === 'GET') {
    const { pickupDate, type } = req.query;

    if (!pickupDate) {
      return res.status(400).json({ error: 'pickupDate is required' });
    }

    if (type === 'slots') {
      // TODO: Fetch existing orders from database/Clover
      const existingOrders = {}; // Placeholder
      const slots = getAvailablePickupSlots(pickupDate, existingOrders);
      return res.status(200).json(slots);
    }

    const availableItems = getAvailableItems(pickupDate);
    return res.status(200).json(availableItems);
  }

  // POST: Validate an order
  if (method === 'POST') {
    const { order } = req.body;

    if (!order) {
      return res.status(400).json({ error: 'order data is required' });
    }

    const validation = validateOrder(order);
    return res.status(validation.valid ? 200 : 400).json(validation);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ============================================
// EXPORTS FOR TESTING
// ============================================

export {
  SPECIALTY_BREAD_SCHEDULE,
  EVERYDAY_BREADS,
  BARS,
  COOKIES,
  PICKUP_SLOTS,
  BLACKOUT_DATES_2026,
  isSpecialtyBreadAvailable,
  isEverydayItemAvailable,
  getAvailableItems,
  getAvailablePickupSlots,
  validateOrder
};
