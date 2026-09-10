(function(root){
'use strict';
const statuses=['Pending','Approved','Partially Paid','Denied'];
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
const dollars=value=>Math.round((Number(value)||0)*100);
const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
const empty=()=>({version:1,settings:{theme:'light',textSize:'medium'},bills:[],transactions:[],appeals:[],plans:[],contacts:[],policies:[]});
const sum=(items,fn)=>items.reduce((total,item)=>total+fn(item),0);
function paid(state,id){return sum(state.transactions.filter(t=>t.billId===id),t=>t.type==='Payment'?t.amount:t.type==='Provider refund'?-t.amount:0);}
function balance(state,bill){return bill.patientOwes===null?null:Math.max(0,bill.patientOwes-paid(state,bill.id));}
function credit(state,bill){return bill.patientOwes===null?0:Math.max(0,paid(state,bill.id)-bill.patientOwes);}
function review(state,bill){return bill.status==='Denied'||(bill.providerBalance!==null&&balance(state,bill)!==null&&Math.abs(bill.providerBalance-balance(state,bill))>1);}
function totals(state){return {billed:sum(state.bills,b=>b.billed),insurance:sum(state.bills,b=>b.insurancePaid),paid:sum(state.bills,b=>paid(state,b.id)),owed:sum(state.bills,b=>balance(state,b)??0),unknown:state.bills.filter(b=>b.patientOwes===null).length,credit:sum(state.bills,b=>credit(state,b))};}
function addPeriod(date,n,frequency){const [y,m,d]=date.split('-').map(Number);const result=new Date(y,m-1,d,12);if(frequency==='Monthly'){result.setDate(1);result.setMonth(result.getMonth()+n);result.setDate(Math.min(d,new Date(result.getFullYear(),result.getMonth()+1,0).getDate()));}else result.setDate(result.getDate()+n*(frequency==='Weekly'?7:14));return [result.getFullYear(),String(result.getMonth()+1).padStart(2,'0'),String(result.getDate()).padStart(2,'0')].join('-');}
function planInfo(state,plan){const amount=sum(state.transactions.filter(t=>t.planId===plan.id),t=>t.type==='Payment'?t.amount:t.type==='Provider refund'?-t.amount:0);const remaining=Math.max(0,plan.total-amount);const completed=Math.max(0,Math.floor(amount/plan.installment));return {paid:amount,remaining,nextDue:remaining?addPeriod(plan.startDate,completed,plan.frequency):null,nextAmount:Math.min(remaining,plan.installment-Math.max(0,amount)%plan.installment)};}
function deadlines(state){const events=[];for(const b of state.bills){if(b.dueDate&&(balance(state,b)===null||balance(state,b)>0))events.push({date:b.dueDate,title:b.provider,type:'Bill due',billId:b.id});if(b.appealDue&&!b.appealClosed)events.push({date:b.appealDue,title:b.provider,type:'Appeal deadline',billId:b.id});}for(const p of state.plans){const info=planInfo(state,p);const bill=state.bills.find(b=>b.id===p.billId);if(info.nextDue&&bill)events.push({date:info.nextDue,title:bill.provider,type:'Plan payment',billId:bill.id});}return events.sort((a,b)=>a.date.localeCompare(b.date));}
function validDate(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;}
function validate(s){
const fail=msg=>{throw new Error(msg);};
if(!s||s.version!==1||!s.settings||!['light','dark'].includes(s.settings.theme))fail('Unsupported or invalid backup.');
if(s.settings.textSize!==undefined&&!['small','medium','large'].includes(s.settings.textSize))fail('Invalid text size preference.');
if(s.settings.profileName!==undefined&&(typeof s.settings.profileName!=='string'||!s.settings.profileName.trim()||s.settings.profileName.length>60))fail('Enter a display name between 1 and 60 characters.');
if(s.settings.profileInitials!==undefined&&(typeof s.settings.profileInitials!=='string'||!/^[\p{L}\p{N}]{0,2}$/u.test(s.settings.profileInitials)))fail('Use up to two letters or numbers for your initials.');
if(s.demo!==undefined&&typeof s.demo!=='boolean')fail('Invalid sample workspace marker.');
const collections=['bills','transactions','appeals','plans','contacts','policies'];
for(const key of collections){if(!Array.isArray(s[key])||s[key].length>10000)fail('Invalid '+key+' collection.');const ids=new Set();for(const r of s[key]){if(!r||typeof r.id!=='string'||!r.id||r.id.length>100||ids.has(r.id))fail('Invalid or duplicate record ID.');ids.add(r.id);}}
const str=(v,required=false)=>{if(typeof v!=='string'||v.length>30000||(required&&!v.trim()))fail('Missing or invalid text field.');};
const cash=(v,nullable=false)=>{if(nullable&&v===null)return;if(!Number.isSafeInteger(v)||v<0||v>100000000000)fail('Invalid monetary amount.');};
const date=(v,required=false)=>{if(!required&&v==='')return;if(!validDate(v))fail('Invalid date.');};
const billIds=new Set(s.bills.map(b=>b.id)),policyIds=new Set(s.policies.map(p=>p.id));
for(const b of s.bills){for(const k of ['provider','patient','category','claimNumber','policyId','denialReason','notes','eobNumber'])str(b[k],k==='provider'||k==='patient');date(b.serviceDate,true);date(b.dueDate);date(b.appealDue);date(b.eobDate);if(!statuses.includes(b.status)||typeof b.appealClosed!=='boolean')fail('Invalid claim status.');for(const k of ['billed','insurancePaid'])cash(b[k]);for(const k of ['allowed','patientOwes','providerBalance'])cash(b[k],true);if(b.policyId&&!policyIds.has(b.policyId))fail('Bill references a missing policy.');if(b.attachment!==null){const a=b.attachment;if(!a||typeof a.name!=='string'||a.name.length>250||typeof a.data!=='string'||a.data.length>850000||!/^data:(application\/pdf|image\/(png|jpeg));base64,[A-Za-z0-9+/=]+$/.test(a.data))fail('Invalid EOB attachment.');}}
for(const b of s.bills){
  if(b.photos===undefined)continue;
  if(!Array.isArray(b.photos)||b.photos.length>6)fail('Each record can contain up to 6 photos.');
  const photoIds=new Set();
  for(const p of b.photos){
    if(!p||typeof p.id!=='string'||!p.id||p.id.length>100||photoIds.has(p.id))fail('Invalid or duplicate photo ID.');
    photoIds.add(p.id);
    if(typeof p.name!=='string'||!p.name.trim()||p.name.length>250)fail('Invalid photo name.');
    if(typeof p.data!=='string'||p.data.length>450000||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.data))fail('Invalid photo. Use JPG, PNG, or WebP images.');
  }
}

for(const t of s.transactions){if(!billIds.has(t.billId))fail('Payment references a missing bill.');if(!['Payment','Provider refund','Reimbursement'].includes(t.type)||!['Personal','HSA','FSA','Other'].includes(t.account)||typeof t.eligible!=='boolean')fail('Invalid transaction.');cash(t.amount);if(!t.amount)fail('Transaction amount must be positive.');date(t.date,true);str(t.notes);str(t.reference);str(t.planId);if(t.planId&&!s.plans.some(p=>p.id===t.planId&&p.billId===t.billId))fail('Transaction references a missing payment plan.');}
for(const a of s.appeals){if(!billIds.has(a.billId))fail('Appeal references a missing bill.');date(a.date,true);for(const k of ['action','reference','notes'])str(a[k],k==='action');}
for(const p of s.plans){if(!billIds.has(p.billId))fail('Plan references a missing bill.');cash(p.total);cash(p.installment);if(!p.total||!p.installment)fail('Plan amounts must be positive.');date(p.startDate,true);if(!['Monthly','Weekly','Every 2 weeks'].includes(p.frequency))fail('Invalid payment frequency.');str(p.notes);}
for(const c of s.contacts){if(!['Provider','Insurance'].includes(c.type))fail('Invalid contact type.');for(const k of ['name','phone','email','address','notes'])str(c[k],k==='name');}
for(const p of s.policies){str(p.name,true);str(p.member);str(p.notes);if(!Number.isInteger(p.year)||p.year<2000||p.year>2200)fail('Invalid plan year.');for(const k of ['deductible','deductibleMet','oop','oopMet'])cash(p[k]);date(p.asOf,true);}
for(const t of s.transactions){if(t.type==='Reimbursement'&&t.planId)fail('Reimbursements cannot be allocated to payment plans.');}
for(const b of s.bills){if(paid(s,b.id)<0)fail('Provider refunds exceed recorded payments.');}
for(const p of s.plans){if(p.installment>p.total)fail('Installment exceeds plan total.');const net=sum(s.transactions.filter(t=>t.planId===p.id),t=>t.type==='Payment'?t.amount:t.type==='Provider refund'?-t.amount:0);if(net<0||net>p.total)fail('Allocated plan payments must be between zero and the agreed total.');}
return s;
}
function demo(){
const s=empty(),d=today(),year=Number(d.slice(0,4));s.demo=true;
s.policies=[{id:'policy-demo',name:'Blue Horizon · Family PPO',member:'DEMO-2026',year,deductible:200000,deductibleMet:125000,oop:600000,oopMet:248000,asOf:d,notes:'Fictional example. Values entered from insurer records.'}];
const bill=(id,provider,patient,category,billed,allowed,insurancePaid,patientOwes,status,delta)=>({id,provider,patient,category,billed,allowed,insurancePaid,patientOwes,status,providerBalance:patientOwes,serviceDate:addPeriod(d,-2,'Weekly'),dueDate:addPeriod(d,delta,'Weekly'),policyId:'policy-demo',claimNumber:'CLM-'+id.slice(-3),eobNumber:'EOB-'+id.slice(-3),eobDate:d,appealDue:'',appealClosed:false,denialReason:'',notes:'Fictional sample record.',attachment:null});
s.bills=[bill('bill-001','Westbrook Medical Center','Alex Morgan','Hospital',485000,290000,220000,70000,'Partially Paid',1),bill('bill-002','Oak & Willow Dental','Alex Morgan','Dentist',84000,62000,42000,20000,'Approved',2),bill('bill-003','Clearview Diagnostics','Jamie Morgan','Laboratory',36000,null,0,null,'Pending',3),bill('bill-004','Northside Specialists','Jamie Morgan','Specialist',125000,96000,0,96000,'Denied',2)];
s.bills[0].providerBalance=265000;s.bills[3].appealDue=addPeriod(d,1,'Weekly');s.bills[3].denialReason='Additional documentation requested.';
s.transactions=[{id:'tx-demo',billId:'bill-002',type:'Payment',amount:20000,date:d,account:'HSA',eligible:true,reference:'DEMO receipt',planId:'',notes:''}];s.bills[1].providerBalance=0;
s.appeals=[{id:'appeal-demo',billId:'bill-004',date:d,action:'Called insurer',reference:'DEMO-REF',notes:'Requested the missing documentation checklist.'}];
s.contacts=[{id:'contact-demo',type:'Provider',name:'Westbrook Medical Center',phone:'',email:'',address:'',notes:'Fictional provider — billing department.'}];
return s;
}

function showcase(){
  const s=demo(),date=today();
  for(const [sourceIndex,id] of [[0,'bill-005'],[1,'bill-006'],[2,'bill-007']]){
    const original=s.bills[sourceIndex];
    s.bills.push({...original,id,claimNumber:'CLM-'+id.slice(-3),eobNumber:original.status==='Pending'?'':'EOB-'+id.slice(-3),serviceDate:addPeriod(date,-1,'Weekly'),dueDate:addPeriod(date,2,'Weekly'),providerBalance:original.patientOwes,photos:[],notes:'Fictional sample record: a follow-up visit. The attached image is an illustrative sample document.'});
  }
  const photos=root.TracklySamplePhotos||{};
  const keys=['hospital','dental','laboratory','specialist','hospital','dental','laboratory'];
  s.bills.forEach((b,index)=>{const photo=photos[keys[index]];b.photos=photo?[{id:b.id+'-sample-photo',name:photo.name,data:photo.data}]:[];});
  s.sampleRevision=1;
  return s;
}
function upgradeSamples(current){
  if(!current.demo||current.sampleRevision===1||!root.TracklySamplePhotos)return current;
  const samples=showcase(),next=structuredClone(current);
  for(const sample of samples.bills){
    const existing=next.bills.find(b=>b.id===sample.id);
    if(existing){
      if(!existing.photos?.length&&existing.provider===sample.provider&&existing.patient===sample.patient&&existing.billed===sample.billed){
        existing.photos=structuredClone(sample.photos);
      }
    }else if(['bill-005','bill-006','bill-007'].includes(sample.id)){
      const added=structuredClone(sample);
      if(!next.policies.some(p=>p.id===added.policyId))added.policyId='';
      next.bills.push(added);
    }
  }
  next.sampleRevision=1;
  return validate(next);
}

root.Trackly={statuses,today,uid,dollars,money,empty,sum,paid,balance,credit,review,totals,planInfo,deadlines,validDate,validate,demo,showcase,upgradeSamples,addPeriod};
})(globalThis);
