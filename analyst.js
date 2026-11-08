/* BlastRadius AI V3 — grounded offline analyst + opt-in secure gateway */
'use strict';
(function(){
const $=id=>document.getElementById(id);
const SHORT_MAX=6000;
let busy=false;
function sentence(s){return String(s||'').replace(/\s+/g,' ').trim()}
function fmt(n){return new Intl.NumberFormat('en-US').format(n)}
function euros(n){return '€'+fmt(n)}
function snapshot(){
 if(!activeId)return null;
 const r=analyze(activeId), affected=model.nodes.filter(n=>r.reached.has(n.id));
 return {dataset:model.name,origin:{id:activeId,label:findNode(activeId).label}, metrics:{affectedSystems:r.reached.size,businessServices:r.services.length,usersInScope:r.users,illustrativeExposurePerHourEUR:r.exposure}, affected:affected.map(n=>({id:n.id,label:n.label,type:n.type,description:n.description||'',users:n.type==='business'?n.users:0,exposureEURPerHour:n.type==='business'?n.exposure:0,path:r.paths.get(n.id).map(id=>findNode(id).label)})), dependencies:model.edges.filter(e=>r.reached.has(e.from)&&r.reached.has(e.to)).map(e=>({from:e.from,to:e.to}))};
}
function offlineAnswer(question,data){
 if(!data)return 'Run a failure simulation first so I can explain the affected systems and dependency paths.';
 const q=question.toLowerCase(), items=data.affected.filter(n=>n.type==='business');
 if(/assumption|limit|confidence|real|accur|reliab|risk score|probab|predict/.test(q))return 'This is a deterministic dependency simulation, not live incident detection. A → B means B depends on A. Reachability indicates potential impact, not confirmed downtime. User counts may overlap, and hourly exposure values are illustrative inputs rather than verified losses. Failover, partial degradation and time-to-recover are not modeled.';
 if(/priorit|triage|recover|first|critical|recommend/.test(q)){
 const ordered=[...items].sort((a,b)=>b.exposureEURPerHour-a.exposureEURPerHour);
 return ordered.length?'Suggested review order (based only on supplied hourly exposure, not an operational recovery recommendation):\n'+ordered.slice(0,6).map((n,i)=>`${i+1}. ${n.label} — ${euros(n.exposureEURPerHour)}/h illustrative exposure; path: ${n.path.join(' → ')}`).join('\n')+'\nValidate redundancy and recovery dependencies before acting.':'No modeled business-service impact. Inspect downstream infrastructure and verify dependencies.';
 }
 const terms=question.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>3&&!['what','which','does','from','this','that','with','affected','because','explain','system','service','fail','failure','about','impact'].includes(w));
 const ranked=data.affected.map(n=>({n,score:(q.includes(n.label.toLowerCase())?100:0)+terms.reduce((s,t)=>s+(n.label.toLowerCase().includes(t)?3:0),0)})).sort((a,b)=>b.score-a.score);
 if(/why|path|depend|connected|relationship|how/.test(q)&&ranked[0]?.score>0){const n=ranked[0].n;return `${n.label} is ${n.id===data.origin.id?'the selected failure origin':'reachable from '+data.origin.label} through this modeled dependency path:\n${n.path.join(' → ')}\nEach step means the next system depends on the previous system. This is a possible impact, not a confirmed outage.`}
 if(/single point|bottleneck|hidden|downstream/.test(q)){const rankedServices=items.map(n=>({n,depth:n.path.length})).sort((a,b)=>b.depth-a.depth);return `The selected failure origin reaches ${data.metrics.affectedSystems} modeled systems. Long dependency chains include:\n${rankedServices.slice(0,4).map(x=>x.n.path.join(' → ')).join('\n')}\nThis does not prove a true single point of failure: redundant paths and failover are not modeled.`}
 return `Simulated failure origin: ${data.origin.label}.\nPotentially affected systems: ${data.metrics.affectedSystems}.\nAffected business services: ${data.metrics.businessServices}.\nIllustrative user count in scope: ${fmt(data.metrics.usersInScope)} (may overlap).\nIllustrative exposure: ${euros(data.metrics.illustrativeExposurePerHourEUR)}/hour.\n\nBusiness-service evidence:\n${items.slice(0,8).map(n=>'• '+n.path.join(' → ')).join('\n')||'None modeled'}\n\nAsk why a specific service is affected or request triage priorities.`;
}
function bubble(role,text){const div=document.createElement('div');div.className='analyst-bubble '+role;div.textContent=text;$('analyst-transcript').append(div);$('analyst-transcript').scrollTop=$('analyst-transcript').scrollHeight;return div}
function setNote(message){$('analyst-note').textContent=message}
function selectedMode(){return document.querySelector('input[name="analyst-mode-select"]:checked').value}
function normalizeGateway(value){const input=sentence(value).replace(/\/+$/,'');if(!input)throw Error('Enter your deployed Cloudflare Worker URL.');const url=new URL(input);if(url.protocol!=='https:')throw Error('The gateway must use HTTPS.');if(url.username||url.password||url.search||url.hash)throw Error('Use a plain HTTPS gateway URL without credentials or query parameters.');return url.origin+(url.pathname==='/'?'':url.pathname)}
async function askGateway(q,data){const endpoint=normalizeGateway($('gateway-url').value);const passcode=$('gateway-passcode').value.trim();if(!passcode)throw Error('Enter your private demo access code.');if(!$('ai-consent').checked)throw Error('Please confirm permission to send this scenario to the AI provider.');
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),25000);
 try{const r=await fetch(endpoint+'/analyze',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-Access':passcode},body:JSON.stringify({question:q,context:data}),signal:controller.signal});let obj;try{obj=await r.json()}catch{throw Error('Gateway returned an invalid response.')}if(!r.ok)throw Error(obj.error||`Gateway error (${r.status}).`);if(typeof obj.answer!=='string'||!obj.answer.trim())throw Error('AI returned an empty answer.');return obj.answer.slice(0,SHORT_MAX)}finally{clearTimeout(timeout)}}
function resetConversation(text){$('analyst-transcript').replaceChildren();bubble('system',text||'Context updated. Ask a question about the current simulation.')}
async function submit(question){const q=sentence(question);if(!q||busy)return;if(q.length>500){setNote('Maximum question length: 500 characters.');return}bubble('user',q);$('analyst-question').value='';const data=snapshot();if(selectedMode()==='local'){bubble('system',offlineAnswer(q,data));setNote('Local mode · evidence from deterministic graph traversal; no external calls.');return}if(!data){bubble('system','Run a simulation before using the AI analyst.');return}busy=true;$('analyst-send').disabled=true;const pending=bubble('system','Analyzing evidence…');try{pending.textContent=await askGateway(q,data);setNote('AI response · review critically. Submitted graph context and question to your gateway.')}catch(e){pending.classList.add('error');pending.textContent=`AI gateway unavailable: ${e.message}\n\nLocal evidence:\n${offlineAnswer(q,data)}`;setNote('Fallback: local evidence engine. Your OpenAI API key must stay on the backend.')}finally{busy=false;$('analyst-send').disabled=false}}
function initAnalyst(){
 $('analyst-form').addEventListener('submit',e=>{e.preventDefault();submit($('analyst-question').value)});
 for(const btn of document.querySelectorAll('[data-question]'))btn.addEventListener('click',()=>submit(btn.dataset.question));
 for(const input of document.querySelectorAll('input[name="analyst-mode-select"]'))input.addEventListener('change',()=>{const ai=selectedMode()==='ai';$('analyst-mode').textContent=ai?'SECURE AI GATEWAY':'LOCAL ANALYST';setNote(ai?'AI mode: only use fictional or authorized data; private access code required.':'Local mode: graph evidence only; no data leaves your browser.')});
 ['simulate','clear-simulation','reset-data'].forEach(id=>$(id).addEventListener('click',()=>resetConversation('Simulation context changed. Ask a question about the current model.')));
 $('file-input').addEventListener('change',()=>resetConversation('A new model may be loading. Run a simulation to analyze its impact.'));
}
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',initAnalyst);
if(typeof module!=='undefined')module.exports={offlineAnswer,snapshot};
})();