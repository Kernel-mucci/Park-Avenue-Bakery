// api/prep-dashboard/checklists/[id]/response.js
// POST /api/prep-dashboard/checklists/:id/response - Save a checklist item response

import crypto from 'crypto';
import { saveResponse } from '../_storage.js';

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

// Template item counts for calculating totals
const TEMPLATE_ITEM_COUNTS = {
  'baker-opening': 12,
  'pastry-opening': 9,
  'foh-opening': 13,
  'closing': 19,
  'night-prep': 6
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Not authenticated' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { id } = req.query;
    const { itemId, value, date } = req.body;

    if (!itemId || value === undefined) {
      return res.status(400).json({ error: 'itemId and value are required' });
    }

    const checklistDate = date || getTodayString();
    const totalItems = TEMPLATE_ITEM_COUNTS[id] || 10;

    console.log('Saving response for checklist:', id, 'item:', itemId, 'value:', value, 'date:', checklistDate);

    // Save to persistent storage
    const result = await saveResponse(checklistDate, id, itemId, value, totalItems);

    // Check for alerts based on value (temperature checks, etc.)
    let alert = null;
    // Temperature alerts could be implemented here based on item metadata

    return res.status(200).json({
      success: true,
      progress: result.progress,
      total: result.total,
      alert
    });
  } catch (error) {
    console.error('Response save error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
