// Checks every record in dist/papers.json against arXiv and Crossref.
//   node tools/check-sources.mjs            report only
//   node tools/check-sources.mjs --update   also record latest arXiv version, arXiv-listed DOI and lastChecked
// Optional: CROSSREF_MAILTO=you@example.org to use Crossref's polite pool.
import {readFileSync, writeFileSync} from 'node:fs';

const file = new URL('../dist/papers.json', import.meta.url);
const db = JSON.parse(readFileSync(file, 'utf8'));
const update = process.argv.includes('--update');
const today = new Date().toISOString().slice(0, 10);
const mailto = process.env.CROSSREF_MAILTO;
const ua = `umlip-atlas-checker/1.0${mailto ? ` (mailto:${mailto})` : ''}`;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const decode = (s) => String(s ?? '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const norm = (s) => String(s).toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

function similarity(a, b) {
  const x = new Set(norm(a).split(' ')), y = new Set(norm(b).split(' '));
  const shared = [...x].filter(w => y.has(w)).length;
  return shared / Math.max(x.size, y.size);
}

async function get(url, as = 'json') {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {headers: {'User-Agent': ua}});
    if (res.ok) return as === 'json' ? res.json() : res.text();
    if (res.status === 404) return null;
    await sleep(3000 * (attempt + 1));
  }
  throw new Error(`Request failed: ${url}`);
}

// One batched arXiv API call for all records with an arXiv ID.
async function arxivInfo(ids) {
  if (!ids.length) return {};
  const xml = await get(`https://export.arxiv.org/api/query?id_list=${ids.join(',')}&max_results=${ids.length}`, 'text');
  const out = {};
  for (const entry of xml.split('<entry>').slice(1)) {
    const tag = (name) => entry.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1].trim();
    const m = tag('id')?.match(/abs\/([\d.]+)v(\d+)/);
    if (!m) continue;
    out[m[1]] = {title: decode(tag('title')).replace(/\s+/g, ' '), version: Number(m[2]), updated: tag('updated')?.slice(0, 10), doi: tag('arxiv:doi') || null, journalRef: tag('arxiv:journal_ref') || null};
  }
  return out;
}

async function crossrefWork(doi) {
  const data = await get(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  return data?.message ?? null;
}

async function crossrefSearch(title) {
  const q = new URLSearchParams({'query.bibliographic': title, rows: '5', filter: 'type:journal-article,type:proceedings-article', select: 'DOI,title,container-title,published,type'});
  const data = await get(`https://api.crossref.org/works?${q}`);
  return (data?.message?.items ?? [])
    .map(it => ({doi: it.DOI, title: it.title?.[0] ?? '', venue: decode(it['container-title']?.[0]), date: it.published?.['date-parts']?.[0]?.join('-'), score: similarity(title, it.title?.[0] ?? '')}))
    .filter(it => it.score >= 0.85 && !it.doi.toLowerCase().startsWith('10.48550/'))
    .sort((a, b) => b.score - a.score);
}

const arxiv = await arxivInfo(db.papers.map(p => p.arxiv).filter(Boolean));
let flagged = 0;

for (const p of db.papers) {
  const notes = [];
  const a = p.arxiv && arxiv[p.arxiv];
  if (p.arxiv && !a) notes.push(`! arXiv ${p.arxiv} not returned by the arXiv API`);
  if (a) {
    // Preprint titles often change on publication, so a mismatch only matters when there is no journal DOI.
    if (similarity(p.title, a.title) < 0.85) notes.push(`${p.doi ? '·' : '!'} arXiv title differs from record: "${a.title}"`);
    if (p.arxivVersion == null) notes.push(`· arXiv ${p.arxiv}: latest v${a.version} (${a.updated}); no version recorded yet`);
    else if (a.version > p.arxivVersion) notes.push(`! arXiv ${p.arxiv}: NEW VERSION v${a.version} (${a.updated}); recorded v${p.arxivVersion}`);
    else notes.push(`· arXiv ${p.arxiv}: v${a.version}, unchanged`);
    if (a.doi && a.doi.toLowerCase() !== (p.doi || '').toLowerCase()) notes.push(`! arXiv lists a journal DOI not in the record: ${a.doi}${a.journalRef ? ` (${a.journalRef})` : ''}`);
    else if (a.journalRef && !p.doi) notes.push(`! arXiv lists a journal reference: ${a.journalRef}`);
  }
  if (p.doi) {
    const w = await crossrefWork(p.doi);
    if (!w) notes.push(`! DOI ${p.doi} not found in Crossref`);
    else {
      const score = similarity(p.title, w.title?.[0] ?? '');
      if (score < 0.85) notes.push(`! DOI title differs from record: "${w.title?.[0]}"`);
      for (const u of w['updated-by'] ?? []) notes.push(`! Publisher notice (${u.type}): ${u.DOI}`);
      if (!notes.some(n => n.startsWith('!'))) notes.push(`· DOI ${p.doi}: ${decode(w['container-title']?.[0] ?? w.type)}`);
    }
    await sleep(300);
  } else {
    const hits = await crossrefSearch(p.title);
    if (hits.length) for (const h of hits.slice(0, 2)) notes.push(`! Possible published version (title match ${Math.round(h.score * 100)}%): ${h.doi} · ${h.venue} · ${h.date}`);
    else notes.push('· No published version found in Crossref');
    await sleep(300);
  }
  if (update && a) {
    p.arxivVersion = a.version;
    if (a.doi && !p.doi) p.doi = a.doi;
  }
  if (update) p.lastChecked = today;
  const bad = notes.some(n => n.startsWith('!'));
  flagged += bad;
  console.log(`${bad ? '⚑' : '✓'} ${p.id}\n  ${notes.join('\n  ')}`);
}

console.log(`\n${db.papers.length} records checked, ${flagged} need attention.`);
if (update) {
  db.snapshotDate = today;
  writeFileSync(file, JSON.stringify(db, null, 2) + '\n');
  console.log('papers.json updated (arXiv versions, arXiv-listed DOIs, lastChecked). Crossref title matches are reported only; review them before editing.');
}
