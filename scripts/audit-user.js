#!/usr/bin/env node
/**
 * Make (or reset) a login for the members-only STR Permit Audit at /audit.
 *
 *   node scripts/audit-user.js <name> [password]
 *
 * Prints the password (generated if omitted) and the hash to paste into the
 * AUDIT_USERS env var on Vercel, which is a JSON object { "name": "<hash>" }.
 * Add or replace that name's entry, redeploy, and the login works. Remove the
 * entry to revoke access (existing sessions die on the next request).
 */
import { scryptSync, randomBytes } from 'crypto';

const [name, given] = process.argv.slice(2);
if (!name) { console.error('usage: node scripts/audit-user.js <name> [password]'); process.exit(1); }
const words = ['river', 'plaza', 'brook', 'maple', 'union', 'summit', 'harbor', 'meadow', 'crest', 'cedar', 'garden', 'liberty', 'prairie', 'quarry', 'valley', 'westport'];
const pw = given || `${words[randomBytes(1)[0] % words.length]}-${words[randomBytes(1)[0] % words.length]}-${100 + (randomBytes(1)[0] % 900)}`;
const salt = randomBytes(16).toString('hex');
const hash = `scrypt$${salt}$${scryptSync(pw, salt, 32).toString('hex')}`;
console.log(`name:      ${name.toLowerCase()}`);
console.log(`password:  ${pw}`);
console.log(`AUDIT_USERS entry:  "${name.toLowerCase()}": "${hash}"`);
