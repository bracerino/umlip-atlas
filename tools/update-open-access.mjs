// Records a free-to-read journal version for each DOI in dist/papers.json, using OpenAlex.
//   node tools/update-open-access.mjs
// Sets p.openAccess = {url, status} when the publisher version is open (gold, diamond, hybrid, bronze),
// or a repository copy when the paper has no arXiv ID; otherwise null. The site falls back to the arXiv PDF.
import {readFileSync, writeFileSync} from 'node:fs';

const file = new URL('../dist/papers.json', import.meta.url);
const db = JSON.parse(readFileSync(file, 'utf8'));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function work(doi) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://api.openalex.org/works/doi:${encodeURIComponent(doi)}?select=open_access,primary_location,best_oa_location`);
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    await sleep(3000 * (attempt + 1));
  }
  throw new Error(`OpenAlex request failed for ${doi}`);
}

let open = 0;
for (const p of db.papers) {
  if (!p.doi) { p.openAccess = null; continue; }
  const w = await work(p.doi);
  const primary = w?.primary_location;
  const best = w?.best_oa_location;
  if (primary?.is_oa) p.openAccess = {url: primary.landing_page_url || `https://doi.org/${p.doi}`, status: w.open_access.oa_status};
  else if (!p.arxiv && best?.is_oa) p.openAccess = {url: best.landing_page_url || best.pdf_url, status: 'repository'};
  else p.openAccess = null;
  open += Boolean(p.openAccess);
  console.log(`  ${p.openAccess ? '✓' : '·'} ${p.id}: ${p.openAccess ? `${p.openAccess.status} ${p.openAccess.url}` : (p.arxiv ? 'arXiv only' : 'no free version found')}`);
  await sleep(150);
}

writeFileSync(file, JSON.stringify(db, null, 2) + '\n');
console.log(`${open} of ${db.papers.filter(p => p.doi).length} journal papers have a free-to-read version.`);
