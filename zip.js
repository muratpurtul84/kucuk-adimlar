// Küçük Adımlar ZIP writer/reader.
// Writer uses STORE (method 0) for broad compatibility.
// Reader supports STORE (0) and DEFLATE (8), including ZIPs produced by
// Android, Drive, Windows, Linux and common archive tools.
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

function findEocd(bytes, view) {
  // EOCD can have a comment of up to 65535 bytes.
  const min = Math.max(0, bytes.length - 22 - 0xffff);
  for (let o = bytes.length - 22; o >= min; o--) {
    if (view.getUint32(o, true) === 0x06054b50) return o;
  }
  throw new Error('Geçerli bir ZIP son kaydı bulunamadı. Dosya eksik veya bozuk olabilir.');
}

async function inflateRaw(compressed) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Bu cihaz Deflate ZIP açmayı desteklemiyor. Chrome veya Edge tarayıcısını güncelleyin.');
  }
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function readZip(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.length < 22) throw new Error('ZIP dosyası boş veya eksik.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEocd(bytes, view);
  const entryCount = view.getUint16(eocd + 10, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  const files = new Map();
  let o = centralOffset;

  for (let i = 0; i < entryCount; i++) {
    if (o + 46 > bytes.length || view.getUint32(o, true) !== 0x02014b50) {
      throw new Error('ZIP merkez dizini okunamadı. Dosya bozuk veya desteklenmeyen ZIP64 biçiminde olabilir.');
    }
    const flags = view.getUint16(o + 8, true);
    const method = view.getUint16(o + 10, true);
    const expectedCrc = view.getUint32(o + 16, true);
    const compressedSize = view.getUint32(o + 20, true);
    const uncompressedSize = view.getUint32(o + 24, true);
    const nameLen = view.getUint16(o + 28, true);
    const extraLen = view.getUint16(o + 30, true);
    const commentLen = view.getUint16(o + 32, true);
    const localOffset = view.getUint32(o + 42, true);
    const utf8 = (flags & 0x0800) !== 0;
    const nameBytes = bytes.slice(o + 46, o + 46 + nameLen);
    const name = utf8 ? td.decode(nameBytes) : td.decode(nameBytes);

    if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50) {
      throw new Error(`ZIP içindeki yerel kayıt okunamadı: ${name}`);
    }
    const localNameLen = view.getUint16(localOffset + 26, true);
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.length) throw new Error(`ZIP içindeki dosya eksik: ${name}`);

    // Directory entries need no payload.
    if (name.endsWith('/')) {
      o += 46 + nameLen + extraLen + commentLen;
      continue;
    }

    const compressed = bytes.slice(dataStart, dataEnd);
    let data;
    if (method === 0) data = compressed;
    else if (method === 8) data = await inflateRaw(compressed);
    else throw new Error(`ZIP sıkıştırma yöntemi desteklenmiyor (method ${method}): ${name}`);

    if (data.length !== uncompressedSize) {
      throw new Error(`ZIP dosya boyutu doğrulanamadı: ${name}`);
    }
    if (crc32(data) !== expectedCrc) {
      throw new Error(`ZIP bütünlük kontrolü başarısız: ${name}`);
    }
    files.set(name, data);
    o += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

export const encodeText = (s) => te.encode(s);
export const decodeText = (b) => td.decode(b);
