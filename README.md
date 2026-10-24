# dsh动画优化

给 DeepSeek Harness 用的客户端插件。它把 Claude Code 风格的外观带进网页界面，同时把思考块和工具输出的展示方式改造成更像实时流的样子。

DSH 后端把工具结果一次性送到页面，这个插件在显示层把它们分段播放出来。文字逐段出现，滚动跟着新内容走，块在开始运行时自动展开，在下一条内容真正出现时才收起。所有效果都在运行时注入，不会修改 DSH 本体。关掉插件，界面就回到 DSH 原来的样子。

## v0.3.3（DSH 0.2.1-rc.3 适配）

- **补齐第三套 CSS module 哈希**：0.2.1-rc.3 把思考块换成 `VJlF5q`、命令卡换成 `EqXNNG`、工具行换成 `hKdVjq`、会话壳换成 `an3WzG/V4vHZW`；插件同时保留 0.1.0（`QWLzlG/_Xvjua`）、0.1.2（`lcKema/_5OnbHa/EvIC1a`）与 0.2.0（`o3BgMG/wSkVaW`）选择器，一套构建覆盖桌面版与网页版。
- **底部运行指示器改用无哈希锚点**：0.2.x 删除了 `turnStatus` 类，运行状态改为 `[data-chat-running]`（鲸鱼图标 + 蓝色 shimmer）。插件用 `[data-chat-running]` + `[class*='_runningIcon']` 语义后缀接管：鲸鱼换成官方动态 Logo、蓝字恢复中性色，Claude Logo 开关依然生效。
- **流式状态检测兼容两代**：0.1.0 依赖 `.Sxvs8a_root[data-streaming]`，0.1.2+ 改为 AssistantMarkdown 根节点的 `[data-streaming]`；thinking / typing 动画按真实流式状态切换。
- **emoji 过滤排除区补齐新哈希**：`an3WzG_scrollBody` / `V4vHZW_scroll` 下的对话正文永不被清理；行首 emoji 被清除后残留的空格一并去掉。
- 工具行的流式播放判断从硬编码 `o3BgMG` 改为 `spec.tool` 标志，新旧工具行行为一致。

## v0.3.1（Claude Desktop App 外观对齐）

- **单个动态 Logo**：运行时只出现**一个** Claude logo——在"正在运行"状态行（Deep diving…）上；助手消息和每个动作行不再挂 logo。
- **全套官方动画素材**（以官方 dotLottie 为唯一正确来源，`assets/claude-desktop/lottie/`）：
  - `thinking.lottie` → 8 帧 @ 7fps（循环 1.143s），推理/工具运行阶段播放；帧序、时长逐条取自 lottie JSON（播放序 `2,1,4,3,5,6,8,7`）；
  - `typing.lottie` → 12 帧 @ 14fps（循环 0.857s），文本流式输出阶段自动切换；播放序 `3,2,1,4,6,5,7,8,9,11,10,12`；
  - 帧位图从 lottie 包解出，与官方位图逐字节一致（`thinking/`、`typing/` 目录）。
  - 注意：`claude-thinking-sprite.svg`（15 步 SMIL 长条）与两个官方 lottie 均不匹配，**不作为运行实现**，仅存仓库作参考。
- **全局 UI emoji 过滤**：自动清除整个界面（侧边栏、标签、菜单、设置、标题、placeholder/title 等全部 UI 层）的 emoji；**输出显示区不受影响**（对话滚动区、工具输出、思考块、代码块、用户输入控件一律不碰）。

## 截图

### Claude 配色界面

![Claude 配色界面](assets/screenshots/1.png)

### DSH 原版配色界面

![DSH 原版配色界面](assets/screenshots/2.png)

### 思考中的动画

![思考中的动画](assets/screenshots/thinking.png)

## 改了哪些动画

思考和 pwsh、edit、write 工具在运行时会保持四行高的视口。视口用缓动曲线跟随最新内容，底部有透明度渐隐。用户真正向上滚动时自动跟随会暂停，不会和阅读抢控制权。

工具输出的行按两行一段出现，段与段间隔 140 毫秒，每行用 0.5 秒的透明度和位移过渡进入。长终端输出会以每行 12 毫秒继续，整体封顶在 3.8 秒左右，这样下一块的收起不会被无限拖住。最快的 edit 和 write 调用往往在状态已经变成完成后才渲染出内容，这种情况同样会走分段播放。

思考块和工具块在进入运行状态时自动展开一次。结束后先保持展开，等文档流里的下一条内容真正挂载出来才播放关闭动画。没有超时兜底，不会在下一项还没出现时提前收起，也不会随便等一个固定秒数。运行时的 96px 视口钳制会保留到关闭动画结束，避免整段内容闪现一帧。

打开和关闭动画都只动 transform 和 opacity，一次播放，不循环。

## 外观

暖米色底、墨色文字和黏土色强调色来自颜色 token 层。标题、路径和引用使用衬线字体，来自字体层。单个动态 Claude logo（官方思考/打字动画）由 logo 层控制。三个层互相独立，可以只保留 Claude 字体而用 DSH 原版配色，反过来也可以。

插件默认开启完整 Claude 全套：配色、字体、logo 都是开着的。如果只想要动画优化、不想要外观改动，在设置里关闭 Claude 配色和 Claude 字体即可，展开收起、流式输出、自动跟随这些行为层动画不受影响，界面会回到 DSH 原版外观。

## 安装

```sh
dsh plugin --profile web add link:C:/IdeaProjects/dsh-animation-optimization
```

插件声明了 `dsh.bundle.patch`，`dsh plugin` 装好后会自动把它加入 `dsh.profile.bundles`，不需要手动改 `cordis.patch.yml`。

重启 `dsh web`，浏览器强制刷新一次。如果之前手动注册过 `dsh-theme-photo-editorial` 或 `dsh-animation-optimization` 的 insert 行，先把它从 `~/.dsh/profiles/web/cordis.patch.yml` 里删掉，避免同一插件挂载两次。

## 设置

插件在 DSH 设置里注册了三个开关，通用设置里各有一条紧凑入口，Photo Editorial 主题分区页里有完整三行。

Claude Logo 控制运行状态行里的单个动态标志（思考动画/打字轨道动画）。Claude 配色在编辑风格配色和 DSH 原版 token 之间切换，暗色模式同样适用。Claude 字体在衬线字体和 DSH 默认字体栈之间切换。三个选择都存在浏览器 localStorage 里，点击后立即生效。

## 结构与测试

宿主侧 `lib/index.js` 是无逻辑的 cordis 入口。客户端 `lib/client.js` 是单个 bundle——由 `src/client.template.js` 经 `scripts/build-client.mjs` 注入官方动画素材后生成（改动模板后运行 `npm run build` 再部署）。运行时注入样式层（行为、颜色 token、字体）与 logo 动画，MutationObserver 驱动展开收起状态机，同一个观察器还维护全局 UI emoji 过滤与流式阶段标记。测试在 `test/client.test.js`，用 VM 假 DOM 运行，不需要浏览器。

```sh
npm run build
npm test
```

## License

MIT

---

# dsh animation optimization

A client-side plugin for DeepSeek Harness that brings a Claude Code-inspired
look to the web UI and presents thinking blocks and tool output as a live
stream instead of finished blocks.

DSH delivers tool results all at once. This plugin replays them visually:
lines surface in small chunks, the viewport follows the newest content, and
disclosure blocks open when they start running and close only when the next
item actually exists. Everything is injected at runtime. Removing the plugin
returns DSH to its original behavior.

## v0.3.1 (Claude Desktop App alignment)

- **Single animated logo**: while a turn runs there is exactly ONE Claude logo,
  inside the running-window status line ("Deep diving…"). Assistant messages
  and per-action rows no longer show a logo.
- **Full official animation set**, sourced strictly from the App's dotLottie
  packages (`assets/claude-desktop/lottie/`): `thinking.lottie` (8 frames @
  7fps, 1.143s loop, play order `2,1,4,3,5,6,8,7`) while reasoning/tools run;
  `typing.lottie` (12 frames @ 14fps, 0.857s loop, play order
  `3,2,1,4,6,5,7,8,9,11,10,12`) swaps in automatically while markdown text
  streams. Frame bitmaps are extracted from the lottie archives byte-for-byte
  (`thinking/`, `typing/`). `claude-thinking-sprite.svg` (15-step SMIL strip)
  matches neither official lottie package and is kept as reference only.
- **Global UI emoji filter**: emoji are stripped from every UI-chrome surface
  (sidebar, tabs, menus, settings, headings, placeholder/title attributes…),
  while the output display is never touched — conversation scroller, tool
  bodies, thinking blocks, code blocks, and user input controls are excluded.

## Screenshots

### Claude UI

![Claude UI](assets/screenshots/1.png)

### Original DSH UI

![Original DSH UI](assets/screenshots/2.png)

### Thinking animation

![Thinking animation](assets/screenshots/thinking.png)

## Animation changes

Thinking blocks and pwsh, edit, and write tools keep a four-line viewport
while running. The viewport follows new content with an ease-out glide and a
soft opacity fade at the bottom edge. A real user scroll-up pauses the
auto-follow.

Tool lines appear in two-line chunks, 140ms apart, each line entering through
a 0.5s opacity and transform transition. Long terminal output continues at
12ms per line, capped near 3.8s so the next disclosure is not delayed. The
fastest edit and write calls render their lines after the state has already
flipped to done; those late lines stream the same way.

Disclosures auto-open once when running. After finishing they stay open until
the next item actually mounts in the document flow, then play a one-shot
closing animation. There is no timeout fallback, so nothing closes before its
successor exists. The running viewport clamp survives until the closing
animation finishes, which prevents a full-height flash for one frame.

Open and close animations animate only transform and opacity, once, never in
a loop.

## Appearance

The warm ivory palette, ink text, and clay accent come from the color token
layer. Headings, paths, and quotes use the serif font layer. The Claude
starburst avatar and streaming indicator come from the logo layer. The layers
are independent: Claude fonts can be combined with the original DSH palette
and the other way around.

The full Claude set is enabled by default: colors, fonts, and logo all start
on. To keep only the animation optimization and drop the restyling, turn off
Claude Colors and Claude Font in settings. The behavior layer — disclosure
timing, streaming reveal, and auto-follow — keeps running, and the UI returns
to the original DSH appearance.

## Install

```sh
dsh plugin --profile web add link:C:/path/to/dsh-animation-optimization
```

The package declares `dsh.bundle.patch`, so `dsh plugin` adds it to
`dsh.profile.bundles` automatically. No manual `cordis.patch.yml` edit is
needed.

Restart `dsh web` and hard-refresh the browser. If you previously registered
`dsh-theme-photo-editorial` or `dsh-animation-optimization` manually with an
insert row, remove it from `~/.dsh/profiles/web/cordis.patch.yml` first so
the plugin does not mount twice.

## Settings

Three switches are registered in DSH Settings: compact rows under General and
a full section page. Claude Logo controls the starburst avatar and streaming
indicator. Claude Colors switches between the editorial palette and the
original DSH tokens, dark mode included. Claude Font switches between the
serif stack and the default DSH fonts. All choices live in browser
localStorage and apply instantly.

## Structure and tests

`lib/index.js` is the no-op cordis host entry. `lib/client.js` is a single
build-free bundle that injects three stylesheet layers (behavior, color
tokens, fonts) and drives the disclosure state machine through a
MutationObserver. Tests in `test/client.test.js` run against a VM fake DOM.

```sh
npm test
```

## License

MIT
