// MedicAide demo: mock data kept in localStorage so patient and doctor pages share it.
const K='mp_state',U='mp_user',DOC={id:1,name:'Dr. Meera Iyer'};
const seed=()=>({doctors:[
 {id:1,name:'Dr. Meera Iyer',spec:'Cardiology',loc:'Adyar, Chennai',slots:['10:30','11:00','11:30','14:00']},
 {id:2,name:'Dr. Karan Shah',spec:'Dermatology',loc:'T. Nagar, Chennai',slots:['09:00','09:30','16:00']},
 {id:3,name:'Dr. Anita Rao',spec:'Pediatrics',loc:'Anna Nagar, Chennai',slots:['10:00','12:00','15:30']}],
 appts:[],records:[{id:1,patient:'Asha Rao',name:'Blood test.pdf',date:'28 Oct'}],visits:[]});
const get=k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}};
const put=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
let S=get(K)||seed();
const commit=()=>put(K,S);
const me=()=>get(U)||{role:'patient',name:'Asha Rao'};
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const iso=d=>new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const tomorrow=()=>{const d=new Date();d.setDate(d.getDate()+1);return iso(d)};
const fmt=d=>new Date(d+'T00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});
const byTime=(a,b)=>(a.date+a.time).localeCompare(b.date+b.time);
let tt;const toast=m=>{let t=$('.toast');if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.append(t)}
 t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),4000)};
const common=draw=>{
 $('#logout').onclick=()=>localStorage.removeItem(U);
 $('#reset').onclick=()=>{localStorage.removeItem(K);location.reload()};
 addEventListener('storage',e=>{if(e.key===K){S=get(K)||seed();draw()}}); // other tab changed data
};

function login(){
 $('form').addEventListener('submit',e=>{e.preventDefault();
  const doc=$('#r-doctor').checked,typed=$('.signup-only input').value.trim();
  put(U,{role:doc?'doctor':'patient',name:doc?DOC.name:(typed||'Asha Rao')});
  location.href=doc?'doctor.html':'patient.html'});
}

function patient(){
 const name=me().name;let move=null;
 $('#who').textContent='Hi, '+name;
 const dt=$('#date');dt.value=dt.min=tomorrow();
 const mine=()=>S.appts.filter(a=>a.patient===name).sort(byTime);
 function draw(){
  if(move&&!S.appts.some(a=>a.id===move))move=null;
  const m=S.appts.find(a=>a.id===move);
  $('#banner').innerHTML=m?`<div class="banner"><span>Pick a new time for your visit with ${esc(m.doctor)}.</span><button class="btn alt sm" data-stop>Keep original</button></div>`:'';
  const sp=$('#spec').value,lo=$('#loc').value.toLowerCase(),date=dt.value;
  const list=S.doctors.filter(d=>(sp==='Any'||d.spec===sp)&&d.loc.toLowerCase().includes(lo)&&(!m||d.id===m.doctorId));
  $('#docs').innerHTML=list.length?list.map(d=>`<article class="panel doc"><h3>${d.name}</h3><small>${d.spec} · ${d.loc}</small><div class="slots">${d.slots.map(t=>
   `<button class="slot" data-d="${d.id}" data-t="${t}" ${S.appts.some(a=>a.doctorId===d.id&&a.date===date&&a.time===t)?'disabled':''}>${t}</button>`).join('')}</div><small>Showing ${fmt(date)}</small></article>`).join('')
   :'<p class="empty">No doctors match. Try another specialty or location.</p>';
  $('#appt-body').innerHTML=mine().map(a=>`<tr><td>${esc(a.doctor)}</td><td>${fmt(a.date)}, ${a.time}</td><td class="row-actions"><button class="btn alt sm" data-move="${a.id}">Reschedule</button><button class="btn alt sm" data-cancel="${a.id}">Cancel</button></td></tr>`).join('')
   ||'<tr><td colspan="3" class="empty">No appointments yet. Pick a time above to book.</td></tr>';
  const vs=S.visits.filter(v=>v.patient===name).reverse();
  $('#visits').innerHTML=vs.map(v=>`<article class="panel rx"><h3>${esc(v.doctor)}</h3><small>${fmt(v.date)}</small><p><strong>Diagnosis:</strong> ${esc(v.dx)}</p><ul><li><span>${esc(v.med)}<br><small>${esc(v.note||'')}</small></span><span class="tag warn">Daily at ${v.time}</span></li></ul><button class="btn alt sm" data-test="${esc(v.med)}">Test reminder</button></article>`).join('')
   ||'<p class="empty">Your diagnosis and prescription will show here after a visit.</p>';
  $('#rec-body').innerHTML=S.records.filter(r=>r.patient===name).map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.date)}</td></tr>`).join('')||'<tr><td colspan="2" class="empty">No documents yet.</td></tr>';
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;const D=b.dataset;
  if(D.t){const doc=S.doctors.find(x=>x.id==D.d),date=dt.value;
   if(move){const a=S.appts.find(x=>x.id===move);Object.assign(a,{date,time:D.t});move=null;toast('Rescheduled to '+fmt(date)+', '+D.t)}
   else{S.appts.push({id:Date.now(),doctorId:doc.id,doctor:doc.name,patient:name,date,time:D.t});toast('Booked with '+doc.name+' on '+fmt(date)+', '+D.t)}
   commit();draw()}
  else if(D.move){move=+D.move;draw();$('#find').scrollIntoView()}
  else if(D.cancel){S.appts=S.appts.filter(a=>a.id!=D.cancel);commit();draw();toast('Appointment cancelled')}
  else if('stop' in D){move=null;draw()}
  else if(D.test)toast('Time to take '+D.test);
 });
 ['spec','loc','date'].forEach(i=>$('#'+i).addEventListener('input',draw));
 $('#file').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;
  S.records.push({id:Date.now(),patient:name,name:f.name,date:new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short'})});
  commit();draw();toast('Saved '+f.name);e.target.value=''});
 // medicine reminders: check the clock every 15 seconds
 let last='';setInterval(()=>{const n=new Date().toTimeString().slice(0,5);if(n===last)return;last=n;
  S.visits.filter(v=>v.patient===name&&v.time===n).forEach(v=>toast('Time to take '+v.med))},15000);
 common(draw);draw();
}

function doctor(){
 const sel=()=>{const p=new Set(S.appts.filter(a=>a.doctorId===DOC.id).map(a=>a.patient));S.records.forEach(r=>p.add(r.patient));return[...p]};
 function fill(id){const s=$(id),cur=s.value;s.innerHTML=sel().map(p=>`<option>${esc(p)}</option>`).join('');if(cur)s.value=cur}
 function draw(){
  const rows=S.appts.filter(a=>a.doctorId===DOC.id).sort(byTime);
  $('#sched').innerHTML=rows.map(a=>`<tr><td>${fmt(a.date)}, ${a.time}</td><td>${esc(a.patient)}</td><td><button class="btn alt sm" data-p="${esc(a.patient)}">Add diagnosis</button></td></tr>`).join('')
   ||'<tr><td colspan="3" class="empty">No bookings yet. Book as a patient in another tab and it will appear here.</td></tr>';
  fill('#pt');fill('#hp');
  const p=$('#hp').value;
  const vs=S.visits.filter(v=>v.patient===p).reverse(),rs=S.records.filter(r=>r.patient===p);
  $('#hist').innerHTML=`<table><thead><tr><th>Date</th><th>Record</th><th>Source</th></tr></thead><tbody>`+
   vs.map(v=>`<tr><td>${fmt(v.date)}</td><td>${esc(v.dx)} (${esc(v.med)})</td><td>${esc(v.doctor)}</td></tr>`).join('')+
   rs.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.name)}</td><td>Uploaded by patient</td></tr>`).join('')+'</tbody></table>';
 }
 document.addEventListener('click',e=>{const b=e.target.closest('[data-p]');if(b){$('#pt').value=b.dataset.p;$('#upload').scrollIntoView();$('#dx').focus()}});
 $('#hp').addEventListener('change',draw);
 $('#rxform').addEventListener('submit',e=>{e.preventDefault();
  S.visits.push({id:Date.now(),patient:$('#pt').value,doctor:DOC.name,date:iso(new Date()),dx:$('#dx').value,med:$('#med').value,note:$('#note').value,time:$('#mt').value});
  commit();e.target.reset();draw();toast('Sent to patient')});
 common(draw);draw();
}
({login,patient,doctor})[document.body.dataset.page]();
