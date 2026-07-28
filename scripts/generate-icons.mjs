// Genera los PNG del PWA sin dependencias externas (solo zlib de Node).
// Ejecutar con: npm run icons
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
mkdirSync(publicDir, { recursive: true });

// ---- CRC32 ----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Genera un PNG RGB con un dibujo: fondo teal, aro blanco y circulo ambar.
function makePng(size, innerRatio) {
  const teal = [15, 118, 110];
  const white = [255, 255, 255];
  const amber = [245, 158, 11];
  const cx = size / 2;
  const cy = size / 2;
  const rInner = size * innerRatio;
  const ring = size * 0.045;

  const rowBytes = size * 3;
  const raw = Buffer.alloc((rowBytes + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (rowBytes + 1)] = 0; // filtro none
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      let color = teal;
      if (d < rInner) color = amber;
      else if (d < rInner + ring) color = white;
      const off = y * (rowBytes + 1) + 1 + x * 3;
      raw[off] = color[0];
      raw[off + 1] = color[1];
      raw[off + 2] = color[2];
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outputs = [
  ['icon-192.png', 192, 0.3],
  ['icon-512.png', 512, 0.3],
  // maskable: circulo mas chico para sobrevivir el recorte de iconos
  ['icon-512-maskable.png', 512, 0.24],
  ['apple-touch-icon.png', 180, 0.3],
];

for (const [name, size, ratio] of outputs) {
  writeFileSync(join(publicDir, name), makePng(size, ratio));
  console.log('  ->', name);
}
console.log('Iconos generados en public/.');
