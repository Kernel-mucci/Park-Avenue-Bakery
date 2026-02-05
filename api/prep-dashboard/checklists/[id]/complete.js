// api/prep-dashboard/checklists/[id]/complete.js
// POST /api/prep-dashboard/checklists/:id/complete - Mark checklist as complete

import crypto from 'crypto';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Not authenticated' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { id } = req.query;
    const { completedBy } = req.body;

    console.log('Marking checklist complete:', id, 'by:', completedBy);

    // MVP: Just acknowledge completion (no persistent storage)
    return res.status(200).json({
      success: true,
      completion: {
        id: Date.now().toString(),
        templateId: id,
        completedAt: new Date().toISOString(),
        completedBy: completedBy || 'Staff'
      }
    });
  } catch (error) {
    console.error('Complete error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
