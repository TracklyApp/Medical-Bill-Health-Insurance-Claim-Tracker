(function(root){
'use strict';
async function generate(state,options={},fontBytes){
 const {PDFDocument,StandardFonts,rgb}=root.PDFLib,T=root.Trackly;
 if(options.from&&options.to&&options.from>options.to)throw new Error('The end date must be on or after the start date.');
 const s=root.FeatureData.reportScope(state,options),doc=await PDFDocument.create();
 doc.registerFontkit(root.fontkit);
 const bytes=fontBytes||await fetch('./vendor/NotoSans-Regular.ttf').then(r=>{if(!r.ok)throw new Error('The report font is not available offline yet.');return r.arrayBuffer();});
 const font=await doc.embedFont(bytes,{subset:true}),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const W=595.28,H=841.89,M=42,CW=W-M*2,BOTTOM=56,ink=rgb(.08,.08,.08),muted=rgb(.28,.28,.28),rule=rgb(.7,.7,.7),pale=rgb(.95,.95,.95);
 const pages=[];let page,y,sectionName='Report overview';
 const full=options.mode==='full',money=value=>value===null||value===undefined?'Not confirmed':T.money(value,T.currency(state));
 const clean=value=>String(value??'').replace(/[\u0000-\u0008\u000b-\u001f]/g,'').replace(/[\u2011\u2013\u2014]/g,'-');
 function wrap(value,size=11,width=CW,type=font){
  const out=[];for(const block of clean(value).split('\n')){
   let line='';
   for(const word of block.split(/\s+/).filter(Boolean)){
    if(type.widthOfTextAtSize((line?line+' ':'')+word,size)<=width){line+=(line?' ':'')+word;continue;}
    if(line){out.push(line);line='';}
    for(const char of Array.from(word)){if(line&&type.widthOfTextAtSize(line+char,size)>width){out.push(line);line='';}line+=char;}
   }
   out.push(line);
  }
  return out.length?out:[''];
 }
 function newPage(){
  page=doc.addPage([W,H]);pages.push(page);
  page.drawText('TracklyApp | Medical & Insurance',{x:M,y:H-M,size:9,font:bold,color:ink});
  const date='Generated '+T.today();page.drawText(date,{x:W-M-font.widthOfTextAtSize(date,9),y:H-M,size:9,font,color:muted});
  page.drawLine({start:{x:M,y:H-M-11},end:{x:W-M,y:H-M-11},thickness:.7,color:rule});
  y=H-M-33;
 }
 function ensure(height){if(y-height<BOTTOM)newPage();}
 function paragraph(value,size=11,color=ink,gap=7){
  const rows=wrap(value,size);ensure(Math.min(rows.length,2)*size*1.42+gap);
  for(const row of rows){ensure(size*1.42);page.drawText(row,{x:M,y:y-size,size,font,color});y-=size*1.42;}y-=gap;
 }
 function section(title,reserve=90){
  sectionName=title;ensure(reserve+50);y-=12;
  page.drawText(title,{x:M,y:y-13,size:13,font:bold,color:ink});y-=23;
  page.drawLine({start:{x:M,y},end:{x:W-M,y},thickness:.7,color:rule});y-=11;
 }
 function table(headers,rows,widths,config={}){
  if(!rows.length)return;const size=config.size||10.5,leading=size*1.4,pad=8,headerSize=9.5;
  const headLines=headers?.map((h,i)=>wrap(h,headerSize,widths[i]-pad*2,bold));
  const headerHeight=headLines?Math.max(...headLines.map(x=>x.length))*13+16:0;
  function header(){
   if(!headLines)return;
   ensure(headerHeight+leading+16);
   page.drawRectangle({x:M,y:y-headerHeight,width:CW,height:headerHeight,color:pale});
   let x=M;
   headLines.forEach((lines,i)=>{lines.forEach((text,j)=>page.drawText(text,{x:x+pad,y:y-pad-headerSize-j*13,size:headerSize,font:bold,color:ink}));x+=widths[i];});
   y-=headerHeight;
  }
  ensure(headerHeight+leading+16);header();
  for(const row of rows){
   const cells=widths.map((w,i)=>wrap(row[i],size,w-pad*2));
   let offset=0;const total=Math.max(...cells.map(c=>c.length)),rowHeight=total*leading+16;
   if(rowHeight<=H-M-33-BOTTOM-headerHeight&&y-rowHeight<BOTTOM){newPage();header();}
   while(offset<total){
    let available=Math.floor((y-BOTTOM-16)/leading);
    if(available<1){newPage();header();available=Math.floor((y-BOTTOM-16)/leading);}
    const take=Math.min(total-offset,available),height=take*leading+16;let x=M;
    cells.forEach((lines,i)=>{lines.slice(offset,offset+take).forEach((text,j)=>{
     const align=config.align?.[i],tx=align==='right'?x+widths[i]-pad-font.widthOfTextAtSize(text,size):x+pad;
     page.drawText(text,{x:tx,y:y-pad-size-j*leading,size,font,color:ink});
    });x+=widths[i];});
    y-=height;page.drawLine({start:{x:M,y},end:{x:W-M,y},thickness:.4,color:rule});offset+=take;
    if(offset<total){newPage();header();}
   }
  }
  y-=12;
 }
 const equal=n=>Array(n).fill(CW/n);
 const pairRows=rows=>table(null,rows,[145,CW-145]);
 newPage();
 paragraph(full?'Full medical expense report':'Medical expense report',22,ink,10);
 const member=state.members?.find(m=>m.id===options.memberId);
 paragraph('Family: '+(member?.name||'All family members')+' | Currency: '+T.currency(state),11);
 paragraph('Service period: '+(!options.from&&!options.to?'All time':(options.from||'Any start date')+' to '+(options.to||'Any end date')),11);
 if(state.demo)paragraph('SAMPLE DATA - Fictional example records',10,muted);
 paragraph('Both period endpoints are included. Linked payments and claim history are shown in full. Balances reflect current recorded information.',10,muted,9);
 const totals=T.totals(s);
 section('Financial summary',100);
 table(['TOTAL BILLED','INSURANCE PAID','YOU PAID (NET)','STILL OWED'],[[money(totals.billed),money(totals.insurance),money(totals.paid),money(totals.owed)]],equal(4),{size:14});
 paragraph(totals.unknown+' record(s) have unconfirmed patient responsibility and are excluded from Still owed. You paid is net of provider refunds.',10,muted);
 section('Medical records at a glance',100);
 if(!s.bills.length)paragraph('No medical records match the selected filters.');
 else table(['PROVIDER / PATIENT','SERVICE DATE','BILLED','INSURANCE PAID','STILL OWED'],s.bills.map(b=>[b.provider+'\n'+b.patient,b.serviceDate,money(b.billed),money(b.insurancePaid),money(T.balance(s,b))]),[177,75,82,85,CW-419],{size:10,align:['left','left','right','right','right']});
 for(let index=0;index<s.bills.length;index++){
  const b=s.bills[index];section('Medical record '+String(index+1).padStart(2,'0'),235);
  paragraph(b.provider,14,ink,5);
  paragraph(b.patient+' | '+b.category+' | Service date: '+b.serviceDate,11,muted,9);
  table(['BILLED','INSURANCE ALLOWED','INSURANCE PAID'],[[money(b.billed),money(b.allowed),money(b.insurancePaid)]],equal(3),{size:12});
  table(['PATIENT RESPONSIBILITY','YOU PAID (NET)','STILL OWED'],[[money(b.patientOwes),money(T.paid(s,b.id)),money(T.balance(s,b))]],equal(3),{size:12});
  if(full){
   pairRows([
    ['Claim', (b.claimNumber||'Not entered')+' | '+b.status],
    ['EOB reference / date',(b.eobNumber||'Not entered')+' | '+(b.eobDate||'Not entered')],
    ['Provider balance',money(b.providerBalance)],
    ['Bill due / review',(b.dueDate||'Not entered')+' | '+(T.review(s,b)?'Review required':'No discrepancy flagged')],
    ...(b.denialReason?[['Denial reason',b.denialReason]]:[]),
    ...(b.appealDue||b.status==='Denied'?[['Appeal deadline / status',(b.appealDue||'Not entered')+' | '+(b.appealClosed?'Closed':'Open')]]:[])
   ]);
  }else paragraph('Claim: '+(b.claimNumber||'Not entered')+' | Status: '+b.status,11);
  if((full||options.notes!==false)&&b.notes){paragraph('Claim notes',11,ink,3);paragraph(b.notes,11);}
  if(full||options.timeline){
   const events=root.FeatureData.timeline(s,b.id);
   if(events.length){paragraph('Claim timeline',11,ink,5);table(['DATE','EVENT','NOTES / REFERENCE'],events.map(e=>[e.date,e.title,e.notes||'-']),[78,164,CW-242],{size:10});}
  }
 }
 if(options.payments!==false){
  section('Payments, refunds & reimbursements',110);
  if(!s.transactions.length)paragraph('No recorded transactions.');
  else table(['DATE','PROVIDER / TYPE','ACCOUNT','AMOUNT','REFERENCE'],s.transactions.map(t=>[t.date,(s.bills.find(b=>b.id===t.billId)?.provider||'')+'\n'+t.type+(full&&t.notes?'\n'+t.notes:''),t.account,money(t.amount),t.reference||'-']),[74,175,65,86,CW-400],{size:10,align:['left','left','left','right','left']});

 }
 if(full){
  const allWorkspace=(!options.memberId||options.memberId==='all')&&!options.from&&!options.to;
  const memberIds=new Set(s.bills.map(b=>b.memberId)),policyIds=new Set(s.bills.map(b=>b.policyId));
  const members=(state.members||[]).filter(m=>allWorkspace||memberIds.has(m.id));
  section('Family members');
  if(!members.length)paragraph('No linked family profiles.');
  else table(['NAME','RELATIONSHIP'],members.map(m=>[m.name,m.relationship]),[CW*.6,CW*.4]);
  const policies=state.policies.filter(p=>allWorkspace||policyIds.has(p.id));
  section('Insurance coverage',160);
  if(!policies.length)paragraph('No linked insurance coverage.');
  for(const p of policies){
   ensure(155);paragraph(p.name+' | '+p.year,12);
   pairRows([['Member / updated',p.member+' | '+p.asOf],['Deductible',money(p.deductibleMet)+' of '+money(p.deductible)],['Out-of-pocket maximum',money(p.oopMet)+' of '+money(p.oop)]]);
   if(p.notes)paragraph(p.notes,10,muted);
  }
  section('Denials & appeal history');
  if(!s.appeals.length)paragraph('No recorded appeal events.');
  else table(['DATE','PROVIDER / ACTION','REFERENCE / NOTES'],s.appeals.map(a=>[a.date,(s.bills.find(b=>b.id===a.billId)?.provider||'')+'\n'+a.action,(a.reference||'No reference')+(a.notes?'\n'+a.notes:'')]),[78,177,CW-255]);
  section('Payment plans',180);
  if(!s.plans.length)paragraph('No linked payment plans.');
  for(const p of s.plans){
   const info=T.planInfo(s,p);ensure(175);
   paragraph((s.bills.find(b=>b.id===p.billId)?.provider||'')+' | '+p.frequency,12);
   table(['AGREED TOTAL','INSTALLMENT','PAID','REMAINING'],[[money(p.total),money(p.installment),money(info.paid),money(info.remaining)]],equal(4));
   paragraph('Started: '+p.startDate+' | Next payment: '+(info.nextDue||'Complete'),10,muted);
   if(p.notes)paragraph(p.notes,10);
  }
  section('HSA / FSA expenses');
  const expenses=s.transactions.filter(t=>t.account==='HSA'||t.account==='FSA');
  if(!expenses.length)paragraph('No linked HSA or FSA transactions.');
  else table(['DATE','ACCOUNT','TYPE','AMOUNT','MARKED ELIGIBLE'],expenses.map(t=>[t.date,t.account,t.type,money(t.amount),t.eligible?'Yes':'No']),[78,70,133,100,CW-381],{align:['left','left','left','right','left']});
  section('Actions & deadlines');
  const actions=root.FeatureData.actions(s);
  if(!actions.length)paragraph('No linked actions or deadlines.');
  else table(['DUE DATE','STATUS / PRIORITY','ACTION / NEXT STEPS'],actions.map(a=>[a.due,(a.done?'Done':'Open')+' / '+a.priority,a.title+(a.notes?'\n'+a.notes:'')]),[78,122,CW-200]);
  section('Provider & insurance contacts',240);
  const names=new Set([...s.bills.map(b=>b.provider),...policies.map(p=>p.name)].map(n=>n.toLowerCase()));
  const contacts=state.contacts.filter(c=>allWorkspace||names.has(c.name.toLowerCase()));
  if(!contacts.length)paragraph('No matching contacts.');
  else table(['CONTACT','DETAILS'],contacts.map(c=>[c.name+'\n'+c.type,[c.phone,c.email,c.address,c.notes].filter(Boolean).join('\n')||'-']),[190,CW-190]);
 }
 const selected=new Set(options.documentIds||[]),documents=root.FeatureData.documents(s).filter(d=>selected.has(d.id));
 if(documents.length){section('Supporting documents');table(['TYPE','DOCUMENT'],documents.map(d=>[d.type,d.name]),[95,CW-95]);}
 for(const d of documents){
  try{
   if(d.mime==='application/pdf'){
    const source=await PDFDocument.load(d.data),embedded=await doc.embedPages(source.getPages());
    for(let i=0;i<embedded.length;i++){
     sectionName='Supporting document';newPage();paragraph(d.name+' | Page '+(i+1)+' of '+embedded.length,10,muted);
     const item=embedded[i],height=y-BOTTOM-12,scale=Math.min(CW/item.width,height/item.height);
     page.drawPage(item,{x:M+(CW-item.width*scale)/2,y:BOTTOM+6+(height-item.height*scale)/2,width:item.width*scale,height:item.height*scale});
    }
   }else{
    const item=d.mime==='image/jpeg'?await doc.embedJpg(d.data):d.mime==='image/png'?await doc.embedPng(d.data):null;
    if(!item)throw new Error('Convert WebP to JPG before including it in a PDF.');
    sectionName='Supporting document';newPage();paragraph(d.name,10,muted);
    const height=y-BOTTOM-12,scale=Math.min(CW/item.width,height/item.height);
    page.drawImage(item,{x:M+(CW-item.width*scale)/2,y:BOTTOM+6+(height-item.height*scale)/2,width:item.width*scale,height:item.height*scale});
   }
  }catch(e){throw new Error('Could not include '+d.name+': '+e.message);}
 }
 pages.forEach((p,i)=>{
  p.drawLine({start:{x:M,y:42},end:{x:W-M,y:42},thickness:.5,color:rule});
  p.drawText('TracklyApp | '+(state.demo?'Fictional sample report':'Personal medical records'),{x:M,y:27,size:8.5,font,color:muted});
  const label='Page '+(i+1)+' of '+pages.length;p.drawText(label,{x:W-M-font.widthOfTextAtSize(label,8.5),y:27,size:8.5,font,color:muted});
 });
 doc.setTitle(full?'TracklyApp - Full medical expense report':'TracklyApp - Medical expense report');doc.setCreator('TracklyApp');return doc.save();
}
async function exampleEOB(bill,currency="USD"){
 const {PDFDocument,StandardFonts,rgb}=root.PDFLib,doc=await PDFDocument.create(),page=doc.addPage([595,842]),font=await doc.embedFont(StandardFonts.Helvetica);
 let y=780;const line=(text,size=13)=>{page.drawText(text,{x:44,y,size,font,color:rgb(.13,.3,.24)});y-=35;};
 line('SAMPLE - NOT A REAL INSURANCE DOCUMENT',13);line('Explanation of Benefits',24);line(bill.provider);line('Patient: '+bill.patient);line('Service date: '+bill.serviceDate);line('Claim: '+bill.claimNumber);line('Billed: '+root.Trackly.money(bill.billed,currency,"code"));line('Allowed: '+(bill.allowed===null?'Not confirmed':root.Trackly.money(bill.allowed,currency,"code")));line('Insurance paid: '+root.Trackly.money(bill.insurancePaid,currency,"code"));line('Patient responsibility: '+(bill.patientOwes===null?'Awaiting review':root.Trackly.money(bill.patientOwes,currency,"code")));line('This sample EOB is not a bill.',11);return doc.saveAsBase64({dataUri:true});
}
root.FeaturePDF={generate,exampleEOB};
})(globalThis);

