# QQ.SG 个人网站 · 四幕动态黑白对切

双击 index.html 即可打开，也可整份目录放到任意静态服务器。无需构建或安装依赖。

## 结构

首页 → 作品 → 网络印记 → 关于，共四幕，每幕占满一屏。

- **#home**：作者原创首屏。左侧 65% 黑 / 右侧白，人像与手写签名、WebGL 墨迹交互保持原样。
- **#works**：40% / 60% 黑白双面展厅。左侧黑面为三行作品索引，悬停、点击或键盘聚焦切换；右侧白面为单张大图版，叠放预加载并做电影淡入，悬停还原真实彩色。
- **#imprints**：58% / 42% 暗场网络印记。左侧黑面为 AS218834 与五条域名索引，右侧白墙以大留白与极淡衬线编号展示当前坐标，随左侧悬停实时联动。
- **#about**：36% / 64% 镜像尾声。左侧黑面底部安放人像，右侧白面为简介、签名与落款。

## 动态黑白对切

桌面端（≥901px）在 body 内固定一层 .split-backdrop，与首屏画布同样 inset 14px、圆角 24px，黑白分割位置由 CSS 变量 --scene-split 驱动。滚动时 site.js 根据四幕锚点（65% → 40% → 58% → 36%）计算目标值，并用阻尼 lerp 在 requestAnimationFrame 中逐帧写入，形成整站共用的"对切线"呼吸。系统开启"减少动态效果"时不做连续插值，直接切到当前幕的目标值。

除首屏外，四幕内容区背景透明，直接浮在移动的分割层上；顶部导航与左下章节指示器使用 mix-blend-mode: difference，在纯黑与画廊白上自动保持可读。

## 移动端（≤900px）

隐藏固定对切层。首页完整保留 mobile-hero.css 构图；作品改为黑色索引 + 纸白图版的单栏，三个文字 Tab 切换作品，一屏内可看完；印记为纯黑单栏；关于为纸白单栏并以全宽无黑缝人像画框收尾。

## 文件

- index.html：完整页面与四幕内容。
- scroll.css：全局底座（首屏 65% 分割与人像合成、影院外框、章节基础布局）。
- portrait-fx.css：首屏人像 WebGL 墨迹样式，并引入 mobile-hero.css。
- mobile-hero.css：移动端首屏排版、角标与安全区适配（由 portrait-fx.css 引入）。
- aesthetic-pass.css：四幕舞台、动态对切背景、交互态与响应式样式。
- site.js：滚动、动态对切插值、作品切换、印记联动、揭示动画与签名重播。
- portrait-fx.js：首屏人像墨迹 WebGL 交互。
- hero-ink-fx.js：首屏墨迹拖尾 WebGL 交互。
- vendor/lenis.min.js：平滑滚动库（许可证见 vendor/LENIS_LICENSE.txt）。
- portrait-cutout-clean.png：当前使用的人像抠图。
- assets/：真实项目界面截图（blog.jpg、sla.jpg、nodeget.jpg）。
- SOURCES.md：内容与截图来源。

当前 index.html 实际加载链：scroll.css → portrait-fx.css（@import mobile-hero.css）→ aesthetic-pass.css → vendor/lenis.min.js → site.js → portrait-fx.js → hero-ink-fx.js。

签名使用原版速度：长度乘 2.65，长笔画 240–1150 毫秒，点笔画 90 毫秒，笔间停顿 40 / 68 毫秒。

作品截图是截取时的界面，不是实时监控。域名按用户提供的信息列出，不代表每个域名均配置了网页服务。IDC 系统按用户要求未展示。

网页尚未发布到线上。当前入口只需要 index.html。
