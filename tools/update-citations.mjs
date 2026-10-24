// Updates citation counts in dist/papers.json from Semantic Scholar (preprint and journal versions merged).
//   node tools/update-citations.mjs                     update now
//   node tools/update-citations.mjs --if-older-than 3   update only if the last update is at least 3 days old
// Optional: S2_API_KEY=... for a personal Semantic Scholar rate limit.
import {readFileSync, writeFileSync} from 'node:fs';

const file = new URL('../dist/papers.json', import.meta.url);
const db = JSON.parse(readFileSync(file, 'utf8'));
const args = process.argv.slice(2);
const minDays = args.includes('--if-older-than') ? Number(args[args.indexOf('--if-older-than') + 1]) : 0;
const now = new Date();
const stamp = now.toISOString().slice(0, 16).replace('T', ' ');

if (minDays && db.citationsUpdated) {
  const age = (now - new Date(db.citationsUpdated.replace(' ', 'T') + 'Z')) / 864e5;
  if (age < minDays) {
    console.log(`${stamp} Citations updated ${age.toFixed(1)} days ago; next update after ${minDays} days.`);
    process.exit(0);
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const headers = {'Content-Type': 'application/json', ...(process.env.S2_API_KEY ? {'x-api-key': process.env.S2_API_KEY} : {})};

async function batch(ids) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch('https://api.semanticscholar.org/graph/v1/paper/batch?fields=citationCount,title,url', {method: 'POST', headers, body: JSON.stringify({ids})});
    if (res.ok) return res.json();
    if (res.status !== 429 && res.status < 500) throw new Error(`Semantic Scholar: HTTP ${res.status}`);
    await sleep(5000 * (attempt + 1));
  }
  throw new Error('Semantic Scholar: rate limited, try again later');
}

// Ask for every DOI and arXiv ID in one request; prefer the DOI match, fall back to arXiv.
const lookups = db.papers.map(p => [p.doi && `DOI:${p.doi}`, p.arxiv && `ARXIV:${p.arxiv}`].filter(Boolean));
const results = await batch(lookups.flat());
let i = 0, missing = 0;
for (const [n, p] of db.papers.entries()) {
  const found = lookups[n].map(() => results[i++]).find(r => r && typeof r.citationCount === 'number');
  if (!found) { missing++; console.log(`  ? ${p.id}: not found in Semantic Scholar; previous count kept`); continue; }
  const before = p.citations?.count;
  p.citations = {count: found.citationCount, source: 'Semantic Scholar', url: found.url, updated: stamp.slice(0, 10)};
  console.log(`  ${p.id}: ${found.citationCount}${before != null && before !== found.citationCount ? ` (was ${before})` : ''}`);
}

db.citationsUpdated = stamp;
writeFileSync(file, JSON.stringify(db, null, 2) + '\n');
console.log(`${stamp} Updated citations for ${db.papers.length - missing} of ${db.papers.length} papers.`);
