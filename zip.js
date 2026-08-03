// Minimal ZIP (store/no compression) writer and reader for offline backups.
const te = new TextEncoder();
const td = new TextDecoder();

function crc32Table() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
}
const CRC_TABLE = crc32Table();
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function u16(v){ const a=new Uint8Array(2); new DataView(a.buffer).setUint16(0,v,true); return a; }
function u32(v){ const a=new Uint8Array(4); new DataView(a.buffer).setUint32(0,v>>>0,true); return a; }
function concat(parts){ const n=parts.reduce((s,p)=>s+p.length,0); const out=new Uint8Array(n); let o=0; for(const p of parts){out.set(p,o);o+=p.length;} return out; }
function dosDateTime(d = new Date()) {
  const year=Math.max(1980,d.getFullYear());
  const date=((year-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  const time=(d.getHours()<<11)|(d.getMinutes()<<5)|Math.floor(d.getSeconds()/2);
  return {date,time};
}
export async function createZip(files) {
  const local=[]; const central=[]; let offset=0;
  for (const file of files) {
    const name=te.encode(file.name.replace(/^\/+/,''));
    const bytes=file.data instanceof Uint8Array ? file.data : new Uint8Array(await file.data.arrayBuffer());
    const crc=crc32(bytes); const {date,time}=dosDateTime(file.date || new Date());
    const header=concat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(time),u16(date),u32(crc),u32(bytes.length),u32(bytes.length),u16(name.length),u16(0),name]);
    local.push(header,bytes);
    const ch=concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(time),u16(date),u32(crc),u32(bytes.length),u32(bytes.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);
    central.push(ch); offset += header.length + bytes.length;
  }
  const centralBytes=concat(central);
  const end=concat([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralBytes.length),u32(offset),u16(0)]);
  return new Blob([...local,centralBytes,end],{type:'application/zip'});
}
export async function readZip(blob) {
  const bytes=new Uint8Array(await blob.arrayBuffer()); const view=new DataView(bytes.buffer); const files=new Map(); let o=0;
  while (o+4<=bytes.length && view.getUint32(o,true)===0x04034b50) {
    const method=view.getUint16(o+8,true); if(method!==0) throw new Error('Bu ZIP sıkıştırma biçimi desteklenmiyor. Küçük Adımlar yedeğini seçin.');
    const size=view.getUint32(o+18,true); const nameLen=view.getUint16(o+26,true); const extraLen=view.getUint16(o+28,true);
    const name=td.decode(bytes.slice(o+30,o+30+nameLen)); const start=o+30+nameLen+extraLen; const data=bytes.slice(start,start+size);
    files.set(name,data); o=start+size;
  }
  return files;
}
export const encodeText = (s) => te.encode(s);
export const decodeText = (b) => td.decode(b);
