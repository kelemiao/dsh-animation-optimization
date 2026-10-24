/**
 * build-client.mjs — assemble lib/client.js from the hand-written template.
 *
 * The template (src/client.template.js) is the full plugin client and stays
 * readable/editable. This script injects the official Claude Desktop App
 * animation assets at the /*__DSH_ASSETS__*\/ marker.
 *
 * Sources of truth (both from the Claude Desktop App dotLottie packages in
 * assets/claude-desktop/lottie/ — the lottie JSON defines the exact frame
 * ORDER, FRAME RATE and DURATION; the embedded webp images are the frames):
 *
 *   1. thinking.lottie  — 8 frames @ 7 fps  (loop = 8/7s ≈ 1.143s)
 *        layer time order: refIds 2,1,4,3,5,6,8,7
 *        => webp sequence: 2,1,4,3,5,6,8,7
 *   2. typing.lottie    — 12 frames @ 14 fps (loop = 12/14s ≈ 0.857s)
 *        layer time order: refIds 3,2,1,4,6,5,7,8,9,11,10,12
 *        => webp sequence: 3,2,1,4,6,5,7,8,9,11,10,12
 *
 * (Note: assets/claude-desktop/claude-thinking-sprite.svg is NOT used for
 * the runtime animation — its 15-step SMIL strip matches neither official
 * lottie package. It stays in the repo as reference material only.)
 *
 * Each frame is a full 1000x1000 image, so the CSS plays it with
 * background-size: contain and discrete per-frame keyframe stops.
 *
 * Output: lib/client.js (committed, directly served by the DSH loader).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetDir = join(root, "assets", "claude-desktop");
const templatePath = join(root, "src", "client.template.js");
const outPath = join(root, "lib", "client.js");

/* Official play sequences (webp file numbers), straight from the lottie
   layer time order of thinking.lottie / typing.lottie. */
const THINK_SEQ = [2, 1, 4, 3, 5, 6, 8, 7];
const TYPE_SEQ = [3, 2, 1, 4, 6, 5, 7, 8, 9, 11, 10, 12];
const THINK_FPS = 7;   // thinking.lottie: fr = 7, op = 8
const TYPE_FPS = 14;   // typing.lottie: fr = 14, op = 12

function frameUris(dir, seq) {
  return seq.map((n) => {
    const bytes = readFileSync(join(assetDir, dir, `${n}.webp`));
    return `data:image/webp;base64,${bytes.toString("base64")}`;
  });
}

function frameStops(uris) {
  const n = uris.length;
  const stops = [];
  for (let f = 0; f < n; f++) {
    const a = ((100 * f) / n).toFixed(3);
    const b = ((100 * (f + 1)) / n - 0.003).toFixed(3);
    stops.push(`${a}%,${b}%{background-image:url("${uris[f]}")}`);
  }
  stops.push(`100%{background-image:url("${uris[n - 1]}")}`);
  return stops.join("");
}

const thinkingUris = frameUris("thinking", THINK_SEQ);
const typingUris = frameUris("typing", TYPE_SEQ);

const thinkingDur = (THINK_SEQ.length / THINK_FPS).toFixed(3);
const typingDur = (TYPE_SEQ.length / TYPE_FPS).toFixed(3);

const generated =
  `/* ---- injected by scripts/build-client.mjs (do not edit) ---- */\n` +
  `var THINKING_FIRST_FRAME_URI = ${JSON.stringify(thinkingUris[0])};\n` +
  `var GENERATED_LOGO_CSS = ${JSON.stringify(
    `@keyframes dsh-claude-thinking{${frameStops(thinkingUris)}}` +
      `@keyframes dsh-claude-typing{${frameStops(typingUris)}}`,
  )};\n` +
  `var THINKING_DUR_S = ${JSON.stringify(thinkingDur)};\n` +
  `var TYPING_DUR_S = ${JSON.stringify(typingDur)};\n` +
  `/* ---- end injected ---- */`;

const template = readFileSync(templatePath, "utf8");
const marker = "/*__DSH_ASSETS__*/";
if (!template.includes(marker)) {
  throw new Error(`marker ${marker} not found in ${templatePath}`);
}
const built = template.replace(marker, generated);

writeFileSync(outPath, built, "utf8");
const kb = (built.length / 1024).toFixed(1);
console.log(
  `built lib/client.js (${kb} KB): thinking ${THINK_SEQ.length} frames @${THINK_FPS}fps (${thinkingDur}s), typing ${TYPE_SEQ.length} frames @${TYPE_FPS}fps (${typingDur}s)`,
);