/**
 * Shared helpers for the STR Permit Audit dashboard (/audit). Sep 2026.
 *
 * Accounts: AUDIT_USERS env var, a JSON object of { "name": "<scrypt hash>" }.
 * Hashes are produced by `node scripts/audit-user.js <name> [password]`.
 * Sessions: HttpOnly cookie `kcstra_audit` = name.expires.hmac, signed with
 * AUDIT_SESSION_SECRET. Rotate the secret to log everyone out at once.
 * Corrections: Upstash Redis via KV_REST_API_URL / KV_REST_API_TOKEN.
 */
import { createHmac, scryptSync, timingSafeEqual, randomBytes } from 'crypto';

export const COOKIE = 'kcstra_audit';
const TTL_MS = 30 * 86400000;

export function users() {
  try { const u = JSON.parse(process.env.AUDIT_USERS || '{}'); return u && typeof u === 'object' ? u : {}; } catch { return {}; }
}

export function hashPassword(pw, salt = randomBytes(16).toString('hex')) {
  return `scrypt$${salt}$${scryptSync(String(pw), salt, 32).toString('hex')}`;
}

export function checkPassword(pw, stored) {
  const [algo, salt, hex] = String(stored || '').split('$');
  if (algo !== 'scrypt' || !salt || !hex) return false;
  const a = scryptSync(String(pw), salt, 32), b = Buffer.from(hex, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

function secret() { return process.env.AUDIT_SESSION_SECRET || ''; }
const sign = (name, exp) => createHmac('sha256', secret()).update(`${name}|${exp}`).digest('hex');

export function mintSession(name) {
  if (!secret()) throw new Error('AUDIT_SESSION_SECRET not configured');
  const exp = Date.now() + TTL_MS;
  return { token: `${name}.${exp}.${sign(name, exp)}`, expiresAt: new Date(exp).toISOString() };
}

/** Returns the user name for a valid session cookie, else null. Fails closed without a secret. */
export function sessionUser(req) {
  if (!secret()) return null;
  const m = String(req.headers?.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return null;
  const parts = decodeURIComponent(m[1]).split('.');
  if (parts.length !== 3) return null;
  const [name, exp, sig] = parts;
  if (!/^\d+$/.test(exp) || Date.now() > +exp) return null;
  const want = sign(name, exp);
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  if (!(name in users())) return null;  // removed accounts lose access immediately
  return name;
}

export function cookieHeader(token, expiresAt) {
  const base = `${COOKIE}=${encodeURIComponent(token || '')}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  return token ? `${base}; Expires=${new Date(expiresAt).toUTCString()}` : `${base}; Max-Age=0`;
}

/* ---------- Redis (Upstash REST) ---------- */
function kv() {
  const url = process.env.KV_REST_API_URL, token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}
export async function kvGet(key) {
  const c = kv(); if (!c) return null;
  const r = await fetch(`${c.url}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${c.token}` } });
  if (!r.ok) return null;
  const d = await r.json();
  return d.result ? JSON.parse(d.result) : null;
}
export async function kvSet(key, value) {
  const c = kv(); if (!c) throw new Error('Redis not configured');
  const r = await fetch(c.url, { method: 'POST', headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(['SET', key, JSON.stringify(value)]) });
  if (!r.ok) throw new Error('Redis write failed');
}
/** Best-effort fixed-window rate limit. Allows when Redis is absent. */
export async function rateLimit(key, limit, windowSec) {
  const c = kv(); if (!c) return true;
  try {
    const r = await fetch(`${c.url}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify([['INCR', key], ['EXPIRE', key, String(windowSec), 'NX']]) });
    const d = await r.json();
    return (d?.[0]?.result ?? 0) <= limit;
  } catch { return true; }
}
