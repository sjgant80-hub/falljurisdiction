#!/usr/bin/env node
// check.mjs — does this document cite the law of a country it does not claim to be from?
//
//   node check.mjs US page.html [...]
//
// Exits non-zero if any file cites a body or statute that governs only somewhere else.
import { readFileSync } from 'node:fs';
import { scan, verdict } from './jurisdiction.mjs';

const [claims, ...files] = process.argv.slice(2);
if (!claims || !files.length) {
  console.log('usage: node check.mjs <US|GB> <file.html> [...]');
  process.exit(2);
}

let bad = 0;
for (const f of files) {
  let text = '';
  try { text = readFileSync(f, 'utf8'); } catch { console.log(`  ✗ ${f} — cannot read`); bad++; continue; }
  const r = scan(text, { claims });
  if (r.ok) { console.log(`  ✓ ${f} — ${verdict(r)}`); continue; }
  bad++;
  console.log(`  ✗ ${f} — ${verdict(r)}`);
  for (const t of r.foreign.slice(0, 8)) {
    console.log(`      ${t.term} (${t.belongsTo}, ${t.count}×) — ${t.sample.slice(0, 90)}`);
  }
}
process.exit(bad ? 1 : 0);
