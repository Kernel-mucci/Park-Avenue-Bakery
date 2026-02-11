// api/prep-dashboard/checklists/[...path].js
// Catch-all route for checklist operations with Vercel KV storage

import crypto from 'crypto';
import { kv } from '@vercel/kv';

// ============================================
// AUTH HELPERS
// ============================================

function generateSessionToken(password) {
  const secret = process.env.SESSION_SECRET || 'park-avenue-bakery-2026';
  return crypto.createHmac('sha256', secret).update(password).digest('hex');
}

function verifySessionToken(token) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return false;
  return token === generateSessionToken(password);
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    if (key && value) cookies[key] = value;
  });
  return cookies;
}

function isAuthenticated(req) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies['dashboard_session'];
  return sessionToken && verifySessionToken(sessionToken);
}

// ============================================
// DATE HELPERS
// ============================================

function getMountainTime() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
}

function getTodayString() {
  return getMountainTime().toISOString().split('T')[0];
}

// ============================================
// KV STORAGE HELPERS
// ============================================

function getChecklistKey(date, templateId) {
  return `checklist:${date}:${templateId}`;
}

function getCompletionsIndexKey(date) {
  return `checklist-completions:${date}`;
}

async function getChecklistSession(date, templateId) {
  try {
    const key = getChecklistKey(date, templateId);
    const data = await kv.get(key);
    return data || { responses: {}, completion: null, progress: 0, total: 0 };
  } catch (error) {
    console.error('KV get error:', error);
    return { responses: {}, completion: null, progress: 0, total: 0 };
  }
}

async function saveResponse(date, templateId, itemId, value, totalItems) {
  try {
    const key = getChecklistKey(date, templateId);
    const session = await getChecklistSession(date, templateId);

    session.responses[itemId] = value;
    session.total = totalItems;
    session.progress = Object.values(session.responses).filter(v => v !== null && v !== undefined && v !== '').length;

    await kv.set(key, session);
    return { success: true, progress: session.progress, total: session.total };
  } catch (error) {
    console.error('KV save error:', error);
    throw error;
  }
}

async function markComplete(date, templateId, completedBy, totalItems) {
  try {
    const key = getChecklistKey(date, templateId);
    const session = await getChecklistSession(date, templateId);

    const completion = {
      id: `${date}-${templateId}-${Date.now()}`,
      templateId,
      date,
      completedAt: new Date().toISOString(),
      completedBy: completedBy || 'Staff',
      responses: session.responses
    };

    session.completion = completion;
    session.progress = totalItems;
    session.total = totalItems;

    await kv.set(key, session);

    // Add to completions index
    const indexKey = getCompletionsIndexKey(date);
    const index = await kv.get(indexKey) || {};
    index[templateId] = completion;
    await kv.set(indexKey, index);

    return { success: true, completion };
  } catch (error) {
    console.error('KV complete error:', error);
    throw error;
  }
}

async function getChecklistStatus(date, templateId, totalItems) {
  try {
    const session = await getChecklistSession(date, templateId);

    if (session.completion) {
      return {
        status: 'completed',
        progress: totalItems,
        total: totalItems,
        completedAt: session.completion.completedAt,
        completedBy: session.completion.completedBy
      };
    }

    if (session.progress > 0) {
      return { status: 'in-progress', progress: session.progress, total: totalItems };
    }

    return { status: 'not-started', progress: 0, total: totalItems };
  } catch (error) {
    console.error('KV status error:', error);
    return { status: 'not-started', progress: 0, total: totalItems };
  }
}

async function getCompletionsInRange(fromDate, toDate) {
  try {
    const completions = [];
    const from = new Date(fromDate);
    const to = new Date(toDate);

    const current = new Date(from);
    while (current <= to) {
      const dateStr = current.toISOString().split('T')[0];
      const index = await kv.get(getCompletionsIndexKey(dateStr)) || {};
      completions.push(...Object.values(index));
      current.setDate(current.getDate() + 1);
    }

    return completions.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  } catch (error) {
    console.error('KV range error:', error);
    return [];
  }
}

// ============================================
// CHECKLIST TEMPLATES
// ============================================

const CHECKLIST_TEMPLATES = {
  'baker-opening': {
    id: 'baker-opening',
    name: 'Baker Opening',
    scheduledTime: '04:00',
    sections: [
      {
        title: 'First 15 Minutes',
        items: [
          { id: 'clock-in', label: 'Clock in', type: 'checkbox', required: true },
          { id: 'check-dashboard', label: 'Check prep dashboard for orders', type: 'checkbox', required: true },
          { id: 'same-day-orders', label: 'Any same-day orders?', type: 'select', options: ['None', 'Yes - noted'], required: true },
        ]
      },
      {
        title: 'Equipment Startup',
        items: [
          { id: 'deck-oven-on', label: 'Deck oven ON', type: 'checkbox', required: true },
          { id: 'deck-oven-temp', label: 'Deck oven temp', type: 'number', unit: '°F', required: true },
          { id: 'convection-on', label: 'Convection oven ON', type: 'checkbox', required: true },
          { id: 'convection-temp', label: 'Convection oven temp', type: 'number', unit: '°F', required: true },
          { id: 'proofer-on', label: 'Proofer ON (78-82°F)', type: 'checkbox', required: true },
          { id: 'proofer-temp', label: 'Proofer temp', type: 'number', unit: '°F', required: true, alertIf: { below: 75, above: 85 } },
        ]
      },
      {
        title: 'Dough Check',
        items: [
          { id: 'overnight-dough', label: 'Overnight dough condition', type: 'select', options: ['Good', 'Over-proofed', 'Under-proofed', 'N/A'], required: true },
          { id: 'specialty-bread', label: "Today's specialty bread", type: 'text', required: false },
        ]
      },
      {
        title: 'Temp Log',
        items: [
          { id: 'walkin-cooler-temp', label: 'Walk-in cooler temp', type: 'number', unit: '°F', required: true, alertIf: { above: 40 } },
          { id: 'walkin-freezer-temp', label: 'Walk-in freezer temp', type: 'number', unit: '°F', required: true, alertIf: { above: 0 } },
        ]
      }
    ]
  },
  'pastry-opening': {
    id: 'pastry-opening',
    name: 'Pastry Opening',
    scheduledTime: '05:00',
    sections: [
      {
        title: 'Equipment',
        items: [
          { id: 'convection-temp', label: 'Convection oven temp', type: 'number', unit: '°F', required: true },
          { id: 'pastry-cooler-temp', label: 'Pastry cooler temp', type: 'number', unit: '°F', required: true, alertIf: { above: 40 } },
          { id: 'sheeter-ready', label: 'Sheeter clean and ready', type: 'checkbox', required: true },
          { id: 'station-sanitized', label: 'Pastry station sanitized', type: 'checkbox', required: true },
        ]
      },
      {
        title: 'Laminated Dough Check',
        items: [
          { id: 'croissant-dough', label: 'Croissant dough condition', type: 'select', options: ['Good', 'Needs attention', 'N/A'], required: true },
          { id: 'danish-dough', label: 'Danish dough condition', type: 'select', options: ['Good', 'Needs attention', 'N/A'], required: true },
        ]
      },
      {
        title: 'Allergen Check',
        items: [
          { id: 'gf-separated', label: 'Gluten-free items separated', type: 'checkbox', required: true },
          { id: 'nuts-labeled', label: 'Nut items clearly labeled', type: 'checkbox', required: true },
          { id: 'allergen-utensils', label: 'Allergen utensils designated', type: 'checkbox', required: true },
        ]
      }
    ]
  },
  'foh-opening': {
    id: 'foh-opening',
    name: 'FOH Opening',
    scheduledTime: '06:30',
    sections: [
      {
        title: 'POS & Cash',
        items: [
          { id: 'pos-on', label: 'POS powered on and logged in', type: 'checkbox', required: true },
          { id: 'starting-cash', label: 'Starting cash drawer', type: 'number', unit: '$', required: true },
          { id: 'card-terminal', label: 'Credit card terminal connected', type: 'checkbox', required: true },
        ]
      },
      {
        title: 'Coffee Station',
        items: [
          { id: 'espresso-on', label: 'Espresso machine ON and at temp', type: 'checkbox', required: true },
          { id: 'test-shot', label: 'Test shot quality', type: 'select', options: ['Good', 'Adjusted grind'], required: true },
          { id: 'drip-brewing', label: 'Drip coffee brewing', type: 'checkbox', required: true },
          { id: 'milk-stocked', label: 'Milk stocked and dated', type: 'checkbox', required: true },
        ]
      },
      {
        title: 'Display Case',
        items: [
          { id: 'case-cleaned', label: 'Display case glass cleaned', type: 'checkbox', required: true },
          { id: 'case-temp', label: 'Display case temp', type: 'number', unit: '°F', required: true, alertIf: { above: 45 } },
          { id: 'pastries-arranged', label: 'Pastries arranged attractively', type: 'checkbox', required: true },
          { id: 'display-photo', label: 'Photo of display case', type: 'photo', required: true },
        ]
      },
      {
        title: 'Facility',
        items: [
          { id: 'door-unlocked', label: 'Front door unlocked at 7:00 AM', type: 'checkbox', required: true },
          { id: 'todays-soup', label: "Today's soup", type: 'text', required: false },
          { id: 'restroom-checked', label: 'Restroom checked (stocked, clean)', type: 'checkbox', required: true },
        ]
      }
    ]
  },
  'closing': {
    id: 'closing',
    name: 'Closing',
    scheduledTime: '17:30',
    sections: [
      {
        title: 'FOH Closing',
        items: [
          { id: 'pos-closed', label: 'POS closed out', type: 'checkbox', required: true },
          { id: 'ending-cash', label: 'Ending cash drawer', type: 'number', unit: '$', required: true },
          { id: 'batch-settled', label: 'Credit card batch settled', type: 'checkbox', required: true },
          { id: 'case-emptied', label: 'Display case emptied and cleaned', type: 'checkbox', required: true },
          { id: 'case-temp-closing', label: 'Display case temp', type: 'number', unit: '°F', required: true },
        ]
      },
      {
        title: 'Coffee Station Closing',
        items: [
          { id: 'espresso-backflush', label: 'Espresso machine backflushed', type: 'checkbox', required: true },
          { id: 'espresso-off', label: 'Espresso machine OFF', type: 'checkbox', required: true },
          { id: 'drip-cleaned', label: 'Drip brewers emptied and cleaned', type: 'checkbox', required: true },
        ]
      },
      {
        title: 'BOH Closing',
        items: [
          { id: 'ovens-off', label: 'All ovens OFF', type: 'checkbox', required: true },
          { id: 'proofer-off', label: 'Proofer OFF (unless overnight proof)', type: 'checkbox', required: true },
          { id: 'mixers-cleaned', label: 'Mixers cleaned', type: 'checkbox', required: true },
          { id: 'surfaces-sanitized', label: 'Work surfaces sanitized', type: 'checkbox', required: true },
          { id: 'dishes-done', label: 'Dishes done', type: 'checkbox', required: true },
          { id: 'floor-cleaned', label: 'Floor swept and mopped', type: 'checkbox', required: true },
        ]
      },
      {
        title: 'Food Storage',
        items: [
          { id: 'food-labeled', label: 'All food labeled with date', type: 'checkbox', required: true },
          { id: 'walkin-temp-close', label: 'Walk-in cooler temp', type: 'number', unit: '°F', required: true, alertIf: { above: 40 } },
          { id: 'freezer-temp-close', label: 'Walk-in freezer temp', type: 'number', unit: '°F', required: true, alertIf: { above: 0 } },
          { id: 'fifo-verified', label: 'FIFO rotation verified', type: 'checkbox', required: true },
        ]
      },
      {
        title: 'Security',
        items: [
          { id: 'back-door-locked', label: 'Back door locked', type: 'checkbox', required: true },
          { id: 'lights-off', label: 'Lights off (except security)', type: 'checkbox', required: true },
          { id: 'alarm-set', label: 'Alarm set', type: 'checkbox', required: false },
          { id: 'front-door-locked', label: 'Front door locked - final check', type: 'checkbox', required: true },
        ]
      },
      {
        title: 'Closing Photos',
        items: [
          { id: 'kitchen-photo', label: 'Photo of clean kitchen', type: 'photo', required: true },
          { id: 'cooler-temp-photo', label: 'Photo of cooler thermometer', type: 'photo', required: false },
        ]
      }
    ]
  },
  'night-prep': {
    id: 'night-prep',
    name: 'Night Before Prep',
    scheduledTime: '17:00',
    sections: [
      {
        title: 'Starter',
        items: [
          { id: 'starter-fed', label: 'Feed sourdough starter', type: 'checkbox', required: true },
          { id: 'starter-activity', label: 'Starter activity level', type: 'select', options: ['Active/Bubbly', 'Sluggish', 'Needs attention'], required: true },
        ]
      },
      {
        title: 'Tomorrow Prep',
        items: [
          { id: 'tomorrow-day', label: 'Tomorrow is', type: 'select', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
          { id: 'specialty-dough-mixed', label: 'Specialty bread dough mixed', type: 'checkbox', required: false },
          { id: 'soakers-started', label: 'Soakers/preferments started', type: 'checkbox', required: false },
          { id: 'dashboard-checked', label: 'Checked dashboard for tomorrow orders', type: 'checkbox', required: true },
        ]
      }
    ]
  }
};

function countTotalItems(template) {
  return template.sections.reduce((sum, s) => sum + s.items.length, 0);
}

function formatTime12Hour(time24) {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
}

// Template names for history
const TEMPLATE_NAMES = {
  'baker-opening': 'Baker Opening',
  'pastry-opening': 'Pastry Opening',
  'foh-opening': 'FOH Opening',
  'closing': 'Closing',
  'night-prep': 'Night Before Prep'
};

// ============================================
// ROUTE HANDLER
// ============================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Not authenticated' });

  // Parse path from query parameter
  const pathSegments = req.query.path || [];
  const pathString = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;

  console.log('Checklist API path:', pathString, 'method:', req.method);

  try {
    // GET /history - Get completion history
    if (pathString === 'history' && req.method === 'GET') {
      const fromDate = req.query.from || getTodayString();
      const toDate = req.query.to || getTodayString();

      const completions = await getCompletionsInRange(fromDate, toDate);
      const enriched = completions.map(c => ({ ...c, name: TEMPLATE_NAMES[c.templateId] || c.templateId }));

      return res.status(200).json({ from: fromDate, to: toDate, completions: enriched });
    }

    // GET /:id - Get single checklist template
    if (pathSegments.length === 1 && req.method === 'GET') {
      const id = pathSegments[0];
      const template = CHECKLIST_TEMPLATES[id];

      if (!template) {
        return res.status(404).json({ error: 'Checklist not found', requestedId: id });
      }

      const date = req.query.date || getTodayString();
      const totalItems = countTotalItems(template);
      const session = await getChecklistSession(date, id);

      return res.status(200).json({
        template,
        date,
        responses: session.responses || {},
        completion: session.completion || null,
        progress: session.progress || 0,
        total: totalItems
      });
    }

    // POST /:id/response - Save item response
    if (pathSegments.length === 2 && pathSegments[1] === 'response' && req.method === 'POST') {
      const id = pathSegments[0];
      const { itemId, value, date } = req.body;

      if (!itemId || value === undefined) {
        return res.status(400).json({ error: 'itemId and value are required' });
      }

      const template = CHECKLIST_TEMPLATES[id];
      if (!template) {
        return res.status(404).json({ error: 'Checklist not found' });
      }

      const checklistDate = date || getTodayString();
      const totalItems = countTotalItems(template);
      const result = await saveResponse(checklistDate, id, itemId, value, totalItems);

      return res.status(200).json({ success: true, progress: result.progress, total: result.total, alert: null });
    }

    // POST /:id/complete - Mark checklist complete
    if (pathSegments.length === 2 && pathSegments[1] === 'complete' && req.method === 'POST') {
      const id = pathSegments[0];
      const { completedBy, date } = req.body;

      const template = CHECKLIST_TEMPLATES[id];
      if (!template) {
        return res.status(404).json({ error: 'Checklist not found' });
      }

      const checklistDate = date || getTodayString();
      const totalItems = countTotalItems(template);
      const result = await markComplete(checklistDate, id, completedBy, totalItems);

      return res.status(200).json({ success: true, completion: result.completion });
    }

    // POST /:id/photo - Upload photo (stub)
    if (pathSegments.length === 2 && pathSegments[1] === 'photo' && req.method === 'POST') {
      return res.status(200).json({
        success: true,
        message: 'Photo upload acknowledged (storage not implemented)',
        url: null
      });
    }

    return res.status(404).json({ error: 'Route not found', path: pathString });
  } catch (error) {
    console.error('Checklist API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
