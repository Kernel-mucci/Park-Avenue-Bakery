// api/prep-dashboard/checklists/index.js
// Handles GET /api/prep-dashboard/checklists - List all checklists

import crypto from 'crypto';

// Auth helpers (duplicated because Vercel serverless functions are isolated)
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

// Checklist templates (minimal info needed for listing)
const CHECKLIST_TEMPLATES = {
  'baker-opening': { id: 'baker-opening', name: 'Baker Opening', scheduledTime: '04:00', itemCount: 12 },
  'pastry-opening': { id: 'pastry-opening', name: 'Pastry Opening', scheduledTime: '05:00', itemCount: 9 },
  'foh-opening': { id: 'foh-opening', name: 'FOH Opening', scheduledTime: '06:30', itemCount: 13 },
  'closing': { id: 'closing', name: 'Closing', scheduledTime: '17:30', itemCount: 19 },
  'night-prep': { id: 'night-prep', name: 'Night Before Prep', scheduledTime: '17:00', itemCount: 6 }
};

function formatTime12Hour(time24) {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function getMountainTime() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
}

function getTodayString() {
  return getMountainTime().toISOString().split('T')[0];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Not authenticated' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const date = req.query.date || getTodayString();

    // Return list of checklists with their status
    // Note: In this MVP, we don't track completion state across function invocations
    // Each function instance has its own memory, so we show all as not-started
    const checklists = Object.values(CHECKLIST_TEMPLATES).map(template => ({
      templateId: template.id,
      name: template.name,
      scheduledTime: template.scheduledTime,
      scheduledTimeDisplay: formatTime12Hour(template.scheduledTime),
      status: 'not-started',
      progress: 0,
      total: template.itemCount
    }));

    // Sort by scheduled time
    checklists.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    return res.status(200).json({ date, checklists });
  } catch (error) {
    console.error('Checklist list error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
