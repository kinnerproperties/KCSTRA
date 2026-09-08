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
 *
 * Corrections live in Redis under audit:corrections (array, newest first) and
 * carry the member who logged/resolved them. They never change a snapshot.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { sessionUser, kvGet, kvSet } from './_audit.js';

const DIR = join(process.cwd(), 'data', 'audit');
const KEY = 'audit:corrections';

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
    const { snapshot, corrections } = req.query || {};
    if (corrections) return res.json({ corrections: (await kvGet(KEY)) || [] });
    if (snapshot) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(snapshot))) return res.status(400).json({ error: 'bad snapshot id' });
      const f = join(DIR, 'snapshots', `${snapshot}.json`);
      if (!existsSync(f)) return res.status(404).json({ error: 'no such snapshot' });
      res.setHeader('Content-Type', 'application/json');
      return res.send(readFileSync(f, 'utf8'));
    }
    const idx = join(DIR, 'index.json');
    return res.json({ snapshots: existsSync(idx) ? JSON.parse(readFileSync(idx, 'utf8')) : [], user });
  }

  if (req.method === 'POST') {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
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
