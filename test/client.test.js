import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../lib/client.js", import.meta.url), "utf8");
const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function eventually(read, timeout = 900) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = read();
    if (value) return value;
    await sleep(12);
  }
  return read();
}

function textNode(value) {
  return { nodeValue: value, nodeType: 3 };
}

function fakeElement(tag, className = "") {
  return {
    tagName: tag,
    nodeType: 1,
    className,
    children: [],
    attributes: {},
    style: {},
    textContent: "",
    setAttribute(key, value) { this.attributes[key] = value; },
    getAttribute(key) { return this.attributes[key] ?? null; },
    removeAttribute(key) { delete this.attributes[key]; },
    appendChild(child) {
      this.children.push(child);
      child.parentNode = this;
    },
    remove() {
      if (this.parentNode) {
        const index = this.parentNode.children.indexOf(this);
        if (index >= 0) this.parentNode.children.splice(index, 1);
        this.parentNode = null;
      }
      this.removed = true;
    },
    querySelector(selector) {
      if (selector === "[data-dsh-stream-blur]") {
        return this.children.find((child) => child.getAttribute && child.getAttribute("data-dsh-stream-blur")) ?? null;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "*") {
        return this.children.slice();
      }
      if (selector.includes("_line_")) {
        return this.children.filter((child) => String(child.className || "").includes("_line_"));
      }
      return [];
    },
  };
}

function loadTheme({ roots = [], tabs = [], flow = null, flows = [] } = {}) {
  let observer;
  let observerOptions;
  let queryCount = 0;
  const document = {
    body: { setAttribute() {}, removeAttribute() {} },
    documentElement: {},
    addEventListener() {},
    head: { appendChild() {} },
    createElement(tag) { return fakeElement(tag); },
    createTreeWalker(root) {
      if (root && Array.isArray(root.__textNodes)) {
        root.__cursor = 0;
        return {
          nextNode() {
            if (root.__cursor < root.__textNodes.length) {
              return root.__textNodes[root.__cursor++];
            }
            return null;
          },
        };
      }
      return { nextNode() { return null; } };
    },
    querySelector(selector) {
      return selector === "style[data-dsh-animation-optimization]" ? null : null;
    },
    querySelectorAll(selector) {
      queryCount += 1;
      if (selector === ".advisor-flow") return flows.slice();
      if (selector === ".QWLzlG_root, ._Xvjua_root, .o3BgMG_root, [class*='_markdown_']") {
        return flow ? flow.slice() : roots.slice();
      }
      if (selector === ".QWLzlG_root") return roots.filter((root) => root.kind !== "file" && root.kind !== "xvjua");
      if (selector === "._Xvjua_root") return roots.filter((root) => root.kind === "xvjua");
      if (selector === ".o3BgMG_root") return roots.filter((root) => root.kind === "file");
      if (selector === ".wSkVaW_tab") return tabs;
      return [];
    },
  };
  class FakeMutationObserver {
    constructor(callback) { this.callback = callback; observer = this; }
    observe(_target, options) { observerOptions = options; }
    disconnect() {}
  }
  let plugin;
  const window = {
    __ModuleLoader__: {
      load(definition) {
        plugin = definition.factory((id) => {
          if (id === "react") {
            return {
              createElement(type, props, ...children) {
                return { type, props: { ...(props || {}), children } };
              },
            };
          }
          if (id === "@deepseek-ai/dsh-client-runtime/client") {
            return {
              defineStore(definition) {
                return {
                  getState() { return definition.init(); },
                  actions: definition.actions,
                };
              },
            };
          }
          return {};
        });
      },
    },
  };
  vm.runInNewContext(source, {
    window,
    document,
    MutationObserver: FakeMutationObserver,
    NodeFilter: { SHOW_TEXT: 4 },
    WeakMap,
    WeakSet,
    clearTimeout,
    setTimeout,
    setInterval,
    clearInterval,
  });
  const ctx = { effect(callback) { return callback(); } };
  plugin.apply(ctx);
  queryCount = 0;
  return {
    fire(records = []) { observer.callback(records); },
    get queryCount() { return queryCount; },
    get observerOptions() { return observerOptions; },
  };
}

function makeRoot({ kind = "think", state = "ok", stateRef = null, body = null, row = null } = {}) {
  const root = {
    kind,
    body,
    getAttribute(name) {
      return name === "data-state" ? (stateRef ? stateRef.value : state) : null;
    },
    querySelector(selector) {
      const rowSelector = kind === "file" ? ".o3BgMG_row" : kind === "xvjua" ? "._Xvjua_row" : ".QWLzlG_row";
      const bodySelector = kind === "file" ? ".o3BgMG_bodyWrap" : kind === "xvjua" ? "._Xvjua_body" : ".QWLzlG_thinkBody";
      if (selector === rowSelector) return row;
      if (selector === bodySelector) return root.body;
      return null;
    },
    querySelectorAll(selector) {
      const scrollSelector = kind === "file"
        ? ".o3BgMG_readBody ._body_biesw_72, .o3BgMG_diffBody ._body_srovd_36"
        : kind === "xvjua" ? "._Xvjua_body" : ".QWLzlG_thinkBody";
      if (root.body && selector === scrollSelector) return [root.body];
      return [];
    },
  };
  return root;
}

test("collapses blank runs at display time only for nodes that just arrived or changed", () => {
  const theme = loadTheme();
  const changed = textNode("a\n\n\nb");
  theme.fire([{ type: "characterData", target: changed }]);
  assert.equal(changed.nodeValue, "a\nb");

  const inserted = textNode("x\n \n\ny");
  theme.fire([{ type: "childList", addedNodes: [inserted] }]);
  assert.equal(inserted.nodeValue, "x\ny");
});

test("never rewrites blank lines inside tool bodies (terminal, diff, read)", () => {
  const theme = loadTheme();
  const terminal = fakeElement("div", "o3BgMG_terminalBody");
  const code = textNode("line1\n\n\nline2");
  code.parentElement = terminal;
  terminal.appendChild(code);
  theme.fire([{ type: "childList", addedNodes: [terminal] }]);
  assert.equal(code.nodeValue, "line1\n\n\nline2");

  const diffLine = textNode("a\n\nb");
  const diffLineEl = fakeElement("div", "_line_srovd_44");
  const diffBody = fakeElement("div", "o3BgMG_diffBody");
  diffLine.parentElement = diffLineEl;
  diffLineEl.parentElement = diffBody;
  theme.fire([{ type: "characterData", target: diffLine }]);
  assert.equal(diffLine.nodeValue, "a\n\nb");
});

test("hides only the Advisor floating capsule, keeps the header toggle, and hides thinking scrollbars", () => {
  assert.match(source, /\.advisor-capsule \{ display: none/);
  assert.doesNotMatch(source, /\.advisor-header-toggle \{ display: none/);
  assert.match(source, /\.advisor-header-toggle \{/);
  assert.match(source, /height: 32px !important/);
  assert.match(source, /\.advisor-panel \{ display: flex !important/);
  assert.match(source, /scrollbar-width: none/);
});

test("keeps the long Advisor review flow following the newest content", async () => {
  const advisorFlow = { scrollTop: 0, scrollHeight: 500, clientHeight: 96 };
  loadTheme({ flows: [advisorFlow] });
  await eventually(() => advisorFlow.scrollTop >= 403.999);
  assert.equal(advisorFlow.scrollTop, 404);
});

test("package manifest follows DSH official plugin conventions", () => {
  assert.equal(pkg.name, "dsh-animation-optimization");
  assert.equal(pkg.dsh.client.platform, "web");
  assert.deepEqual(pkg.dsh.client.inject, ["@deepseek-ai/dsh-client-runtime"]);
  assert.ok(pkg.keywords.includes("theme"));
  assert.ok(pkg.keywords.includes("appearance"));
  assert.ok(pkg.keywords.includes("animation"));
  assert.ok(pkg.keywords.includes("vibe-coding"));
  assert.match(pkg.repository.url, /github\.com\/kelemiao\/dsh-animation-optimization/);
});

test("ships DSH Settings rows for logo, colors and fonts plus split CSS layers", () => {
  assert.match(source, /settings\.general\.item/);
  assert.match(source, /settings\.section/);
  assert.match(source, /data-dsh-logo=off/);
  assert.match(source, /LOGO_STORAGE_KEY/);
  assert.match(source, /COLOR_STORAGE_KEY/);
  assert.match(source, /FONT_STORAGE_KEY/);
  assert.match(source, /var COLOR_CSS = \[/);
  assert.match(source, /var FONT_CSS = \[/);
  assert.match(source, /data-dsh-colors/);
  assert.match(source, /data-dsh-font/);
  assert.match(source, /data-dsh-animation-optimization-colors/);
  assert.match(source, /data-dsh-animation-optimization-fonts/);
  // v27: the duplicate small starburst beside the Think label is gone.
  assert.doesNotMatch(source, /\.QWLzlG_root\[data-state=running\] \.QWLzlG_leading::before/);
});

test("keeps the running clamp tag through the state flip and collapses from pinned height", async () => {
  let clicks = 0;
  const row = { click() { clicks += 1; } };
  const stateRef = { value: "running" };
  const body = fakeElement("div");
  body.scrollTop = 0;
  body.scrollHeight = 400;
  body.clientHeight = 96;
  body.getBoundingClientRect = () => ({ height: 96 });
  const root = makeRoot({ stateRef, row });
  const theme = loadTheme({ roots: [root] });
  assert.equal(clicks, 1); // auto-open

  root.body = body;
  theme.fire();
  await sleep(30);
  assert.equal(body.getAttribute("data-dsh-running"), "1"); // clamp survives state flip

  stateRef.value = "ok";
  theme.fire();
  await sleep(30);
  assert.equal(body.getAttribute("data-dsh-collapsing"), null); // deferred: next item missing
  assert.equal(body.getAttribute("data-dsh-running"), "1"); // clamp still survives

  root.nextElementSibling = { nodeType: 1, className: "_markdown_test", textContent: "next item" };
  theme.fire();
  await sleep(30);
  assert.equal(body.getAttribute("data-dsh-collapsing"), "1");
  // v24: the clamp tag survives through the out animation — DSH re-renders
  // must not be able to drop the 96px clamp and flash the full chain open.
  assert.equal(body.getAttribute("data-dsh-running"), "1");
  assert.equal(body.style.maxHeight, "96px"); // pinned current height

  await eventually(() => clicks === 2, 1200);
  assert.equal(clicks, 2);
  assert.equal(body.getAttribute("data-dsh-running"), null); // released at finish
});

test("collapses as soon as the next disclosure row EXISTS, even a collapsed ok row (real DSH pre-mount)", async () => {
  let clicks = 0;
  const row = { click() { clicks += 1; } };
  const stateRef = { value: "running" };
  const body = fakeElement("div");
  body.scrollTop = 0;
  body.scrollHeight = 400;
  body.clientHeight = 96;
  body.getBoundingClientRect = () => ({ height: 96 });
  const root = makeRoot({ stateRef, row });
  // The next row in the real stream is usually pre-mounted as a collapsed
  // "ok" disclosure with no body — it must still count as "the next item".
  const nextRoot = {
    nodeType: 1,
    className: "QWLzlG_root",
    textContent: "next think row",
    getAttribute(name) { return name === "data-state" ? "ok" : null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  const theme = loadTheme({ roots: [root], flow: [root, nextRoot] });
  assert.equal(clicks, 1); // auto-open while running

  root.body = body;
  theme.fire();
  await sleep(25);
  assert.equal(body.getAttribute("data-dsh-running"), "1");

  stateRef.value = "ok";
  theme.fire();
  await sleep(30);
  // The pending loop must see the collapsed next row and start the close —
  // no waiting for it to become running, and no 8s fallback.
  assert.equal(body.getAttribute("data-dsh-collapsing"), "1");
  await eventually(() => clicks === 2, 1500);
  assert.equal(clicks, 2);
});

test("observes data-state attribute changes so state-only transitions sync", () => {
  const theme = loadTheme();
  assert.equal(theme.observerOptions.attributes, true);
  assert.equal(theme.observerOptions.attributeFilter.join(","), "data-state");
});

test("coalesces a burst of DOM mutations into one page synchronization", async () => {
  const theme = loadTheme();
  for (let index = 0; index < 100; index += 1) theme.fire();
  await sleep(25);
  assert.equal(theme.queryCount, 5);
});

test("does not click the same unsettled disclosure more than once", async () => {
  let clicks = 0;
  const row = { click() { clicks += 1; } };
  const root = makeRoot({ state: "running", row });
  const theme = loadTheme({ roots: [root] });
  theme.fire();
  await sleep(25);
  theme.fire();
  await sleep(25);
  assert.equal(clicks, 1);
});

test("strips the red dot only from the Memory Evolve settings tab and never rewrites unchanged text", async () => {
  const settingsNode = textNode("🔴 Memory Evolve 设置");
  const memoryNode = textNode("🔴 记忆 (3)");
  const tabs = [
    { __textNodes: [settingsNode], textContent: "🔴 Memory Evolve 设置" },
    { __textNodes: [memoryNode], textContent: "🔴 记忆 (3)" },
  ];
  loadTheme({ tabs });
  assert.equal(settingsNode.nodeValue, "Memory Evolve 设置");
  assert.equal(memoryNode.nodeValue, "🔴 记忆 (3)");
});

test("does not auto-close a manually opened completed disclosure", async () => {
  let clicks = 0;
  const row = { click() { clicks += 1; } };
  const body = { scrollTop: 0, scrollHeight: 40, clientHeight: 20 };
  const root = makeRoot({ state: "ok", body, row });
  const theme = loadTheme({ roots: [root] });
  theme.fire();
  await sleep(25);
  theme.fire();
  await sleep(25);
  assert.equal(clicks, 0);
});

test("auto-closes exactly once on running→done after the collapse animation, and never closes manual reopens", async () => {
  let clicks = 0;
  const row = { click() { clicks += 1; } };
  const stateRef = { value: "running" };
  const body = { scrollTop: 0, scrollHeight: 500, clientHeight: 96 };
  const root = makeRoot({ stateRef, row });
  const theme = loadTheme({ roots: [root] });
  assert.equal(clicks, 1); // running + no body -> auto-open once

  root.querySelector = function (selector) {
    if (selector === ".QWLzlG_row") return row;
    if (selector === ".QWLzlG_thinkBody") return root.body;
    return null;
  };
  root.body = body;
  theme.fire();
  await sleep(25);
  assert.equal(clicks, 1); // running + body -> keep open, no extra click

  stateRef.value = "ok";
  theme.fire();
  await sleep(120);
  assert.equal(clicks, 1); // finished but the NEXT item has not appeared yet

  root.nextElementSibling = { nodeType: 1, className: "_markdown_test", textContent: "next item" };
  theme.fire();
  await eventually(() => clicks === 2);
  assert.equal(clicks, 2); // collapses exactly once when the next item exists

  root.body = null;
  theme.fire();
  await sleep(25);
  assert.equal(clicks, 2);

  root.body = body; // user manually reopens
  theme.fire();
  await sleep(450);
  theme.fire();
  await sleep(25);
  assert.equal(clicks, 2); // manual reopen stays open
});

test("auto-opens a running file tool disclosure", async () => {
  let clicks = 0;
  const row = { click() { clicks += 1; } };
  const root = makeRoot({ kind: "file", state: "running", row });
  const theme = loadTheme({ roots: [root] });
  assert.equal(clicks, 1);
  theme.fire();
  await sleep(25);
  assert.equal(clicks, 1);
});

test("collapses file tool bodies with the one-shot animation after running→done", async () => {
  let clicks = 0;
  const row = { click() { clicks += 1; } };
  const stateRef = { value: "running" };
  const body = fakeElement("div");
  body.scrollTop = 0;
  body.scrollHeight = 500;
  body.clientHeight = 96;
  const root = makeRoot({ kind: "file", stateRef, row });
  const theme = loadTheme({ roots: [root] });
  assert.equal(clicks, 1); // auto-open while running

  root.body = body;
  theme.fire();
  await sleep(25);
  assert.equal(clicks, 1);

  stateRef.value = "ok";
  theme.fire();
  await sleep(80);
  assert.equal(body.getAttribute("data-dsh-collapsing"), null); // waits for next item

  root.nextElementSibling = { nodeType: 1, className: "_markdown_test", textContent: "next" };
  theme.fire();
  await sleep(30);
  assert.equal(body.getAttribute("data-dsh-collapsing"), "1"); // animated out first
  await eventually(() => clicks === 2, 2500);
  assert.equal(clicks, 2); // then the row is toggled closed
});

test("stagger-reveals file tool lines while running and delays collapse until the reveal finishes", async () => {
  let clicks = 0;
  const row = { click() { clicks += 1; } };
  const stateRef = { value: "running" };
  const body = fakeElement("div");
  body.scrollTop = 0;
  body.scrollHeight = 500;
  body.clientHeight = 96;
  const line1 = fakeElement("div", "_line_srovd_44");
  const line2 = fakeElement("div", "_line_srovd_44");
  body.appendChild(line1);
  body.appendChild(line2);
  const root = makeRoot({ kind: "file", stateRef, row });
  const theme = loadTheme({ roots: [root] });
  assert.equal(clicks, 1); // auto-open while running

  root.body = body;
  theme.fire();
  await sleep(30);
  assert.match(line1.style.animation, /dsh-line-in/);
  assert.match(line1.style.animation, /0ms/);
  assert.match(line2.style.animation, /24ms/); // 2-line segment: 0ms, 24ms, then 110ms chunk gap

  stateRef.value = "ok";
  theme.fire();
  await sleep(120);
  assert.equal(clicks, 1); // still waiting for the next item

  root.nextElementSibling = { nodeType: 1, className: "_markdown_test", textContent: "next" };
  theme.fire();
  await eventually(() => clicks === 2, 2400);
  assert.equal(clicks, 2); // collapsed after the next item appears
});

test("stream-staggers file lines that render only after the row finished (fast tool calls)", async () => {
  let clicks = 0;
  const row = { click() { clicks += 1; } };
  const stateRef = { value: "running" };
  const body = fakeElement("div");
  body.scrollTop = 0;
  body.scrollHeight = 500;
  body.clientHeight = 96;
  const line1 = fakeElement("div", "_line_srovd_44");
  const line2 = fakeElement("div", "_line_srovd_44");
  body.appendChild(line1);
  body.appendChild(line2);
  const root = makeRoot({ kind: "file", stateRef, row });
  const theme = loadTheme({ roots: [root] });
  assert.equal(clicks, 1); // auto-open while running

  stateRef.value = "ok";
  theme.fire(); // finishes BEFORE the body/lines have mounted
  await sleep(25);
  assert.equal(clicks, 1);

  root.body = body; // lines mount only now, after ok
  theme.fire();
  await sleep(30);
  assert.match(line1.style.animation, /dsh-line-in/);
  assert.match(line1.style.animation, /0ms/);
  assert.match(line2.style.animation, /24ms/);
  assert.equal(body.getAttribute("data-dsh-collapsing"), null); // still waits for the next item

  root.nextElementSibling = { nodeType: 1, className: "_markdown_test", textContent: "next" };
  theme.fire();
  await eventually(() => clicks === 2, 2400);
  assert.equal(clicks, 2);
});

test("streams tool bodies without _line_ elements through their text leaves", async () => {
  let clicks = 0;
  const row = { click() { clicks += 1; } };
  const body = fakeElement("div");
  body.scrollTop = 0;
  body.scrollHeight = 500;
  body.clientHeight = 96;
  const leaf1 = fakeElement("div");
  leaf1.textContent = "first";
  const leaf2 = fakeElement("div");
  leaf2.textContent = "second";
  body.appendChild(leaf1);
  body.appendChild(leaf2);
  const root = makeRoot({ kind: "file", state: "running", body, row });
  loadTheme({ roots: [root] });
  await sleep(30);
  // No _line_ class: fallback streams the text-bearing leaves chunk by chunk.
  assert.match(leaf1.style.animation, /dsh-line-in/);
  assert.match(leaf1.style.animation, /0ms/);
  assert.match(leaf2.style.animation, /24ms/);
});

test("auto-scrolls a running thinking body to the bottom with a non-linear tween and respects user scroll-up", async () => {
  let clicks = 0;
  const row = { click() { clicks += 1; } };
  const body = { scrollTop: 0, scrollHeight: 500, clientHeight: 96 };
  const root = makeRoot({ state: "running", body, row });
  const theme = loadTheme({ roots: [root] });
  await eventually(() => body.scrollTop >= 403.999);
  assert.equal(body.scrollTop, 404);

  body.scrollHeight = 560; // stream grows; position untouched by the user
  theme.fire();
  await eventually(() => body.scrollTop >= 463.999);
  assert.equal(body.scrollTop, 464); // growth alone must keep following

  body.scrollTop = 100;
  body.scrollHeight = 800;
  theme.fire();
  await sleep(80);
  assert.equal(body.scrollTop, 100); // user scrolled up: leave it alone

  body.scrollTop = 800 - 96 - 10;
  theme.fire();
  await eventually(() => body.scrollTop >= 703.999);
  assert.equal(body.scrollTop, 704); // near bottom: follow the stream again
});
