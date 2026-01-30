// api/prep-dashboard/checklists/[...path].js
// Handles sub-routes: /api/prep-dashboard/checklists/:templateId, /history, etc.

import crypto from 'crypto';

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
          { id: 'deck-oven-temp', label: 'Deck oven temp', type: 'number', unit: '\u00B0F', required: true },
          { id: 'convection-on', label: 'Convection oven ON', type: 'checkbox', required: true },
          { id: 'convection-temp', label: 'Convection oven temp', type: 'number', unit: '\u00B0F', required: true },
          { id: 'proofer-on', label: 'Proofer ON (78-82\u00B0F)', type: 'checkbox', required: true },
          { id: 'proofer-temp', label: 'Proofer temp', type: 'number', unit: '\u00B0F', required: true, alertIf: { below: 75, above: 85 } },
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
          { id: 'walkin-cooler-temp', label: 'Walk-in cooler temp', type: 'number', unit: '\u00B0F', required: true, alertIf: { above: 40 } },
          { id: 'walkin-freezer-temp', label: 'Walk-in freezer temp', type: 'number', unit: '\u00B0F', required: true, alertIf: { above: 0 } },
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
          { id: 'convection-temp', label: 'Convection oven temp', type: 'number', unit: '\u00B0F', required: true },
          { id: 'pastry-cooler-temp', label: 'Pastry cooler temp', type: 'number', unit: '\u00B0F', required: true, alertIf: { above: 40 } },
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
          { id: 'case-temp', label: 'Display case temp', type: 'number', unit: '\u00B0F', required: true, alertIf: { above: 45 } },
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
          { id: 'case-temp-closing', label: 'Display case temp', type: 'number', unit: '\u00B0F', required: true },
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
          { id: 'walkin-temp-close', label: 'Walk-in cooler temp', type: 'number', unit: '\u00B0F', required: true, alertIf: { above: 40 } },
          { id: 'freezer-temp-close', label: 'Walk-in freezer temp', type: 'number', unit: '\u00B0F', required: true, alertIf: { above: 0 } },
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

// ============================================
// IN-MEMORY STORAGE
// ============================================

const completions = new Map();

function getCompletionKey(templateId, date) {
  return `${templateId}:${date}`;
}

function getCompletion(templateId, date) {
  return completions.get(getCompletionKey(templateId, date));
}

function saveCompletion(completion) {
  completions.set(getCompletionKey(completion.templateId, completion.date), completion);
  return completion;
}

function getAllCompletionsForDate(date) {
  const results = [];
  for (const [, completion] of completions) {
    if (completion.date === date) results.push(completion);
  }
  return results;
}

function getCompletionsInRange(fromDate, toDate) {
  const results = [];
  for (const [, completion] of completions) {
    if (completion.date >= fromDate && completion.date <= toDate) results.push(completion);
  }
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getMountainTime() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
}

function getTodayString() {
  return getMountainTime().toISOString().split('T')[0];
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function countTotalItems(template) {
  return template.sections.reduce((sum, s) => sum + s.items.length, 0);
}

function countCompletedItems(completion) {
  return completion?.responses ? Object.keys(completion.responses).length : 0;
}

function checkAlerts(template, responses) {
  const alerts = [];
  for (const section of template.sections) {
    for (const item of section.items) {
      if (item.alertIf && responses[item.id]) {
        const value = responses[item.id].value;
        if (typeof value === 'number') {
          if (item.alertIf.above !== undefined && value > item.alertIf.above) {
            alerts.push({ itemId: item.id, message: `${item.label} exceeds limit`, severity: 'high' });
          }
          if (item.alertIf.below !== undefined && value < item.alertIf.below) {
            alerts.push({ itemId: item.id, message: `${item.label} below minimum`, severity: 'high' });
          }
        }
      }
    }
  }
  return alerts;
}

function formatTime12Hour(time24) {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
}

// ============================================
// API HANDLER
// ============================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAuthenticated(req)) {
    console.log('Auth failed. Cookie header:', req.headers.cookie);
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { method, query } = req;
    const pathParts = (query.path || []).filter(Boolean);

    // Log request details for debugging
    console.log('Checklist API request:', { method, pathParts, url: req.url });

    // GET template by ID: /api/prep-dashboard/checklists/baker-opening
    if (method === 'GET' && pathParts.length === 1 && pathParts[0] !== 'history') {
    const templateId = pathParts[0];
    const template = CHECKLIST_TEMPLATES[templateId];
    if (!template) return res.status(404).json({ error: 'Checklist not found' });

    const date = query.date || getTodayString();
    const completion = getCompletion(templateId, date);

    return res.status(200).json({
      template,
      date,
      completion: completion || null,
      progress: countCompletedItems(completion),
      total: countTotalItems(template)
    });
  }

  // GET history: /api/prep-dashboard/checklists/history
  if (method === 'GET' && pathParts[0] === 'history') {
    const fromDate = query.from || getTodayString();
    const toDate = query.to || getTodayString();
    let history = getCompletionsInRange(fromDate, toDate);
    if (query.templateId) history = history.filter(c => c.templateId === query.templateId);

    return res.status(200).json({
      from: fromDate,
      to: toDate,
      completions: history.map(c => ({
        id: c.id,
        templateId: c.templateId,
        templateName: CHECKLIST_TEMPLATES[c.templateId]?.name || c.templateId,
        date: c.date,
        completedAt: c.completedAt,
        completedBy: c.completedBy,
        progress: countCompletedItems(c),
        total: countTotalItems(CHECKLIST_TEMPLATES[c.templateId]),
        alerts: (c.alerts || []).length
      }))
    });
  }

  // POST response: /api/prep-dashboard/checklists/baker-opening/response
  if (method === 'POST' && pathParts.length === 2 && pathParts[1] === 'response') {
    const templateId = pathParts[0];
    const template = CHECKLIST_TEMPLATES[templateId];
    if (!template) return res.status(404).json({ error: 'Checklist not found' });

    const { itemId, value, completedBy, date: reqDate } = req.body;
    const date = reqDate || getTodayString();
    if (!itemId || value === undefined) return res.status(400).json({ error: 'itemId and value required' });

    let completion = getCompletion(templateId, date);
    const now = new Date().toISOString();

    if (!completion) {
      completion = {
        id: generateId(),
        templateId,
        date,
        startedAt: now,
        completedAt: null,
        completedBy: completedBy || 'Staff',
        responses: {},
        alerts: []
      };
    }

    completion.responses[itemId] = { value, timestamp: now };
    if (completedBy) completion.completedBy = completedBy;
    completion.alerts = checkAlerts(template, completion.responses);

    let itemAlert = null;
    const itemConfig = template.sections.flatMap(s => s.items).find(i => i.id === itemId);
    if (itemConfig?.alertIf && typeof value === 'number') {
      if (itemConfig.alertIf.above !== undefined && value > itemConfig.alertIf.above) {
        itemAlert = { type: 'warning', message: `Exceeds ${itemConfig.alertIf.above}${itemConfig.unit || ''} limit` };
      } else if (itemConfig.alertIf.below !== undefined && value < itemConfig.alertIf.below) {
        itemAlert = { type: 'warning', message: `Below ${itemConfig.alertIf.below}${itemConfig.unit || ''} minimum` };
      }
    }

    saveCompletion(completion);
    return res.status(200).json({
      success: true,
      progress: countCompletedItems(completion),
      total: countTotalItems(template),
      alert: itemAlert
    });
  }

  // POST complete: /api/prep-dashboard/checklists/baker-opening/complete
  if (method === 'POST' && pathParts.length === 2 && pathParts[1] === 'complete') {
    const templateId = pathParts[0];
    const template = CHECKLIST_TEMPLATES[templateId];
    if (!template) return res.status(404).json({ error: 'Checklist not found' });

    const { completedBy, date: reqDate } = req.body;
    const date = reqDate || getTodayString();
    const completion = getCompletion(templateId, date);
    if (!completion) return res.status(400).json({ error: 'No checklist in progress' });

    const required = template.sections.flatMap(s => s.items).filter(i => i.required);
    const missing = required.filter(i => !completion.responses[i.id]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required items',
        missingItems: missing.map(i => ({ id: i.id, label: i.label }))
      });
    }

    completion.completedAt = new Date().toISOString();
    if (completedBy) completion.completedBy = completedBy;
    saveCompletion(completion);

    return res.status(200).json({ success: true, completion });
  }

  // POST photo (stub)
  if (method === 'POST' && pathParts.length === 2 && pathParts[1] === 'photo') {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'itemId required' });
    return res.status(200).json({ success: true, url: `mock://photo-${itemId}` });
  }

  return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Checklist API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
