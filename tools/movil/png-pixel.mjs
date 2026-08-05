// Decodificador PNG mínimo (sin dependencias) para leer un píxel exacto de un PNG de captureScreenshot.
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

function readPng(path) {
  const buf = readFileSync(path);
  let off = 8; // firma PNG
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    }
    off += 8 + len + 4;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let rawOff = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rawOff]; rawOff += 1;
    const rowStart = y * stride;
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[rawOff + x];
      const a = x >= channels ? out[rowStart + x - channels] : 0;
      const b = y > 0 ? out[rowStart - stride + x] : 0;
      const c = (x >= channels && y > 0) ? out[rowStart - stride + x - channels] : 0;
      let val;
      if (filter === 0) val = rawByte;
      else if (filter === 1) val = rawByte + a;
      else if (filter === 2) val = rawByte + b;
      else if (filter === 3) val = rawByte + Math.floor((a + b) / 2);
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
        val = rawByte + pr;
      } else val = rawByte;
      out[rowStart + x] = val & 0xff;
    }
    rawOff += stride;
  }
  return { width, height, channels, data: out };
}

function getPixel(img, x, y) {
  const i = (y * img.width + x) * img.channels;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}

const path = process.argv[2];
const x = parseInt(process.argv[3], 10);
const y = parseInt(process.argv[4], 10);
const img = readPng(path);
console.log(path, `${img.width}x${img.height}`, "px@", x, y, "=", getPixel(img, x, y));
