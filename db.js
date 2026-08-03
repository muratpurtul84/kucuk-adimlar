const DB_NAME='kucuk-adimlar-db'; const DB_VERSION=3;
const ENTRY='entries', MEDIA='media', ALBUM='albums', SETTINGS='settings';
function reqP(req){return new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error);});}
function done(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error);});}
export function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const db=r.result;
 if(!db.objectStoreNames.contains(ENTRY)){const s=db.createObjectStore(ENTRY,{keyPath:'id'});s.createIndex('date','date');s.createIndex('type','type');}
 if(!db.objectStoreNames.contains(MEDIA)){const s=db.createObjectStore(MEDIA,{keyPath:'id'});s.createIndex('entryId','entryId');}
 if(!db.objectStoreNames.contains(ALBUM)){db.createObjectStore(ALBUM,{keyPath:'id'});}
 if(!db.objectStoreNames.contains(SETTINGS)){db.createObjectStore(SETTINGS,{keyPath:'key'});}
};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
export async function putEntry(entry,mediaItems=[],removeMediaIds=[]){const db=await openDB();const tx=db.transaction([ENTRY,MEDIA],'readwrite');tx.objectStore(ENTRY).put(entry);for(const id of removeMediaIds)tx.objectStore(MEDIA).delete(id);for(const m of mediaItems)tx.objectStore(MEDIA).put(m);await done(tx);db.close();}
export async function entries(){const db=await openDB();const r=await reqP(db.transaction(ENTRY).objectStore(ENTRY).getAll());db.close();return r.sort((a,b)=>new Date(b.date)-new Date(a.date));}
export async function entry(id){const db=await openDB();const r=await reqP(db.transaction(ENTRY).objectStore(ENTRY).get(id));db.close();return r;}
export async function mediaFor(id){const db=await openDB();const r=await reqP(db.transaction(MEDIA).objectStore(MEDIA).index('entryId').getAll(id));db.close();return r||[];}
export async function allMedia(){const db=await openDB();const r=await reqP(db.transaction(MEDIA).objectStore(MEDIA).getAll());db.close();return r||[];}
export async function removeEntry(id){const db=await openDB();const tx=db.transaction([ENTRY,MEDIA],'readwrite');tx.objectStore(ENTRY).delete(id);const req=tx.objectStore(MEDIA).index('entryId').openCursor(IDBKeyRange.only(id));req.onsuccess=()=>{const c=req.result;if(c){c.delete();c.continue();}};await done(tx);db.close();}
export async function clearAll(){const db=await openDB();const tx=db.transaction([ENTRY,MEDIA,ALBUM],'readwrite');tx.objectStore(ENTRY).clear();tx.objectStore(MEDIA).clear();tx.objectStore(ALBUM).clear();await done(tx);db.close();}
export async function albums(){const db=await openDB();const r=await reqP(db.transaction(ALBUM).objectStore(ALBUM).getAll());db.close();return r||[];}
export async function putAlbum(a){const db=await openDB();const tx=db.transaction(ALBUM,'readwrite');tx.objectStore(ALBUM).put(a);await done(tx);db.close();}
export async function deleteAlbum(id){const db=await openDB();const tx=db.transaction(ALBUM,'readwrite');tx.objectStore(ALBUM).delete(id);await done(tx);db.close();}
export async function setting(key,fallback=null){const db=await openDB();const r=await reqP(db.transaction(SETTINGS).objectStore(SETTINGS).get(key));db.close();return r?.value??fallback;}
export async function setSetting(key,value){const db=await openDB();const tx=db.transaction(SETTINGS,'readwrite');tx.objectStore(SETTINGS).put({key,value});await done(tx);db.close();}
export async function allSettings(){const db=await openDB();const r=await reqP(db.transaction(SETTINGS).objectStore(SETTINGS).getAll());db.close();return Object.fromEntries((r||[]).map(x=>[x.key,x.value]));}
