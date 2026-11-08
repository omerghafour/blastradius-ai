/* BlastRadius AI v2 — dependency-free client-side prototype. */
'use strict';
const SAMPLE = {
 name:'Northstar Commerce (sample)',
 nodes:[
  {id:'network',label:'Core Network',type:'infrastructure',description:'Routing layer for shared enterprise connectivity.'},
  {id:'identity',label:'Identity Provider',type:'infrastructure',description:'Signs in employees and customers.'},
  {id:'database',label:'Customer Database',type:'data',description:'Provides customer and account records.'},
  {id:'gateway',label:'API Gateway',type:'infrastructure',description:'Routes inbound API requests.'},
  {id:'crm',label:'CRM Platform',type:'business',users:220,exposure:2800,description:'Sales and customer account workflows.'},
  {id:'portal',label:'Customer Portal',type:'business',users:640,exposure:5300,description:'Customer self-service and profile access.'},
  {id:'payments',label:'Payment Service',type:'business',users:390,exposure:11800,description:'Checkout and transaction processing.'},
  {id:'support',label:'Support Desk',type:'business',users:110,exposure:900,description:'Assisted customer support.'},
  {id:'reports',label:'Analytics Reports',type:'business',users:80,exposure:600,description:'Sales and customer reporting.'},
  {id:'monitor',label:'Monitoring Service',type:'application',description:'Observability and availability notifications.'},
  {id:'warehouse',label:'Data Warehouse',type:'data',description:'Historical analytics dataset.'},
  {id:'orders',label:'Order Management',type:'business',users:120,exposure:3500,description:'Order tracking and fulfillment.'}
 ],
 edges:[
  {from:'network',to:'identity'},{from:'network',to:'database'},{from:'network',to:'gateway'},{from:'network',to:'monitor'},
  {from:'identity',to:'crm'},{from:'identity',to:'portal'},{from:'identity',to:'support'},
  {from:'database',to:'crm'},{from:'database',to:'portal'},{from:'database',to:'warehouse'},{from:'database',to:'orders'},
  {from:'gateway',to:'portal'},{from:'gateway',to:'payments'},{from:'gateway',to:'orders'},
  {from:'crm',to:'support'},{from:'warehouse',to:'reports'},{from:'orders',to:'reports'}
 ]
};
const MAX_NODES=250, MAX_EDGES=1500, MAX_FILE_BYTES=3*1024*1024;
let model=clone(SAMPLE), selectedId='identity', activeId=null, inspectedId=null, zoom=1, graphLayout=null;
const el=id=>document.getElementById(id);
function clone(value){return JSON.parse(JSON.stringify(value))}
function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function number(x,field){if(x===undefined||x===null||x==='')return 0;const n=Number(x);if(!Number.isFinite(n)||n<0)throw Error(`${field} must be a non-negative number.`);return n}
function validate(raw){
 if(!raw||!Array.isArray(raw.nodes)||!Array.isArray(raw.edges))throw Error('Expected JSON with "nodes" and "edges" arrays.');
 if(!raw.nodes.length||raw.nodes.length>MAX_NODES)throw Error(`Model must contain 1–${MAX_NODES} nodes.`);
 if(raw.edges.length>MAX_EDGES)throw Error(`Maximum ${MAX_EDGES} dependency edges.`);
 const ids=new Set();const nodes=raw.nodes.map((n,i)=>{
  if(!n||typeof n!=='object')throw Error(`Invalid node at row ${i+1}.`);
  const id=String(n.id??'').trim(),label=String(n.label||n.name||id).trim();
  if(!id||!label||id.length>80||label.length>90)throw Error(`Invalid node ID or name at row ${i+1}.`);
  if(ids.has(id))throw Error(`Duplicate system ID: ${id}`);
  ids.add(id);
  const type=String(n.type||'application').trim().toLowerCase();
  if(!['infrastructure','data','application','business'].includes(type))throw Error(`Unknown type "${type}" for ${id}. Use infrastructure, data, application or business.`);
  return {id,label,type,description:String(n.description||'').slice(0,500),users:number(n.users,`users for ${id}`),exposure:number(n.exposure,`exposure for ${id}`)};
 });
 const pairSet=new Set();const edges=raw.edges.map((e,i)=>{
  const from=String(Array.isArray(e)?e[0]:e?.from??'').trim(),to=String(Array.isArray(e)?e[1]:e?.to??'').trim();
  if(!ids.has(from)||!ids.has(to))throw Error(`Edge ${i+1} references an unknown system (${from} → ${to}).`);
  if(from===to)throw Error(`Self-dependency not allowed: ${from}`);
  const key=JSON.stringify([from,to]);if(pairSet.has(key))throw Error(`Duplicate dependency: ${from} → ${to}`);pairSet.add(key);
  return {from,to};
 });
 return {name:String(raw.name||'Imported environment').slice(0,120),nodes,edges};
}
// CSV parser supports quoted commas, double quotation marks, and CR/LF in values.
function parseCSV(text){
 text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else if(!quoted&&field.trim()!==''){throw Error('Malformed CSV quote.')}else{quoted=!quoted}}
  else if(ch===','&&!quoted){row.push(field);field=''}
  else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field=''}
  else{field+=ch}
 }
 if(quoted)throw Error('Unclosed quoted field in CSV.');row.push(field);if(row.some(x=>x.trim()))rows.push(row);
 if(rows.length<2)throw Error('CSV needs a header and at least one row.');const headers=rows[0].map(x=>x.trim().toLowerCase());
 if(new Set(headers).size!==headers.length)throw Error('Duplicate CSV column names.');
 return rows.slice(1).map((r,i)=>{if(r.length!==headers.length)throw Error(`CSV row ${i+2} has ${r.length} columns; expected ${headers.length}.`);return Object.fromEntries(headers.map((h,j)=>[h,r[j].trim()]))});
}
function analyze(origin){
 const adjacency=new Map(model.nodes.map(n=>[n.id,[]]));
 for(const e of model.edges)adjacency.get(e.from).push(e.to);
 const reached=new Set([origin]),previous=new Map(),queue=[origin];
 for(let idx=0;idx<queue.length;idx++)for(const next of adjacency.get(queue[idx]))if(!reached.has(next)){reached.add(next);previous.set(next,queue[idx]);queue.push(next)}
 const paths=new Map();for(const id of reached){const path=[id];let x=id;while(previous.has(x)){x=previous.get(x);path.unshift(x)}paths.set(id,path)}
 const services=model.nodes.filter(n=>n.type==='business'&&reached.has(n.id));
 return {reached,previous,paths,services,users:services.reduce((s,n)=>s+n.users,0),exposure:services.reduce((s,n)=>s+n.exposure,0)};
}
const findNode=id=>model.nodes.find(n=>n.id===id);
const fmt=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(n);
const money=n=>'€'+fmt(n);
const pathText=path=>path.map(id=>findNode(id)?.label||id).join(' → ');
function note(message='',kind=''){const m=el('message');m.textContent=message;m.className='message '+kind}
function loadModel(data,message){model=validate(data);activeId=null;inspectedId=null;selectedId=model.nodes[0].id;zoom=1;populateOrigins();render();note(message,'success')}
function populateOrigins(){const control=el('source-select');control.replaceChildren();for(const n of model.nodes){const option=document.createElement('option');option.value=n.id;option.textContent=`${n.label} · ${n.type}`;control.append(option)}control.value=selectedId}
function render(){
 el('dataset-name').textContent=model.name;el('dataset-summary').textContent=`${model.nodes.length} systems · ${model.edges.length} directed links`;
 const result=activeId?analyze(activeId):null;
 el('metric-systems').textContent=result?fmt(result.reached.size):'—';el('metric-services').textContent=result?fmt(result.services.length):'—';el('metric-users').textContent=result?fmt(result.users):'—';el('metric-exposure').textContent=result?money(result.exposure):'—';
 el('graph-status').textContent=result?'IMPACT MAPPED':'READY';el('graph-count').textContent=`${model.nodes.length} systems · ${model.edges.length} dependencies`;el('export-report').disabled=!result;
 renderGraph(result);renderInvestigation(result);renderInspector(result);
}
function computeLayout(){
 // Breadth-first rank from roots; cyclic nodes still get positions.
 const ids=model.nodes.map(n=>n.id),incoming=new Map(ids.map(id=>[id,0])),outgoing=new Map(ids.map(id=>[id,[]]));
 for(const e of model.edges){incoming.set(e.to,incoming.get(e.to)+1);outgoing.get(e.from).push(e.to)}
 const roots=ids.filter(id=>!incoming.get(id));const levels=new Map();const queue=roots.length?roots:[ids[0]];
 for(const id of queue)levels.set(id,0);
 for(let i=0;i<queue.length;i++){const id=queue[i];for(const next of outgoing.get(id)){if(!levels.has(next)){levels.set(next,Math.min(levels.get(id)+1,7));queue.push(next)}}}
 for(const id of ids)if(!levels.has(id))levels.set(id,Math.max(...levels.values(),0)+1);
 // Longest useful path makes layered display more readable for a DAG.
 for(let iter=0;iter<Math.min(ids.length,20);iter++){let changed=false;for(const e of model.edges){if(levels.get(e.from)<7&&levels.get(e.to)<=levels.get(e.from)){const target=levels.get(e.from)+1;if(target>levels.get(e.to)){levels.set(e.to,target);changed=true}}}if(!changed)break}
 const columns=new Map();for(const n of model.nodes){const k=levels.get(n.id);if(!columns.has(k))columns.set(k,[]);columns.get(k).push(n.id)}
 const keys=[...columns.keys()].sort((a,b)=>a-b),maxCount=Math.max(...[...columns.values()].map(a=>a.length));const width=Math.max(840,keys.length*193+90),height=Math.max(390,maxCount*90+100);
 const positions=new Map();keys.forEach((level,idx)=>{const list=columns.get(level);list.forEach((id,row)=>{positions.set(id,{x:105+idx*(width-210)/Math.max(keys.length-1,1),y:(height/(list.length+1))*(row+1)})})});
 return {positions,width,height};
}
function svgEl(name,attrs={}){const element=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [k,v] of Object.entries(attrs))element.setAttribute(k,String(v));return element}
function renderGraph(result){
 const svg=el('graph');svg.replaceChildren();graphLayout=computeLayout();const {positions,width,height}=graphLayout;
 const cx=width/2,cy=height/2,viewW=width/zoom,viewH=height/zoom;svg.setAttribute('viewBox',`${cx-viewW/2} ${cy-viewH/2} ${viewW} ${viewH}`);
 const defs=svgEl('defs');for(const [key,color] of [['normal','#6885a6'],['alert','#ff7288']]){const marker=svgEl('marker',{id:`arrow-${key}`,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:5,markerHeight:5,orient:'auto-start-reverse'});marker.append(svgEl('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:color}));defs.append(marker)}svg.append(defs);
 for(const e of model.edges){const a=positions.get(e.from),b=positions.get(e.to);if(!a||!b)continue;const affected=!!result&&result.reached.has(e.from)&&result.reached.has(e.to);let x1=a.x,y1=a.y,x2=b.x,y2=b.y;const dx=x2-x1,dy=y2-y1,d=Math.hypot(dx,dy)||1;const cutoffA=dx>80?66:Math.abs(dx)<40?30:46,cutoffB=cutoffA;x1+=dx/d*cutoffA;y1+=dy/d*cutoffA;x2-=dx/d*cutoffB;y2-=dy/d*cutoffB;const line=svgEl('line',{x1,y1,x2,y2,class:`edge${affected?' affected':''}`,'marker-end':`url(#arrow-${affected?'alert':'normal'})`});const title=svgEl('title');title.textContent=`${findNode(e.to).label} depends on ${findNode(e.from).label}`;line.append(title);svg.append(line)}
 for(const n of model.nodes){const pos=positions.get(n.id),origin=!!result&&n.id===activeId,hit=!!result&&result.reached.has(n.id);const g=svgEl('g',{class:`node${origin?' origin':hit?' affected':''}${inspectedId===n.id?' selected':''}`,role:'button',tabindex:0,'aria-label':`Inspect ${n.label}`});g.dataset.id=n.id;g.append(svgEl('rect',{x:pos.x-67,y:pos.y-29,width:134,height:58,rx:10}));const label=svgEl('text',{x:pos.x,y:pos.y-3,class:'node-label'});label.textContent=n.label.length>19?n.label.slice(0,18)+'…':n.label;g.append(label);const subtitle=svgEl('text',{x:pos.x,y:pos.y+16,class:'node-kind'});subtitle.textContent=n.type.toUpperCase();g.append(subtitle);const title=svgEl('title');title.textContent=n.label;g.append(title);g.addEventListener('click',()=>{inspectedId=n.id;renderGraph(result);renderInspector(result)});g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();inspectedId=n.id;renderGraph(result);renderInspector(result)}});svg.append(g)}
}
function renderInvestigation(result){const target=el('investigation');if(!result){target.className='empty-state';target.textContent='Choose a failure origin and run the simulation to reveal exactly which dependencies propagate the impact.';return}target.className='';const origin=findNode(activeId);const items=result.services.map(n=>`<div class="impact-row"><strong>${escapeHTML(n.label)}</strong><span class="badge">Affected</span><p>${escapeHTML(pathText(result.paths.get(n.id)))}</p><small>Shortest verified dependency path · ${fmt(n.users)} illustrative users · ${money(n.exposure)}/h exposure</small></div>`).join('');target.innerHTML=`<div class="impact-summary"><strong>${escapeHTML(origin.label)}</strong> can reach <strong>${result.reached.size}</strong> systems and <strong>${result.services.length}</strong> business services through the modeled dependencies. These are potential cascading effects, not confirmed outage events.</div>${items||'<p class="muted">No business services are downstream of this node.</p>'}`}
function renderInspector(result){const target=el('inspector');if(!inspectedId){target.className='empty-state';target.textContent='Select any node in the graph to inspect its relationships, description, and failure path.';return}target.className='';const n=findNode(inspectedId);const upstream=model.edges.filter(e=>e.to===n.id).map(e=>findNode(e.from).label);const downstream=model.edges.filter(e=>e.from===n.id).map(e=>findNode(e.to).label);const state=!result?'Not simulated':n.id===activeId?'Failed origin':result.reached.has(n.id)?'Potentially affected':'Not reachable from failure origin';target.innerHTML=`<div class="inspector-title">${escapeHTML(n.label)} <span class="badge ${n.id===activeId&&result?'origin':'neutral'}">${escapeHTML(n.type)}</span></div><p class="inspector-desc">${escapeHTML(n.description||'No description supplied.')}</p><div class="key-val"><span>System ID</span><span>${escapeHTML(n.id)}</span></div><div class="key-val"><span>Status</span><span>${escapeHTML(state)}</span></div><div class="key-val"><span>Depends on</span><span>${escapeHTML(upstream.join(', ')||'No modeled dependencies')}</span></div><div class="key-val"><span>Required by</span><span>${escapeHTML(downstream.join(', ')||'No modeled dependents')}</span></div>${result&&result.reached.has(n.id)?`<div class="path-display"><strong>Evidence path</strong><br>${escapeHTML(pathText(result.paths.get(n.id)))}</div>`:''}`}
function download(name,body,type){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
function exportReport(){if(!activeId)return;const result=analyze(activeId),origin=findNode(activeId),date=new Date().toISOString();const affected=model.nodes.filter(n=>result.reached.has(n.id));const lines=affected.map(n=>`<tr><td>${escapeHTML(n.label)}</td><td>${escapeHTML(n.type)}</td><td>${escapeHTML(pathText(result.paths.get(n.id)))}</td><td>${n.type==='business'?fmt(n.users):'—'}</td><td>${n.type==='business'?money(n.exposure):'—'}</td></tr>`).join('');const report=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BlastRadius impact report</title><style>body{font:15px/1.55 system-ui,sans-serif;max-width:1100px;margin:40px auto;padding:0 24px;color:#162236}h1{margin-bottom:3px}p{color:#4c5b6c}table{border-collapse:collapse;width:100%;font-size:13px}th,td{border-bottom:1px solid #d9e2ed;text-align:left;padding:10px;vertical-align:top}th{background:#ebf1f8}.metrics{display:flex;gap:12px;flex-wrap:wrap;margin:22px 0}.stat{border:1px solid #d9e2ed;border-radius:8px;padding:15px;min-width:130px}.stat strong{display:block;font-size:25px}.foot{font-size:12px;margin-top:30px}button{padding:9px 15px;background:#174e82;color:white;border:0;border-radius:6px;cursor:pointer}@media print{button{display:none}}@media(max-width:650px){table{font-size:10px}td,th{padding:6px}}</style></head><body><button onclick="window.print()">Print / Save PDF</button><h1>BlastRadius AI — Impact Report</h1><p>Dataset: ${escapeHTML(model.name)} · Created: ${escapeHTML(date)} · Simulated origin: ${escapeHTML(origin.label)}</p><div class="metrics"><div class="stat">Affected systems<strong>${result.reached.size}</strong></div><div class="stat">Business services<strong>${result.services.length}</strong></div><div class="stat">Users in scope<strong>${fmt(result.users)}</strong></div><div class="stat">Exposure / hour<strong>${money(result.exposure)}</strong></div></div><h2>Dependency evidence</h2><table><thead><tr><th>System</th><th>Type</th><th>Shortest evidence path</th><th>Users</th><th>€/hour</th></tr></thead><tbody>${lines}</tbody></table><h2>Method & assumptions</h2><p>Directed edge A → B means B depends on A. A breadth-first graph traversal identifies all systems reachable from the simulated failure origin. The displayed path is one shortest dependency path; other valid paths may exist. This is a potential-impact scenario, not confirmation of an outage. Cycles are handled by a visited-node set. The "users in scope" metric sums user counts across affected business nodes and may double-count people. Exposure is the sum of illustrative hourly financial values supplied for affected business services; it is not a prediction or audited loss calculation. All sample data is fictional. Imported data is processed locally in the user's browser; this report contains the selected model's identifiers and descriptions.</p><p class="foot">BlastRadius AI V2 · Portfolio demonstration · No LLM/ML model involved</p></body></html>`;download(`blastradius-impact-${activeId.replace(/[^a-z0-9_-]/gi,'_')}.html`,report,'text/html;charset=utf-8')}
async function handleFiles(files){if(!files.length)return;try{if([...files].some(f=>f.size>MAX_FILE_BYTES))throw Error('Each import file must be 3 MB or smaller.');const jsonFiles=[...files].filter(f=>f.name.toLowerCase().endsWith('.json'));if(jsonFiles.length){if(files.length!==1)throw Error('Upload one JSON model at a time.');let parsed;try{parsed=JSON.parse(await jsonFiles[0].text())}catch{throw Error('Invalid JSON syntax.')}loadModel(parsed,'JSON model loaded. Your data stays in this browser.');return}
 const csvFiles=[...files].filter(f=>f.name.toLowerCase().endsWith('.csv'));if(csvFiles.length!==2||files.length!==2)throw Error('Select BOTH assets.csv and dependencies.csv in one upload.');const parsed=await Promise.all(csvFiles.map(async f=>({filename:f.name,rows:parseCSV(await f.text())})));const assets=parsed.find(p=>p.rows[0]&&'id'in p.rows[0]);const dependencies=parsed.find(p=>p.rows[0]&&'from'in p.rows[0]&&'to'in p.rows[0]);if(!assets||!dependencies||assets===dependencies)throw Error('CSV columns required: assets: id,label,type; dependencies: from,to.');loadModel({name:'Imported CSV environment',nodes:assets.rows,edges:dependencies.rows},'CSV asset and dependency files loaded locally.');
 }catch(err){note(err.message||'Import failed.','error')}finally{el('file-input').value=''}}
function init(){populateOrigins();render();el('file-input').addEventListener('change',e=>handleFiles(e.target.files));el('reset-data').addEventListener('click',()=>{loadModel(SAMPLE,'Fictional sample environment restored.');selectedId='identity';el('source-select').value=selectedId});el('source-select').addEventListener('change',e=>{selectedId=e.target.value});el('simulate').addEventListener('click',()=>{activeId=el('source-select').value;selectedId=activeId;inspectedId=activeId;render();note(`Simulation completed for ${findNode(activeId).label}.`,'success')});el('clear-simulation').addEventListener('click',()=>{activeId=null;inspectedId=null;render();note('Simulation cleared.','')});el('export-report').addEventListener('click',exportReport);el('node-search').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();if(!q)return;const node=model.nodes.find(n=>n.label.toLowerCase().includes(q)||n.id.toLowerCase().includes(q));if(node){selectedId=node.id;el('source-select').value=node.id;inspectedId=node.id;renderGraph(activeId?analyze(activeId):null);renderInspector(activeId?analyze(activeId):null)}});el('zoom-in').addEventListener('click',()=>{zoom=Math.min(2.2,Math.round((zoom+.2)*10)/10);renderGraph(activeId?analyze(activeId):null)});el('zoom-out').addEventListener('click',()=>{zoom=Math.max(.65,Math.round((zoom-.2)*10)/10);renderGraph(activeId?analyze(activeId):null)});el('zoom-reset').addEventListener('click',()=>{zoom=1;renderGraph(activeId?analyze(activeId):null)})}
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',init);
if(typeof module!=='undefined')module.exports={validate,parseCSV,analyze,SAMPLE};
