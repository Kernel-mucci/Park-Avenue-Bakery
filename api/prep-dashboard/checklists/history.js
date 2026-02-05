// api/prep-dashboard/checklists/history.js
// GET /api/prep-dashboard/checklists/history - Get checklist completion history

import crypto from 'crypto';
import { getCompletionsInRange } from './_storage.js';

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

function getMountainTime() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
}

function getTodayString() {
  return getMountainTime().toISOString().split('T')[0];
}

// Checklist template names for enriching history results
const TEMPLATE_NAMES = {
  'baker-opening': 'Baker Opening',
  'pastry-opening': 'Pastry Opening',
  'foh-opening': 'FOH Opening',
  'closing': 'Closing',
  'night-prep': 'Night Before Prep'
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Not authenticated' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const fromDate = req.query.from || getTodayString();
    const toDate = req.query.to || getTodayString();

    // Get completions from persistent storage
    const completions = await getCompletionsInRange(fromDate, toDate);

    // Enrich with template names
    const enrichedCompletions = completions.map(c => ({
      ...c,
      name: TEMPLATE_NAMES[c.templateId] || c.templateId
    }));

    return res.status(200).json({
      from: fromDate,
      to: toDate,
      completions: enrichedCompletions
    });
  } catch (error) {
    console.error('Checklist history error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
