/**
 * Board finances for /finance. Same sign-in as /audit (api/audit-login.js).
 *
 *   GET /api/finance            → the published ledger (summary, month-end checks, notes, transactions)
 *   GET /api/finance?file=xlsx  → the Excel workbook, as a download
 *
 * The ledger is built privately (~/Documents/KCSTRA Ledger/ledger.py) and copied into Redis by
 * scripts/finance-publish.js (kcstra-finance:ledger, kcstra-finance:xlsx). None of it is in git: this repo is public.
 * FINANCE_USERS (comma list) narrows who can see it; unset means everyone with an /audit login.
 */
import { sessionUser, kvGet, isAdmin } from './_audit.js';

function allowed(user) {
  const only = String(process.env.FINANCE_USERS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return !only.length || only.includes(user) || isAdmin(user);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const user = sessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  if (!allowed(user)) return res.status(403).json({ error: 'The finances are for board members.', user });

  if (req.query?.file === 'xlsx') {
    const f = await kvGet('kcstra-finance:xlsx');
    if (!f?.b64) return res.status(404).json({ error: 'No workbook has been published yet' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${String(f.name || 'KCSTRA Ledger.xlsx').replace(/[^\w .()-]/g, '')}"`);
    return res.send(Buffer.from(f.b64, 'base64'));
  }
  const ledger = await kvGet('kcstra-finance:ledger');
  if (!ledger) return res.status(404).json({ error: 'No ledger has been published yet', user });
  return res.json({ ...ledger, user, admin: isAdmin(user) });
}
