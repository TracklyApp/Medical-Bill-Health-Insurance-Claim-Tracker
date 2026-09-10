(function(root){
'use strict';
const T=root.Trackly,baseValidate=T.validate;
const collections=['members','actions','activity','documents'];
function prepare(value){
 const s=structuredClone(value);
 for(const key of collections)s[key]??=[];
 for(const b of s.bills){
  if(!s.familyReady&&!b.memberId){let member=s.members.find(m=>m.name===b.patient);if(!member){member={id:T.uid(),name:b.patient,relationship:'Family member',color:'#6e9680',photo:null};s.members.push(member);}b.memberId=member.id;}
 }
 s.familyReady=1;
 if(s.demo&&!s.featureExamples){
  s.members.forEach((m,i)=>{m.relationship=i?'Partner':'Self';m.color=i?'#9380ab':'#6e9680';});
  const b=s.bills[0],other=s.bills.find(x=>x.status==='Denied')||b;
  if(b){
   s.actions.push({id:'sample-action-call',billId:b.id,title:'Call the billing department',due:T.today(),priority:'High',done:false,source:'manual',notes:'Sample task: ask for an itemized statement.'});
   s.actions.push({id:'sample-action-check',billId:other.id,title:'Gather supporting appeal documents',due:T.addPeriod(T.today(),1,'Weekly'),priority:'High',done:false,source:'manual',notes:'Sample task: collect the EOB and claim letter.'});
   s.actions.push({id:'sample-action-done',billId:b.id,title:'Check the insurance payment',due:T.today(),priority:'Normal',done:true,source:'manual',notes:'Sample completed task.'});
   s.activity.push({id:'sample-event-1',billId:b.id,date:T.addPeriod(T.today(),-1,'Weekly'),title:'Claim submitted',notes:'Fictional submission confirmation.',documentId:''},{id:'sample-event-2',billId:b.id,date:T.today(),title:'Billing department contacted',notes:'Asked for an itemized bill. Reference SAMPLE-101.',documentId:''},{id:'sample-event-3',billId:other.id,date:T.today(),title:'Appeal documents requested',notes:'Fictional follow-up; waiting for the provider response.',documentId:''});
  }
  for(const bill of s.bills.slice(0,3)){const photo=bill.photos?.[0];if(photo)s.documents.push({id:'sample-document-'+bill.id,billId:bill.id,type:'Bill',name:photo.name,mime:'image/jpeg',data:photo.data,date:T.today(),notes:'Fictional example document.'});}
  for(const [billId,id,total,installment] of [['bill-005','sample-plan-1',70000,17500],['bill-006','sample-plan-2',20000,5000]]){
   if(s.bills.some(b=>b.id===billId)&&!s.plans.some(p=>p.billId===billId))s.plans.push({id,billId,total,installment,startDate:T.today(),frequency:'Monthly',notes:'Fictional installment agreement.'});
  }
  if(b&&!s.transactions.some(t=>t.id==='sample-reimbursement'))s.transactions.push({id:'sample-reimbursement',billId:b.id,type:'Reimbursement',amount:5000,date:T.today(),account:'HSA',eligible:true,reference:'SAMPLE-HSA',planId:'',notes:'Fictional reimbursement, separate from provider payments.'});
  for(const c of [{id:'sample-contact-insurer',type:'Insurance',name:'Blue Horizon Member Services',phone:'',email:'',address:'Claims department',notes:'Fictional insurance contact.'},{id:'sample-contact-dental',type:'Provider',name:'Oak & Willow Dental',phone:'',email:'',address:'Billing department',notes:'Fictional dental provider.'},{id:'sample-contact-lab',type:'Provider',name:'Clearview Diagnostics',phone:'',email:'',address:'Patient accounts',notes:'Fictional laboratory contact.'}])if(!s.contacts.some(x=>x.id===c.id))s.contacts.push(c);
  s.featureExamples=1;
 }
 if(s.demo&&!s.familyPhotoExamples&&root.TracklyFamilyPhotos){
  for(const member of s.members){const portrait=root.TracklyFamilyPhotos[member.name];if(!member.photo&&portrait)member.photo=portrait;}
  s.familyPhotoExamples=1;
 }
 return s;
}
function validate(s){
 baseValidate(s);
 const fail=msg=>{throw new Error(msg);};
 for(const key of collections){if(s[key]===undefined)continue;if(!Array.isArray(s[key])||s[key].length>10000)fail('Invalid '+key+' data.');const ids=new Set();for(const item of s[key]){if(!item||typeof item.id!=='string'||!item.id||item.id.length>200||ids.has(item.id))fail('Invalid '+key+' record ID.');ids.add(item.id);}}
 const text=(v,max=30000)=>{if(typeof v!=='string'||v.length>max)fail('Invalid text field.');};
 const bills=new Set(s.bills.map(b=>b.id)),members=new Set((s.members||[]).map(m=>m.id));
 const link=id=>{if(id&&!bills.has(id))fail('Linked medical bill was not found.');};
 for(const m of s.members||[]){text(m.name,120);if(!m.name.trim())fail('Enter a family member name.');text(m.relationship,80);if(!/^#[0-9a-f]{6}$/i.test(m.color))fail('Choose a valid profile color.');if(m.photo!==null&&(typeof m.photo!=='string'||m.photo.length>450000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(m.photo)))fail('Invalid family profile photo.');}
 for(const b of s.bills){if(b.memberId&&!members.has(b.memberId))fail('Linked family member was not found.');}
 for(const a of s.actions||[]){text(a.title,300);text(a.notes);text(a.billId,200);link(a.billId);if(!a.title.trim()||!T.validDate(a.due)||!['High','Normal','Low'].includes(a.priority)||typeof a.done!=='boolean'||!['manual','automatic'].includes(a.source))fail('Invalid action details.');}
 for(const e of s.activity||[]){text(e.title,300);text(e.notes);text(e.documentId,300);link(e.billId);if(!e.billId||!e.title.trim()||!T.validDate(e.date))fail('Invalid timeline event.');}
 for(const d of s.documents||[]){link(d.billId);text(d.name,250);text(d.notes);if(!d.name.trim()||!T.validDate(d.date)||!['Bill','EOB','Receipt','Appeal','Other'].includes(d.type)||!['application/pdf','image/jpeg','image/png','image/webp'].includes(d.mime)||typeof d.data!=='string'||d.data.length>36000000||!d.data.startsWith('data:'+d.mime+';base64,')||!/^[A-Za-z0-9+/=]+$/.test(d.data.split(',')[1]||''))fail('Invalid document file.');}
 return s;
}
function scope(s,memberId){
 if(!memberId||memberId==='all')return s;
 const bills=s.bills.filter(b=>b.memberId===memberId),ids=new Set(bills.map(b=>b.id));
 return {...s,bills,transactions:s.transactions.filter(t=>ids.has(t.billId)),appeals:s.appeals.filter(a=>ids.has(a.billId)),plans:s.plans.filter(p=>ids.has(p.billId)),actions:(s.actions||[]).filter(a=>ids.has(a.billId)),activity:(s.activity||[]).filter(e=>ids.has(e.billId)),documents:(s.documents||[]).filter(d=>ids.has(d.billId))};
}
function actions(s){
 const generated=[];
 for(const event of T.deadlines(s)){
  generated.push({id:'auto-'+event.type+'-'+event.billId+'-'+event.date,billId:event.billId,title:event.type+' · '+event.title,due:event.date,priority:event.type==='Appeal deadline'?'High':'Normal',done:false,source:'automatic',notes:'Based on the deadline entered in this record.'});
 }
 for(const b of s.bills){
  if(!b.eobNumber&&!b.eobDate&&b.patientOwes===null)generated.push({id:'auto-eob-'+b.id,billId:b.id,title:'Request the EOB · '+b.provider,due:b.dueDate||T.today(),priority:'Normal',done:false,source:'automatic',notes:'Patient responsibility has not been confirmed.'});
  if(b.status==='Denied'&&!b.appealClosed)generated.push({id:'auto-followup-'+b.id,billId:b.id,title:'Follow up on denied claim · '+b.provider,due:b.appealDue||T.today(),priority:'High',done:false,source:'automatic',notes:b.denialReason||'Review the denial notice and record your next step.'});
 }
 const overrides=new Map((s.actions||[]).map(a=>[a.id,a]));
 const list=generated.map(a=>overrides.get(a.id)||a),ids=new Set(list.map(a=>a.id));
 for(const a of s.actions||[])if(!ids.has(a.id))list.push(a);
 return list.sort((a,b)=>Number(a.done)-Number(b.done)||a.due.localeCompare(b.due));
}
function documents(s){
 const list=[...(s.documents||[])];
 for(const b of s.bills){
  if(b.attachment)list.push({id:'attachment:'+b.id,billId:b.id,type:'EOB',name:b.attachment.name,mime:b.attachment.data.slice(5).split(';')[0],data:b.attachment.data,date:b.eobDate||b.serviceDate,notes:'Attached EOB',virtual:true});
  for(const p of b.photos||[])list.push({id:'photo:'+b.id+':'+p.id,billId:b.id,type:'Other',name:p.name,mime:p.data.slice(5).split(';')[0],data:p.data,date:b.serviceDate,notes:'Record photo',virtual:true});
 }
 return list;
}
function timeline(s,billId){
 const b=s.bills.find(b=>b.id===billId);if(!b)return [];
 const events=[{id:'service:'+b.id,billId:b.id,date:b.serviceDate,title:'Medical service',notes:b.category+' · '+b.provider,source:'record',documentId:''}];
 if(b.eobDate)events.push({id:'eob:'+b.id,billId:b.id,date:b.eobDate,title:'EOB recorded',notes:b.eobNumber||'Explanation of Benefits',source:'record',documentId:b.attachment?'attachment:'+b.id:''});
 for(const t of s.transactions.filter(t=>t.billId===billId))events.push({id:'payment:'+t.id,billId,date:t.date,title:t.type+' · '+T.money(t.amount,T.currency(s)),notes:t.notes||t.reference,source:'transaction',documentId:''});
 for(const a of s.appeals.filter(a=>a.billId===billId))events.push({id:'appeal:'+a.id,billId,date:a.date,title:a.action,notes:a.notes,source:'appeal',documentId:''});
 for(const e of s.activity||[])if(e.billId===billId)events.push({...e,source:'activity'});
 return events.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}
function parseOCR(text){
 const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const value=label=>{const match=text.match(new RegExp('(?:'+label+')\\s*[:$]*\\s*\\$?([0-9][0-9,]*(?:\\.[0-9]{2})?)','i'));return match?T.dollars(match[1].replace(/,/g,'')):null;};
 const skip=/sample|not a real|for demonstration|for illustrative|billed|patient|insurance|statement|bill$|^date|^account/i;
 const provider=lines.find(x=>x.length>4&&/[a-z]/i.test(x)&&!skip.test(x))||'';
 const patient=text.match(/patient(?:\s+name)?\s*:?\s*\n?\s*([A-Za-z][A-Za-z .'-]{1,80})/i)?.[1]?.trim()||'';
 const iso=text.match(/\b(20\d{2})[-/](\d{2})[-/](\d{2})\b/);
 const us=text.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
 let serviceDate=iso?iso[1]+'-'+iso[2]+'-'+iso[3]:us?us[3]+'-'+us[1].padStart(2,'0')+'-'+us[2].padStart(2,'0'):'';
 if(serviceDate&&!T.validDate(serviceDate))serviceDate='';
 return {provider,patient,serviceDate,billed:value('billed(?:\\s+amount)?|total\\s+charges'),insurancePaid:value('insurance\\s+paid'),patientOwes:value('(?:EOB\\s+)?patient\\s+responsibility'),allowed:value('(?:insurance\\s+)?allowed'),status:/\bdenied\b/i.test(text)?'Denied':/\bapproved\b/i.test(text)?'Approved':'Pending'};
}
function reportScope(s,options){
 let result=scope(s,options.memberId);
 const ids=new Set(result.bills.filter(b=>(!options.from||b.serviceDate>=options.from)&&(!options.to||b.serviceDate<=options.to)&&(options.mode==='full'||!options.billIds||options.billIds.includes(b.id))).map(b=>b.id));
 return {...result,actions:(result.actions||[]).filter(a=>ids.has(a.billId)||(!a.billId&&(!options.memberId||options.memberId==='all')&&!options.from&&!options.to)),bills:result.bills.filter(b=>ids.has(b.id)),transactions:result.transactions.filter(t=>ids.has(t.billId)),appeals:result.appeals.filter(a=>ids.has(a.billId)),plans:result.plans.filter(p=>ids.has(p.billId)),documents:(result.documents||[]).filter(d=>ids.has(d.billId)),activity:(result.activity||[]).filter(a=>ids.has(a.billId))};
}
root.FeatureData={prepare,validate,scope,actions,documents,timeline,parseOCR,reportScope};
T.validate=validate;
})(globalThis);
