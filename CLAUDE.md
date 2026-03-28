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
