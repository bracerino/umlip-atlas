export const defaults = Object.freeze({q:'',model:'',type:'',area:'',from:'',to:'',start:'',sort:'newest',paper:''});
export function normalize(input={}) {
  const state={...defaults};
  for(const k of Object.keys(state)) if(typeof input[k]==='string') state[k]=input[k];
  if(!['newest','oldest','cited','path'].includes(state.sort)) state.sort='newest';
  if(!['','Development','Benchmark','Application'].includes(state.type)) state.type='';
  if(state.start!=='1') state.start='';
  for(const k of ['from','to']) if(state[k]&&!/^\d{4}-\d{2}-\d{2}$/.test(state[k])) state[k]='';
  return state;
}
export function parseHash(hash) { return normalize(Object.fromEntries(new URLSearchParams(hash.replace(/^#/,'')))); }
export function stateHash(state) { const p=new URLSearchParams(); for(const [k,v] of Object.entries(normalize(state))) if(v!==defaults[k]) p.set(k,v); return p.size?'#'+p.toString():''; }
export function selectPapers(papers,state) {
  const s=normalize(state), terms=s.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return papers.filter(p=>{
    const searchable=[p.title,p.shortTitle,p.authors,p.result,p.systems,p.focus,...p.models,...p.areas].join(' ').toLowerCase();
    return (!s.model||p.models.includes(s.model))&&(!s.type||p.type===s.type)&&(!s.area||p.areas.includes(s.area))&&(!s.from||p.date>=s.from)&&(!s.to||p.date<=s.to)&&(!s.start||p.starter)&&terms.every(t=>searchable.includes(t));
  }).sort((a,b)=>s.sort==='path'?(a.starter??999)-(b.starter??999)||b.date.localeCompare(a.date):s.sort==='cited'?(b.citations?.count??-1)-(a.citations?.count??-1)||b.date.localeCompare(a.date):s.sort==='oldest'?a.date.localeCompare(b.date):b.date.localeCompare(a.date));
}
export function escapeHTML(s) { return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
