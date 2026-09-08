# KCSTRA — Kansas City Short Term Rental Alliance

## Project Overview
Marketing website for KCSTRA, a nonprofit alliance of short-term rental operators in the Kansas City metro area (MO & KS).

## Tech Stack
- **Frontend:** Single-page static HTML (`index.html`) with embedded CSS and vanilla JavaScript
- **Backend:** Vercel serverless function (`api/contact.js`) for contact form submissions
- **Form data:** Posts to a Google Sheet via webhook (`GOOGLE_SHEET_WEBHOOK` env var on Vercel)
- **Hosting:** Vercel (auto-deploys from `main` branch on GitHub)
- **Repo:** github.com/kinnerproperties/KCSTRA

## Local Development
```bash
npm run dev        # runs vercel dev on port 3000
python3 server.py  # alternative: simple HTTP server (no API routes)
```

## Deployment
Push to `main` — Vercel picks it up automatically.

## Site Sections (in order)
1. **Nav** — Logo, links (Mission, Benefits, Our Story, Board, Get Involved)
2. **Hero** — Full-screen intro with CTA buttons
3. **Mission** — Two-column layout with stat cards
4. **Benefits** — 6-card grid of member benefits
5. **Our Story** — Founding story with graphic (founded 2023 by Kristen Doppelt, Susan Brown, Laura Williams)
6. **Board** — Officers first (President, VP, Treasurer, Secretary), then board members
7. **CTA Banner** — Call to action
8. **Contact** — Info + form (no formal membership; directs to Facebook Group and MOVHA.org)
9. **Footer** — Copyright + email

## Key Details
- **Contact email:** KCSTRA.info@gmail.com
- **Facebook Group:** https://www.facebook.com/groups/794307775401596
- **State group:** MO Vacation Home Alliance — MOVHA.org
- Board officers: Susan Brown (President), Laura Williams (VP), Jaymi Zehms (Treasurer), Grant Woodward (Secretary)

## STR Permit Audit (members-only, `/audit`) — Sep 2026
A copy of the kinnerproperties.com admin STR Audit dashboard for board members. No public link; share the URL directly.
- `audit/index.html` — the dashboard (KCSTRA palette, sign-in gate). Views: Overview, Map, Listings, Operators, Owners, World Cup, Corrections, Method.
- `api/audit-login.js` — POST {user, pw} sets the HttpOnly `kcstra_audit` cookie (30 days for `AUDIT_ADMINS`, `AUDIT_SESSION_HOURS` = 24 h for everyone else); GET = who am I; DELETE = sign out. Rate-limited 10/10 min per IP.
- `api/audit.js` — snapshot index / `?snapshot=DATE` / `?corrections=1`; POST correction / correction-status / correction-delete. Cookie-gated. Corrections carry `by` / `resolvedBy`.
- `api/_audit.js` — accounts, scrypt hashing, session signing, Redis (Upstash REST) helpers.
- `data/audit/index.json` + `data/audit/snapshots/<date>.json` — written by the audit pipeline's `export_snapshot.py` (kc-str-permit-audit skill), which mirrors here automatically. Commit + push to publish. `/data/audit/*` redirects to `/audit` so the raw files aren't browsable.
- Env: `AUDIT_USERS` = JSON `{ "name": "<scrypt hash>" }`; `AUDIT_SESSION_SECRET` (rotate to sign everyone out); `KV_REST_API_URL` / `KV_REST_API_TOKEN` from the shared `upstash-kv-bole-drum` Marketplace resource (keys namespaced `audit:*`).
- Activity log: every sign-in attempt → Redis `audit:logins`; the page pings `/api/audit {action:'ping', view}` once a minute while visible and on tab change → `audit:sessions` (10-minute quiet gap = new session, sign-out closes it). `?activity=1` and the Activity tab are visible only to `AUDIT_ADMINS` (comma list, default `adam`).
- Add or reset a login: `node scripts/audit-user.js <name>` prints a password + hash; merge the entry into `AUDIT_USERS` (`vercel env rm` / `vercel env add` for production, preview, development) and redeploy. Remove the entry to revoke.
