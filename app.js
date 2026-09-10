'use strict';
const T=Trackly,KEY='trackly-medical-v1';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cash=value=>T.money(value,T.currency(state)), fmtDate=s=>s?new Date(s+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—';
let state,storageError=false,storageIssue='',rawStored=null;
if(typeof FeatureKit==='undefined'){
try{rawStored=localStorage.getItem(KEY);}catch(e){state=T.showcase();storageError=true;storageIssue='unavailable';}
if(!state){
  if(rawStored===null){
    state=T.showcase();
    try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){storageIssue='write';}
  }else{
    try{state=T.validate(JSON.parse(rawStored));}catch(e){state=T.empty();storageError=true;storageIssue='invalid';}
  }
}
if(!storageError){
  const upgraded=T.upgradeSamples(state);
  if(upgraded!==state){
    try{const serialized=JSON.stringify(upgraded);localStorage.setItem(KEY,serialized);state=upgraded;rawStored=serialized;}
    catch(e){storageIssue='sample-update';}
  }
}

}else state=T.empty();

let page='dashboard',search='',filter='All',month=T.today().slice(0,7),installEvent=null,toastTimer;
const navItems=[['dashboard','overview','Overview'],['bills','bill','Medical Bills'],['claims','shield','Insurance Claims'],['eob','eob','EOB Tracker'],['coverage','coverage','Coverage'],['appeals','flag','Denials & Appeals'],['payments','payment','Payments'],['plans','plan','Payment Plans'],['hsa','wallet','HSA / FSA'],['calendar','calendar','Calendar'],['contacts','contacts','Contacts'],['reports','reports','Reports'],['settings','settings','Settings']];

const navigationGroups=[
 {id:'family',label:'Family & Planning',icon:'contacts',pages:['family','actions','calendar']},
 {id:'insurance',label:'Bills & Insurance',icon:'shield',pages:['bills','claims','eob','compare','coverage','appeals','timeline']},
 {id:'payments',label:'Payments',icon:'wallet',pages:['payments','plans','hsa']},
 {id:'resources',label:'Documents & Tools',icon:'eob',pages:['scanner','vault','contacts','reports','help']}
];
let openNavigationGroup='',lastNavigationPage='';
function navigationLink(key){
 const item=navItems.find(n=>n[0]===key);if(!item)return '';
 const [route,symbol,label]=item;
 return '<a href="#'+route+'" class="'+(page===route?'active':'')+'" '+(page===route?'aria-current="page"':'')+' title="'+label+'"><span class="nav-icon" aria-hidden="true">'+icon(symbol)+'</span><span class="nav-text">'+label+'</span>'+(route==='bills'?'<span class="nav-count">'+state.bills.length+'</span>':'')+'</a>';
}
function renderNavigation(){
 const activeGroup=navigationGroups.find(g=>g.pages.includes(page));
 if(page!==lastNavigationPage){openNavigationGroup=activeGroup?.id||'';lastNavigationPage=page;}
 const groups=navigationGroups.map(group=>{
  const links=group.pages.map(navigationLink).join('');if(!links)return '';
  const active=group.id===activeGroup?.id;
  return '<details class="nav-group'+(active?' has-active-page':'')+'" data-nav-group="'+group.id+'" '+(openNavigationGroup===group.id?'open':'')+'><summary><span class="nav-icon" aria-hidden="true">'+icon(group.icon)+'</span><span class="nav-group-label">'+group.label+'</span><svg class="nav-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><div class="nav-group-links">'+links+'</div></details>';
 }).join('');
 return '<div class="nav-overview">'+navigationLink('dashboard')+'</div>'+groups+'<div class="nav-settings">'+navigationLink('settings')+'</div>';
}
document.addEventListener('toggle',e=>{
 const group=e.target;if(!group.matches?.('#nav details[data-nav-group]'))return;
 if(group.open){
  openNavigationGroup=group.dataset.navGroup;
  document.querySelectorAll('#nav details[data-nav-group]').forEach(other=>{if(other!==group)other.open=false;});
 }else if(openNavigationGroup===group.dataset.navGroup)openNavigationGroup='';
},true);
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),5000);}
function save(next){if(typeof FeatureKit!=='undefined')return FeatureKit.save(next);try{T.validate(next);const serialized=JSON.stringify(next);localStorage.setItem(KEY,serialized);state=next;rawStored=serialized;storageError=false;storageIssue='';return true;}catch(e){toast('Could not save: '+e.message+'. Your previously saved records have not been replaced.');return false;}}
function storageNotice(){
  let html=location.protocol==='file:'?'<div class="notice"><div><h3>You opened the app from a file</h3><p>Use the local app address for installation and offline setup. If you added your own records here, download a backup before switching addresses.</p></div><a class="button" href="http://localhost:8765/">Open TracklyApp →</a></div>':'';
  const messages={
    'sample-update':['Sample update could not be saved','Your existing records are unchanged. Free some browser storage and reload to add the new samples.'],
    unavailable:['Browser storage is unavailable','The seven sample records are shown as a preview. Editing is paused because existing records could not be checked. Allow this site to store data, then reload.'],
    write:['Sample records have not been saved yet','The seven examples are still visible. Browser storage may be blocked or full; allow storage and reload, or retry saving.'],
    invalid:['Saved records need recovery','Editing is paused. The original saved data has not been changed. Download it from Settings, then restore a valid backup.'],
    changed:['Records changed in another tab','Close your form and reload before making further changes.']
  };
  if(storageIssue){const [title,message]=messages[storageIssue];html+='<div class="notice"><div><h3>'+title+'</h3><p>'+message+'</p></div>'+btn('Reload app','reload')+'</div>';}
  return html;
}
function mutate(fn){if(storageError){toast('Stored data could not be read. Export the original data in Settings before restoring a valid backup.');return false;}const next=structuredClone(state);fn(next);return save(next);}
function icon(name){
const paths={
overview:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
bill:'<path d="M6 3h9l4 4v14l-3-1.5-4 1.5-4-1.5L5 21V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5M9 12h6M9 16h4"/>',
shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
eob:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h3"/>',
coverage:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>',
flag:'<path d="M5 21V4m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
payment:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h3"/>',
plan:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18m-14 4h3m4 0h3"/>',
wallet:'<path d="M19 8V5H6a3 3 0 0 0 0 6h14v9H6a3 3 0 0 1-3-3V8"/><path d="M16 11v5h5v-5M17 13.5h1"/>',
calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18M8 15h2M14 15h2"/>',
contacts:'<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="9" r="2.5"/><path d="M8 17c0-4 8-4 8 0M2 7h3M2 12h3M2 17h3"/>',
reports:'<path d="M4 3v18h17M8 16v-5M13 16V7M18 16v-8"/>',
settings:'<path d="m9 3-1 3-3 1-1 3 2 2-1 3 2 3h3l2 3 3-1 1-3 3-1 1-3-2-2 1-3-2-3h-3l-2-2Z"/><circle cx="12" cy="12" r="3"/>',
arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
down:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
plus:'<path d="M12 5v14M5 12h14"/>',
alert:'<path d="m12 3 10 17H2L12 3Z"/><path d="M12 9v5M12 17h.01"/>',
check:'<path d="m5 12 4 4L19 6"/>',
lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>'
};
return '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.bill)+'</svg>';
}

let photoDraft=[],photoDraftBillId='',photoBusy=false,photoSession=0;
function recordPhotos(bill){
  if(bill.photos?.length)return bill.photos;
  const a=bill.attachment;
  return a&&/^data:image\/(png|jpeg);base64,/.test(a.data)?[{id:'eob-preview',name:a.name,data:a.data}]:[];
}
function billThumbnail(bill){
  const photos=recordPhotos(bill);
  if(!photos.length)return providerMark(bill.category);
  return '<button type="button" class="bill-thumbnail" data-action="view-photo" data-id="'+esc(bill.id)+'" data-photo-index="0" aria-label="View photo for '+esc(bill.provider)+'"><img src="'+esc(photos[0].data)+'" alt="" loading="lazy" decoding="async">'+(photos.length>1?'<span>'+photos.length+'</span>':'')+'</button>';
}
function photoEditor(){
  return '<div class="form-section">Photos</div><div class="full photo-upload"><div><strong>Add bill or claim photos</strong><p class="hint">Up to 6 JPG, PNG, or WebP photos. Photos are resized for local storage; keep your originals for full detail. The first photo appears in lists.</p></div><label class="button"><span>'+icon('plus')+' Add photos</span><input id="photo-input" type="file" accept="image/jpeg,image/png,image/webp" multiple></label></div><div id="photo-grid" class="photo-grid full">'+photoDraftMarkup()+'</div><p id="photo-status" class="hint full" role="status" aria-live="polite"></p>';
}
function photoDraftMarkup(){
  return photoDraft.map((p,index)=>'<div class="photo-edit-card"><img src="'+esc(p.data)+'" alt="'+esc(p.name)+'"><div class="photo-edit-info"><span class="photo-name" title="'+esc(p.name)+'">'+esc(p.name)+'</span>'+(index===0?'<span class="tag green">First photo · list thumbnail</span>':'<button type="button" class="photo-text-button" data-action="photo-first" data-photo-index="'+index+'">Make first</button>')+'<button type="button" class="photo-text-button danger" data-action="photo-remove" data-photo-index="'+index+'">Remove</button></div></div>').join('');
}
function renderPhotoDraft(){const grid=$('#photo-grid');if(grid)grid.innerHTML=photoDraftMarkup();}
function photoGallery(bill){
  const photos=recordPhotos(bill);
  return '<div class="detail-section"><div class="row"><h3>Photos'+(photos.length?' · '+photos.length:'')+'</h3>'+btn(photos.length?'Manage photos':'+ Add photos','edit-bill',bill.id)+'</div>'+(photos.length?'<div class="photo-gallery">'+photos.map((p,index)=>'<button type="button" class="gallery-photo" data-action="view-photo" data-id="'+esc(bill.id)+'" data-photo-index="'+index+'"><img src="'+esc(p.data)+'" alt="'+esc(p.name)+'" loading="lazy"><span>'+esc(p.name)+'</span></button>').join('')+'</div>':'<p class="hint">Attach photos of bills, claim letters, or receipts to this record.</p>')+'</div>';
}
function showPhoto(billId,index=0){
  const bill=state.bills.find(b=>b.id===billId);if(!bill)return;
  const photos=recordPhotos(bill),p=photos[index];if(!p)return;
  show(modalHead('Photo '+(index+1)+' of '+photos.length,esc(bill.provider))+'<div class="photo-viewer"><img src="'+esc(p.data)+'" alt="'+esc(p.name)+'"></div><p class="hint photo-filename">'+esc(p.name)+'</p><div class="photo-view-actions">'+btn('Back to record','detail',billId)+(index>0?'<button class="button" data-action="view-photo" data-id="'+esc(billId)+'" data-photo-index="'+(index-1)+'">Previous photo</button>':'')+(index<photos.length-1?'<button class="button" data-action="view-photo" data-id="'+esc(billId)+'" data-photo-index="'+(index+1)+'">Next photo</button>':'')+'<button class="button primary" data-action="download-photo" data-id="'+esc(billId)+'" data-photo-index="'+index+'">Download photo</button></div>');
}
async function optimizePhoto(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose JPG, PNG, or WebP photos. Convert HEIC photos to JPG first.');
  if(file.size>12*1024*1024)throw new Error('Each original photo must be 12 MB or smaller.');
  const url=URL.createObjectURL(file);
  let bitmap;
  try{
    bitmap=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('This photo could not be opened. Try another JPG, PNG, or WebP file.'));img.src=url;});
    if(!bitmap.naturalWidth||!bitmap.naturalHeight)throw new Error('The photo has no readable image dimensions.');
    const scale=Math.min(1,1600/Math.max(bitmap.naturalWidth,bitmap.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.naturalWidth*scale));canvas.height=Math.max(1,Math.round(bitmap.naturalHeight*scale));
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Your browser could not prepare this photo.');
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    let data;
    for(const quality of [.88,.78,.66,.54,.42]){data=canvas.toDataURL('image/jpeg',quality);if(data.length<=450000)break;}
    if(!data||data.length>450000||!data.startsWith('data:image/jpeg;base64,'))throw new Error('This photo is too detailed for local storage. Crop it or choose a smaller image.');
    return {id:T.uid(),name:(file.name.replace(/\.[^.]+$/,'')+'.jpg').slice(-250),data};
  }finally{URL.revokeObjectURL(url);}
}
async function addPhotoFiles(files,prepare=optimizePhoto){
  if(photoBusy)return;
  if(!files.length)return;
  const session=photoSession,initialCount=photoDraft.length;
  if(initialCount+files.length>6)throw new Error('You can attach up to 6 photos per record. Remove a photo before adding more.');
  photoBusy=true;
  const status=$('#photo-status'),input=$('#photo-input'),submit=$('#record-form')?.querySelector?.('[type="submit"]');
  if(status)status.textContent='Preparing photos…';
  if(input)input.disabled=true;if(submit)submit.disabled=true;
  try{
    const prepared=[];
    for(const file of files)prepared.push(await prepare(file));
    if(session!==photoSession||!$('#dialog').open)return;
    photoDraft.push(...prepared);renderPhotoDraft();
    if(status)status.textContent='Photos ready. Save the record to keep these changes.';
  }finally{
    if(session===photoSession){photoBusy=false;if(input)input.disabled=false;if(submit)submit.disabled=false;}
  }
}

function providerMark(category){return '<span class="provider-mark '+(category==='Hospital'?'hospital':category==='Laboratory'?'lab':category==='Dentist'?'dental':'specialist')+'">'+icon(category==='Hospital'?'coverage':category==='Laboratory'?'eob':category==='Dentist'?'shield':'contacts')+'</span>';}
function claimSnapshot(){
const total=state.bills.length;
const counts=T.statuses.map(status=>({status,count:state.bills.filter(b=>b.status===status).length}));
let end=0;const colors=['#d7b676','#76a990','#839db8','#c58275'];
const stops=counts.map((entry,i)=>{const start=end;end+=total?entry.count/total*100:0;return colors[i]+' '+start+'% '+end+'%';}).join(',');
return '<div class="claim-snapshot"><div class="claim-ring" style="--ring:conic-gradient('+(total?stops:'var(--border) 0% 100%')+')" role="img" aria-label="'+esc(counts.map(c=>c.count+' '+c.status).join(', '))+'"><div><strong>'+total+'</strong><span>Total claims</span></div></div><div class="claim-legend">'+counts.map((entry,i)=>'<div><span class="legend-dot" style="background:'+colors[i]+'"></span><span>'+entry.status+'</span><strong>'+entry.count+'</strong></div>').join('')+'</div></div>';
}
function statusTag(status){const color={Pending:'amber',Approved:'green','Partially Paid':'blue',Denied:'red'}[status]||'';return '<span class="tag '+color+'">'+esc(status)+'</span>';}
function btn(label,action,id='',cls=''){
const accessible=label==='←'?'Previous month':label==='→'?'Next month':'';
let content=label;
if(label.startsWith('+ '))content=icon('plus')+'<span>'+label.slice(2)+'</span>';
else if(label.startsWith('↓ '))content=icon('down')+'<span>'+label.slice(2)+'</span>';
else if(label.endsWith(' →'))content='<span>'+label.slice(0,-2)+'</span>'+icon('arrow');
return '<button type="button" class="button '+cls+'" data-action="'+action+'" data-id="'+esc(id)+'"'+(accessible?' aria-label="'+accessible+'"':'')+'>'+content+'</button>';
}
function heading(title,sub,actions=''){return '<div class="page-heading"><div><div class="eyebrow">MEDICAL & INSURANCE</div><h1>'+title+'</h1><p class="muted">'+sub+'</p></div><div class="actions">'+actions+'</div></div>';}
function panel(title,body,extra=''){return '<section class="panel"><div class="panel-head"><h2>'+title+'</h2>'+extra+'</div>'+body+'</section>';}
function empty(title,body,action=''){return '<div class="empty"><div class="empty-symbol">⊕</div><h3>'+title+'</h3><p>'+body+'</p>'+action+'</div>';}
function stats(){const n=T.totals(state);return '<div class="stats">'+[['Total Billed',n.billed,'Across '+state.bills.length+' medical records','bill'],['Insurance Paid',n.insurance,'Covered by your insurance','shield'],['You Paid',n.paid,'Net of provider refunds','payment'],['Still Owed',n.owed,n.unknown?n.unknown+' bill'+(n.unknown===1?'':'s')+' awaiting EOB':'Based on EOB responsibility','wallet']].map(([label,value,note,symbol],i)=>'<div class="stat '+(i===3?'emphasis':'')+'"><div class="stat-top"><span>'+label+'</span><span class="stat-symbol">'+icon(symbol)+'</span></div><strong>'+cash(value)+'</strong><div class="stat-bottom"><span class="stat-indicator"></span><small>'+esc(note)+'</small></div></div>').join('')+'</div>';}
function billRows(bills,mode='bills'){if(!bills.length)return empty('No matching records','Add a bill or adjust your filters.',btn('+ Add medical bill','new-bill','','primary'));return '<div class="table-wrap"><table><thead><tr><th>Provider / Patient</th><th>'+(mode==='claims'?'Claim #':'Service date')+'</th><th>Billed</th>'+(mode==='eob'?'<th>Allowed</th><th>Insurance paid</th>':'')+'<th>Still owed</th><th>Status</th></tr></thead><tbody>'+bills.map(b=>'<tr><td><div class="provider-cell">'+billThumbnail(b)+'<div class="provider-copy"><button class="bill-link" data-action="detail" data-id="'+esc(b.id)+'">'+esc(b.provider)+'</button><small>'+esc(b.patient)+' · '+esc(b.category)+'</small></div></div></td><td>'+(mode==='claims'?esc(b.claimNumber||'Not entered'):fmtDate(b.serviceDate))+'</td><td>'+cash(b.billed)+'</td>'+(mode==='eob'?'<td>'+(b.allowed===null?'Not entered':cash(b.allowed))+'</td><td>'+cash(b.insurancePaid)+'</td>':'')+'<td><strong>'+(T.balance(state,b)===null?'Awaiting EOB':cash(T.balance(state,b)))+'</strong>'+(T.credit(state,b)?'<small>Credit: '+cash(T.credit(state,b))+'</small>':'')+'</td><td>'+statusTag(b.status)+(T.review(state,b)?'<small class="danger">⚠ Review required</small>':'')+'</td></tr>').join('')+'</tbody></table></div>';}
function deadlineList(events){if(!events.length)return empty('All clear for now','Your upcoming bill and appeal deadlines will appear here.');return '<div class="panel-body">'+events.map(e=>{const d=new Date(e.date+'T12:00:00');return '<div class="deadline"><div class="date-tile"><small>'+d.toLocaleDateString('en-US',{month:'short'})+'</small><strong>'+d.getDate()+'</strong></div><div><button class="bill-link" data-action="detail" data-id="'+esc(e.billId)+'">'+esc(e.title)+'</button><p>'+esc(e.type)+'</p></div>'+(e.date<T.today()?'<span class="tag red">Overdue</span>':'')+'</div>';}).join('')+'</div>';}
function progress(label,met,max){const percent=max?Math.min(100,Math.round(met/max*100)):0;return '<div class="progress-row"><div class="progress-label"><span>'+label+'</span><strong>'+cash(met)+' <span class="muted">/ '+cash(max)+'</span></strong></div><div class="progress-track" role="progressbar" aria-label="'+label+'" aria-valuenow="'+percent+'" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="width:'+percent+'%"></div></div><div class="progress-foot"><span>'+percent+'% reached</span><span>'+cash(Math.max(0,max-met))+' remaining</span></div></div>';}
function dashboard(){
const reviews=state.bills.filter(b=>T.review(state,b)),events=T.deadlines(state);
const policy=state.policies.find(p=>p.year===Number(T.today().slice(0,4)))||state.policies[0];
const coverageBody=policy?'<div class="panel-body"><div class="policy-identity"><span class="policy-symbol">'+icon('shield')+'</span><div><strong>'+esc(policy.name)+'</strong><small>'+policy.year+' coverage year</small></div></div>'+progress('Deductible',policy.deductibleMet,policy.deductible)+progress('Out-of-pocket maximum',policy.oopMet,policy.oop)+'<div class="coverage-foot">'+icon('check')+' Confirmed '+fmtDate(policy.asOf)+'</div></div>':empty('Your coverage, at a glance','Add a plan to track your deductible and out-of-pocket progress.',btn('+ Add insurance plan','new-policy','','primary'));
return '<div class="dashboard-intro">'+heading('Your care. A clearer picture.','A calm place to keep track of your medical finances.',btn('↓ Export report','report')+btn('+ Add medical bill','new-bill','','primary'))+'</div>'+
stats()+
(reviews.length?'<div class="notice review-notice"><span class="notice-symbol">'+icon('alert')+'</span><div><h3>A little attention now. More peace of mind later.</h3><p>'+reviews.length+' '+(reviews.length===1?'bill needs':'bills need')+' review. Check denied claims and differences in your EOB.</p></div>'+btn('Review bills →','review')+'</div>':'<div class="notice clear-notice"><span class="notice-symbol">'+icon('shield')+'</span><div><h3>You are all caught up.</h3><p>No denied claims or recorded balance differences to review.</p></div></div>')+
'<div class="grid-two dashboard-primary">'+panel('Recent medical bills',billRows(state.bills.slice(-6).reverse()),'<a class="panel-link" href="#bills">All medical bills '+icon('arrow')+'</a>')+panel('Your coverage',coverageBody,'<a class="panel-link" href="#coverage">Manage '+icon('arrow')+'</a>')+'</div>'+
'<div class="grid-two dashboard-secondary">'+panel('Coming up next',deadlineList(events.slice(0,4)),'<a class="panel-link" href="#calendar">'+icon('calendar')+' View calendar</a>')+panel('Claims at a glance',claimSnapshot(),'<span class="panel-caption">ALL RECORDS</span>')+'</div>'+
'<div class="workspace-assurance">'+icon('lock')+'<span>Your records stay on this device.</span><a href="#settings">Manage backups '+icon('arrow')+'</a></div>';
}
function billPage(){const info={bills:['Medical bills','One record for every visit, bill, and payment.'],claims:['Insurance claims','Follow every claim from submission to resolution.'],eob:['EOB tracker','Compare provider balances with your Explanation of Benefits.']}[page];const found=state.bills.filter(b=>(b.provider+' '+b.patient+' '+b.claimNumber).toLowerCase().includes(search.toLowerCase())&&(filter==='All'||filter==='Review required'&&T.review(state,b)||b.status===filter));return heading(...info,btn('+ Add medical bill','new-bill','','primary'))+'<div class="toolbar"><input id="search" type="search" placeholder="Search provider, patient, or claim…" aria-label="Search records" value="'+esc(search)+'"><select id="filter" aria-label="Filter by status">'+['All',...T.statuses,'Review required'].map(s=>'<option '+(filter===s?'selected':'')+'>'+s+'</option>').join('')+'</select></div>'+panel(found.length+' records',billRows(found,page==='eob'?'eob':page==='claims'?'claims':'bills'))+(page==='eob'?'<p class="hint">Still owed = EOB patient responsibility − patient payments + provider refunds, with a minimum of zero. Reimbursements do not reduce a provider balance. Unknown responsibility is excluded from totals.</p>':'');}
function coverage(){return heading('Insurance coverage','Track insurer-confirmed progress for each plan and year.',btn('+ Add insurance plan','new-policy','','primary'))+(state.policies.length?'<div class="cards">'+state.policies.map(p=>panel(esc(p.name),'<div class="panel-body"><p class="muted" style="margin:0 0 20px">'+p.year+' · '+esc(p.member||'Member ID not entered')+'</p>'+progress('Deductible',p.deductibleMet,p.deductible)+progress('Out-of-pocket maximum',p.oopMet,p.oop)+'<p class="hint">Updated '+fmtDate(p.asOf)+'</p><p class="hint">'+esc(p.notes)+'</p><div class="actions" style="margin-top:18px">'+btn('Edit plan','edit-policy',p.id)+btn('Delete','delete-policy',p.id,'danger')+'</div></div>')).join('')+'</div>':panel('Your plans',empty('Make your coverage visible','Add your plan limits and the progress shown by your insurer.',btn('Add insurance plan','new-policy','','primary'))))+'<p class="hint">Progress is entered from your insurer’s records. Payments are not automatically counted toward deductible or out-of-pocket limits.</p>';}
function appealsPage(){const bills=state.bills.filter(b=>b.status==='Denied'||b.appealDue||state.appeals.some(a=>a.billId===b.id));return heading('Denials & appeals','Keep the reason, deadline, and every follow-up together.',btn('+ Log appeal activity','new-appeal','','primary'))+panel('Claims to follow up',bills.length?'<div class="table-wrap"><table><thead><tr><th>Claim / Provider</th><th>Denial reason</th><th>Appeal deadline</th><th>Follow-up</th></tr></thead><tbody>'+bills.map(b=>'<tr><td><button class="bill-link" data-action="detail" data-id="'+esc(b.id)+'">'+esc(b.provider)+'</button><small>'+esc(b.claimNumber)+'</small></td><td>'+esc(b.denialReason||'Not recorded')+'</td><td>'+fmtDate(b.appealDue)+'</td><td>'+statusTag(b.appealClosed?'Closed':'Open')+'</td></tr>').join('')+'</tbody></table></div>':empty('No denied claims to follow up','Appeal deadlines are entered from your notice; the app does not determine them.'))+panel('Appeal history',state.appeals.length?'<div class="panel-body">'+state.appeals.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(a=>'<div class="row"><div><h3>'+esc(a.action)+'</h3><small>'+fmtDate(a.date)+' · '+esc(state.bills.find(b=>b.id===a.billId)?.provider)+' · '+esc(a.reference)+'</small><p style="white-space:pre-wrap">'+esc(a.notes)+'</p></div><div class="actions">'+btn('Edit','edit-appeal',a.id)+btn('Delete','delete-appeal',a.id,'danger')+'</div></div>').join('')+'</div>':empty('A record of every conversation','Log calls, submitted documents, decisions, and reference numbers.'));}
function transactionTable(transactions){return transactions.length?'<div class="table-wrap"><table><thead><tr><th>Date / Provider</th><th>Type</th><th>Account</th><th>Amount</th><th class="no-print">Actions</th></tr></thead><tbody>'+transactions.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(t=>'<tr><td>'+fmtDate(t.date)+'<small>'+esc(state.bills.find(b=>b.id===t.billId)?.provider)+'</small></td><td>'+esc(t.type)+'<small>'+esc(t.reference)+'</small></td><td>'+esc(t.account)+'</td><td>'+cash(t.amount)+'</td><td class="no-print"><div class="actions">'+btn('Edit','edit-transaction',t.id)+btn('Delete','delete-transaction',t.id,'danger')+'</div></td></tr>').join('')+'</tbody></table></div>':empty('No transactions yet','Record payments, provider refunds, and reimbursements.',btn('Add transaction','new-transaction','','primary'));}
function paymentsPage(){return heading('Payments & reimbursements','Every payment, refund, and reimbursement in one ledger.',btn('+ Add transaction','new-transaction','','primary'))+panel('Transaction history',transactionTable(state.transactions));}
function hsaPage(){const ts=state.transactions.filter(t=>t.account==='HSA'||t.account==='FSA'||t.eligible);return heading('HSA / FSA expenses','Organize account spending and expenses you marked as eligible.',btn('+ Add transaction','new-transaction','','primary'))+'<div class="stats">'+['HSA','FSA'].map(account=>'<div class="stat"><div class="stat-top">'+account+' net spending</div><strong>'+cash(T.sum(state.transactions.filter(t=>t.account===account),t=>t.type==='Payment'?t.amount:t.type==='Provider refund'?-t.amount:0))+'</strong><small>Payments less provider refunds · all dates</small></div>').join('')+'<div class="stat"><div class="stat-top">Reimbursements received</div><strong>'+cash(T.sum(ts.filter(t=>t.type==='Reimbursement'),t=>t.amount))+'</strong><small>Tracked separately from provider payments</small></div></div>'+panel('Account & eligible expense ledger',transactionTable(ts))+'<p class="hint">The eligible marker is your own classification. The app does not determine tax eligibility or account contribution limits.</p>';}
function plansPage(){return heading('Payment plans','See your installment schedule and remaining plan balance.',btn('+ Add payment plan','new-plan','','primary'))+(state.plans.length?'<div class="cards">'+state.plans.map(p=>{const info=T.planInfo(state,p),bill=state.bills.find(b=>b.id===p.billId);return panel(esc(bill.provider),'<div class="panel-body"><p class="muted">'+cash(p.installment)+' · '+p.frequency+'</p><div style="margin:20px 0">'+progress('Plan payments',info.paid,p.total)+'</div><p><strong>'+cash(info.remaining)+'</strong> remaining</p><p class="hint">'+(info.nextDue?'Next: '+cash(info.nextAmount)+' on '+fmtDate(info.nextDue):'Plan fully paid')+'</p><p class="hint">'+esc(p.notes)+'</p><div class="actions" style="margin-top:18px">'+btn('Record payment','plan-pay',p.id,'primary')+btn('Edit','edit-plan',p.id)+btn('Delete','delete-plan',p.id,'danger')+'</div></div>');}).join('')+'</div>':panel('Installment schedules',empty('Make larger bills manageable','Add the schedule you agreed with your provider.',btn('Add payment plan','new-plan','','primary'))));}
function contactsPage(){return heading('Your contacts','Billing departments and insurance support, easy to find.',btn('+ Add contact','new-contact','','primary'))+(state.contacts.length?'<div class="cards">'+state.contacts.map(c=>panel(esc(c.name),'<div class="panel-body"><span class="tag green">'+esc(c.type)+'</span><div style="margin:18px 0">'+(c.phone?'<p>'+esc(c.phone)+'</p>':'')+(c.email?'<p>'+esc(c.email)+'</p>':'')+'<p class="muted">'+esc(c.address)+'</p><p class="hint" style="white-space:pre-wrap">'+esc(c.notes)+'</p></div><div class="actions">'+btn('Edit','edit-contact',c.id)+btn('Delete','delete-contact',c.id,'danger')+'</div></div>')).join('')+'</div>':panel('Contact directory',empty('Know who to call','Save provider and insurance contacts here.')));}
function calendarPage(){const events=T.deadlines(state),start=new Date(month+'-01T12:00:00'),offset=(start.getDay()+6)%7,days=new Date(start.getFullYear(),start.getMonth()+1,0).getDate();let cells=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>'<div class="calendar-weekday">'+d+'</div>').join('');for(let i=0;i<Math.ceil((days+offset)/7)*7;i++){const n=i-offset+1,valid=n>0&&n<=days,date=month+'-'+String(n).padStart(2,'0');cells+='<div class="calendar-day '+(!valid?'other':'')+' '+(date===T.today()?'today':'')+'">'+(valid?'<strong>'+n+'</strong>'+events.filter(e=>e.date===date).map(e=>'<button class="calendar-event" data-action="detail" data-id="'+esc(e.billId)+'">'+esc(e.type)+' · '+esc(e.title)+'</button>').join(''):'')+'</div>';}return heading('Your calendar','Keep bill, appeal, and installment deadlines in view.')+panel(start.toLocaleDateString('en-US',{month:'long',year:'numeric'}),'<div class="calendar-grid">'+cells+'</div>','<div class="actions">'+btn('←','prev-month')+btn('Today','today-month')+btn('→','next-month')+'</div>')+panel('Deadline list',deadlineList(events));}
function reportsPage(){return heading('Medical expense report','All recorded dates · Generated '+fmtDate(T.today()),btn('Print / Save as PDF','print','','primary'))+'<p class="report-only">TracklyApp · '+(state.demo?'SAMPLE DATA · ':'')+''+T.currency(state)+' · Personal medical expense summary</p>'+stats()+panel('Bills & insurance',billRows(state.bills,'eob'))+panel('Payments, refunds & reimbursements',transactionTable(state.transactions))+panel('Appeal deadlines',deadlineList(T.deadlines(state).filter(e=>e.type==='Appeal deadline')))+'<p class="hint">All amounts in '+T.currency(state)+'. Unknown EOB responsibility is excluded from Still Owed. You Paid is net of provider refunds; reimbursements are separate. This report summarizes your entered records.</p>';}

function textSizeControls(){
  const selected=state.settings.textSize||'medium';
  return '<div class="text-size-setting"><h3 id="text-size-label">Text size</h3><p class="hint">Choose the reading size that feels right for you.</p><div class="text-size-options" role="group" aria-labelledby="text-size-label">'+[['small','Small'],['medium','Medium'],['large','Large']].map(([size,label])=>'<button type="button" class="text-size-option" data-action="text-size" data-id="'+size+'" aria-pressed="'+String(selected===size)+'"><span class="size-symbol size-'+size+'" aria-hidden="true">Aa</span><span>'+label+'</span></button>').join('')+'</div><div class="text-size-preview"><strong>Medical records, comfortably clear.</strong><p>Your bills, claims, and notes at a size that suits you.</p></div></div>';
}


function currencyPanel(){const code=T.currency(state);return panel('Currency','<div class="panel-body"><span class="tag green">'+esc(code)+'</span><h3>Workspace currency</h3><p>Enter your currency manually, such as USD, EUR, GBP or RON. USD is the default.</p>'+btn('Edit currency','currency-open','','primary')+'<p class="hint">One currency for this workspace. Amounts use two decimal places and are not converted. Original attachments keep their own currency.</p></div>');}
function currencyForm(){const existing=state.bills.length||state.transactions.length||state.policies.length||state.plans.length;form('Workspace currency','currency-settings','',field('currency','Currency code',T.currency(state),'text','required minlength="3" maxlength="3" pattern="[A-Za-z]{3}" placeholder="USD" autocomplete="off" spellcheck="false" style="text-transform:uppercase"')+'<p class="hint full">Type a three-letter currency code: USD, EUR, GBP, RON, CAD or another supported code. USD is used for new workspaces. Amounts use two decimal places.</p><p class="hint full">Changing this setting relabels every amount without exchange conversion: 100 USD becomes 100 EUR when switching to EUR. Original documents and photos are not changed.</p>'+(existing?'<label class="check-label full"><input type="checkbox" name="confirmCurrency" required> I understand that existing amounts will be relabeled, not converted.</label>':''));}

function settingsPage(){return heading('Settings & your data','A private workspace, with you in control.')+'<div class="settings-grid">'+(typeof TracklyLicense==="undefined"?"":TracklyLicense.panel()+panel("User manual",'<div class="panel-body"><p>Step-by-step instructions and examples for every part of TracklyApp.</p><a class="button primary" href="#help">Open user manual</a></div>'))+panel('Backup & restore','<div class="panel-body"><p>Download an encrypted backup, including records, family profiles, documents and photos. Restore replaces this device’s records after you review the file.</p><div class="actions">'+btn('↓ Download backup','backup','','primary')+'<label class="button">↑ Restore backup<input id="restore" type="file" accept=".json,.trackly,application/json" hidden></label></div><p class="hint" style="margin-top:16px">Backups contain personal health and financial information. Keep them somewhere private.</p></div>')+currencyPanel()+panel('Appearance','<div class="panel-body"><p>Choose the appearance that feels comfortable on your screen.</p>'+btn(state.settings.theme==='dark'?'☀ Switch to light':'◐ Switch to dark','theme')+textSizeControls()+'</div>')+panel('Offline & installation','<div class="panel-body"><p id="install-help">After the first load from localhost or HTTPS, the app can work offline. Install from your browser’s menu when supported. On iPhone or iPad, use Safari → Share → Add to Home Screen.</p><p>No account, analytics, remote fonts, or cloud sync. Data stays in this browser on this device. Clearing site data removes records; export backups regularly.</p><p>Enable workspace encryption in Private Vault to protect saved records with a passphrase.</p>'+btn('Check offline readiness','offline-check')+'</div>')+panel('Sample records','<div class="panel-body"><p>Explore seven fictional English medical records, family profiles, actions, timelines, documents and payment plans. Loading examples replaces your current records only after confirmation.</p><div class="actions">'+btn('Load 7 sample records','load-demo')+btn('Start with empty records','clear','','danger')+'</div></div>')+'</div>';}
function render(){if(typeof FeatureKit!=='undefined'){if(FeatureKit.guard())return;FeatureKit.cleanBlobs();}renderProfile();page=location.hash.slice(1)||'dashboard';if(!navItems.some(n=>n[0]===page))page='dashboard';$('.shell').className='shell section-'+page;document.body.classList.toggle('dark',state.settings.theme==='dark');document.body.classList.toggle('text-small',state.settings.textSize==='small');document.body.classList.toggle('text-large',state.settings.textSize==='large');$('#nav').innerHTML=renderNavigation();const views={dashboard,bills:billPage,claims:billPage,eob:billPage,coverage,appeals:appealsPage,payments:paymentsPage,plans:plansPage,hsa:hsaPage,calendar:calendarPage,contacts:contactsPage,reports:typeof FeatureKit==='undefined'?reportsPage:customReportsPage,settings:settingsPage};if(typeof FeatureKit!=='undefined')Object.assign(views,{family:familyPage,actions:actionCenterPage,scanner:scannerPage,compare:comparisonPage,timeline:timelinePage,vault:vaultPage,help:()=>TracklyHelp.page()});$('#main').innerHTML=storageNotice()+(typeof TracklyLicense==='undefined'?'':TracklyLicense.banner())+(state.demo?'<div class="demo-bar"><span><strong>Sample workspace</strong> · Includes fictional example records.</span>'+btn('Start fresh','clear')+'</div>':'')+(typeof FeatureKit==='undefined'?views[page]():FeatureKit.filterBar()+(['dashboard','bills','claims','eob','appeals','payments','plans','hsa','calendar'].includes(page)?FeatureKit.view(views[page]):views[page]()));document.title=navItems.find(n=>n[0]===page)[2]+' · TracklyApp';}
function show(content){photoSession++;photoBusy=false;$('#dialog-content').innerHTML=content;if(!$('#dialog').open)$('#dialog').showModal();}
function modalHead(title,subtitle=''){return '<div class="modal-head"><div><h2>'+title+'</h2><p class="muted">'+subtitle+'</p></div><button class="icon-button" data-action="close" aria-label="Close dialog">×</button></div>';}
function field(name,label,value='',type='text',extra=''){return '<label class="field">'+label+'<input name="'+name+'" type="'+type+'" value="'+esc(value??'')+'" '+extra+'></label>';}
function amount(name,label,value,required=false){return field(name,label+' ('+T.currency(state)+')',value===null||value===undefined?'':(value/100).toFixed(2),'number','min="0" max="1000000000" step="0.01" '+(required?'required':''));}
function select(name,label,options,value){return '<label class="field">'+label+'<select name="'+name+'">'+options.map(o=>{const [v,l]=Array.isArray(o)?o:[o,o];return '<option value="'+esc(v)+'" '+(v===value?'selected':'')+'>'+esc(l)+'</option>';}).join('')+'</select></label>';}
function textarea(name,label,value=''){return '<label class="field full">'+label+'<textarea name="'+name+'" maxlength="30000">'+esc(value)+'</textarea></label>';}
function form(title,kind,id,fields,subtitle=''){show(modalHead(title,subtitle)+'<form id="record-form" data-kind="'+kind+'" data-id="'+esc(id||'')+'"><div class="form-grid">'+fields+'</div><p class="form-error" id="form-error" role="alert"></p><div class="modal-actions">'+btn('Cancel','close')+'<button type="submit" class="button primary">'+(kind==='profile'?'Save profile':'Save record')+'</button></div></form>');}
function billForm(id){photoSession++;photoBusy=false;photoDraftBillId=id||'';photoDraft=structuredClone(state.bills.find(b=>b.id===id)?.photos||[]);const b=state.bills.find(b=>b.id===id)||{provider:'',patient:'',category:'Hospital',serviceDate:T.today(),billed:0,allowed:null,insurancePaid:0,patientOwes:null,providerBalance:null,status:'Pending'};form(id?'Edit medical bill':'Add medical bill','bill',id,field('provider','Provider / facility',b.provider,'text','required maxlength="200"')+(typeof FeatureKit==='undefined'?field('patient','Patient name',b.patient,'text','required maxlength="200"'):FeatureKit.patientFields(b.patient,b.memberId))+select('category','Provider type',['Hospital','Doctor','Specialist','Laboratory','Pharmacy','Dentist','Therapy','Other'],b.category)+field('serviceDate','Service date',b.serviceDate,'date','required')+field('dueDate','Bill due date',b.dueDate,'date')+select('policyId','Insurance plan',[['','No plan linked'],...state.policies.map(p=>[p.id,p.name+' · '+p.year])],b.policyId||'')+'<div class="form-section">Bill & EOB amounts · '+T.currency(state)+'</div>'+amount('billed','Original billed amount',b.billed,true)+amount('allowed','Insurance allowed',b.allowed)+amount('insurancePaid','Insurance paid',b.insurancePaid,true)+amount('patientOwes','EOB patient responsibility',b.patientOwes)+amount('providerBalance','Current provider balance (after payments)',b.providerBalance)+'<div class="hint">Leave unknown amounts blank. Enter patient responsibility directly from the EOB; the app does not infer it from the allowed amount.</div>'+'<div class="form-section">Insurance claim & EOB</div>'+field('claimNumber','Claim number',b.claimNumber)+select('status','Claim status',T.statuses,b.status)+field('eobNumber','EOB reference',b.eobNumber)+field('eobDate','EOB date',b.eobDate,'date')+'<label class="field full">EOB attachment · PDF, PNG, JPG · up to 600 KB<input name="attachment" type="file" accept="application/pdf,image/png,image/jpeg"></label>'+(b.attachment?'<label class="field full"><input style="width:auto;min-height:0;display:inline" type="checkbox" name="removeAttachment"> Remove '+esc(b.attachment.name)+'</label>':'')+'<div class="form-section">Denial & appeal</div>'+field('denialReason','Denial reason',b.denialReason)+field('appealDue','Appeal deadline from your notice',b.appealDue,'date')+select('appealClosed','Appeal follow-up',[['false','Open'],['true','Closed']],String(b.appealClosed||false))+textarea('notes','Claim notes',b.notes)+photoEditor(),'Keep the bill, insurance response, and follow-up in one place.');}
function billOptions(){return state.bills.map(b=>[b.id,b.provider+' · '+b.patient]);}
function requireBills(){if(state.bills.length)return true;toast('Add a medical bill first.');return false;}
function transactionForm(id,billId='',planId=''){if(!requireBills())return;const t=state.transactions.find(t=>t.id===id)||{billId:billId||state.bills[0].id,type:'Payment',date:T.today(),amount:null,account:'Personal',planId,eligible:false};if(planId&&!id)t.amount=T.planInfo(state,state.plans.find(p=>p.id===planId)).nextAmount;form(id?'Edit transaction':'Add transaction','transaction',id,select('billId','Medical bill',billOptions(),t.billId)+select('type','Transaction type',['Payment','Provider refund','Reimbursement'],t.type)+amount('amount','Amount · USD',t.amount,true)+field('date','Transaction date',t.date,'date','required')+select('account','Account',['Personal','HSA','FSA','Other'],t.account)+select('eligible','Marked as HSA / FSA eligible',[['false','No / not classified'],['true','Yes — classified by me']],String(t.eligible))+field('reference','Receipt / reference',t.reference)+select('planId','Apply to payment plan',[['','No payment plan'],...state.plans.filter(p=>p.billId===t.billId).map(p=>[p.id,p.frequency+' · '+cash(p.installment)])],t.planId||'')+textarea('notes','Transaction notes',t.notes),'Provider refunds reverse your payments. Reimbursements are recorded separately.');}
function policyForm(id){const p=state.policies.find(p=>p.id===id)||{year:Number(T.today().slice(0,4)),deductible:0,deductibleMet:0,oop:0,oopMet:0,asOf:T.today()};form(id?'Edit insurance plan':'Add insurance plan','policy',id,field('name','Plan name',p.name,'text','required maxlength="200"')+field('member','Member / family reference',p.member)+field('year','Plan year',p.year,'number','min="2000" max="2200" required')+field('asOf','Confirmed as of',p.asOf,'date','required')+amount('deductible','Annual deductible · USD',p.deductible,true)+amount('deductibleMet','Deductible met · USD',p.deductibleMet,true)+amount('oop','Out-of-pocket maximum · USD',p.oop,true)+amount('oopMet','Out-of-pocket met · USD',p.oopMet,true)+textarea('notes','Plan notes',p.notes),'Use the limits and confirmed totals from your insurer.');}
function appealForm(id,billId=''){if(!requireBills())return;const a=state.appeals.find(a=>a.id===id)||{billId:billId||state.bills[0].id,date:T.today(),action:'Called insurer'};form(id?'Edit appeal activity':'Log appeal activity','appeal',id,select('billId','Medical bill',billOptions(),a.billId)+field('date','Activity date',a.date,'date','required')+field('action','Action / outcome',a.action,'text','required maxlength="200"')+field('reference','Reference number',a.reference)+textarea('notes','Conversation, documents, or next steps',a.notes));}
function planForm(id){if(!requireBills())return;const p=state.plans.find(p=>p.id===id)||{billId:state.bills[0].id,total:null,installment:null,startDate:T.today(),frequency:'Monthly'};form(id?'Edit payment plan':'Add payment plan','plan',id,select('billId','Medical bill',billOptions(),p.billId)+select('frequency','Frequency',['Monthly','Weekly','Every 2 weeks'],p.frequency)+amount('total','Agreed plan total · USD',p.total,true)+amount('installment','Installment amount · USD',p.installment,true)+field('startDate','First payment due',p.startDate,'date','required')+textarea('notes','Agreement notes',p.notes),'Only payments explicitly assigned to this plan advance its schedule.');}

function profileLetters(settings=state.settings){
  if(settings.profileInitials)return settings.profileInitials.toLocaleUpperCase();
  const words=(settings.profileName||'Personal').trim().split(/\s+/);
  const first=Array.from(words[0]||'P')[0],last=words.length>1?Array.from(words[words.length-1])[0]:'';
  return Array.from((first+last).toLocaleUpperCase()).slice(0,2).join('');
}
function renderProfile(){
  const name=state.settings.profileName||'Personal',avatar=$('.avatar');
  avatar.textContent=profileLetters();
  avatar.setAttribute('aria-label','Edit profile: '+name);
  avatar.setAttribute('title',name+' · Edit profile');
}
function profileForm(){
  form('Your profile','profile','',
    '<div class="profile-preview full"><span class="profile-preview-avatar" aria-hidden="true">'+esc(profileLetters())+'</span><div><strong>'+esc(state.settings.profileName||'Personal')+'</strong><p class="hint">Make this workspace yours.</p></div></div>'+
    field('profileName','Display name',state.settings.profileName||'Personal','text','required maxlength="60" autocomplete="nickname"')+
    field('profileInitials','Initials (optional)',state.settings.profileInitials||'','text','maxlength="2" autocapitalize="characters"')+
    '<p class="hint full">Use up to two letters or numbers, or leave initials blank to use your display name.</p>',
    'Choose the name and initials shown in your workspace.');
}

function contactForm(id){const c=state.contacts.find(c=>c.id===id)||{type:'Provider'};form(id?'Edit contact':'Add contact','contact',id,field('name','Contact / organization',c.name,'text','required maxlength="200"')+select('type','Contact type',['Provider','Insurance'],c.type)+field('phone','Phone',c.phone,'tel')+field('email','Email',c.email,'email')+field('address','Address / department',c.address)+textarea('notes','Contact notes',c.notes));}
function detail(id){const b=state.bills.find(b=>b.id===id);if(!b)return;const bal=T.balance(state,b);show(modalHead(esc(b.provider),esc(b.patient)+' · '+esc(b.category)+' · '+fmtDate(b.serviceDate))+'<div class="actions">'+statusTag(b.status)+(T.review(state,b)?'<span class="tag amber">⚠ Review required</span>':'')+'</div><div class="detail-numbers">'+[['Billed',cash(b.billed)],['Allowed',b.allowed===null?'Unknown':cash(b.allowed)],['Insurance paid',cash(b.insurancePaid)],['Still owed',bal===null?'Unknown':cash(bal)]].map(([l,v])=>'<div><small>'+l+'</small><strong>'+v+'</strong></div>').join('')+'</div><div class="detail-section"><h3>Bill & EOB comparison</h3><div class="row"><span>EOB patient responsibility</span><strong>'+(b.patientOwes===null?'Not entered':cash(b.patientOwes))+'</strong></div><div class="row"><span>Your net payments</span><strong>'+cash(T.paid(state,b.id))+'</strong></div><div class="row"><span>Current provider balance</span><strong>'+(b.providerBalance===null?'Not entered':cash(b.providerBalance))+'</strong></div>'+(T.credit(state,b)?'<p>Potential credit: '+cash(T.credit(state,b))+'</p>':'')+'<p class="hint">The provider balance is entered manually from your latest statement. Update it when the provider posts payments.</p></div><div class="detail-section"><h3>Claim '+esc(b.claimNumber||'—')+'</h3><p>EOB: '+esc(b.eobNumber||'Not entered')+' · '+fmtDate(b.eobDate)+'</p><p>Bill due: '+fmtDate(b.dueDate)+'</p>'+(b.attachment?btn('↓ Download EOB','download-eob',b.id):'')+'</div><div class="detail-section"><h3>Denial & appeal</h3><p>'+esc(b.denialReason||'No denial reason recorded.')+'</p><p>Deadline: '+fmtDate(b.appealDue)+' · Follow-up '+(b.appealClosed?'closed':'open')+'</p>'+state.appeals.filter(a=>a.billId===id).map(a=>'<div class="row"><div><strong>'+esc(a.action)+'</strong><small>'+fmtDate(a.date)+' · '+esc(a.reference)+'</small><p>'+esc(a.notes)+'</p></div></div>').join('')+'</div>'+photoGallery(b)+(typeof FeatureKit==='undefined'?'':'<div class="actions">'+btn('Compare documents','compare-bill',b.id)+btn('Claim timeline','timeline-bill',b.id)+btn('Add document','new-document',b.id)+'</div>')+'<div class="detail-section"><h3>Notes</h3><p>'+esc(b.notes||'No notes yet.')+'</p></div><div class="detail-section"><h3>Transactions</h3>'+transactionTable(state.transactions.filter(t=>t.billId===id))+'</div><div class="actions">'+btn('Edit bill','edit-bill',id,'primary')+btn('Add payment','bill-pay',id)+btn('Log appeal','bill-appeal',id)+btn('Delete bill','delete-bill',id,'danger')+'</div>');}


function download(content,name,type){const url=URL.createObjectURL(content instanceof Blob?content:new Blob([content],{type}));if(typeof FeatureKit!=='undefined')FeatureKit.trackBlob(url);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function confirmAction(title,message,callback){show(modalHead(title)+'<p>'+message+'</p><div class="modal-actions">'+btn('Cancel','close')+'<button class="button primary" id="confirm-action">Confirm</button></div>');$('#confirm-action').onclick=async()=>{try{await callback();}catch(e){toast(e.message);}};}
async function submitRecord(formEl){
if(typeof FeatureKit!=='undefined'&&await FeatureKit.submit(formEl))return;
const f=new FormData(formEl),kind=formEl.dataset.kind,id=formEl.dataset.id||T.uid(),v=n=>String(f.get(n)||'').trim(),n=name=>T.dollars(v(name)),nullable=name=>v(name)===''?null:n(name);

if(kind==='currency-settings'){const code=v('currency').toUpperCase();if(!T.validCurrency(code))throw new Error('Enter a supported three-letter currency code, such as USD, EUR, GBP or RON.');if(code!==T.currency(state)&&(state.bills.length||state.transactions.length||state.policies.length||state.plans.length)&&!f.get('confirmCurrency'))throw new Error('Confirm that amounts will be relabeled without conversion.');const next=structuredClone(state);next.settings.currency=code;if(storageError)throw new Error('Restore access to saved data before changing currency.');if(await save(next)){$('#dialog').close();render();toast('Workspace currency saved. Amounts were not converted.');}return;}
if(kind==='profile'){
  const next=structuredClone(state);
  next.settings.profileName=v('profileName');
  next.settings.profileInitials=v('profileInitials').toLocaleUpperCase();
  T.validate(next);
  if(storageError)throw new Error('Restore access to saved data before editing your profile.');
  if(await save(next)){$('#dialog').close();render();toast('Profile saved.');$('.avatar').focus();}
  return;
}

let record;
if(kind==='bill'){if(photoBusy)throw new Error('Wait for the photos to finish preparing before saving.');const existing=state.bills.find(b=>b.id===id);let attachment=existing?.attachment||null;if(f.get('removeAttachment'))attachment=null;const file=f.get('attachment');if(file?.size){if(file.size>600*1024||!['application/pdf','image/png','image/jpeg'].includes(file.type))throw new Error('Choose a PDF, PNG, or JPG no larger than 600 KB.');attachment={name:file.name,data:await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read attachment.'));reader.readAsDataURL(file);})};}record={...existing,id,...(typeof FeatureKit==='undefined'?{}:{memberId:v('memberId')}),provider:v('provider'),patient:v('patient'),...(typeof FeatureKit==='undefined'?{}:FeatureKit.patientValue(f)),category:v('category'),serviceDate:v('serviceDate'),dueDate:v('dueDate'),policyId:v('policyId'),billed:n('billed'),allowed:nullable('allowed'),insurancePaid:n('insurancePaid'),patientOwes:nullable('patientOwes'),providerBalance:nullable('providerBalance'),claimNumber:v('claimNumber'),status:v('status'),eobNumber:v('eobNumber'),eobDate:v('eobDate'),appealDue:v('appealDue'),appealClosed:v('appealClosed')==='true',denialReason:v('denialReason'),notes:v('notes'),attachment,photos:photoDraftBillId===(formEl.dataset.id||'')?structuredClone(photoDraft):structuredClone(existing?.photos||[])};}
if(kind==='transaction'){record={id,billId:v('billId'),type:v('type'),amount:n('amount'),date:v('date'),account:v('account'),eligible:v('eligible')==='true',reference:v('reference'),planId:v('planId'),notes:v('notes')};if(record.type==='Reimbursement'&&record.planId)throw new Error('Reimbursements cannot be assigned to a provider payment plan.');if(record.type==='Provider refund'){const other=structuredClone(state);other.transactions=other.transactions.filter(t=>t.id!==id);if(record.amount>T.paid(other,record.billId))throw new Error('A provider refund cannot exceed recorded net patient payments for this bill.');if(record.planId&&record.amount>T.planInfo(other,other.plans.find(p=>p.id===record.planId)).paid)throw new Error('The refund exceeds payments allocated to this plan.');}}
if(kind==='policy')record={id,name:v('name'),member:v('member'),year:Number(v('year')),deductible:n('deductible'),deductibleMet:n('deductibleMet'),oop:n('oop'),oopMet:n('oopMet'),asOf:v('asOf'),notes:v('notes')};
if(kind==='appeal')record={id,billId:v('billId'),date:v('date'),action:v('action'),reference:v('reference'),notes:v('notes')};
if(kind==='plan'){record={id,billId:v('billId'),total:n('total'),installment:n('installment'),startDate:v('startDate'),frequency:v('frequency'),notes:v('notes')};if(!record.total||!record.installment)throw new Error('Plan and installment amounts must be greater than zero.');if(record.installment>record.total)throw new Error('An installment cannot exceed the agreed total.');}
if(kind==='contact')record={id,name:v('name'),type:v('type'),phone:v('phone'),email:v('email'),address:v('address'),notes:v('notes')};
const collection={bill:'bills',transaction:'transactions',policy:'policies',appeal:'appeals',plan:'plans',contact:'contacts'}[kind];
const next=structuredClone(state),index=next[collection].findIndex(x=>x.id===id);if(index<0)next[collection].push(record);else next[collection][index]=record;if(typeof FeatureKit!=='undefined')FeatureKit.recordEvent(next,kind,record);T.validate(next);
for(const b of next.bills){if(T.paid(next,b.id)<0)throw new Error('This change would make provider refunds exceed recorded payments.');}
for(const p of next.plans){const info=T.planInfo(next,p);if(info.paid<0)throw new Error('This change would make a payment plan’s refunds exceed its payments.');}
if(storageError)throw new Error('Restore a valid backup before editing.');
if(await save(next)){$('#dialog').close();render();toast('Record saved on this device.');}
}
function removeRecord(kind,id){const collection={bill:'bills',transaction:'transactions',policy:'policies',appeal:'appeals',plan:'plans',contact:'contacts'}[kind];const extra=kind==='bill'?' This also removes its payments, appeal history, payment plans, and attachment.':kind==='policy'?' Linked bills will keep their amounts and lose this plan reference.':kind==='plan'?' Recorded transactions are retained and unlinked from this plan.':'';confirmAction('Delete '+kind+'?','This cannot be undone.'+extra,async()=>{const next=structuredClone(state);next[collection]=next[collection].filter(x=>x.id!==id);if(typeof FeatureKit!=='undefined')FeatureKit.cascade(next,kind,id);if(kind==='bill'){next.transactions=next.transactions.filter(t=>t.billId!==id);next.appeals=next.appeals.filter(a=>a.billId!==id);next.plans=next.plans.filter(p=>p.billId!==id);}if(kind==='policy')next.bills.forEach(b=>{if(b.policyId===id)b.policyId='';});if(kind==='plan')next.transactions.forEach(t=>{if(t.planId===id)t.planId='';});if(next.bills.some(b=>T.paid(next,b.id)<0)||next.plans.some(p=>T.planInfo(next,p).paid<0)){toast('Remove the related refund first; refunds cannot exceed recorded payments.');return;}if(storageError){toast('Restore a valid backup before editing.');return;}if(await save(next)){$('#dialog').close();render();toast('Record deleted.');}});}
async function restoreFile(file){if(typeof FeatureKit!=='undefined')return FeatureKit.restore(file);if(!file)return;try{if(file.size>8*1024*1024)throw new Error('Backup is too large (maximum 8 MB).');const next=T.validate(JSON.parse(await file.text()));confirmAction('Restore this backup?','Replace current data with <strong>'+next.bills.length+' bills, '+next.transactions.length+' transactions, '+next.appeals.length+' appeal entries, '+next.plans.length+' payment plans, '+next.policies.length+' insurance plans, and '+next.contacts.length+' contacts</strong>? Export your current backup first if you want to keep it.',async()=>{if(await save(next)){$('#dialog').close();render();toast('Backup restored.');}});}catch(e){toast('Backup not restored: '+e.message);}}
document.addEventListener('submit',async e=>{if(e.target.id!=='record-form')return;e.preventDefault();const submit=e.target.querySelector('[type="submit"]');submit.disabled=true;try{await submitRecord(e.target);}catch(err){$('#form-error').textContent=err.message;}finally{submit.disabled=false;}});
document.addEventListener('input',e=>{if(e.target.id==='search'){const position=e.target.selectionStart;search=e.target.value;render();$('#search').focus();$('#search').setSelectionRange(position,position);}});
document.addEventListener('change',e=>{if(e.target.id==='photo-input'){const input=e.target,session=photoSession;addPhotoFiles(Array.from(input.files)).catch(err=>{if(session!==photoSession)return;const status=$('#photo-status');if(status)status.textContent=err.message;toast(err.message);}).finally(()=>{input.value='';});return;}if(e.target.id==='filter'){filter=e.target.value;render();}if(e.target.id==='restore'){restoreFile(e.target.files[0]);e.target.value='';}if(e.target.name==='billId'&&e.target.form?.dataset.kind==='transaction'){const selectEl=e.target.form.elements.planId;selectEl.innerHTML='<option value="">No payment plan</option>'+state.plans.filter(p=>p.billId===e.target.value).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.frequency)+' · '+cash(p.installment)+'</option>').join('');}});

let mobileMenuOpen=false;
function setMobileMenu(open,restoreFocus=false){
  mobileMenuOpen=Boolean(open);
  $('.sidebar').classList.toggle('mobile-menu-open',mobileMenuOpen);
  const toggle=$('#mobile-menu-toggle');
  toggle.setAttribute('aria-expanded',String(mobileMenuOpen));
  toggle.setAttribute('aria-label',mobileMenuOpen?'Close navigation menu':'Open navigation menu');
  $('#mobile-menu-label').textContent=mobileMenuOpen?'Close':'Menu';
  if(!mobileMenuOpen&&restoreFocus)toggle.focus();
}
$('#nav').onclick=e=>{if(e.target.closest('a[href^="#"]')&&mobileMenuOpen){setMobileMenu(false);$('#main').focus({preventScroll:true});}};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mobileMenuOpen){e.preventDefault();setMobileMenu(false,true);}});
document.addEventListener('pointerdown',e=>{if(mobileMenuOpen&&!e.target.closest('.sidebar'))setMobileMenu(false);});
const desktopNavigation=window.matchMedia?.('(min-width: 901px)');
desktopNavigation?.addEventListener('change',e=>{if(e.matches)setMobileMenu(false);});

document.addEventListener('click',async e=>{
const button=e.target.closest('[data-action]');if(!button)return;const {action,id}=button.dataset;
if(typeof FeatureKit!=='undefined'&&!['mobile-menu','close'].includes(action)){try{if(await FeatureKit.action(action,id,button))return;}catch(err){toast(err.message);return;}}
if(action==='mobile-menu'){setMobileMenu(!mobileMenuOpen);return;}
if(action==='close'){photoSession++;photoBusy=false;$('#dialog').close();return;}
if(action==='view-photo'){showPhoto(id,Number(button.dataset.photoIndex));return;}
if(action==='download-photo'){const p=recordPhotos(state.bills.find(b=>b.id===id)||{})[Number(button.dataset.photoIndex)];if(p){const [header,data]=p.data.split(',');const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));download(new Blob([bytes],{type:header.slice(5).split(';')[0]}),p.name);}return;}
if(action==='photo-first'||action==='photo-remove'){if(photoBusy){toast('Wait for photos to finish preparing.');return;}const index=Number(button.dataset.photoIndex);if(!Number.isInteger(index)||index<0||index>=photoDraft.length)return;if(action==='photo-remove')photoDraft.splice(index,1);else photoDraft.unshift(...photoDraft.splice(index,1));renderPhotoDraft();return;}
if(action==='reload'){location.reload();return;}
const forms={bill:billForm,transaction:transactionForm,policy:policyForm,appeal:appealForm,plan:planForm,contact:contactForm,profile:profileForm};
if(action.startsWith('new-')||action.startsWith('edit-')){forms[action.split('-')[1]]?.(id);return;}
if(action.startsWith('delete-')){removeRecord(action.split('-')[1],id);return;}
if(action==='detail')detail(id);
if(action==='bill-pay')transactionForm('',id);
if(action==='bill-appeal')appealForm('',id);
if(action==='plan-pay'){const p=state.plans.find(p=>p.id===id);if(!T.planInfo(state,p).remaining){toast('This plan is fully paid.');return;}transactionForm('',p.billId,id);}
if(action==='text-size'){
  if(!['small','medium','large'].includes(id))return;
  if(await mutate(s=>s.settings.textSize=id)){render();$('[data-action="text-size"][data-id="'+id+'"]')?.focus();toast('Text size updated.');}
  return;
}
if(action==='theme'){if(await mutate(s=>s.settings.theme=s.settings.theme==='light'?'dark':'light'))render();}
if(action==='report'){location.hash='reports';}
if(action==='print')window.print();
if(action==='review'){filter='Review required';location.hash='bills';if(page==='bills')render();}
if(action==='backup'){try{if(storageIssue==='unavailable'){toast('Original data cannot be accessed while browser storage is blocked. Allow storage and reload first.');return;}const data=storageIssue==='invalid'?rawStored:JSON.stringify(state,null,2);download(data??'{}','trackly-backup-'+T.today()+'.json','application/json');toast('Backup download started.');}catch(err){toast('Unable to read browser storage: '+err.message);}}
if(action==='download-eob'){const a=state.bills.find(b=>b.id===id)?.attachment;if(a){const [header,data]=a.data.split(',');const raw=atob(data),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));download(new Blob([bytes],{type:header.slice(5).split(';')[0]}),a.name);}}
if(action==='currency-open'){currencyForm();return;}
if(action==='load-demo'||action==='clear'){if(storageError){toast('Export the original data and restore a valid backup first.');return;}confirmAction(action==='clear'?'Start with empty records?':'Load seven sample records?','This replaces all current records. Download a backup first to keep them.',async()=>{let next=action==='clear'?T.empty():T.showcase();if(typeof FeatureKit!=='undefined')next=await FeatureKit.prepareExamples(next);next.settings={...state.settings};if(await save(next)){$('#dialog').close();location.hash='dashboard';render();toast(action==='clear'?'Your workspace is ready.':'Seven English sample records loaded.');}});}
if(['prev-month','next-month','today-month'].includes(action)){if(action==='today-month')month=T.today().slice(0,7);else{const d=new Date(month+'-01T12:00:00');d.setMonth(d.getMonth()+(action==='next-month'?1:-1));month=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}render();}
if(action==='offline-check'){try{const registration=await navigator.serviceWorker?.getRegistration();const assets=await caches.open('trackly-shell-v17');const cached=await assets.match('./index.html');toast(registration?.active&&cached?'App files are cached and ready for offline use.':'Offline setup is not ready. Open from localhost or HTTPS, then reload.');}catch{toast('Offline installation requires localhost or HTTPS.');}}
});
$('#theme').onclick=async()=>{if(await mutate(s=>s.settings.theme=s.settings.theme==='light'?'dark':'light'))render();};
window.addEventListener('hashchange',()=>{setMobileMenu(false);search='';if(location.hash!=='#bills')filter='All';render();window.scrollTo(0,0);});
window.addEventListener('storage',e=>{if(typeof FeatureKit!=='undefined')return;if(e.key!==KEY&&e.key!==null)return;if($('#dialog').open){toast('Records changed in another tab. Close this form and reload before saving.');storageError=true;storageIssue='changed';return;}rawStored=e.newValue;try{state=e.newValue===null?T.empty():T.validate(JSON.parse(e.newValue));storageError=false;storageIssue='';render();}catch{storageError=true;storageIssue='invalid';render();}});
const connection=()=>{$('#offline-status').textContent=navigator.onLine?'On-device storage':'Offline · on-device storage';};
window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;$('#install').hidden=false;});
$('#install').onclick=async()=>{if(installEvent){await installEvent.prompt();installEvent=null;$('#install').hidden=true;}};
window.addEventListener('appinstalled',()=>{$('#install').hidden=true;toast('TracklyApp installed.');});
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>toast('Offline cache could not be installed. Reload from localhost or HTTPS.'));
if(typeof FeatureKit==='undefined')render();else FeatureKit.boot();


