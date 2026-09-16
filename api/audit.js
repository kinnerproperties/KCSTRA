/**
 * STR Permit Audit dashboard data. Members-only (session cookie from /api/audit-login).
 *
 * Snapshots are static JSON under data/audit/, written by the audit pipeline
 * (export_snapshot.py). Nothing here talks to Airbnb or the city.
 *
 *   GET  /api/audit                 → { snapshots } (index.json, newest first)
 *   GET  /api/audit?snapshot=DATE   → that snapshot (listings + registry + summary)
 *   GET  /api/audit?corrections=1   → correction requests
 *   POST /api/audit {action:'correction', id, kind, note, title, cat}
 *   POST /api/audit {action:'correction-status', ts, status}   open|verified|rejected
 *   POST /api/audit {action:'correction-delete', ts}
 *   POST /api/audit {action:'ping', view}   → heartbeat (page sends one a minute while visible, and on tab change)
 *   GET  /api/audit?activity=1        → { logins, sessions } (admins only, AUDIT_ADMINS)
 *   GET  /api/audit?status=1          → listing liveness map (str-audit:status, written by kinnerproperties.com's daily probe)
 *   GET  /api/audit?events=1          → enforcement log + auto events (str-audit:events, shared with the admin dashboard)
 *   POST /api/audit {action:'event', kind, id?, reg?, address?, date, note, source?, link?} / {action:'event-delete', ts}
 *
 * Corrections live in Redis under audit:corrections (array, newest first) and
 * carry the member who logged/resolved them. They never change a snapshot.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { sessionUser, kvGet, kvSet, isAdmin, touchSession, LOG_KEY, SESS_KEY } from './_audit.js';

const DIR = join(process.cwd(), 'data', 'audit');
const KEY = 'audit:corrections';
const STATUS_KEY = 'str-audit:status', EVENTS_KEY = 'str-audit:events';   // same Redis as kinnerproperties.com; one log for both dashboards
const EVENT_KINDS = new Set(['letter', 'takedown', 'citation', 'complaint', 'permit_denied', 'permit_revoked', 'permit_issued', 'court', 'note', 'other']);
function statusSummary(status) {
  const meta = status._meta || {}; let live = 0, gone = 0, unknown = 0, suspects = 0;
  for (const [id, r] of Object.entries(status)) { if (id === '_meta') continue; if (r.state === 'live') live++; else if (r.state === 'gone') gone++; else unknown++; if (r.suspect) suspects++; }
  return { ...meta, live, gone, unknown, suspects };
}

export default async function handler(req, res) {
  if (req.method === 'GET' && req.query && req.query.health) {
    const idx = join(DIR, 'index.json');
    const n = existsSync(idx) ? JSON.parse(readFileSync(idx, 'utf8')).length : -1;
    return res.json({ ok: n >= 0, snapshots: n });
  }
  const user = sessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const { snapshot, corrections, activity, status, events } = req.query || {};
    if (status) { const st = (await kvGet(STATUS_KEY)) || {}; return res.json({ status: st, summary: statusSummary(st) }); }
    if (events) return res.json({ events: (await kvGet(EVENTS_KEY)) || [] });
    if (activity) { if (!isAdmin(user)) return res.status(403).json({ error: 'Admins only' }); return res.json({ logins: (await kvGet(LOG_KEY)) || [], sessions: (await kvGet(SESS_KEY)) || [] }); }
    if (corrections) return res.json({ corrections: (await kvGet(KEY)) || [] });
    if (snapshot) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(snapshot))) return res.status(400).json({ error: 'bad snapshot id' });
      const f = join(DIR, 'snapshots', `${snapshot}.json`);
      if (!existsSync(f)) return res.status(404).json({ error: 'no such snapshot' });
      res.setHeader('Content-Type', 'application/json');
      return res.send(readFileSync(f, 'utf8'));
    }
    const idx = join(DIR, 'index.json');
    return res.json({ snapshots: existsSync(idx) ? JSON.parse(readFileSync(idx, 'utf8')) : [], user, admin: isAdmin(user) });
  }

  if (req.method === 'POST') {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (b.action === 'ping') { await touchSession(user, req, String(b.view || '').slice(0, 20)); return res.json({ ok: true }); }
    if (b.action === 'event') {
      const kind = String(b.kind || 'other').slice(0, 40); if (!EVENT_KINDS.has(kind)) return res.status(400).json({ error: 'bad kind' });
      const entry = { ts: new Date().toISOString(), kind, id: String(b.id || '').replace(/\D/g, ''), title: String(b.title || '').slice(0, 200), reg: String(b.reg || '').slice(0, 40), address: String(b.address || '').slice(0, 160),
        date: /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || '')) ? b.date : new Date().toISOString().slice(0, 10), note: String(b.note || '').slice(0, 2000), source: String(b.source || '').slice(0, 80), link: String(b.link || '').slice(0, 500), by: user, manual: true };
      if (!entry.id && !entry.reg && !entry.address && !entry.note) return res.status(400).json({ error: 'listing, permit number, address or note required' });
      const ev = (await kvGet(EVENTS_KEY)) || []; ev.unshift(entry); await kvSet(EVENTS_KEY, ev.slice(0, 3000));
      return res.json({ ok: true, entry });
    }
    if (b.action === 'event-delete') {
      const ev = (await kvGet(EVENTS_KEY)) || []; const e = ev.find(x => x.ts === b.ts);
      if (!e) return res.status(404).json({ error: 'not found' });
      if (e.auto || (e.by !== user && !isAdmin(user))) return res.status(403).json({ error: 'only the person who logged it, or an admin, can delete it' });
      await kvSet(EVENTS_KEY, ev.filter(x => x.ts !== b.ts)); return res.json({ ok: true });
    }
    const list = (await kvGet(KEY)) || [];
    if (b.action === 'correction') {
      const id = String(b.id || '').replace(/\D/g, '');
      if (!id) return res.status(400).json({ error: 'listing id required' });
      const entry = {
        ts: new Date().toISOString(), id, kind: String(b.kind || 'other').slice(0, 40),
        note: String(b.note || '').slice(0, 1000), title: String(b.title || '').slice(0, 200),
        cat: String(b.cat || '').slice(0, 80), status: 'open', by: user,
      };
      list.unshift(entry);
      await kvSet(KEY, list.slice(0, 500));
      return res.json({ ok: true, entry });
    }
    if (b.action === 'correction-status') {
      const e = list.find(x => x.ts === b.ts);
      if (!e) return res.status(404).json({ error: 'not found' });
      if (!['open', 'verified', 'rejected'].includes(b.status)) return res.status(400).json({ error: 'bad status' });
      e.status = b.status; e.resolved = new Date().toISOString(); e.resolvedBy = user;
      await kvSet(KEY, list);
      return res.json({ ok: true, entry: e });
    }
    if (b.action === 'correction-delete') {
      const next = list.filter(x => x.ts !== b.ts);
      if (next.length === list.length) return res.status(404).json({ error: 'not found' });
      await kvSet(KEY, next);
      return res.json({ ok: true });
    }
    return res.status(400).json({ error: 'unknown action' });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
