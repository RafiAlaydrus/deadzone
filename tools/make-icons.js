/* Generates the PWA icons. Dependency-free: rasterises the DEADZONE scan-ring mark
   and encodes a PNG using only Node's zlib. Run: node tools/make-icons.js */
const zlib = require('zlib'), fs = require('fs'), path = require('path');

const OUT = path.join(__dirname, '..', 'icons');
fs.mkdirSync(OUT, { recursive: true });

const INK   = [0x07, 0x0a, 0x0c];
const GRID  = [0x11, 0x1b, 0x20];
const PHOS  = [0x9d, 0xff, 0x5c];
const BONE  = [0xe8, 0xf2, 0xec];

const SS = 4; // supersample factor for anti-aliasing

// `inset` shrinks the artwork so maskable icons survive being cropped to a circle.
function draw(size, inset, opaqueBg){
  const px = new Uint8Array(size * size * 4);
  const c = size / 2;
  const art = size * inset;               // diameter the mark is allowed to occupy
  const ringR = art * 0.36;
  const ringW = Math.max(size * 0.035, 1.5);
  const dotR  = art * 0.085;
  const coreR = art * 0.038;
  const gridStep = size / 8;

  for (let y = 0; y < size; y++){
    for (let x = 0; x < size; x++){
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++){
        for (let sx = 0; sx < SS; sx++){
          const fx = x + (sx + 0.5)/SS, fy = y + (sy + 0.5)/SS;
          const d = Math.hypot(fx - c, fy - c);
          let col, al = 1;

          // background (transparent outside the art circle for maskable variants)
          if (opaqueBg) col = INK;
          else if (d <= art/2) col = INK;
          else { col = INK; al = 0; }

          // faint grid, only inside the art area
          if (al && d <= art/2){
            const gx = Math.abs(((fx % gridStep) + gridStep) % gridStep);
            const gy = Math.abs(((fy % gridStep) + gridStep) % gridStep);
            if (gx < 1 || gy < 1) col = GRID;
          }
          // scan ring
          if (Math.abs(d - ringR) <= ringW/2) col = PHOS;
          // inner ring, dimmer
          if (Math.abs(d - ringR*0.52) <= ringW*0.32) col = [0x3f, 0x6b, 0x2a];
          // player dot
          if (d <= dotR) col = BONE;
          if (d <= coreR) col = PHOS;

          r += col[0]*al; g += col[1]*al; b += col[2]*al; a += 255*al;
        }
      }
      const n = SS*SS, i = (y*size + x)*4;
      px[i]   = Math.round(r/n);
      px[i+1] = Math.round(g/n);
      px[i+2] = Math.round(b/n);
      px[i+3] = Math.round(a/n);
    }
  }
  return px;
}

function crc32(buf){
  let c, t = [];
  for (let n = 0; n < 256; n++){
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = t[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, px){
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;    // bit depth
  ihdr[9] = 6;    // colour type: RGBA
  const raw = Buffer.alloc(size * (size*4 + 1));
  for (let y = 0; y < size; y++){
    raw[y*(size*4+1)] = 0; // filter: none
    Buffer.from(px.buffer, y*size*4, size*4).copy(raw, y*(size*4+1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const targets = [
  { file:'icon-192.png',          size:192, inset:0.86, opaque:true  },
  { file:'icon-512.png',          size:512, inset:0.86, opaque:true  },
  { file:'icon-maskable-512.png', size:512, inset:0.62, opaque:true  }, // extra padding for cropping
  { file:'apple-touch-icon.png',  size:180, inset:0.86, opaque:true  },
  { file:'favicon-32.png',        size:32,  inset:0.94, opaque:true  }
];

for (const t of targets){
  const buf = png(t.size, draw(t.size, t.inset, t.opaque));
  fs.writeFileSync(path.join(OUT, t.file), buf);
  console.log('  ' + t.file.padEnd(24), (buf.length/1024).toFixed(1) + 'KB');
}
console.log('done');
