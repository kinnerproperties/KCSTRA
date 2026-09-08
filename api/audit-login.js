/**
 * POST /api/audit-login { user, pw }  → sets the kcstra_audit session cookie (30 days)
 * GET  /api/audit-login               → { user } for the current session, or 401
 * DELETE /api/audit-login             → clears the cookie
 */
import { users, checkPassword, mintSession, sessionUser, cookieHeader, rateLimit } from './_audit.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    const u = sessionUser(req);
    return u ? res.json({ ok: true, user: u }) : res.status(401).json({ error: 'Not signed in' });
  }
  if (req.method === 'DELETE') { res.setHeader('Set-Cookie', cookieHeader('')); return res.json({ ok: true }); }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (!(await rateLimit(`audit:login:${ip}`, 10, 600))) return res.status(429).json({ error: 'Too many attempts. Try again in ten minutes.' });

  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const name = String(b.user || '').trim().toLowerCase(), pw = String(b.pw || '');
  const stored = users()[name];
  if (!name || !pw || !stored || !checkPassword(pw, stored)) return res.status(401).json({ error: 'Wrong name or password' });

  try {
    const { token, expiresAt } = mintSession(name);
    res.setHeader('Set-Cookie', cookieHeader(token, expiresAt));
    return res.json({ ok: true, user: name, expiresAt });
  } catch (e) { return res.status(500).json({ error: e.message }); }
}
