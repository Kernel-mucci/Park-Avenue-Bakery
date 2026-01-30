// api/prep-dashboard/checklists/index.js
// Checklist API - List today's checklists

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
// IN-MEMORY STORAGE (replace with database later)
// ============================================

// Store completions in memory (resets on server restart)
// In production, use Vercel KV, Supabase, or similar
const completions = new Map();

function getCompletionKey(templateId, date) {
  return `${templateId}:${date}`;
}

function getCompletion(templateId, date) {
  return completions.get(getCompletionKey(templateId, date));
}

function saveCompletion(completion) {
  const key = getCompletionKey(completion.templateId, completion.date);
  completions.set(key, completion);
  return completion;
}

function getAllCompletionsForDate(date) {
  const results = [];
  for (const [key, completion] of completions) {
    if (completion.date === date) {
      results.push(completion);
    }
  }
  return results;
}

function getCompletionsInRange(fromDate, toDate) {
  const results = [];
  for (const [key, completion] of completions) {
    if (completion.date >= fromDate && completion.date <= toDate) {
      results.push(completion);
    }
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
  const now = getMountainTime();
  return now.toISOString().split('T')[0];
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function countTotalItems(template) {
  let total = 0;
  for (const section of template.sections) {
    total += section.items.length;
  }
  return total;
}

function countCompletedItems(completion) {
  if (!completion || !completion.responses) return 0;
  return Object.keys(completion.responses).length;
}

function checkAlerts(template, responses) {
  const alerts = [];
  for (const section of template.sections) {
    for (const item of section.items) {
      if (item.alertIf && responses[item.id]) {
        const value = responses[item.id].value;
        if (typeof value === 'number') {
          if (item.alertIf.above !== undefined && value > item.alertIf.above) {
            alerts.push({
              itemId: item.id,
              message: `${item.label} (${value}${item.unit || ''}) exceeds ${item.alertIf.above}${item.unit || ''} limit`,
              severity: 'high'
            });
          }
          if (item.alertIf.below !== undefined && value < item.alertIf.below) {
            alerts.push({
              itemId: item.id,
              message: `${item.label} (${value}${item.unit || ''}) is below ${item.alertIf.below}${item.unit || ''} minimum`,
              severity: 'high'
            });
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
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

// ============================================
// API HANDLER
// ============================================

// This file ONLY handles GET /api/prep-dashboard/checklists (list all checklists)
// All other routes (templates, responses, etc.) are handled by [...path].js

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check authentication
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Only handle GET requests for listing checklists
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req;
  const date = query.date || getTodayString();
  const todayCompletions = getAllCompletionsForDate(date);

  const checklists = Object.values(CHECKLIST_TEMPLATES).map(template => {
    const completion = todayCompletions.find(c => c.templateId === template.id);
    const totalItems = countTotalItems(template);

    if (completion && completion.completedAt) {
      return {
        templateId: template.id,
        name: template.name,
        scheduledTime: template.scheduledTime,
        scheduledTimeDisplay: formatTime12Hour(template.scheduledTime),
        status: 'complete',
        completedAt: completion.completedAt,
        completedBy: completion.completedBy,
        alerts: (completion.alerts || []).length,
        progress: totalItems,
        total: totalItems
      };
    } else if (completion) {
      return {
        templateId: template.id,
        name: template.name,
        scheduledTime: template.scheduledTime,
        scheduledTimeDisplay: formatTime12Hour(template.scheduledTime),
        status: 'in-progress',
        startedAt: completion.startedAt,
        startedBy: completion.completedBy,
        progress: countCompletedItems(completion),
        total: totalItems
      };
    } else {
      return {
        templateId: template.id,
        name: template.name,
        scheduledTime: template.scheduledTime,
        scheduledTimeDisplay: formatTime12Hour(template.scheduledTime),
        status: 'not-started',
        progress: 0,
        total: totalItems
      };
    }
  });

  // Sort by scheduled time
  checklists.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  return res.status(200).json({
    date,
    checklists
  });
}
