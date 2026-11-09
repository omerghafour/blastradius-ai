/* BlastRadius AI V4 — evidence-led investigation reports.
 * Deterministic graph evidence is calculated locally; Gemini supplies commentary only.
 * Uses existing /analyze gateway endpoint, no Worker deployment required.
 */
'use strict';
(function(){
 const byId=id=>document.getElementById(id);
 const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const integer=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(n);
 const euro=n=>'€'+integer(n);
 const formatDate=iso=>new Date(iso).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});
 const limit=(s,n=6000)=>String(s??'').trim().slice(0,n);
 let report=null,busy=false;
 function evidence(){
   if(!activeId)return null;
   const origin=findNode(activeId),result=analyze(activeId);
   const affected=model.nodes.filter(n=>result.reached.has(n.id));
   const services=result.services.slice().sort((a,b)=>b.exposure-a.exposure);
   return {
     dataset:model.name,origin:{id:origin.id,label:origin.label},
     createdAt:new Date().toISOString(),
     metrics:{systems:result.reached.size,services:services.length,users:result.users,exposure:result.exposure},
     affected:affected.map((n,i)=>({ref:'SYS-'+String(i+1).padStart(3,'0'),id:n.id,label:n.label,type:n.type,description:n.description||'',users:n.type==='business'?n.users:0,exposure:n.type==='business'?n.exposure:0,path:result.paths.get(n.id).map(id=>findNode(id).label)})),
     services:services.map(n=>n.id)
   };
 }
 function keyOf(e){return e?JSON.stringify({dataset:e.dataset,origin:e.origin,metrics:e.metrics,affected:e.affected}):''}
 function ensureCurrent(){if(report&&keyOf(evidence())!==report.key){report=null;render();}}
 function hasConsent(){return byId('ai-consent').checked}
 function gateway(){const raw=byId('gateway-url').value.trim().replace(/\/+$/,'');if(!raw)throw Error('Enter your Cloudflare Worker URL in the AI assistant settings.');let url;try{url=new URL(raw)}catch{throw Error('Cloudflare gateway URL is invalid.')}if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('Use a plain HTTPS Cloudflare gateway URL.');return url.origin+(url.pathname==='/'?'':url.pathname)}
 function summary(e){return `A simulated failure of ${e.origin.label} can reach ${integer(e.metrics.systems)} system(s), including ${integer(e.metrics.services)} modeled business service(s). The affected business services account for ${integer(e.metrics.users)} illustrative user entries and ${euro(e.metrics.exposure)} per hour of assumed exposure. Reachability indicates possible impact, not verified downtime.`}
 function findings(e){const lookup=new Map(e.affected.map(n=>[n.id,n]));return e.services.map(id=>lookup.get(id)).filter(Boolean);}
 function priorities(e){return findings(e).slice(0,5).map((n,i)=>({order:i+1,name:n.label,ref:n.ref,reason:'Review priority based on supplied illustrative hourly exposure: '+euro(n.exposure)+'/h; verify actual business criticality and recovery dependencies.'}));}
 function fullText(e){return e.affected.map(n=>n.ref+' | '+n.label+' ('+n.type+') | '+n.path.join(' → ')).join('\n');}
 async function generateAI(e){
   if(!hasConsent())throw Error('Confirm data sharing in the AI assistant before generating an AI report.');
   const code=byId('gateway-passcode').value.trim();if(!code)throw Error('Enter your private demo access code in the AI assistant.');
   const question='Write an executive incident-analysis report narrative, with headings: Key insights, Investigation priorities, Uncertainties. Cite SYS-### evidence IDs and paths from context; avoid invented facts; label all estimates illustrative.';
   const r=await fetch(gateway()+'/analyze',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-Access':code},body:JSON.stringify({question,context:{dataset:e.dataset,origin:e.origin,metrics:{affectedSystems:e.metrics.systems,businessServices:e.metrics.services,usersInScope:e.metrics.users,illustrativeExposurePerHourEUR:e.metrics.exposure},affected:e.affected.map(n=>({id:n.id,label:n.label,type:n.type,description:n.description,users:n.users,exposureEURPerHour:n.exposure,path:n.path,ref:n.ref})),dependencies:model.edges.filter(edge=>e.affected.some(n=>n.id===edge.from)&&e.affected.some(n=>n.id===edge.to))})});
   let obj={};try{obj=await r.json()}catch{throw Error('Gateway returned invalid JSON.')}
   if(!r.ok)throw Error(obj.error||'Gateway request failed ('+r.status+').');
   if(typeof obj.answer!=='string'||!obj.answer.trim())throw Error('Gemini returned an empty answer.');
   return limit(obj.answer,6000);
 }
 function reportObject(e,ai,mode,error){return {e,key:keyOf(e),ai,mode,error:error||'',summary:summary(e),findings:findings(e),priorities:priorities(e)};}
 function render(){
   const status=byId('report-status'),content=byId('report-preview');
   if(!report){status.textContent=activeId?'READY FOR REPORT':'RUN A SIMULATION';content.innerHTML='<div class="report-empty">Select a failure origin and run a simulation to prepare an evidence-led investigation report.</div>';byId('report-download').disabled=true;byId('report-print').disabled=true;return}
   const {e}=report;
   status.textContent=report.mode==='ai'?'AI-ASSISTED':'EVIDENCE-ONLY';
   byId('report-download').disabled=false;byId('report-print').disabled=false;
   content.innerHTML=`
     <div class="report-kicker">INVESTIGATION BRIEF · ${html(report.mode==='ai'?'GEMINI-ASSISTED':'LOCAL EVIDENCE')}</div>
     <div class="report-head"><div><h3>${html(e.origin.label)} — impact assessment</h3><p>${html(e.dataset)} · ${html(formatDate(e.createdAt))}</p></div><span class="report-status-tag">SIMULATED</span></div>
     <div class="report-stats">
       <div><small>Systems in scope</small><b>${integer(e.metrics.systems)}</b></div>
       <div><small>Business services</small><b>${integer(e.metrics.services)}</b></div>
       <div><small>Illustrative users</small><b>${integer(e.metrics.users)}</b></div>
       <div><small>Exposure / hour</small><b>${euro(e.metrics.exposure)}</b></div>
     </div>
     <div class="report-section"><h4>01 / Executive summary</h4><p>${html(report.summary)}</p></div>
     ${report.ai?`<div class="report-section"><h4>02 / AI investigation commentary</h4><div class="report-ai-text">${html(report.ai)}</div><p class="report-caveat">AI narrative is interpretive and may contain mistakes; validate claims against the evidence register below.</p></div>`:''}
     <div class="report-section"><h4>${report.ai?'03':'02'} / Evidence-backed findings</h4><div class="report-evidence-list">${report.findings.map(n=>`<article><div class="report-finding-head"><strong>${html(n.label)}</strong><span>${html(n.ref)}</span></div><div class="report-path">${html(n.path.join(' → '))}</div><small>${integer(n.users)} illustrative users · ${euro(n.exposure)}/h assumed exposure</small></article>`).join('')||'<p>No downstream business services are modeled.</p>'}</div></div>
     <div class="report-section"><h4>${report.ai?'04':'03'} / Investigation priorities</h4><ol class="report-priorities">${report.priorities.map(p=>`<li><strong>${html(p.name)} [${html(p.ref)}]</strong><span>${html(p.reason)}</span></li>`).join('')||'<li>Validate origin and downstream technical dependencies.</li>'}</ol></div>
     <div class="report-section"><h4>Method, assumptions and scope</h4><p>Dependency graph traversal determines possible downstream impact from the selected failure origin. One shortest path is shown for each affected node. Business values and user counts are supplied assumptions, may overlap and are not measured losses. No redundancy, failover, recovery timings, probability or confirmed outages are modeled. Data is not live monitoring.</p></div>
     ${report.error?`<p class="report-warning">AI request failed; deterministic report shown instead: ${html(report.error)}</p>`:''}
   `;
 }
 function pageHTML(r){
   const e=r.e;
   const rows=e.affected.map(n=>`<tr><td>${html(n.ref)}</td><td>${html(n.label)}</td><td>${html(n.type)}</td><td>${html(n.path.join(' → '))}</td><td>${n.type==='business'?integer(n.users):'—'}</td><td>${n.type==='business'?euro(n.exposure):'—'}</td></tr>`).join('');
   return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BlastRadius AI — Investigation Report</title><style>
   :root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f2f5f9;color:#15243b;font:14px/1.65 system-ui,-apple-system,Segoe UI,sans-serif}.sheet{max-width:1040px;margin:32px auto;padding:48px;background:#fff;box-shadow:0 14px 50px #17263b14}.top{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #193956;padding-bottom:16px}.brand{letter-spacing:.13em;font-weight:800;color:#17436e}.mark{font-size:12px;color:#65778c}.eyebrow{letter-spacing:.16em;font-size:10px;font-weight:800;color:#2375ab;margin-top:28px}h1{font-size:30px;line-height:1.25;letter-spacing:-.035em;margin:10px 0}h2{font-size:16px;border-bottom:1px solid #dbe4ee;padding-bottom:7px;margin-top:29px}p{color:#43556a}.muted,.meta{font-size:12px;color:#698097}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:25px 0}.stat{background:#edf4f9;border-radius:7px;padding:13px}.stat small{display:block;font-size:10px;color:#4d667d}.stat strong{font-size:23px}.ai{background:#f2f7fc;border-left:3px solid #357db2;padding:16px;white-space:pre-wrap;overflow-wrap:anywhere}.notice{background:#fff5e8;color:#78511f;padding:10px;font-size:12px}.priority{padding:8px 0;border-bottom:1px solid #e5edf3}.priority span{display:block;color:#546779;font-size:12px}.priority strong{display:block}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:11px}th,td{padding:9px;text-align:left;border-bottom:1px solid #dae4ee;vertical-align:top;overflow-wrap:anywhere}th{background:#eef3f8;color:#3c5169}td:nth-child(4){min-width:190px}.foot{border-top:1px solid #dae4ee;padding-top:17px;margin-top:30px;font-size:11px;color:#607487}.toolbar{text-align:right;margin:18px auto;max-width:1040px}.toolbar button{background:#194b77;border:0;border-radius:6px;color:#fff;padding:11px 18px;cursor:pointer}@media(max-width:650px){.sheet{margin:0;padding:20px}.stats{grid-template-columns:repeat(2,1fr)}h1{font-size:24px}}@media print{body{background:#fff}.sheet{box-shadow:none;margin:0;max-width:none;padding:8mm}.toolbar{display:none}h2, .stat, .priority{break-inside:avoid}tr{break-inside:avoid}@page{size:A4;margin:12mm}}
   </style></head><body><div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div><main class="sheet"><div class="top"><span class="brand">◈ BLASTRADIUS AI</span><span class="mark">INVESTIGATION REPORT / V4</span></div><div class="eyebrow">OPERATIONAL INTELLIGENCE · SIMULATION ONLY</div><h1>${html(e.origin.label)}<br>Impact Investigation</h1><div class="meta">${html(e.dataset)} · ${html(formatDate(e.createdAt))} · ${html(r.mode==='ai'?'AI-assisted narrative':'Deterministic evidence-only')}</div><div class="stats"><div class="stat"><small>Systems in scope</small><strong>${integer(e.metrics.systems)}</strong></div><div class="stat"><small>Business services</small><strong>${integer(e.metrics.services)}</strong></div><div class="stat"><small>Users (illustrative)</small><strong>${integer(e.metrics.users)}</strong></div><div class="stat"><small>Exposure / hour</small><strong>${euro(e.metrics.exposure)}</strong></div></div><h2>01 · Executive summary</h2><p>${html(r.summary)}</p>${r.ai?`<h2>02 · AI-generated analysis</h2><div class="ai">${html(r.ai)}</div><p class="muted">AI text is interpretive. Confirm every claim against evidence IDs and paths below.</p>`:''}<h2>${r.ai?'03':'02'} · Investigation priorities</h2>${r.priorities.map(p=>`<div class="priority"><strong>${p.order}. ${html(p.name)} [${html(p.ref)}]</strong><span>${html(p.reason)}</span></div>`).join('')||'<p>No business-service priorities identified.</p>'}<h2>${r.ai?'04':'03'} · Evidence register</h2><div class="table-wrap"><table><thead><tr><th>Evidence ID</th><th>System</th><th>Type</th><th>Shortest dependency path</th><th>Users</th><th>€/hour</th></tr></thead><tbody>${rows}</tbody></table></div><h2>Scope & limitations</h2><p>Simulation only. Directed edge A → B means B depends on A. A breadth-first traversal identifies nodes reachable from the failure origin, with one shortest path per node. Reachability is not confirmation of downtime; redundancies, failover, partial degradation, durations and true recovery precedence are not modeled. User counts can overlap. Exposure values are illustrative inputs, not predictions or actual financial losses. Imported models are not automatically verified.</p>${r.error?`<div class="notice">AI narrative unavailable: ${html(r.error)}. This deterministic evidence report remains valid for the supplied graph.</div>`:''}<div class="foot">BlastRadius AI · Portfolio demonstration · Evidence model generated locally; optional AI commentary provided by Gemini through a private gateway. Do not treat this report as operational incident evidence.</div></main></body></html>`;
 }
 function download(name,body){const url=URL.createObjectURL(new Blob([body],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
 function filename(r){return 'blastradius-investigation-'+r.e.origin.id.replace(/[^a-z0-9_-]/gi,'_')+'-'+r.e.createdAt.slice(0,10)+'.html'}
 function setStatus(s){byId('report-progress').textContent=s}
 async function run(useAI){
   if(busy)return;const e=evidence();if(!e){setStatus('Run a failure simulation first.');return;}
   busy=true;byId('report-local').disabled=true;byId('report-ai').disabled=true;report=reportObject(e,'','local');render();setStatus('Preparing evidence register…');
   if(useAI){try{setStatus('Requesting Gemini narrative based on modeled evidence…');const reply=await generateAI(e);if(keyOf(evidence())!==keyOf(e)){report=null;setStatus('Simulation changed; the earlier AI response was discarded. Generate a fresh report.');}else{report=reportObject(e,reply,'ai');setStatus('AI-assisted report generated. Review the narrative against the evidence register.')}}catch(err){if(keyOf(evidence())!==keyOf(e)){report=null;setStatus('Simulation changed. Generate a report for the new scenario.');}else{report=reportObject(e,'','local',err.message);setStatus('Gemini unavailable; evidence-only report is ready. '+err.message)}}}
   else setStatus('Evidence-only report ready. You can download or print it.');
   busy=false;byId('report-local').disabled=false;byId('report-ai').disabled=false;render();
 }
 function init(){
   byId('report-local').addEventListener('click',()=>run(false));
   byId('report-ai').addEventListener('click',()=>run(true));
   byId('report-download').addEventListener('click',()=>{ensureCurrent();if(report)download(filename(report),pageHTML(report))});
   byId('report-print').addEventListener('click',()=>{ensureCurrent();if(!report)return;const w=window.open('','_blank');if(!w){setStatus('Pop-up blocked. Download the HTML report instead.');return;}w.document.open();w.document.write(pageHTML(report));w.document.close();w.focus();setTimeout(()=>w.print(),400)});
   ['simulate','clear-simulation','reset-data'].forEach(id=>byId(id).addEventListener('click',()=>{if(!busy){report=null;render();setStatus('Run a simulation, then generate a fresh report.')}}));
   byId('file-input').addEventListener('change',()=>{report=null;render();setStatus('Model import initiated; run a new simulation.')});
   render();
 }
 if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',init);
 if(typeof module!=='undefined')module.exports={summary,reportObject,findings,pageHTML,keyOf};
})();