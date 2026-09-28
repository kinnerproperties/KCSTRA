#!/usr/bin/env node
/**
 * Publish the board ledger to /finance (board members only).
 *
 *   node scripts/finance-publish.js "<ledger folder>"
 *
 * The ledger folder is private (~/Documents/KCSTRA Ledger). `python3 ledger.py build` there writes
 * ledger.json and "KCSTRA Ledger through <date>.xlsx"; this copies both into Redis
 * (kcstra-finance:xlsx, then kcstra-finance:ledger), where api/finance.js serves them to signed-in board members.
 * Never commit the ledger files: this repo is public.
 *
 * Needs KV_REST_API_URL and KV_REST_API_TOKEN (the Redis that /audit uses). Keep the env file
 * outside the repo:
 *   vercel env pull "$TMPDIR/kcstra.env" --environment=production --yes
 *   node --env-file="$TMPDIR/kcstra.env" scripts/finance-publish.js ~/Documents/KCSTRA\ Ledger
 *   rm "$TMPDIR/kcstra.env"
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { kvGet, kvSet } from '../api/_audit.js';

const dir = process.argv[2];
if (!dir) { console.error('usage: node scripts/finance-publish.js "<ledger folder>"'); process.exit(1); }
if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  console.error('KV_REST_API_URL / KV_REST_API_TOKEN are not set (see the top of this file)'); process.exit(1);
}
const ledger = JSON.parse(readFileSync(join(dir, 'ledger.json'), 'utf8'));
const xlsx = readFileSync(join(dir, ledger.file));
// workbook first, so the page never offers a download that isn't there yet
await kvSet('kcstra-finance:xlsx', { name: ledger.file, b64: xlsx.toString('base64'), bytes: xlsx.length, builtAt: ledger.builtAt });
await kvSet('kcstra-finance:ledger', { ...ledger, publishedAt: new Date().toISOString() });
const back = await kvGet('kcstra-finance:ledger');
if (back?.builtAt !== ledger.builtAt) { console.error('Read-back failed: Redis does not have the new ledger'); process.exit(1); }
console.log(`Published ${ledger.file} (${Math.round(xlsx.length / 1024)} KB): ${ledger.transactions.length} transactions through ${ledger.asOf}.`);
