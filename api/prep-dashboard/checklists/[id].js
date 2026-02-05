// api/prep-dashboard/checklists/[id].js
// GET /api/prep-dashboard/checklists/:id - Get a specific checklist template

import crypto from 'crypto';
import { getChecklistSession } from './_storage.js';

// Auth helpers
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

// Checklist templates
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

// Helper functions
function getMountainTime() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
}

function getTodayString() {
  return getMountainTime().toISOString().split('T')[0];
}

function countTotalItems(template) {
  return template.sections.reduce((sum, s) => sum + s.items.length, 0);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Not authenticated' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { id } = req.query;
    console.log('Checklist [id].js called with id:', id);

    const template = CHECKLIST_TEMPLATES[id];
    if (!template) {
      return res.status(404).json({ error: 'Checklist not found', requestedId: id });
    }

    const date = req.query.date || getTodayString();
    const totalItems = countTotalItems(template);

    // Get saved session data from persistent storage
    const session = await getChecklistSession(date, id);

    return res.status(200).json({
      template,
      date,
      responses: session.responses || {},
      completion: session.completion || null,
      progress: session.progress || 0,
      total: totalItems
    });
  } catch (error) {
    console.error('Checklist API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
