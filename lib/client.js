/**
 * dsh-theme-photo-editorial — client half (Claude / Anthropic aesthetic, v27).
 *
 * v27: streaming now covers pwsh terminal output, write and edit diffs — the
 * stagger scans the WHOLE tool bodyWrap for `_line_*` elements (with a text-
 * leaf fallback), so terminal lines no longer pop in as one blob. The small
 * starburst to the left of the Think label is removed; only the big assistant
 * logo remains.
 * v26: REVERTED v24's instant bottom-anchor on first overflow. Auto-scroll is
 * back to pure non-linear following with no first-frame jump.
 * v25: CSS split into behavior / color / font layers; DSH Settings has three
 * switches — Claude logo / Claude colors / Claude font — persisted in
 * localStorage and applied through body attributes.
 * v23/v24 (kept): collapse fires exactly when the next item mounts; the
 * running clamp tag lives until the collapse animation finishes.
 */
window.__ModuleLoader__.load({ id: "dsh-theme-photo-editorial", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";

var React = require("react");
var runtimeClient = require("@deepseek-ai/dsh-client-runtime/client");

var SERIF = "'Anthropic Serif', 'Tiempos Text', Georgia, 'Times New Roman', 'Songti SC', 'STSong', 'SimSun', serif";
var CLAY = "#D97757";

function svgUri(svg) { return "data:image/svg+xml," + encodeURIComponent(svg); }

/* Official Claude starburst (from claude-color.svg / claude.ai greeting spark). */
var CLAUDE_STAR_PATH = "M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z";
var STAR_URI = svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="' + CLAUDE_STAR_PATH + '" fill="#D97757"/></svg>');

/* ======================= Theme switches: Claude logo / colors / fonts ======================= */
var LOGO_STORAGE_KEY = "dsh-theme-photo-editorial:logoEnabled";
var COLOR_STORAGE_KEY = "dsh-theme-photo-editorial:claudeColors";
var FONT_STORAGE_KEY = "dsh-theme-photo-editorial:claudeFonts";
var readStoredFlag = function (key) {
  try {
    var raw = localStorage.getItem(key);
    return raw === null ? true : raw !== "0" && raw !== "false";
  } catch (e) { return true; }
};
var readLogoEnabled = function () { return readStoredFlag(LOGO_STORAGE_KEY); };
var readColorEnabled = function () { return readStoredFlag(COLOR_STORAGE_KEY); };
var readFontEnabled = function () { return readStoredFlag(FONT_STORAGE_KEY); };
var applyBodyFlag = function (attr, enabled) {
  if (typeof document === "undefined" || !document.body) return;
  if (enabled) document.body.removeAttribute(attr);
  else document.body.setAttribute(attr, "off");
};
var applyLogoState = function (enabled) { applyBodyFlag("data-dsh-logo", enabled); };
var applyColorState = function (enabled) { applyBodyFlag("data-dsh-colors", enabled); };
var applyFontState = function (enabled) { applyBodyFlag("data-dsh-font", enabled); };
var logoToggleStore = null;
if (runtimeClient && typeof runtimeClient.defineStore === "function") {
  logoToggleStore = runtimeClient.defineStore({
    init: function () {
      return {
        enabled: readLogoEnabled(),
        colors: readColorEnabled(),
        fonts: readFontEnabled()
      };
    },
    actions: {
      sync: function (draft, enabled) { draft.enabled = !!enabled; },
      syncColors: function (draft, enabled) { draft.colors = !!enabled; },
      syncFonts: function (draft, enabled) { draft.fonts = !!enabled; }
    }
  });
}
function themeUiText() {
  var zh = typeof navigator !== "undefined" && /^zh/i.test(navigator.language || "");
  return {
    section: zh ? "Photo Editorial 主题" : "Photo Editorial Theme",
    logo: {
      title: zh ? "Claude 星爆标志" : "Claude Logo",
      description: zh ? "显示助手消息的星爆头像与思考指示器。" : "Show the Claude starburst avatar and thinking indicator."
    },
    colors: {
      title: zh ? "Claude 配色" : "Claude Colors",
      description: zh ? "使用暖米色与矿物色的 Claude 风配色；关闭后恢复 DSH 原版配色。" : "Use the warm ivory / mineral Claude palette; turn off for the original DSH colors."
    },
    fonts: {
      title: zh ? "Claude 字体" : "Claude Font",
      description: zh ? "标题、路径与引用使用 Claude 风衬线字体；关闭后恢复 DSH 默认字体。" : "Use the Claude-style serif for headings and quotes; turn off for the default DSH fonts."
    }
  };
}
function ToggleRow(props) {
  var enabled = !!props.enabled;
  return React.createElement("div", {
    style: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: "16px", padding: "16px 0",
      borderBottom: "1px solid var(--dsw-alias-border-l2)"
    }
  },
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "4px" } },
      React.createElement("div", { style: { fontSize: "14px", lineHeight: "22px", color: "var(--dsw-alias-label-primary)" } },
        props.title),
      React.createElement("div", { style: { fontSize: "12px", lineHeight: "18px", color: "var(--dsw-alias-label-tertiary)" } },
        props.description)
    ),
    React.createElement("button", {
      type: "button",
      "aria-pressed": enabled,
      onClick: function () { props.onToggle(!enabled); },
      style: {
        width: "40px", height: "22px", borderRadius: "999px", border: "none", cursor: "pointer",
        position: "relative", padding: 0,
        background: enabled ? "var(--dsw-alias-brand-primary)" : "var(--dsw-alias-button-primary-dimmed)",
        transition: "background 0.2s cubic-bezier(0.22, 1, 0.36, 1)"
      }
    },
      React.createElement("span", {
        style: {
          position: "absolute", top: "2px", left: enabled ? "20px" : "2px",
          width: "18px", height: "18px", borderRadius: "999px",
          background: enabled ? "#FAF9F5" : "var(--dsw-alias-label-tertiary)",
          transition: "left 0.2s cubic-bezier(0.22, 1, 0.36, 1), background 0.2s"
        }
      })
    )
  );
}
function LogoRow(props) {
  var copy = themeUiText().logo;
  var enabled = props.useStore(function (state) { return state.enabled; });
  return React.createElement(ToggleRow, {
    title: copy.title,
    description: copy.description,
    enabled: enabled,
    onToggle: props.setLogo
  });
}
function ColorRow(props) {
  var copy = themeUiText().colors;
  var enabled = props.useStore(function (state) { return state.colors; });
  return React.createElement(ToggleRow, {
    title: copy.title,
    description: copy.description,
    enabled: enabled,
    onToggle: props.setColors
  });
}
function FontRow(props) {
  var copy = themeUiText().fonts;
  var enabled = props.useStore(function (state) { return state.fonts; });
  return React.createElement(ToggleRow, {
    title: copy.title,
    description: copy.description,
    enabled: enabled,
    onToggle: props.setFonts
  });
}
function ThemeSection(props) {
  var copy = themeUiText();
  return React.createElement("div", { style: { padding: "8px 0", maxWidth: 680 } },
    React.createElement("div", { style: { fontSize: "18px", lineHeight: "26px", fontWeight: 600, color: "var(--dsw-alias-label-primary)", paddingBottom: "4px" } },
      copy.section),
    React.createElement(LogoRow, props),
    React.createElement(ColorRow, props),
    React.createElement(FontRow, props)
  );
}

/* Token overrides are the ENTIRE color switch: with the body attribute set to
   "off", these rules stop matching, the variables resolve to DSH's original
   palette and every color-consuming rule below follows automatically. */
var COLOR_CSS = [
  /* ======================= Light tokens ======================= */
  "body:not([data-dsh-colors=off]) {",
  "  --dsw-alias-bg-base: #FAF9F5;",
  "  --dsw-alias-bg-layer-1: #FAF9F5;",
  "  --dsw-alias-bg-layer-2: #F5F3ED;",
  "  --dsw-alias-bg-layer-3: #F0EEE6;",
  "  --dsw-alias-bg-overlay: #E8E6DC;",
  "  --dsw-alias-bg-module-platform: #F5F3ED;",
  "  --dsw-alias-bg-multi-select: #F5F3ED;",
  "  --dsw-alias-bg-skeleton: rgba(20,20,19,0.06);",
  "  --dsw-alias-border-l1: rgba(20,20,19,0.06);",
  "  --dsw-alias-border-l2: rgba(20,20,19,0.10);",
  "  --dsw-alias-border-l2-darkmode-thin: rgba(20,20,19,0.10);",
  "  --dsw-alias-border-l3: rgba(20,20,19,0.14);",
  "  --dsw-alias-border-l4: rgba(20,20,19,0.20);",
  "  --dsw-alias-border-inverted: rgba(20,20,19,0.06);",
  "  --dsw-alias-border-inverted2: rgba(20,20,19,0.06);",
  "  --dsw-alias-label-primary: #141413;",
  "  --dsw-alias-label-primary-bluish: #141413;",
  "  --dsw-alias-label-primary-dimmed: #3D3D3A;",
  "  --dsw-alias-label-primary-foreground: #FAF9F5;",
  "  --dsw-alias-label-primary-inverted: #FAF9F5;",
  "  --dsw-alias-label-secondary: #3D3D3A;",
  "  --dsw-alias-label-tertiary: #87867F;",
  "  --dsw-alias-label-caption: #87867F;",
  "  --dsw-alias-label-dimmed: #B0AEA5;",
  "  --dsw-alias-brand-primary: #D97757;",
  "  --dsw-alias-brand-primary-invert: #FAF9F5;",
  "  --dsw-alias-brand-primary-new-colorprimary-new-color: #D97757;",
  "  --dsw-alias-brand-text: #141413;",
  "  --dsw-alias-button-primary-fill: #D97757;",
  "  --dsw-alias-button-primary-hover: #C96845;",
  "  --dsw-alias-button-primary-dimmed: #F0EEE6;",
  "  --dsw-alias-button-contrast-fill: #3D3D3A;",
  "  --dsw-alias-button-elevated-fill: #FAF9F5;",
  "  --dsw-alias-button-floating-fill: #FAF9F5;",
  "  --dsw-alias-button-floating-hover: #F5F3ED;",
  "  --dsw-alias-button-info-fill: #D97757;",
  "  --dsw-alias-button-info-hover: #C96845;",
  "  --dsw-alias-button-ghost-active-fill: #F0EEE6;",
  "  --dsw-alias-button-ghost-active-hover: #E8E6DC;",
  "  --dsw-alias-button-ghost-active-border: #87867F;",
  "  --dsw-alias-button-tool-bar-fill: rgba(61,61,58,0.5);",
  "  --dsw-alias-button-tool-bar-hover: rgba(61,61,58,0.6);",
  "  --dsw-alias-button-tool-bar-fill-invisible: rgba(20,20,19,0.36);",
  "  --dsw-alias-interactive-bg-hover: rgba(20,20,19,0.05);",
  "  --dsw-alias-interactive-bg-hover-accent: rgba(217,119,87,0.12);",
  "  --dsw-alias-interactive-bg-hover-danger: rgba(179,35,30,0.06);",
  "  --dsw-alias-interactive-bg-hover-solid: #F0EEE6;",
  "  --dsw-alias-interactive-bg-active: rgba(20,20,19,0.08);",
  "  --dsw-alias-state-business-primary: #D97757;",
  "  --dsw-alias-state-business-tertiary: #F0E1D8;",
  "  --dsw-alias-state-error-primary: #B3231E;",
  "  --dsw-alias-state-error-secondary: #D1524A;",
  "  --dsw-alias-state-success-primary: #3E7A4E;",
  "  --dsw-alias-state-success-secondary: #5C8A6A;",
  "  --dsw-alias-state-success-tertiary: #E8EEE2;",
  "  --dsw-alias-state-warn-primary: #A8701E;",
  "  --dsw-alias-state-warn-secondary: #C0892E;",
  "  --dsw-alias-state-warn-tertiary: #F2E8D2;",
  "  --dsw-alias-state-warn-label: #8C5E1A;",
  "  --dsw-alias-markdown-code-block: #F5F3ED;",
  "  --dsw-alias-markdown-code-block-banner: #F0EEE6;",
  "  --dsw-alias-markdown-inline-code: #EEEBE2;",
  "  --dsw-alias-markdown-code-segment-selected: #FAF9F5;",
  "  --dsw-alias-markdown-code-segment-unselected: #F0EEE6;",
  "  --dsw-alias-markdown-citation: #F0EEE6;",
  "  --dsw-alias-markdown-placeholder: #F0EEE6;",
  "  --dsw-alias-markdown-tag: #F0EEE6;",
  "  --dsw-alias-scrollbar-bg-l1: #E8E6DC;",
  "  --dsw-alias-scrollbar-bg-l2: #E8E6DC;",
  "  --dsw-alias-scrollbar-hover-l1: #C6C4BA;",
  "  --dsw-alias-scrollbar-hover-l2: #C6C4BA;",
  "  --dsw-alias-toast-bg: #141413;",
  "  --dsw-alias-tooltip-bg: #3D3D3A;",
  "  --dsw-specific-sidebar-fill: #F5F3ED;",
  "  --dsw-specific-sidebar-nav-item-active: #F0EEE6;",
  "  --dsw-specific-sidebar-nav-item-hover: #F5F3ED;",
  "  --dsw-specific-sidebar-nav-item-active-accent: #D97757;",
  "  --dsw-specific-bubble: #F0EEE6;",
  "  --dsw-specific-bubble-highlight: #E8E6DC;",
  "  --dsw-specific-input-major: #FAF9F5;",
  "  --dsw-specific-login-input: #FAF9F5;",
  "  --dsw-specific-menu: #FAF9F5;",
  "  --dsw-specific-selector: #F5F3ED;",
  "  --dsw-specific-tip: #F0EEE6;",
  "}",

  /* ======================= Dark tokens ======================= */
  "body:not([data-dsh-colors=off])[data-ds-dark-theme] {",
  "  --dsw-alias-bg-base: #1F1E1C;",
  "  --dsw-alias-bg-layer-1: #262523;",
  "  --dsw-alias-bg-layer-2: #2B2A27;",
  "  --dsw-alias-bg-layer-3: #302E2B;",
  "  --dsw-alias-bg-overlay: #3A3835;",
  "  --dsw-alias-bg-module-platform: #262523;",
  "  --dsw-alias-bg-multi-select: #2B2A27;",
  "  --dsw-alias-bg-skeleton: rgba(240,238,230,0.08);",
  "  --dsw-alias-border-l1: rgba(240,238,230,0.08);",
  "  --dsw-alias-border-l2: rgba(240,238,230,0.12);",
  "  --dsw-alias-border-l2-darkmode-thin: rgba(240,238,230,0.08);",
  "  --dsw-alias-border-l3: rgba(240,238,230,0.16);",
  "  --dsw-alias-border-l4: rgba(240,238,230,0.22);",
  "  --dsw-alias-border-inverted: rgba(240,238,230,0.08);",
  "  --dsw-alias-border-inverted2: rgba(240,238,230,0.08);",
  "  --dsw-alias-label-primary: #F0EEE6;",
  "  --dsw-alias-label-primary-bluish: #F0EEE6;",
  "  --dsw-alias-label-primary-dimmed: #C6C4BA;",
  "  --dsw-alias-label-primary-foreground: #141413;",
  "  --dsw-alias-label-primary-inverted: #141413;",
  "  --dsw-alias-label-secondary: #C6C4BA;",
  "  --dsw-alias-label-tertiary: #87867F;",
  "  --dsw-alias-label-caption: #6E6C66;",
  "  --dsw-alias-label-dimmed: #4A4844;",
  "  --dsw-alias-brand-primary: #D97757;",
  "  --dsw-alias-brand-primary-invert: #141413;",
  "  --dsw-alias-brand-primary-new-colorprimary-new-color: #D97757;",
  "  --dsw-alias-brand-text: #F0EEE6;",
  "  --dsw-alias-button-primary-fill: #D97757;",
  "  --dsw-alias-button-primary-hover: #E28A6B;",
  "  --dsw-alias-button-primary-dimmed: #302E2B;",
  "  --dsw-alias-button-contrast-fill: #F0EEE6;",
  "  --dsw-alias-button-elevated-fill: #2B2A27;",
  "  --dsw-alias-button-floating-fill: #2B2A27;",
  "  --dsw-alias-button-floating-hover: #302E2B;",
  "  --dsw-alias-button-info-fill: #D97757;",
  "  --dsw-alias-button-info-hover: #E28A6B;",
  "  --dsw-alias-button-ghost-active-fill: #262523;",
  "  --dsw-alias-button-ghost-active-hover: #302E2B;",
  "  --dsw-alias-button-ghost-active-border: #87867F;",
  "  --dsw-alias-button-tool-bar-fill: rgba(198,196,186,0.5);",
  "  --dsw-alias-button-tool-bar-hover: rgba(198,196,186,0.6);",
  "  --dsw-alias-button-tool-bar-fill-invisible: rgba(240,238,230,0.36);",
  "  --dsw-alias-interactive-bg-hover: rgba(240,238,230,0.08);",
  "  --dsw-alias-interactive-bg-hover-accent: rgba(217,119,87,0.20);",
  "  --dsw-alias-interactive-bg-hover-danger: rgba(209,82,74,0.15);",
  "  --dsw-alias-interactive-bg-hover-solid: #2B2A27;",
  "  --dsw-alias-interactive-bg-active: rgba(240,238,230,0.14);",
  "  --dsw-alias-state-business-primary: #D97757;",
  "  --dsw-alias-state-business-tertiary: #4A3228;",
  "  --dsw-alias-state-error-primary: #D1524A;",
  "  --dsw-alias-state-error-secondary: #D1524A;",
  "  --dsw-alias-state-success-primary: #6FA67B;",
  "  --dsw-alias-state-success-secondary: #6FA67B;",
  "  --dsw-alias-state-success-tertiary: #2E3A2F;",
  "  --dsw-alias-state-warn-primary: #D9A64B;",
  "  --dsw-alias-state-warn-secondary: #D9A64B;",
  "  --dsw-alias-state-warn-tertiary: #433A28;",
  "  --dsw-alias-state-warn-label: #C0892E;",
  "  --dsw-alias-markdown-code-block: #262523;",
  "  --dsw-alias-markdown-code-block-banner: #201F1D;",
  "  --dsw-alias-markdown-inline-code: #2B2A27;",
  "  --dsw-alias-markdown-code-segment-selected: #302E2B;",
  "  --dsw-alias-markdown-code-segment-unselected: #201F1D;",
  "  --dsw-alias-markdown-citation: #2B2A27;",
  "  --dsw-alias-markdown-placeholder: #2B2A27;",
  "  --dsw-alias-markdown-tag: #2B2A27;",
  "  --dsw-alias-scrollbar-bg-l1: #4A4844;",
  "  --dsw-alias-scrollbar-bg-l2: #4A4844;",
  "  --dsw-alias-scrollbar-hover-l1: #6E6C66;",
  "  --dsw-alias-scrollbar-hover-l2: #6E6C66;",
  "  --dsw-alias-toast-bg: #302E2B;",
  "  --dsw-alias-tooltip-bg: #3A3835;",
  "  --dsw-specific-sidebar-fill: #201F1D;",
  "  --dsw-specific-sidebar-nav-item-active: #2B2A27;",
  "  --dsw-specific-sidebar-nav-item-hover: #262523;",
  "  --dsw-specific-sidebar-nav-item-active-accent: #D97757;",
  "  --dsw-specific-bubble: #2B2A27;",
  "  --dsw-specific-bubble-highlight: #302E2B;",
  "  --dsw-specific-input-major: #262523;",
  "  --dsw-specific-login-input: #201F1D;",
  "  --dsw-specific-menu: #2B2A27;",
  "  --dsw-specific-selector: #2B2A27;",
  "  --dsw-specific-tip: #2B2A27;",
  "}",

  "body:not([data-dsh-colors=off]) { background-color: #FAF9F5; }"
].join("\n");

/* Behavior + neutral structural rules: always on, independent of the color
   and font switches. Colors below only consume --dsw-alias-* variables. */
var BASE_CSS = [

  /* ======================= Layout refinements ======================= */
  ".Md3f7G_column { gap: 16px !important; }",
  ".wSkVaW_tabActive { color: var(--dsw-alias-label-primary) !important; }",
  ".wSkVaW_tabActive:after { background: var(--dsw-alias-brand-primary) !important; height: 2px !important; border-radius: 2px !important; }",

  /* ======================= Animations ======================= */
  "@keyframes dsh-claude-morph { 0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; } 25% { transform: scale(1.12) rotate(5deg); opacity: 0.88; } 50% { transform: scale(0.95) rotate(0deg); opacity: 1; } 75% { transform: scale(1.08) rotate(-4deg); opacity: 0.92; } }",
  "@keyframes dsh-claude-pop { 0% { opacity: 0; transform: scale(0.4); } 70% { transform: scale(1.12); } 100% { opacity: 1; transform: scale(1); } }",

  /* ======================= Assistant avatar + streaming spin ======================= */
  ".Sxvs8a_root { position: relative; padding-left: 34px; }",
  ".Sxvs8a_root::before {",
  "  content: \"\";",
  "  position: absolute;",
  "  left: 0;",
  "  top: 6px;",
  "  width: 22px;",
  "  height: 22px;",
  "  background-image: url(\"" + STAR_URI + "\");",
  "  background-size: contain;",
  "  background-repeat: no-repeat;",
  "  background-position: center;",
  "  animation: dsh-claude-pop 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.3) both;",
  "}",
  ".Sxvs8a_root[data-streaming]::before { animation: dsh-claude-morph 1.8s ease-in-out infinite; }",
  "body[data-dsh-logo=off] .Sxvs8a_root { padding-left: 0 !important; }",
  "body[data-dsh-logo=off] .Sxvs8a_root::before,",
  "body[data-dsh-logo=off] .Md3f7G_turnStatus::before { display: none !important; }",

  /* ======================= Thinking spinner ======================= */
  ".Md3f7G_turnStatus { display: inline-flex !important; align-items: center; gap: 8px; background: none !important; color: var(--dsw-alias-label-tertiary) !important; -webkit-text-fill-color: var(--dsw-alias-label-tertiary) !important; }",
  ".Md3f7G_turnStatus::before {",
  "  content: \"\";",
  "  width: 16px; height: 16px;",
  "  background-image: url(\"" + STAR_URI + "\");",
  "  background-size: contain; background-repeat: no-repeat; background-position: center;",
  "  animation: dsh-claude-morph 1.8s ease-in-out infinite;",
  "}",
  ".QWLzlG_root[data-state=running] .QWLzlG_thinkBody,",
  "._Xvjua_root[data-state=running] ._Xvjua_body,",
  ".o3BgMG_root[data-state=running] .o3BgMG_readBody ._body_biesw_72,",
  ".o3BgMG_root[data-state=running] .o3BgMG_diffBody ._body_srovd_36,",
  ".QWLzlG_thinkBody[data-dsh-running],",
  "._Xvjua_body[data-dsh-running],",
  ".o3BgMG_readBody ._body_biesw_72[data-dsh-running],",
  ".o3BgMG_diffBody ._body_srovd_36[data-dsh-running] {",
  "  position: relative !important;",
  "  box-sizing: border-box !important;",
  "  max-height: 96px !important;",
  "  overflow-y: auto !important;",
  "  overflow-x: hidden !important;",
  "  scroll-behavior: auto !important;",
  "  overflow-anchor: none !important;",
  "  mask-image: linear-gradient(to bottom, #000 0%, #000 80%, transparent 100%) !important;",
  "  -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 80%, transparent 100%) !important;",
  "}",

  /* Non-linear one-shot reveal/collapse animations for disclosure bodies.
     Only transform+opacity animate, so every frame stays on the compositor. */
  "@keyframes dsh-disclose-in {",
  "  0% { opacity: 0; transform: translateY(10px) scale(0.98); }",
  "  60% { opacity: 1; }",
  "  100% { opacity: 1; transform: translateY(0) scale(1); }",
  "}",
  "@keyframes dsh-disclose-out {",
  "  0% { opacity: 1; transform: translateY(0) scale(1); }",
  "  100% { opacity: 0; transform: translateY(8px) scale(0.96); }",
  "}",
  "@keyframes dsh-line-in {",
  "  0% { opacity: 0; transform: translateY(9px) scale(0.98); }",
  "  100% { opacity: 1; transform: none; }",
  "}",
  ".QWLzlG_thinkBody, ._Xvjua_body, .o3BgMG_bodyWrap {",
  "  animation: dsh-disclose-in 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;",
  "  will-change: transform, opacity;",
  "  backface-visibility: hidden;",
  "}",
  "[data-dsh-collapsing] {",
  "  overflow: hidden !important;",
  "  animation: dsh-disclose-out 0.34s cubic-bezier(0.65, 0, 0.35, 1) forwards !important;",
  "  will-change: transform, opacity;",
  "  pointer-events: none !important;",
  "}",
  "@media (prefers-reduced-motion: reduce) {",
  "  .QWLzlG_thinkBody, ._Xvjua_body, .o3BgMG_bodyWrap, [data-dsh-collapsing] {",
  "    animation-duration: 0.01ms !important;",
  "  }",
  "}",

  /* Thinking viewports: no scrollbar on the right, content still scrolls. */
  ".QWLzlG_thinkBody, ._Xvjua_body { scrollbar-width: none !important; }",
  ".QWLzlG_thinkBody::-webkit-scrollbar, ._Xvjua_body::-webkit-scrollbar {",
  "  display: none !important;",
  "  width: 0 !important;",
  "  height: 0 !important;",
  "}",

  /* The memory-evolve Advisor floating capsule is not part of this theme's
     art direction; hide only the capsule. The header toggle and its panel
     stay available (no-op when the plugin is not installed). */
  ".advisor-capsule { display: none !important; }",

  /* ======================= Structural accents ======================= */
  ".gdEzaW_bubble { border-radius: 20px; padding: 10px 18px; }",
  ".uV2eYG_primary { background: var(--dsw-alias-brand-primary) !important; color: #FAF9F5 !important; border-radius: 999px !important; }",
  ".uV2eYG_primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover) !important; }",

  /* Color-consuming accents (variables follow whichever palette is active). */
  "blockquote {",
  "  color: var(--dsw-alias-label-secondary);",
  "  border-left: 2px solid var(--dsw-alias-brand-primary);",
  "}",
  "hr { border: none; height: 1px; background: var(--dsw-alias-border-l2); }",
  "a { color: var(--dsw-alias-brand-primary); }",
  "::selection { background: var(--dsw-alias-brand-primary); color: #FAF9F5; }"
].join("\n");

/* Serif / Songti mix: the entire font switch, scoped off by a body attribute.
   Disabled = DSH default fonts. */
var FONT_CSS = [
  "body:not([data-dsh-font=off]) h1,",
  "body:not([data-dsh-font=off]) h2,",
  "body:not([data-dsh-font=off]) h3,",
  "body:not([data-dsh-font=off]) h4,",
  "body:not([data-dsh-font=off]) h5,",
  "body:not([data-dsh-font=off]) h6 {",
  "  font-family: " + SERIF + ";",
  "  font-weight: 500;",
  "  letter-spacing: -0.02em;",
  "  line-height: 1.15;",
  "  color: var(--dsw-alias-label-primary);",
  "}",
  "body:not([data-dsh-font=off]) h1 { font-size: 1.5em; }",
  "body:not([data-dsh-font=off]) h2 { font-size: 1.35em; }",
  "body:not([data-dsh-font=off]) h3 { font-size: 1.2em; }",
  "body:not([data-dsh-font=off]) .wSkVaW_crumbCurrent { font-family: " + SERIF + " !important; font-size: 15px; font-weight: 500; letter-spacing: -0.01em; }",
  "body:not([data-dsh-font=off]) .pXSMma_headline,",
  "body:not([data-dsh-font=off]) .pXSMma_headlineText { font-family: " + SERIF + " !important; font-weight: 500; letter-spacing: -0.02em; }",
  "body:not([data-dsh-font=off]) blockquote {",
  "  font-family: " + SERIF + ";",
  "  font-style: italic;",
  "}"
].join("\n");

exports.inject = ["slots"];
exports.apply = function apply(ctx) {
  applyLogoState(readLogoEnabled());
  applyColorState(readColorEnabled());
  applyFontState(readFontEnabled());
  ctx.effect(function () {
    if (typeof document === "undefined") return function () {};
    var existing = document.querySelector("style[data-dsh-theme-photo-editorial]");
    if (existing) return function () {};
    var makeStyle = function (attr, css) {
      var styleTag = document.createElement("style");
      styleTag.setAttribute(attr, "1");
      styleTag.textContent = css;
      return styleTag;
    };
    var tag = makeStyle("data-dsh-theme-photo-editorial", BASE_CSS);
    var colorTag = makeStyle("data-dsh-theme-photo-editorial-colors", COLOR_CSS);
    var fontTag = makeStyle("data-dsh-theme-photo-editorial-fonts", FONT_CSS);
    document.head.appendChild(tag);
    document.head.appendChild(colorTag);
    document.head.appendChild(fontTag);

    // 🔴: strip the red dot only from the "Memory Evolve …" settings tab.
    // Other tabs keep their pending-count badges. The u-flag is required for
    // the \u{1F534} codepoint escape to work inside a regex; the guard below
    // prevents same-value writes, which used to feed the mutation loop.
    var RED_DOT = /\u{1F534}\uFE0F?\s*/gu;
    var stripRedDots = function () {
      var tabs = document.querySelectorAll(".wSkVaW_tab");
      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        var label = tab.textContent || "";
        if (label.indexOf("Memory Evolve") === -1) continue;
        var walker = document.createTreeWalker(tab, NodeFilter.SHOW_TEXT);
        var n;
        while ((n = walker.nextNode())) {
          if (!n || typeof n.nodeValue !== "string") continue;
          var before = n.nodeValue;
          var after = before.replace(RED_DOT, "");
          if (after !== before) n.nodeValue = after;
        }
      }
    };

    // Thinking/command/file disclosures share one state machine:
    //   running + closed      -> auto-open once and auto-scroll the stream
    //   running -> ok/error   -> auto-collapse exactly once (user asked for it)
    //   manual open of a done -> never touched (stays open + fully scrollable)
    var DISCLOSURES = [
      { root: ".QWLzlG_root", row: ".QWLzlG_row", body: ".QWLzlG_thinkBody",
        scroll: ".QWLzlG_thinkBody" },
      { root: "._Xvjua_root", row: "._Xvjua_row", body: "._Xvjua_body",
        scroll: "._Xvjua_body" },
      { root: ".o3BgMG_root", row: ".o3BgMG_row", body: ".o3BgMG_bodyWrap",
        scroll: ".o3BgMG_readBody ._body_biesw_72, .o3BgMG_diffBody ._body_srovd_36" }
    ];
    var lastStates = new WeakMap();
    var pendingClicks = new WeakMap();
    var pendingCollapse = new Map();

    // Display-time blank-line preprocessing: only the text nodes that were
    // just inserted or just changed are collapsed, exactly once, inside the
    // mutation callback. No periodic whole-body rewrites -> no flicker.
    // File bodies are never touched (code/diffs stay byte-for-byte intact).
    var collapseBlankRuns = function (node) {
      if (!node || typeof node.nodeValue !== "string") return;
      var t = node.nodeValue;
      var t2 = t.replace(/\n[ \t]*\n+/g, "\n");
      if (t2 !== t) node.nodeValue = t2;
    };
    var visitNewNodes = function (node) {
      if (!node) return;
      if (node.nodeType === 3) {
        collapseBlankRuns(node);
        return;
      }
      var kids = node.childNodes;
      if (!kids) return;
      for (var i = 0; i < kids.length; i++) visitNewNodes(kids[i]);
    };
    var cleanMutationRecords = function (records) {
      for (var r = 0; r < records.length; r++) {
        var record = records[r];
        if (record.type === "characterData") collapseBlankRuns(record.target);
        else if (record.type === "childList") {
          var added = record.addedNodes;
          for (var a = 0; a < added.length; a++) visitNewNodes(added[a]);
        }
      }
    };

    // One global 0ms interval drives every active scroll box with a 16ms
    // per-element throttle. 0ms timers fire reliably in all browser states
    // (headless/background included); the throttle keeps the ~60fps glide.
    // scrollMemory survives between bursts so a later user scroll-up is still
    // recognized against the previous bottom anchor.
    var scrollEntries = new Map();
    var scrollMemory = new WeakMap();
    var staggerCounts = new WeakMap();
    var staggeredLines = new WeakSet();
    var staggerEnds = new WeakMap();
    var revealStarted = new WeakMap();
    var autoOpened = new WeakSet();
    var finishedWithoutBody = new WeakSet();
    var FILE_REVEAL_MIN_MS = 1400;
    var scrollTimer = null;
    var processScrolls = function () {
      var now = Date.now();
      scrollEntries.forEach(function (entry, el) {
        var mem = scrollMemory.get(el);
        if (!mem || mem.userUp) return;
        if (now - entry.last < 16) return;
        entry.last = now;
        var max = Math.max(0, el.scrollHeight - el.clientHeight);
        var dest = Math.min(entry.target, max);
        var delta = dest - el.scrollTop;
        if (Math.abs(delta) < 0.5) {
          el.scrollTop = dest;
          scrollEntries.delete(el);
          return;
        }
        el.scrollTop += delta * 0.22 + (delta > 0 ? 0.4 : -0.4);
      });
      if (scrollEntries.size === 0 && scrollTimer !== null) {
        clearInterval(scrollTimer);
        scrollTimer = null;
      }
    };
    var ensureScrollTimer = function () {
      if (scrollTimer === null) scrollTimer = setInterval(processScrolls, 0);
    };
    var stopScrollLoop = function (el) {
      scrollEntries.delete(el);
    };

    var autoScroll = function (root, selector) {
      if (typeof root.querySelectorAll !== "function" || !selector) return;
      var list = root.querySelectorAll(selector);
      for (var i = 0; i < list.length; i++) {
        var el = list[i];
        if (!el || typeof el.scrollTop !== "number") continue;
        var distance = el.scrollHeight - el.scrollTop - el.clientHeight;
        var mem = scrollMemory.get(el);
        if (!mem) {
          mem = { userUp: false, lastTop: el.scrollTop };
          scrollMemory.set(el, mem);
        }
        // Only a real scroll-UP pauses following; content growth alone must
        // never look like user scrolling. 24px slack absorbs tween lag.
        if (mem.userUp && distance > 24) continue;
        if (distance > 24 && el.scrollTop < mem.lastTop - 24) {
          mem.userUp = true;
          mem.lastTop = el.scrollTop;
          stopScrollLoop(el);
          continue;
        }
        mem.userUp = false;
        mem.lastTop = el.scrollTop;
        var entry = scrollEntries.get(el);
        if (!entry) {
          entry = { target: el.scrollHeight, last: 0 };
          scrollEntries.set(el, entry);
          ensureScrollTimer();
        }
        entry.target = el.scrollHeight;
      }
    };

    // Streaming-style presentation for pwsh / edit / write tool bodies. The
    // real DSH DOM uses `_line_*` elements in all three (terminal
    // `_line_10eou_*`, diff `_line_srovd_*`), so scanning the WHOLE bodyWrap
    // catches every one — the old selector only reached read/diff bodies and
    // that is why pwsh output popped in as one blob.
    // The first 40 lines arrive in clearly visible 2-line chunks (140ms
    // between chunks); longer outputs keep typing at 12ms/line, capped at
    // 3.8s so the collapse that follows the next item is never delayed long.
    var streamDelayFor = function (index) {
      if (index < 40) return Math.floor(index / 2) * 140 + (index % 2) * 24;
      return 2684 + (index - 40) * 12;
    };
    var collectStreamUnits = function (scope) {
      if (typeof scope.querySelectorAll !== "function") return [];
      var lines = scope.querySelectorAll("[class*='_line_']");
      if (lines.length) return lines;
      // Fallback for tool bodies that have no _line_ class: stream their
      // text-bearing leaf elements instead (buttons/svg stay static).
      var content = scope.querySelector(".o3BgMG_terminalBody, .o3BgMG_diffBody, .o3BgMG_readBody") || scope;
      var all = content.querySelectorAll("*");
      var leaves = [];
      for (var a = 0; a < all.length; a++) {
        var el = all[a];
        if (el.children && el.children.length === 0 &&
            (el.textContent || "").trim().length > 0 &&
            el.tagName !== "BUTTON" && el.tagName !== "SVG") leaves.push(el);
      }
      return leaves;
    };
    var staggerToolLines = function (root, selector) {
      if (typeof root.querySelectorAll !== "function") return;
      if (!revealStarted.has(root)) revealStarted.set(root, Date.now());
      var wrap = typeof root.querySelector === "function" ? root.querySelector(".o3BgMG_bodyWrap") : null;
      var scopes = [];
      if (wrap) scopes.push(wrap);
      else if (selector) scopes = root.querySelectorAll(selector);
      for (var b = 0; b < scopes.length; b++) {
        var body = scopes[b];
        if (typeof body.querySelectorAll !== "function") continue;
        var lines = collectStreamUnits(body);
        var count = staggerCounts.get(body) || 0;
        for (var i = 0; i < lines.length && i < 400; i++) {
          var line = lines[i];
          if (staggeredLines.has(line)) continue;
          staggeredLines.add(line);
          var delay = Math.min(streamDelayFor(count), 3800);
          count += 1;
          line.style.animation = "dsh-line-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both " + delay + "ms";
          line.style.willChange = "transform, opacity";
        }
        var lastCount = Math.max(0, count - 1);
        var lastDelay = Math.min(streamDelayFor(lastCount), 3800);
        var startedAt = revealStarted.get(root) || Date.now();
        staggerEnds.set(root, Math.max(Date.now() + lastDelay + 450, startedAt + FILE_REVEAL_MIN_MS));
      }
    };

    // A finished disclosure only collapses when the NEXT item in the same
    // message flow has appeared. Real DSH DOM does NOT make thinking/tool rows
    // siblings, so detection walks the document-order list of all disclosure
    // roots and answer markdown blocks.
    //
    // v23 (root cause of the wrong timing): the NEXT disclosure row counts as
    // soon as it EXISTS. Real DSH pre-mounts the following think/tool row in
    // the collapsed "ok" state, so requiring running/open made detection miss
    // it and every collapse fell back to the 8s timer — which is why blocks
    // closed far too late (or, when the timer fired first, too early).
    var hasNextItem = function (root) {
      var next = root && root.nextElementSibling;
      while (next) {
        if (next.nodeType === 1) {
          var sibCls = String(next.className || "");
          var isAnswerSibling = sibCls.indexOf("_markdown_") !== -1 ||
            /(?:^|[\s_-])(?:answer|markdown|prose)(?:[\s_-]|$)/i.test(sibCls);
          var isDisclosureSibling = sibCls.indexOf("QWLzlG_root") !== -1 ||
            sibCls.indexOf("_Xvjua_root") !== -1 || sibCls.indexOf("o3BgMG_root") !== -1;
          var ownState = typeof next.getAttribute === "function" && next.getAttribute("data-state");
          var hasDisclosure = typeof next.querySelector === "function" && next.querySelector("[data-state]");
          if (isDisclosureSibling || ownState || hasDisclosure) return true;
          if (isAnswerSibling && (next.textContent || "").trim().length > 0) return true;
        }
        next = next.nextElementSibling;
      }
      var items = Array.prototype.slice.call(
        document.querySelectorAll(".QWLzlG_root, ._Xvjua_root, .o3BgMG_root, [class*='_markdown_']")
      );
      var index = items.indexOf(root);
      var nextItem = index >= 0 ? items[index + 1] : null;
      if (!nextItem || nextItem.nodeType !== 1) return false;
      var cls = String(nextItem.className || "");
      if (cls.indexOf("QWLzlG_root") !== -1 || cls.indexOf("_Xvjua_root") !== -1 || cls.indexOf("o3BgMG_root") !== -1) {
        // The next disclosure row merely existing (in any state) means the
        // next item has come out. This is what the real stream shows: the
        // following think row mounts collapsed "ok", then its tool mounts.
        return true;
      }
      // Otherwise it is the answer markdown: counts once text is visible.
      return (nextItem.textContent || "").trim().length > 0;
    };

    // The running clamp must survive the data-state flip: while running we tag
    // the scroll boxes with data-dsh-running, and the tag is only removed when
    // the collapse animation starts (after the current height is pinned). This
    // is what prevents the "whole chain flashes open for one frame" bug.
    var setRunningMarks = function (root, selector, on) {
      if (typeof root.querySelectorAll !== "function" || !selector) return;
      var list = root.querySelectorAll(selector);
      for (var m = 0; m < list.length; m++) {
        var el = list[m];
        if (!el || typeof el.setAttribute !== "function") continue;
        if (on) el.setAttribute("data-dsh-running", "1");
        else if (typeof el.removeAttribute === "function") el.removeAttribute("data-dsh-running");
      }
    };

    // One-shot animated collapse: play dsh-disclose-out, then click the row so
    // the framework removes the body. Guards prevent double-firing and avoid
    // reopening a body the framework already removed on its own.
    var collapseOnce = function (root, row, body, bodySelector, spec) {      if (!body || !row || pendingClicks.get(root) === "close") return;
      if (body.getAttribute && body.getAttribute("data-dsh-collapsing")) return;
      // Pin the CURRENT rendered height before anything reflows, so the out
      // animation shrinks from the visible box instead of flashing open. The
      // running clamp tag STAYS on through the out animation (it is the only
      // thing DSH cannot reset mid-render) and is removed in finish().
      if (body.getBoundingClientRect) {
        var rectHeight = body.getBoundingClientRect().height;
        if (rectHeight > 0) {
          body.style.maxHeight = Math.ceil(rectHeight) + "px";
          body.style.overflow = "hidden";
        }
      }
      if (body.setAttribute) body.setAttribute("data-dsh-collapsing", "1");
      stopScrollLoop(body);
      var minDelay = 380;
      var staggerEnd = staggerEnds.get(root);
      if (staggerEnd) minDelay = Math.max(380, staggerEnd - Date.now());
      else if (spec && spec.root === ".o3BgMG_root") {
        var started = revealStarted.get(root);
        if (started) minDelay = Math.max(380, started + FILE_REVEAL_MIN_MS - Date.now());
      }
      var finished = false;
      var finish = function () {
        if (finished) return;
        finished = true;
        if (spec) setRunningMarks(root, spec.scroll, false);
        if (body.style) {
          body.style.maxHeight = "";
          body.style.overflow = "";
        }
        var connected = !body.isConnected || body.isConnected;
        var stillThere = root.isConnected !== false && connected &&
          typeof root.querySelector === "function" &&
          root.querySelector(bodySelector) === body;
        if (stillThere) clickOnce(root, row, "close");
        else pendingClicks.delete(root);
      };
      var onEnd = function (event) {
        if (event && event.animationName === "dsh-disclose-out") finish();
      };
      if (body.addEventListener) body.addEventListener("animationend", onEnd);
      setTimeout(finish, minDelay);
      if (body.removeEventListener) {
        setTimeout(function () { body.removeEventListener("animationend", onEnd); }, minDelay + 1000);
      }
    };

    var clickOnce = function (root, row, action) {
      if (pendingClicks.get(root) === action) return;
      pendingClicks.set(root, action);
      try { row.click(); } catch (e) { pendingClicks.delete(root); }
    };

    var syncDisclosures = function () {
      for (var s = 0; s < DISCLOSURES.length; s++) {
        var spec = DISCLOSURES[s];
        var roots = document.querySelectorAll(spec.root);
        for (var i = 0; i < roots.length; i++) {
          var root = roots[i];
          var state = root.getAttribute("data-state");
          var prev = lastStates.get(root);
          var hasBody = !!root.querySelector(spec.body);
          var row = root.querySelector(spec.row);

          if (state === "running") {
            autoOpened.add(root);
            pendingCollapse.delete(root);
            finishedWithoutBody.delete(root);
            if (!hasBody && row) clickOnce(root, row, "open");
            else {
              pendingClicks.delete(root);
              setRunningMarks(root, spec.scroll, true);
              autoScroll(root, spec.scroll);
              if (spec.root === ".o3BgMG_root") staggerToolLines(root, spec.scroll);
            }
          } else {
            // Any disclosure that just finished (running -> ok/error) is NOT
            // collapsed yet: it waits for the next item to appear first, so
            // the message flow never shows an empty gap.
            if (prev === "running" && hasBody && row) {
              pendingCollapse.set(root, {
                row: row,
                bodySelector: spec.body,
                spec: spec
              });
              // Fast tool calls render their lines only after the state has
              // already flipped ok; keep streaming them chunk-by-chunk.
              if (spec.root === ".o3BgMG_root" && autoOpened.has(root)) {
                staggerToolLines(root, spec.scroll);
              }
            } else if (prev === "running" && !hasBody && row) {
              // The tool/think finished while its body had not been mounted
              // yet (the fastest tool calls). Remember it so the body that
              // arrives in the next frames still joins the pending flow.
              finishedWithoutBody.add(root);
              setRunningMarks(root, spec.scroll, false);
            } else if (hasBody && row && finishedWithoutBody.has(root)) {
              finishedWithoutBody.delete(root);
              pendingCollapse.set(root, {
                row: row,
                bodySelector: spec.body,
                spec: spec
              });
              if (spec.root === ".o3BgMG_root" && autoOpened.has(root)) {
                staggerToolLines(root, spec.scroll);
              }
            } else {
              // A pending disclosure keeps its running clamp until the
              // collapse animation actually finishes; any mid-wait sync
              // must not release it early (that was the 96px flash-open).
              if (!pendingCollapse.has(root)) {
                setRunningMarks(root, spec.scroll, false);
                if (hasBody && typeof root.querySelectorAll === "function") {
                  var doneList = root.querySelectorAll(spec.scroll);
                  for (var d = 0; d < doneList.length; d++) stopScrollLoop(doneList[d]);
                }
              }
            }
          }
          lastStates.set(root, state);
        }
      }

      // Collapse pending disclosures the moment their next item exists.
      // No timer fallback: per the desired flow, a finished block stays open
      // until something actually follows it — closing before the next item
      // appears was the bug, and an arbitrary timeout IS an early close.
      pendingCollapse.forEach(function (entry, root) {
        var pendingBody = root.querySelector(entry.bodySelector);
        if (!pendingBody || root.isConnected === false) {
          pendingCollapse.delete(root);
          return;
        }
        if (hasNextItem(root)) {
          pendingCollapse.delete(root);
          collapseOnce(root, entry.row, pendingBody, entry.bodySelector, entry.spec);
        }
      });
    };

    var framePending = false;
    var frameHandle = null;
    // setTimeout instead of rAF for the same reason as the scroll tween:
    // deterministic in headless/background tabs, still one batch per mutation.
    var scheduleFrame = function (callback) { return setTimeout(callback, 0); };
    var cancelFrame = clearTimeout;
    var onMutation = function (records) {
      // Display-time blank-line preprocessing happens immediately, only on
      // the nodes that just changed (before the batched UI sync).
      cleanMutationRecords(records || []);
      if (framePending) return;
      framePending = true;
      frameHandle = scheduleFrame(function () {
        framePending = false;
        frameHandle = null;
        syncDisclosures();
        stripRedDots();
      });
    };

    var cleanExistingBodies = function () {
      var bodies = document.querySelectorAll(".QWLzlG_thinkBody, ._Xvjua_body");
      for (var b = 0; b < bodies.length; b++) visitNewNodes(bodies[b]);
    };

    // Observe documentElement (not body) so the observer survives whatever
    // mounting order DSH uses; when no body exists yet, nothing throws.
    // attributes+attributeFilter catches state changes that arrive WITHOUT any
    // childList/characterData mutation (e.g. a tool row turning running).
    var mo = new MutationObserver(onMutation);
    var startObserver = function () {
      mo.observe(document.documentElement || document, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["data-state"]
      });
    };
    if (document.documentElement) startObserver();
    else if (typeof document.addEventListener === "function") {
      document.addEventListener("DOMContentLoaded", startObserver, { once: true });
    }
    syncDisclosures();
    stripRedDots();
    cleanExistingBodies();

    return function () {
      mo.disconnect();
      if (framePending) cancelFrame(frameHandle);
      if (scrollTimer !== null) {
        clearInterval(scrollTimer);
        scrollTimer = null;
      }
      scrollEntries.clear();
      tag.remove();
      colorTag.remove();
      fontTag.remove();
    };
  }, "photo-editorial: claude v20");

  // Integrated DSH Settings surfaces. The plugin registers compact General
  // rows (logo / colors / fonts) AND its own settings section with all three.
  if (ctx.slots && logoToggleStore) {
    var injectThemeActions = function (actions) {
      return {
        setLogo: function (enabled) {
          try { localStorage.setItem(LOGO_STORAGE_KEY, enabled ? "1" : "0"); } catch (e) {}
          applyLogoState(enabled);
          actions.sync(enabled);
        },
        setColors: function (enabled) {
          try { localStorage.setItem(COLOR_STORAGE_KEY, enabled ? "1" : "0"); } catch (e) {}
          applyColorState(enabled);
          actions.syncColors(enabled);
        },
        setFonts: function (enabled) {
          try { localStorage.setItem(FONT_STORAGE_KEY, enabled ? "1" : "0"); } catch (e) {}
          applyFontState(enabled);
          actions.syncFonts(enabled);
        }
      };
    };
    var registerItem = function (id, order, label, row) {
      return ctx.slots.inject("settings.general.item", function () {
        return ctx.slots.register({
          name: "settings.general.item",
          id: id,
          order: order,
          label: label,
          store: logoToggleStore,
          inject: injectThemeActions
        }, row);
      });
    };
    registerItem("dsh-theme-photo-editorial-logo", 96, function () { return themeUiText().logo.title; }, LogoRow);
    registerItem("dsh-theme-photo-editorial-colors", 97, function () { return themeUiText().colors.title; }, ColorRow);
    registerItem("dsh-theme-photo-editorial-fonts", 98, function () { return themeUiText().fonts.title; }, FontRow);
    ctx.slots.inject("settings.section", function () {
      return ctx.slots.register({
        name: "settings.section",
        id: "dsh-theme-photo-editorial",
        order: 80,
        label: function () { return themeUiText().section; },
        store: logoToggleStore,
        inject: injectThemeActions
      }, ThemeSection);
    });
  }
};

return module.exports; } });
