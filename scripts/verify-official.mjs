/**
 * verify-official.mjs — end-to-end proof that the shipped animation is the
 * official Claude Desktop App animation, byte for byte and frame for frame.
 *
 * Chain verified:
 *   official lottie zip payloads
 *     -> assets/claude-desktop/{thinking,typing}/*.webp
 *     -> keyframes inside lib/client.js (GENERATED_LOGO_CSS)
 *     -> the bundle actually served by the DSH webserver (HTTP binary)
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetDir = join(root, "assets", "claude-desktop");
const lottieDir = join(assetDir, "lottie");
const clientPath = join(root, "lib", "client.js");

const sha1 = (b) => createHash("sha1").update(b).digest("hex");
const sha256 = (b) => createHash("sha256").update(b).digest("hex");

const EXPECT = {
  thinking: { seq: [2, 1, 4, 3, 5, 6, 8, 7], count: 8, dur: (8 / 7).toFixed(3) },
  typing: { seq: [3, 2, 1, 4, 6, 5, 7, 8, 9, 11, 10, 12], count: 12, dur: (12 / 14).toFixed(3) },
};

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
};

/* ---- zip reader (local headers + zlib inflate) ---- */
function unzip(path) {
  const buf = readFileSync(path);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const out = {};
  let off = 0;
  while (off + 30 <= buf.length && view.getUint32(off, true) === 0x04034b50) {
    const method = view.getUint16(off + 8, true);
    const csize = view.getUint32(off + 18, true);
    const nlen = view.getUint16(off + 26, true);
    const elen = view.getUint16(off + 28, true);
    const name = buf.subarray(off + 30, off + 30 + nlen).toString("utf8");
    const start = off + 30 + nlen + elen;
    const data = buf.subarray(start, start + csize);
    out[name] = method === 8 ? inflateRawSync(data) : Buffer.from(data);
    off = start + csize;
  }
  return out;
}

/* ---- 1. assets vs official lottie zip payloads (byte equality) ---- */
const lookup = {};
for (const kind of ["thinking", "typing"]) {
  lookup[kind] = {};
  for (const f of readdirSync(join(assetDir, kind)).filter((x) => x.endsWith(".webp"))) {
    lookup[kind][f] = readFileSync(join(assetDir, kind, f));
  }
}
for (const kind of ["thinking", "typing"]) {
  const lz = unzip(join(lottieDir, `${kind}.lottie`));
  const frameFiles = Object.keys(lz)
    .filter((n) => n.startsWith("images/") && n.endsWith(".webp"))
    .sort((a, b) => Number(a.split("/")[1].split(".")[0]) - Number(b.split("/")[1].split(".")[0]));
  for (const n of frameFiles) {
    const file = n.split("/")[1];
    const official = Buffer.from(lz[n]);
    const local = lookup[kind][file];
    check(`${kind}: assets/${file} == lottie payload ${file}`,
      !!local && local.length === official.length && sha256(local) === sha256(official),
      local ? `${local.length}B` : "missing");
  }
  console.log(`  (${kind}.lottie frames parsed: ${frameFiles.length})`);
}

/* ---- 2. keyframes inside lib/client.js vs official play order ---- */
const clientSrc = readFileSync(clientPath, "utf8");
const m = clientSrc.match(/var GENERATED_LOGO_CSS = ("(?:[^"\\]|\\.)*")/);
check("lib/client.js contains GENERATED_LOGO_CSS", !!m);
const css = m ? JSON.parse(m[1]) : "";
const parseFrames = (css, animName) => {
  const mark = `@keyframes ${animName}{`;
  const start = css.indexOf(mark);
  if (start < 0) return null;
  const bodyStart = start + mark.length;
  const next = css.indexOf("@keyframes ", bodyStart);
  const body = next === -1 ? css.slice(bodyStart) : css.slice(bodyStart, next);
  // each stop: `A%,B%{background-image:url("data:image/webp;base64,...")}`
  const stops = [...body.matchAll(/([\d.]+)%,([\d.]+)%\{background-image:url\("data:image\/webp;base64,([^"]+)"\)\}/g)];
  const frames = [];
  for (const s of stops) {
    const buf = Buffer.from(s[3], "base64");
    const h = sha256(buf);
    if (!frames.length || frames[frames.length - 1].hash !== h) frames.push({ hash: h, file: null });
  }
  return frames;
};
for (const kind of ["thinking", "typing"]) {
  const frames = parseFrames(css, `dsh-claude-${kind}`);
  check(`${kind}: keyframes has ${EXPECT[kind].count} frames`, frames && frames.length === EXPECT[kind].count,
    frames ? frames.length + " stops" : "none");
  if (!frames) continue;
  // map hashes back to asset filenames
  const byHash = {};
  for (const f of readdirSync(join(assetDir, kind)).filter((x) => x.endsWith(".webp"))) {
    byHash[sha256(readFileSync(join(assetDir, kind, f)))] = f;
  }
  const seq = frames.map((f) => {
    f.file = byHash[f.hash] || "?";
    return Number(f.file.replace(".webp", ""));
  });
  const exp = EXPECT[kind].seq.join(",");
  check(`${kind}: keyframe play order == official lottie order`,
    seq.join(",") === exp, `got ${seq.join(",")}`);
}
/* duration constants */
for (const kind of ["thinking", "typing"]) {
  const durVar = kind === "thinking" ? "THINKING_DUR_S" : "TYPING_DUR_S";
  const dm = clientSrc.match(new RegExp(`var ${durVar} = "([\\d.]+)"`));
  check(`${kind}: duration ${durVar} == ${EXPECT[kind].dur}s`, dm && dm[1] === EXPECT[kind].dur, dm ? dm[1] : "missing");
}

/* ---- 3. served bundle == local bundle (binary) ---- */
try {
  const res = await fetch("http://127.0.0.1:3080/plugins/dsh-animation-optimization/client.js");
  const served = Buffer.from(await res.arrayBuffer());
  const local = readFileSync(clientPath);
  check("served bundle binary == lib/client.js", served.length === local.length && sha256(served) === sha256(local),
    `served ${served.length}B local ${local.length}B`);
} catch (e) {
  check("served bundle fetch", false, String(e));
}

/* ---- 4. reference check: runtime bundle must NOT use the sprite svg ---- */
const svg = readFileSync(join(assetDir, "claude-thinking-sprite.svg"), "utf8");
const d = (svg.match(/d="([^"]+)"/) || [])[1] || "";
const mabs = [...d.matchAll(/M\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/g)].map((x) => ({ x: +x[1], y: +x[2] }));
const uniqYs = [...new Set(mabs.map((p) => Math.round(p.y)))].sort((a, b) => a - b);
const bandHits = new Map();
for (const y of uniqYs) bandHits.set(Math.floor(y / 100), (bandHits.get(Math.floor(y / 100)) || 0) + 1);
console.log(`  (sprite abs-M count: ${mabs.length}; M-start y/b100 band hits: ${[...bandHits.entries()].map(([k, v]) => `${k}:${v}`).join(" ")})`);
check("runtime bundle does not reference the sprite svg",
  !clientSrc.includes("claude-thinking-sprite") && !clientSrc.includes("THINKING_SPRITE_URI"),
  "sprite stays as reference asset only");

process.exitCode = failures ? 1 : 0;
if (failures) console.log(`\n${failures} FAILURE(S)`);
else console.log("\nALL CHECKS PASS — animation is the official Claude Desktop App set, byte for byte.");