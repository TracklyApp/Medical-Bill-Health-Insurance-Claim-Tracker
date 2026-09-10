(function(root){
'use strict';
const DB='trackly-private-workspace',KEY='primary',ITERATIONS=310000;
const bytesTo64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
const from64=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
async function derive(password,salt){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
function validateEnvelope(e){if(!e||e.format!=='trackly-encrypted'||e.version!==1||e.iterations!==ITERATIONS||typeof e.salt!=='string'||typeof e.iv!=='string'||typeof e.ciphertext!=='string'||e.ciphertext.length>250000000)throw new Error('Unsupported encrypted backup.');if(from64(e.salt).length!==16||from64(e.iv).length!==12)throw new Error('Invalid encrypted backup.');return e;}
async function encryptWithKey(value,key,salt){const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(value)));return {format:'trackly-encrypted',version:1,iterations:ITERATIONS,salt:bytesTo64(salt),iv:bytesTo64(iv),ciphertext:bytesTo64(new Uint8Array(encrypted))};}
async function seal(value,password){if(typeof password!=='string'||password.length<10)throw new Error('Use a passphrase of at least 10 characters.');const salt=crypto.getRandomValues(new Uint8Array(16)),key=await derive(password,salt);return {envelope:await encryptWithKey(value,key,salt),key,salt};}
async function unseal(envelope,password){validateEnvelope(envelope);const salt=from64(envelope.salt),key=await derive(password,salt);let clear;try{clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(envelope.iv)},key,from64(envelope.ciphertext));}catch{throw new Error('Incorrect passphrase or damaged backup.');}return {value:JSON.parse(new TextDecoder().decode(clear)),key,salt};}
class Repository{
 constructor(){this.db=null;this.key=null;this.salt=null;this.encrypted=false;this.revision=0;this.record=null;this.ready=false;}
 async open(){if(!root.indexedDB)throw new Error('This browser cannot open local storage. Use Chrome, Edge, or Safari with site storage allowed.');this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('workspace');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('Close other TracklyApp tabs, then reload.'));});this.db.onversionchange=()=>this.db.close();this.record=await this.read();this.revision=this.record?.revision||0;this.encrypted=this.record?.payload?.format==='trackly-encrypted';this.ready=true;return this.record;}
 read(){return new Promise((resolve,reject)=>{const tx=this.db.transaction('workspace','readonly');const r=tx.objectStore('workspace').get(KEY);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});}
 async commit(payload){const expected=this.revision;const next={revision:expected+1,payload};await new Promise((resolve,reject)=>{const tx=this.db.transaction('workspace','readwrite'),store=tx.objectStore('workspace');let conflict=false;const r=store.get(KEY);r.onsuccess=()=>{if((r.result?.revision||0)!==expected){conflict=true;tx.abort();return;}store.put(next,KEY);};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('Could not save local data.'));tx.onabort=()=>reject(new Error(conflict?'Records changed in another tab. Reload before saving.':'Local save was interrupted.'));});this.record=next;this.revision=next.revision;return next;}
 async save(value){if(this.encrypted&&!this.key)throw new Error('Unlock the vault before saving.');const payload=this.encrypted?await encryptWithKey(value,this.key,this.salt):{format:'trackly-plain',version:1,value};await this.commit(payload);}
 async unlock(password){const result=await unseal(this.record.payload,password);this.key=result.key;this.salt=result.salt;return result.value;}
 async protect(value,password){const result=await seal(value,password);await this.commit(result.envelope);this.key=result.key;this.salt=result.salt;this.encrypted=true;}
 async unprotect(value){await this.commit({format:'trackly-plain',version:1,value});this.encrypted=false;this.key=null;this.salt=null;}
 lock(){this.key=null;this.salt=null;}
 async backup(value,password){return (await seal(value,password)).envelope;}
}
root.TracklyStore={Repository,seal,unseal,validateEnvelope,bytesTo64,from64};
})(globalThis);
