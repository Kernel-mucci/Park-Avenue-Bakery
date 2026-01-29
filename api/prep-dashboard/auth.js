// api/prep-dashboard/auth.js
// Authentication endpoint for Park Avenue Bakery Prep Dashboard

import crypto from 'crypto';

// Generate a session token from password + secret
function generateSessionToken(password) {
    const secret = process.env.SESSION_SECRET || 'park-avenue-bakery-2026';
    return crypto.createHmac('sha256', secret).update(password).digest('hex');
}

// Verify session token
function verifySessionToken(token) {
    const password = process.env.DASHBOARD_PASSWORD;
    if (!password) return false;
    const expectedToken = generateSessionToken(password);
    return token === expectedToken;
}

// Parse cookies from request
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

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;

    if (!DASHBOARD_PASSWORD) {
        console.error('DASHBOARD_PASSWORD environment variable not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    // GET: Check if user is authenticated
    if (req.method === 'GET') {
        const cookies = parseCookies(req.headers.cookie);
        const sessionToken = cookies['dashboard_session'];

        if (sessionToken && verifySessionToken(sessionToken)) {
            return res.status(200).json({ authenticated: true });
        }

        return res.status(401).json({ authenticated: false });
    }

    // POST: Login attempt
    if (req.method === 'POST') {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        if (password !== DASHBOARD_PASSWORD) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        // Generate session token
        const sessionToken = generateSessionToken(password);

        // Set httpOnly cookie with 7 day expiry
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = [
            `dashboard_session=${sessionToken}`,
            'Path=/',
            'HttpOnly',
            'SameSite=Strict',
            `Max-Age=${7 * 24 * 60 * 60}` // 7 days in seconds
        ];

        if (isProduction) {
            cookieOptions.push('Secure');
        }

        res.setHeader('Set-Cookie', cookieOptions.join('; '));

        return res.status(200).json({ success: true, message: 'Login successful' });
    }

    // DELETE: Logout
    if (req.method === 'DELETE') {
        // Clear the session cookie
        res.setHeader('Set-Cookie', 'dashboard_session=; Path=/; HttpOnly; Max-Age=0');
        return res.status(200).json({ success: true, message: 'Logged out' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

// Export helper for other endpoints to verify auth
export { verifySessionToken, parseCookies };
