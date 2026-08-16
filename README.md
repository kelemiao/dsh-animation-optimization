# dsh-theme-photo-editorial

A client-side appearance plugin for DeepSeek Harness (DSH). It gives the web
GUI a Claude Code-inspired look and, more importantly, smooths out how
thinking blocks and tool output appear on screen.

DSH delivers tool results as one finished block. This plugin presents them as
a stream: lines surface in small chunks, scrolling follows the newest content,
and disclosure blocks open and close on predictable, non-linear animations.
Everything is runtime-only. Removing or disabling the plugin returns DSH to
its original behavior, and the settings switches can turn individual layers
on and off without uninstalling anything.

## What changes

The warm ivory and ink palette, the clay accent color, serif headings, and the
Claude starburst avatar all come from two CSS token layers (colors and fonts)
plus a small set of structural rules. The layers are independent, so original
DSH colors can be combined with the Claude fonts, or the other way around.

While a turn is running, thinking blocks and pwsh, edit, and write tool bodies
are kept at a four-line viewport. The viewport follows the growing content
with an ease-out glide and fades out at the bottom edge. Real user scroll-up
is detected and respected, so the auto-follow does not fight the reader.

Tool output is streamed visually in two-line chunks, 140ms apart, with each
line animating in via a short opacity and transform transition. Long terminal
output continues at a 12ms-per-line pace, capped so the reveal stays bounded
and the next disclosure is not delayed indefinitely. The stagger also runs
for lines that render after the tool state has already flipped to done, which
is how the fastest edit and write calls behave in practice.

Disclosure blocks auto-open the moment they start running. Once finished,
they stay open until the next item actually mounts, then close with a
matching one-shot animation. There is no timeout fallback, so a finished
block never closes before its successor exists and never lingers for an
arbitrary number of seconds. The running clamp survives the state change
until the closing animation finishes, which prevents the full body from
flashing open for one frame.

A few smaller cleanups are included: blank runs in thinking text are
collapsed as they arrive, the thinking viewport hides its scrollbar, the
Memory Evolve floating capsule is hidden while its header toggle and panel
remain available, and the pending-count red dot is stripped from the Memory
Evolve settings tab.

## Install

Add the plugin to the web profile and register it in the cordis patch.

```sh
dsh plugin --profile web add link:C:/path/to/dsh-theme-photo-editorial
```

```yaml
- insert:
    - id: dsh-theme-photo-editorial
      name: dsh-theme-photo-editorial
```

Restart `dsh web` and hard-refresh the browser once so the new client bundle
is picked up.

## Settings

The plugin registers three switches in DSH Settings, both as compact rows
under General and together on the Photo Editorial section page.

Claude Logo controls the starburst avatar and the streaming indicator.
Claude Colors switches the palette between the editorial theme and the
original DSH tokens, dark mode included. Claude Font switches between the
serif and Songti mix and the default DSH font stack. All three choices are
stored in browser localStorage and apply instantly.

## Structure

The host half in `lib/index.js` is a no-op cordis entry. The client half in
`lib/client.js` is a single dependency-free bundle with no build step. It
injects three stylesheet layers (behavior, color tokens, fonts) and drives
the disclosure state machine through a MutationObserver that watches the
document for state changes and newly mounted rows.

Tests live in `test/client.test.js` and run against a VM sandbox with fake DOM
elements, so no browser is required for CI.

```sh
npm test
```

## License

MIT
