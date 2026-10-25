import {defaults,parseHash,stateHash,selectPapers,escapeHTML as e} from './core.js';

const paths={
 book:'M12 6.5C10.3 5 7.7 4.5 4 4.5v14c3.7 0 6.3.5 8 2 1.7-1.5 4.3-2 8-2v-14c-3.7 0-6.3.5-8 2Zm0 0v14',
 library:'M4 3h13a2 2 0 0 1 2 2v15H6a2 2 0 0 1-2-2V3Zm0 13a2 2 0 0 1 2-2h13M8 6h7M8 9h5',
 gauge:'M12 14l4-4M3 16a9 9 0 1 1 18 0M3 16h3M18 16h3M12 7V5', quote:'M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6', layers:'m3 7 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 17l9 5 9-5',
 flask:'M9 3h6M10 3v7L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2l-6-9V3M7 15h10',
 info:'M12 16v-5M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z', lock:'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5V10Zm7 4v3',
 search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z', calendar:'M5 3v4M19 3v4M3 10h18M3 5h18v16H3V5Z',
 chevron:'m8 10 4 4 4-4', filter:'M3 5h18M6 12h12M9 19h6', close:'m6 6 12 12M18 6 6 18',
 link:'m10 14 4-4M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0',
 arrow:'M5 12h14m-5-5 5 5-5 5', back:'M19 12H5m5-5-5 5 5 5', external:'M14 3h7v7m0-7-11 11M10 3H3v18h18v-7',
 check:'m5 12 4 4L19 6', circle:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', cube:'m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10 9-5M12 12v10M12 12 3 7', spark:'m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z'
};
const icon=(name)=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.info}"/></svg>`;
document.querySelectorAll('[data-icon]').forEach(n=>n.outerHTML=icon(n.dataset.icon));
const $=(id)=>document.getElementById(id);
const {papers}=await fetch('./papers.json',{cache:'no-cache'}).then(r=>r.json());
const modelNames=[...new Set(papers.flatMap(p=>p.models))].sort();
const areaNames=[...new Set(papers.flatMap(p=>p.areas))].sort();
$('all-count').textContent=papers.length;$('starter-count').textContent=$('starter-nav-count').textContent=papers.filter(p=>p.starter).length;$('paper-total').textContent=papers.length;$('model-total').textContent=modelNames.length;
const typeLabel={Development:'Model development',Benchmark:'Benchmark',Application:'Application'};
document.querySelectorAll('[data-focus-count]').forEach(n=>n.textContent=papers.filter(p=>p.type===n.dataset.focusCount).length);
const sideList=(names,field,attr)=>names.map(x=>`<button class="area-item" ${attr}="${e(x)}">${e(x)}<span>${papers.filter(p=>p[field].includes(x)).length}</span></button>`).join('');
$('area-nav').innerHTML=sideList(areaNames,'areas','data-area');
$('model-nav').innerHTML=sideList(modelNames,'models','data-side-model');
const years=[...new Set(papers.map(p=>p.date.slice(0,4)))].sort().reverse();
$('year-nav').innerHTML=years.map(y=>`<button class="area-item" data-year="${y}">${y}<span>${papers.filter(p=>p.date.startsWith(y)).length}</span></button>`).join('');
let state=parseHash(location.hash), current=[], toastTimer, returnFocus=null;
const date=(d)=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(d+'T00:00:00Z'));
function notify(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2800);}
function setState(patch,replace=false){state={...state,...patch};const hash=stateHash(state);history[replace?'replaceState':'pushState'](null,'',location.pathname+location.search+hash);render();}
const cites=(p)=>p.citations?`<span class="cite-badge" title="Citations on Semantic Scholar, updated ${e(p.citations.updated)}">${icon('quote')}${p.citations.count.toLocaleString('en-GB')} citations</span>`:'';
function readMark(p){return `<span class="read-mark ${p.read?'is-read':''}" title="${p.read?'You have read this article':'Not read yet'}">${icon(p.read?'check':'circle')}${p.read?'Read':'Unread'}</span>`;}
function readLink(p){if(p.openAccess)return {url:p.openAccess.url,label:'Open access',title:'Free to read at the publisher'};if(p.arxiv)return {url:`https://arxiv.org/pdf/${p.arxiv}`,label:'arXiv PDF',title:'Free preprint PDF on arXiv'};return null;}
function tags(p,clickable=true){const tag=(cls,attr,x,label)=>clickable?`<button class="${cls}" ${attr}="${e(x)}" aria-label="Filter by ${label} ${e(x)}">${e(x)}</button>`:`<span class="${cls}">${e(x)}</span>`;return `<div class="tag-rows"><div class="tag-row"><span class="tag-label">Collection</span>${p.areas.map(a=>tag('area-tag','data-area',a,'collection')).join('')}</div><div class="tag-row"><span class="tag-label">Models</span>${p.models.map(m=>tag('model-tag','data-model',m,'model')).join('')}</div></div>`;}
function card(p){return `<article class="paper-card ${p.read?'is-read':''}" data-paper-id="${p.id}"><div class="card-top"><span class="category-label ${p.type.toLowerCase()}">${typeLabel[p.type]||e(p.type)}<small>/ ${e(p.focus)}</small></span>${state.start&&p.starter?`<span class="step-badge">Step ${p.starter}</span>`:''}${readMark(p)}</div><h3 class="article-title"><a data-open="${p.id}" href="${e(stateHash({...state,paper:p.id}))}">${e(p.title)}</a></h3><p class="takeaway">${e(p.shortTitle)}</p><p class="authors">${e(p.authors)}</p><div class="paper-meta"><span class="year-badge">${p.date.slice(0,4)}</span><span class="venue">${e(p.venue)}</span>${p.publisher?`<span class="publisher">${e(p.publisher)}</span>`:''}<span class="dot"></span><time class="card-date" datetime="${p.date}" title="${e(p.dateBasis)}">${p.dateBasis.includes("posted")?"Posted ":"Published "}${date(p.date)}</time>${cites(p)}</div>${tags(p)}<p class="main-result">${e(p.result)}</p><div class="card-actions"><div class="card-links">${(r=>r?`<a class="read-link" href="${e(r.url)}" target="_blank" rel="noopener noreferrer" title="${r.title}" aria-label="Read full text (${r.label}): ${e(p.title)}">${icon('book')}Read · ${r.label}</a>`:'')(readLink(p))}<a class="source-link" href="${e(p.source)}" target="_blank" rel="noopener noreferrer" aria-label="Open original source: ${e(p.title)}">Source ${icon('external')}</a><a class="read-notes" data-open="${p.id}" href="${e(stateHash({...state,paper:p.id}))}">Details ${icon('arrow')}</a></div></div></article>`;}
function render(){
  current=selectPapers(papers,state);
  for(const key of ['q','from','to','sort']){const input=$(key==='q'?'search':key);if(input.value!==state[key])input.value=state[key];}
  $('heading-count').textContent=String(current.length).padStart(2,'0');
  const unfiltered=!state.model&&!state.type&&!state.area&&!state.start;
  $('collection-title').firstChild.textContent=(state.start&&!state.area&&!state.model?'Start here':state.area||state.model?[state.area,state.model].filter(Boolean).join(' · '):'The collection')+' ';
  document.querySelectorAll('[data-start]').forEach(n=>n.classList.toggle('active',Boolean(state.start)));
  document.querySelectorAll('[data-nav]').forEach(n=>{n.classList.toggle('active',unfiltered);n.setAttribute('aria-current',unfiltered?'page':'false');});
  document.querySelectorAll('[data-focus]').forEach(n=>{n.classList.toggle('active',n.dataset.focus===state.type);n.setAttribute('aria-pressed',String(n.dataset.focus===state.type));});
  document.querySelectorAll('[data-area]').forEach(n=>{n.classList.toggle('active',n.dataset.area===state.area);n.setAttribute('aria-pressed',String(n.dataset.area===state.area));});
  document.querySelectorAll('[data-side-model]').forEach(n=>{n.classList.toggle('active',n.dataset.sideModel===state.model);n.setAttribute('aria-pressed',String(n.dataset.sideModel===state.model));});
  $('result-count').innerHTML=`Showing <strong>${current.length}</strong> of <strong>${papers.length}</strong> papers`;
  const chips=['start','q','model','type','area','from','to'].filter(k=>state[k]);
  $('active-filters').innerHTML=chips.map(k=>`<button class="filter-chip" data-remove="${k}" aria-label="Remove ${k} filter: ${e(state[k])}">${k==='start'?'Start here':(k==='from'?'From ':k==='to'?'Through ':k==='q'?'Search: ':'')+e(state[k])}${icon('close')}</button>`).join('');
  $('reset').hidden=!chips.length;
  const readTotal=current.filter(p=>p.read).length;$('read-count').innerHTML=`${icon('check')}${readTotal} of ${current.length} read`;
  if(state.area)$('area-group').open=true;if(state.model)$('model-group').open=true;if(state.from||state.to)$('year-group').open=true;
  $('date-error').hidden=!(state.from&&state.to&&state.from>state.to);
  document.querySelectorAll('[data-year]').forEach(n=>{const on=state.from===n.dataset.year+'-01-01'&&state.to===n.dataset.year+'-12-31';n.classList.toggle('active',on);n.setAttribute('aria-pressed',String(on));});
  $('papers').innerHTML=current.length?current.map(card).join(''):`<div class="empty-state">${icon('search')}<h3>No papers match this view</h3><p>Try a broader date range, remove a filter, or search for a different topic.</p><button class="outline-button" style="margin:auto" data-empty-reset>Clear filters</button></div>`;
  renderDialog();
}
function renderDialog(){
  const p=papers.find(p=>p.id===state.paper),dialog=$('paper-dialog');
  if(!p){if(dialog.open)dialog.close();return;}
  const index=current.findIndex(x=>x.id===p.id);
  $('paper-detail').innerHTML=`<div class="detail-toolbar"><span class="category-label ${p.type.toLowerCase()}">${typeLabel[p.type]||e(p.type)} <small>/ ${e(p.focus)}</small></span>${readMark(p)}</div><h2 id="paper-title" tabindex="-1">${e(p.title)}</h2><p class="takeaway detail-takeaway">${e(p.shortTitle)}</p><div class="detail-meta">${e(p.authors)}<div class="paper-meta detail-venue"><span class="year-badge">${p.date.slice(0,4)}</span><span class="venue">${e(p.venue)}</span>${p.publisher?`<span class="publisher">${e(p.publisher)}</span>`:''}${p.citations?`<a class="cite-badge" href="${e(p.citations.url)}" target="_blank" rel="noopener noreferrer" title="Updated ${e(p.citations.updated)}">${icon('quote')}${p.citations.count.toLocaleString('en-GB')} citations · Semantic Scholar ${icon('external')}</a>`:''}</div><strong>${date(p.date)}</strong> · ${e(p.dateBasis)} · ${e(p.status)}</div>${tags(p,false)}<p class="detail-models"><strong>Models / versions:</strong> ${e(p.versions)}</p><div class="detail-sections"><section class="detail-section"><h3>Main result</h3><p>${e(p.result)}</p></section><section class="detail-section"><h3>Materials /<br>systems</h3><p>${e(p.systems)}</p></section></div><div class="detail-bottom">${(r=>r?`<a class="read-button" href="${e(r.url)}" target="_blank" rel="noopener noreferrer" title="${r.title}">${icon('book')}Read full text · ${r.label}</a>`:'')(readLink(p))}<a class="primary-button" href="${e(p.source)}" target="_blank" rel="noopener noreferrer">Open original source ${icon('external')}</a>${p.alternate?`<a class="outline-button" href="${e(p.alternate)}" target="_blank" rel="noopener noreferrer">${e(p.alternateLabel)} ${icon('external')}</a>`:''}<button class="text-button" id="copy-paper">${icon('link')}Copy paper link</button></div><div class="detail-navigation"><button data-step="-1" ${index<=0?'disabled':''}>${icon('back')} Previous</button><span>${index<0?'Outside the current filters':`${index+1} of ${current.length} in this view`}</span><button data-step="1" ${index<0||index>=current.length-1?'disabled':''}>Next ${icon('arrow')}</button></div>`;
  if(!dialog.open){returnFocus=document.activeElement;dialog.showModal();}
}
function openPaper(id){setState({paper:id});$('paper-dialog').scrollTop=0;$('paper-title')?.focus();}
function closePaper(){setState({paper:''});if(returnFocus?.isConnected)returnFocus.focus();else $('search').focus();}
async function copyLink(paper=state.paper){const link=location.origin+location.pathname+location.search+stateHash({...state,paper});try{await navigator.clipboard.writeText(link);notify('Link copied — filters are included.');}catch{notify('Copy the current page address to share this view.');}}
document.querySelector('.skip-link').addEventListener('click',ev=>{ev.preventDefault();$('collection').focus();$('collection').scrollIntoView();});
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-open],[data-start],[data-nav],[data-focus],[data-area],[data-side-model],[data-model],[data-remove],[data-year],[data-step],[data-empty-reset]');if(!b)return;
  if(b.hasAttribute('data-open')){ev.preventDefault();openPaper(b.dataset.open);return;}
  if(b.hasAttribute('data-start')){setState(state.start?{start:'',sort:state.sort==='path'?'newest':state.sort,paper:''}:{start:'1',sort:'path',paper:''});$('collection').scrollIntoView({behavior:'smooth'});return;}
  if(b.hasAttribute('data-nav')){setState({...defaults,sort:state.sort==='path'?'newest':state.sort});$('collection').scrollIntoView({behavior:'smooth'});return;}
  if(b.hasAttribute('data-focus')){setState({type:state.type===b.dataset.focus?'':b.dataset.focus,paper:''});$('collection').scrollIntoView({behavior:'smooth'});return;}
  if(b.hasAttribute('data-area')){setState({area:state.area===b.dataset.area?'':b.dataset.area,paper:''});$('collection').scrollIntoView({behavior:'smooth'});return;}
  if(b.hasAttribute('data-side-model')){setState({model:state.model===b.dataset.sideModel?'':b.dataset.sideModel,paper:''});$('collection').scrollIntoView({behavior:'smooth'});return;}
  if(b.hasAttribute('data-model')){setState({model:b.dataset.model,paper:''});return;}
  if(b.hasAttribute('data-remove')){setState({[b.dataset.remove]:'',...(b.dataset.remove==='start'&&state.sort==='path'?{sort:'newest'}:{})});return;}
  if(b.hasAttribute('data-year')){const year=b.dataset.year;const on=state.from===year+'-01-01'&&state.to===year+'-12-31';setState(on?{from:'',to:'',paper:''}:{from:year+'-01-01',to:year+'-12-31',paper:''});$('collection').scrollIntoView({behavior:'smooth'});return;}
  if(b.hasAttribute('data-step')){const index=current.findIndex(p=>p.id===state.paper),next=current[index+Number(b.dataset.step)];if(next)openPaper(next.id);return;}
  if(b.hasAttribute('data-empty-reset')){setState({...defaults});}
});
$('search').addEventListener('input',ev=>setState({q:ev.target.value,paper:''},true));
for(const key of ['from','to','sort'])$(key).addEventListener('change',ev=>setState({[key]:ev.target.value,paper:''}));
$('reset').addEventListener('click',()=>setState({...defaults}));
$('close-paper').addEventListener('click',closePaper);
$('paper-dialog').addEventListener('cancel',ev=>{ev.preventDefault();closePaper();});
$('paper-dialog').addEventListener('click',ev=>{if(ev.target.closest('#copy-paper'))copyLink();else if(ev.target===$('paper-dialog')){const r=ev.target.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)closePaper();}});
for(const event of ['popstate','hashchange'])window.addEventListener(event,()=>{state=parseHash(location.hash);render();});
document.addEventListener('keydown',ev=>{if(ev.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){ev.preventDefault();$('search').focus();}});
render();
