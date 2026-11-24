/**
 * Minimal indexed-color PNG encoder for the PDF pipeline.
 *
 * The dossier pages are flat-color text on white, so quantizing every pixel to
 * the report's fixed palette and emitting a colorType-3 (palette) PNG gives two
 * savings: the encoder works on 1 byte/pixel instead of 3/4, and jsPDF stores
 * the decoded palette indices (not RGB) in the PDF image stream.
 * Lossless for glyph shapes — no JPEG-style blur of Tamil text or digits.
 */

// Report palette: every literal color used in PDF_CSS + builder inline styles,
// plus a gray ramp so antialiased text edges keep their snap.
export const PDF_PALETTE: [number, number, number][] = [
  [255, 255, 255], // #ffffff — page background
  [17, 24, 39],    // #111827 — ink
  [29, 78, 216],   // #1D4ED8
  [21, 128, 61],   // #15803D — positive band
  [63, 63, 70],    // #3F3F46
  [82, 82, 91],    // #52525B — moderate band
  [161, 161, 170], // #A1A1AA — muted text
  [180, 83, 9],    // #B45309
  [185, 28, 28],   // #B91C1C — vermilion
  [212, 212, 216], // #D4D4D8 — watermark
  [229, 231, 235], // #E5E7EB — hairlines
  [0, 0, 0],
  // neutral ramp for antialiasing blends
  [243, 244, 246],
  [209, 213, 219],
  [156, 163, 175],
  [107, 114, 128],
  [55, 65, 81],
];

// ---------- CRC32 (PNG chunk checksums; jsPDF validates them) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ---------- nearest-palette-color mapping ----------
export function buildIndexMap(palette: [number, number, number][]): Uint8Array {
  // 32×32×32 color cube (5 bits per channel) → palette index. Slight rounding on
  // edge blends is invisible at print scale and makes mapping O(1).
  const map = new Uint8Array(32768);
  for (let r = 0; r < 32; r++) {
    for (let g = 0; g < 32; g++) {
      for (let b = 0; b < 32; b++) {
        const rr = (r << 3) | (r >> 2);
        const gg = (g << 3) | (g >> 2);
        const bb = (b << 3) | (b >> 2);
        let best = 0;
        let bestD = Infinity;
        for (let p = 0; p < palette.length; p++) {
          const dr = rr - palette[p][0];
          const dg = gg - palette[p][1];
          const db = bb - palette[p][2];
          const d = dr * dr + dg * dg + db * db;
          if (d < bestD) { bestD = d; best = p; }
        }
        map[(r << 10) | (g << 5) | b] = best;
      }
    }
  }
  return map;
}

export function quantize(rgba: Uint8ClampedArray, pixelCount: number, map: Uint8Array): Uint8Array {
  const indices = new Uint8Array(pixelCount);
  for (let i = 0, o = 0; i < pixelCount; i++, o += 4) {
    indices[i] = map[((rgba[o] >> 3) << 10) | ((rgba[o + 1] >> 3) << 5) | (rgba[o + 2] >> 3)];
  }
  return indices;
}

// ---------- scanline filters (standard PNG adaptive heuristic) ----------
function filterScanlines(indices: Uint8Array, width: number, height: number): Uint8Array {
  const bpp = 1; // palette indices
  const stride = width * bpp;
  const out = new Uint8Array(height * (stride + 1));
  const cand: Uint8Array[] = [0, 1, 2, 3, 4].map(() => new Uint8Array(stride));
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const row = indices.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? row[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      cand[0][x] = row[x];
      cand[1][x] = (row[x] - a) & 0xff;
      cand[2][x] = (row[x] - b) & 0xff;
      cand[3][x] = (row[x] - ((a + b) >> 1)) & 0xff;
      const p = a + b - c;
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      cand[4][x] = (row[x] - (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
    }
    let best = 0;
    let bestSum = Infinity;
    for (let f = 0; f < 5; f++) {
      let sum = 0;
      for (let x = 0; x < stride; x++) sum += Math.min(cand[f][x], 256 - cand[f][x]);
      if (sum < bestSum) { bestSum = sum; best = f; }
    }
    out[y * (stride + 1)] = best;
    out.set(cand[best], y * (stride + 1) + 1);
    prev = row.slice();
  }
  return out;
}

// ---------- chunk assembly ----------
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate');
  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Assemble a complete colorType-3 PNG: signature · IHDR · PLTE · IDAT(zlib) · IEND. */
export async function encodeIndexedPng(indices: Uint8Array, width: number, height: number, palette: [number, number, number][]): Promise<Uint8Array> {
  const ihdr = new Uint8Array(13);
  const iv = new DataView(ihdr.buffer);
  iv.setUint32(0, width);
  iv.setUint32(4, height);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 3;  // color type: palette
  // bytes 10-12: compression/filter/interlace = 0

  const plte = new Uint8Array(palette.length * 3);
  for (let i = 0; i < palette.length; i++) {
    plte[i * 3] = palette[i][0];
    plte[i * 3 + 1] = palette[i][1];
    plte[i * 3 + 2] = palette[i][2];
  }

  const idat = await deflate(filterScanlines(indices, width, height));
  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const parts = [sig, chunk('IHDR', ihdr), chunk('PLTE', plte), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((s, p) => s + p.length, 0);
  const png = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { png.set(p, off); off += p.length; }
  return png;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(bin);
}

/**
 * Quantize a rendered page canvas to the fixed palette and return an indexed
 * PNG data URL. Returns null when the platform lacks the needed primitives so
 * the caller can fall back to the browser's own PNG encoder.
 */
export async function canvasToIndexedPngDataUrl(canvas: HTMLCanvasElement): Promise<string | null> {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof CompressionStream === 'undefined') return null;
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const indices = quantize(img.data, canvas.width * canvas.height, buildIndexMap(PDF_PALETTE));
    const png = await encodeIndexedPng(indices, canvas.width, canvas.height, PDF_PALETTE);
    return `data:image/png;base64,${bytesToBase64(png)}`;
  } catch {
    return null;
  }
}
