# QQ.SG 个人网站 · 四幕动态黑白对切

双击 index.html 即可打开，也可整份目录放到任意静态服务器。无需构建或安装依赖。

## 结构

首页 → 作品 → 网络印记 → 关于，共四幕，每幕占满一屏。

- **#home**：作者原创首屏。左侧 65% 黑 / 右侧白，人像与手写签名、WebGL 墨迹交互保持原样。
- **#works**：40% / 60% 黑白双面展厅。左侧黑面为三行固定高度作品索引，悬停、点击或键盘聚焦切换并点亮左侧 1px 标尺；右侧白面为单张大图版，切换时以 5 条错峰墨色百叶扫片覆盖并显影，图版随指针做 3D 透视微倾与反向微视差，悬停还原真实彩色。
- **#imprints**：52% / 48% 暗场网络印记。左侧黑面为 AS218834 与五条域名索引；右侧白墙是一颗**真实世界高反差墨点地球**：3,232 个 Natural Earth 陆地点构成清晰可辨的中国、日本、东南亚、欧洲、美洲、澳洲，正面陆地为浓黑墨点（alpha .55–.95），背面为 .06–.09 的极淡通透点；AS218834（北京）与五个入口（上海、东京、法兰克福、洛杉矶、新加坡）以真实经纬度落点，洲际 3D SLERP 拱起飞线、14 节渐隐彗尾信号流、城市信标短标与旋转游标准星。左侧悬停/聚焦时按最短角差平滑转至对应城市并锁定；右侧地球可按住拖拽旋转、松手惯性滑行，停稳 2.5s 后恢复缓慢自转。底部为 Telemetry 铭牌，主名切换执行 0.42s 字符解码。
- **#about**：36% / 64% 镜像尾声。左侧黑面底部人像带 ±12px 滚动纵深视差；右侧白面为简介、现场逐笔书写的签名（可点击重播）与落款。

## 动态黑白对切

桌面端（≥901px）在 body 内固定一层 .split-backdrop，与首屏画布同样 inset 14px、圆角 24px，黑白分割位置由 CSS 变量 --scene-split 驱动。滚动时 site.js 根据四幕锚点（65% → 40% → 52% → 36%）以 smootherstep 计算目标值，再用帧率无关指数阻尼（1 - e^(−9dt)）在 requestAnimationFrame 中逐帧写入 GPU transform，形成整站共用的"对切线"呼吸。系统开启"减少动态效果"时不做连续插值，直接切到当前幕的目标值。

## 装置与微动效

- 地球 Canvas 只使用 #060606 / #f4f3ee 墨色，DPR 封顶 2；3,232 个真实陆地点按透明度/半径分入 8 个 Path2D 桶（1 个背面桶 + 7 个正面墨色桶），每帧仅 8 次 fill；由 IntersectionObserver 控制，仅 #imprints 在视口内渲染，离屏即暂停，标签页隐藏时同样暂停。
- 陆地点来自 Natural Earth 50m 陆地 TopoJSON（为台湾、新加坡等小岛保留真实轮廓），以 11,000 个斐波那契候选点做点在多边形判定后压缩为本地静态 world-dots.js（3,232 点 / 25.9KB）；运行时无任何地图数据外链。
- 桌面精确指针可在右侧白墙按住拖拽旋转地球，带惯性角速度衰减；停稳 2.5s 后恢复缓慢自转。悬停左侧入口会中断自转并按最短角差锁定城市。
- Works 切换保留无闪烁的双层图版（is-prev / is-active），叠加 5 条 35ms 错峰的墨色百叶扫片（总 0.78s）；桌面精确指针下支持 3D 透视微倾、反相微视差与磁吸外链。
- Lenis 滚动速度写入 --scroll-skew（±1.2deg）与 --scroll-lag（±10px），以帧率无关阻尼作用于图版、域名列表与 About 文案，停滚即归零。
- 全局光标仅对 hover:hover + pointer:fine 生效，首帧直接落位；触屏与减少动态效果下自动关闭。
- 首屏保持作者原构图；所有新增动画在 prefers-reduced-motion 下均为静态最终态。

除首屏外，四幕内容区背景透明，直接浮在移动的分割层上；顶部导航与左下章节指示器使用 mix-blend-mode: difference，在纯黑与画廊白上自动保持可读。

## 移动端（≤900px）

隐藏固定对切层。首页完整保留 mobile-hero.css 构图；作品改为黑色索引 + 纸白图版的单栏，三个文字 Tab 切换作品，一屏内可看完；印记以纯黑域名列表收束，并在其下以 260px 紧凑高度展示真实世界高反差墨点地球（按步长抽稀至约 1,600 点）与当前 Telemetry 铭牌；关于为纸白单栏并以全宽无黑缝人像画框收尾。移动端不加载光标、磁吸、倾斜、拖拽与滚动惯性，地球仍按视口暂停。

## 文件

- index.html：完整页面与四幕内容。
- scroll.css：全局底座（首屏 65% 分割与人像合成、影院外框、章节基础布局）。
- portrait-fx.css：首屏人像 WebGL 墨迹样式，并引入 mobile-hero.css。
- mobile-hero.css：移动端首屏排版、角标与安全区适配（由 portrait-fx.css 引入）。
- aesthetic-pass.css：四幕舞台、动态对切背景、星盘与铭牌、百叶切图、光标与响应式样式。
- world-dots.js：Natural Earth 陆地点的压缩静态数据（Int16 base64，3,232 点 / 25.9KB），挂在 window.__QQSG_WORLD_DOTS__。
- site.js：滚动与对切插值、真实墨点地球与 BGP 飞线、拖拽惯性、作品切换与扫片、印记联动、字符解码、边界视差、磁吸与签名重播。
- portrait-fx.js：首屏人像墨迹 WebGL 交互。
- hero-ink-fx.js：首屏墨迹拖尾 WebGL 交互。
- vendor/lenis.min.js：平滑滚动库（许可证见 vendor/LENIS_LICENSE.txt）。
- portrait-cutout-clean.png：当前使用的人像抠图。
- assets/：真实项目界面截图（blog.jpg、sla.jpg、nodeget.jpg）。
- SOURCES.md：内容与截图来源。

当前 index.html 实际加载链：scroll.css → portrait-fx.css（@import mobile-hero.css）→ aesthetic-pass.css → vendor/lenis.min.js → world-dots.js → site.js → portrait-fx.js → hero-ink-fx.js。

签名使用原版速度：长度乘 2.65，长笔画 240–1150 毫秒，点笔画 90 毫秒，笔间停顿 40 / 68 毫秒。

作品截图是截取时的界面，不是实时监控。域名按用户提供的信息列出，不代表每个域名均配置了网页服务。IDC 系统按用户要求未展示。

线上入口：https://www.qq.sg/（qq.sg 301 → www.qq.sg，Vercel 自动部署）。本地入口只需要 index.html。
