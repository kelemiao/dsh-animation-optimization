/**
 * Runtime verification against real DSH 0.2.1 markup, in a real DOM (jsdom).
 *
 * The unit suite runs the bundle in a hand-rolled fake DOM that matches
 * selectors by exact string; this script instead builds the actual class and
 * attribute structure DSH 0.2.1 renders (VJlF5q reasoning row,
 * [data-disclosure-row] toggle, [data-chat-running] indicator) and checks the
 * behaviours users see: auto-expand while running, collapse when the turn
 * ends, retry when the host swallows a click, and no stale collapse tag.
 *
 * Run: node scripts/verify-dom.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "..", "lib", "client.js"), "utf8");

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildDom() {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>
    <div class="V4vHZW_column">
      <div class="V4vHZW_flowItem" data-chat-flow-kind="turn-process">
        <div class="VJlF5q_root" data-variant="think" data-state="running" data-expanded="true">
          <div class="VJlF5q_header">
            <div class="VJlF5q_row" data-disclosure-row="true" data-expandable="true" role="button" aria-expanded="true">
              <span class="VJlF5q_leading"></span><span class="VJlF5q_title">思考</span>
            </div>
          </div>
          <div class="VJlF5q_thinkBody">第一行<br>第二行</div>
        </div>
      </div>
      <div class="V4vHZW_running" data-chat-running="true">
        <span class="V4vHZW_runningDivider" aria-hidden="true"></span>
        <span class="V4vHZW_runningContent">
          <span class="V4vHZW_runningIcon" aria-hidden="true"><svg class="V4vHZW_runningWhaleStill"></svg></span>
          <span class="V4vHZW_runningText">深度求索中，用时 12秒 ···</span>
        </span>
      </div>
    </div>
  </body></html>`, { pretendToBeVisual: true, runScripts: "outside-only" });
  return dom;
}

function mount(dom, { swallowClicks = 0 } = {}) {
  const { window } = dom;
  const { document } = window;
  const root = document.querySelector(".VJlF5q_root");
  const row = document.querySelector("[data-disclosure-row]");
  const state = { clicks: 0, accepted: 0, ignored: swallowClicks };

  // Stand-in for the React disclosure: the row toggles mount/unmount.
  row.addEventListener("click", () => {
    state.clicks += 1;
    if (state.ignored > 0) { state.ignored -= 1; return; }
    state.accepted += 1;
    const body = root.querySelector(".VJlF5q_thinkBody");
    if (root.getAttribute("data-expanded")) {
      body?.remove();
      root.removeAttribute("data-expanded");
      row.setAttribute("aria-expanded", "false");
    } else {
      root.setAttribute("data-expanded", "true");
      row.setAttribute("aria-expanded", "true");
    }
  });

  let plugin = null;
  window.__ModuleLoader__ = {
    load(definition) { plugin = definition.factory(requireStub); },
  };
  const requireStub = (id) => {
    if (id === "react") {
      return { createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children } }) };
    }
    throw new Error("missed the module table");
  };

  vm.runInContext(source, dom.getInternalVMContext(), { filename: "client.js" });
  const ctx = { effect: (cb) => cb() };
  plugin.apply(ctx);
  return { root, row, state, window, document };
}

const domA = buildDom();
const a = mount(domA);
await sleep(120);
check("injects style layers", a.document.head.querySelectorAll("style").length >= 3,
  `${a.document.head.querySelectorAll("style").length} tags`);
const css = [...a.document.head.querySelectorAll("style")].map((s) => s.textContent).join("\n");
check("official thinking/typing frame animations present",
  css.includes("@keyframes dsh-claude-thinking") && css.includes("@keyframes dsh-claude-typing"));
check("running indicator restyled through hash-free anchors",
  css.includes("[data-chat-running]") && css.includes("[data-chat-running] [class*='_runningIcon']::before"));
check("version marker stamped", a.document.body.getAttribute("data-dsh-anim-version") === "0.3.5",
  a.document.body.getAttribute("data-dsh-anim-version"));

// While the turn runs, the finished block waits for a successor.
a.root.setAttribute("data-state", "ok");
await sleep(120);
check("does not collapse while the turn is still running", a.state.accepted === 0);

// Turn ends: the running indicator is replaced by the "worked for …" summary.
a.document.querySelector("[data-chat-running]").remove();
await sleep(900);
check("collapses when the turn goes idle (no successor ever mounts)", a.state.accepted === 1,
  `${a.state.accepted} accepted / ${a.state.clicks} clicks`);
check("collapse tag released", a.document.querySelectorAll("[data-dsh-collapsing]").length === 0);

// A host that swallows the first click must still close via retry.
const domB = buildDom();
const b = mount(domB, { swallowClicks: 1 });
await sleep(120);
b.root.setAttribute("data-state", "ok");
b.document.querySelector("[data-chat-running]").remove();
await sleep(1400);
check("retries a swallowed close click", b.state.accepted === 1,
  `${b.state.accepted} accepted / ${b.state.clicks} clicks`);

// A stale collapse tag is force-released by the watchdog.
const domC = buildDom();
const c = mount(domC);
await sleep(120);
const stray = c.document.createElement("div");
stray.setAttribute("data-dsh-collapsing", "1");
stray.textContent = "stale";
c.document.body.appendChild(stray);
const deadline = Date.now() + 4000;
while (stray.hasAttribute("data-dsh-collapsing") && Date.now() < deadline) await sleep(200);
check("watchdog releases a stale collapse tag", !stray.hasAttribute("data-dsh-collapsing"));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
