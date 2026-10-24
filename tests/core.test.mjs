import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {papers}=JSON.parse(readFileSync(new URL('../dist/papers.json',import.meta.url)));
import {defaults,normalize,parseHash,stateHash,selectPapers,escapeHTML} from '../dist/core.js';
test('verified seed records have complete assessments, unique IDs and safe sources',()=>{
  assert.ok(papers.length>=8);assert.equal(new Set(papers.map(p=>p.id)).size,papers.length);
  for(const p of papers){for(const k of ['title','date','dateBasis','result','systems','source'])assert.ok(p[k],`${p.id}: ${k}`);assert.match(p.date,/^\d{4}-\d{2}-\d{2}$/);assert.equal(new URL(p.source).protocol,'https:');if(p.arxiv)assert.match(p.arxiv,/^\d{4}\.\d{4,5}$/);if(p.doi)assert.match(p.doi,/^10\.\d{4,}\//);assert.ok(p.models.length);assert.ok(p.areas.length);assert.equal(typeof p.read,'boolean',`${p.id}: read`);}
});
test('each model, type and area returns exactly the appropriate entries',()=>{
  for(const [key,field] of [['model','models'],['area','areas'],['type','type']]){
    const values=[...new Set(papers.flatMap(p=>p[field]))];
    for(const value of values){const expected=papers.filter(p=>Array.isArray(p[field])?p[field].includes(value):p[field]===value).map(p=>p.id).sort();assert.deepEqual(selectPapers(papers,{[key]:value}).map(p=>p.id).sort(),expected);}
  }
});
test('combined filters intersect model, date, type, area and query',()=>{
  assert.deepEqual(selectPapers(papers,{model:'MACE',type:'Benchmark',area:'Surfaces',from:'2025-01-01',to:'2025-12-31',q:'Deng softening'}).map(p=>p.id),['systematic-softening']);
  assert.equal(selectPapers(papers,{model:'MatterSim',area:'Catalysis'}).length,0);
  assert.equal(selectPapers(papers,{from:'2026-12-31',to:'2023-01-01'}).length,0);
});
test('date boundaries are inclusive and the 2026 preset selects the catalyst study',()=>{
  assert.deepEqual(selectPapers(papers,{from:'2026-01-01',to:'2026-12-31'}).map(p=>p.id).sort(),papers.filter(p=>p.date.startsWith('2026')).map(p=>p.id).sort());assert.ok(selectPapers(papers,{from:'2026-01-01',to:'2026-12-31'}).some(p=>p.id==='uma-catalysts'));
  assert.ok(selectPapers(papers,{from:'2025-01-10',to:'2025-01-10'}).every(p=>p.date==='2025-01-10'));assert.ok(selectPapers(papers,{from:'2025-01-10',to:'2025-01-10'}).some(p=>p.id==='systematic-softening'));
});
test('search handles spaces, case, punctuation and absent matches',()=>{
  assert.equal(selectPapers(papers,{q:'  uMa   CATALYSTS  '})[0].id,'uma-catalysts');
  assert.equal(selectPapers(papers,{q:'<script>no-such-paper'}).length,0);
});
test('starter view lists only starter papers in reading order',()=>{
  const ids=selectPapers(papers,{start:'1',sort:'path'}).map(p=>p.starter);
  assert.ok(ids.length>0&&ids.every(Boolean));assert.deepEqual(ids,[...ids].sort((a,b)=>a-b));
  assert.equal(normalize({start:'yes'}).start,'');
});
test('sort orders',()=>{
  assert.equal(selectPapers(papers,{}).at(0).date,papers.map(p=>p.date).sort().at(-1));
  assert.equal(selectPapers(papers,{sort:'oldest'}).at(0).date,papers.map(p=>p.date).sort()[0]);
  const cited=selectPapers(papers,{sort:'cited'}).map(p=>p.citations?.count??-1);assert.deepEqual(cited,[...cited].sort((a,b)=>b-a));
});
test('deep links preserve filter and paper navigation state',()=>{
  const state={...defaults,q:'surface & defect',model:'MACE',type:'Benchmark',area:'Surfaces',from:'2025-01-01',to:'2025-12-31',start:'1',sort:'path',paper:'systematic-softening'};
  assert.deepEqual(parseHash(stateHash(state)),state);assert.equal(stateHash(defaults),'');
  assert.deepEqual(parseHash('#collection'),defaults);
  assert.equal(normalize({sort:'bad',type:'bad',from:'not-a-date'}).sort,'newest');
  assert.equal(escapeHTML('<script>"&'), '&lt;script&gt;&quot;&amp;');
});
