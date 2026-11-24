# QQ.SG 个人网站 · 五幕动态黑白对切

双击 index.html 即可打开，也可整份目录放到任意静态服务器。无需构建或安装依赖。

## 结构

首页 → 宣言 → 作品 → 网络印记 → 关于，共五幕。

- **#home**：作者原创首屏。左侧 65% 黑 / 右侧白，人像与手写签名、WebGL 墨迹交互保持原样。
- **#manifesto**：桌面端 320svh（粘性行程 220svh）三段式长卷。三行超宽不换行字轨（实心 / 描边 / 酸柠绿重复片段）以纯 GPU 横滚：0→-46vw、-48→+2vw、-4→-42vw；Lenis 速度驱动 ±6° skewX 迎风倾斜并在停滚时阻尼归零。保留 3 栏能力矩阵、00–100 精密标尺、末段内容 scale(.94) 退暗；移动端/reduced 仅显示首组完整文字。
- **#works**：四张近全幅 sticky 叠层王牌卡（LowEndCloud / 1Kb.Page / 聶.NET / NIE-SLA），纸白与炭黑交替，卡片 top 76px、4 格进度微条、160px 卡距、底部 18svh 呼吸与顶部 76px 安全背板。右侧原生产品窗口：LowEndCloud 地区/套餐/Run 终端、1KB 阅读页 + Live Payload Inspector、聶.NET 搜索 + 标签筛选 + 4 篇文章、NIE-SLA 分组筛选 + 4×28 格悬停遥测。截图 assets 仅供下方 Selected Archive hover 预览。
- **#imprints**：52% / 48% 暗场网络印记。左侧黑面为 AS218834 与七条域名索引（新增 lowend.cloud / 1kb.page），副标含 BGP · IPv4/IPv6 · 7 ACTIVE ENDPOINTS 徽条，当前锁定项带 4px 酸柠绿微点；右侧白墙是一颗真实世界高反差墨点地球：3,232 个 Natural Earth 陆地点构成清晰可辨的中国、日本、东南亚、欧洲、美洲、澳洲，正面陆地为浓黑墨点（alpha .55–.95），背面为 .06–.09 的极淡通透点；AS218834（北京）与七个入口（上海、东京、法兰克福、洛杉矶、新加坡、香港、伦敦）以真实经纬度落点，洲际 3D SLERP 拱起飞线、14 节渐隐彗尾信号流、城市信标短标与旋转游标准星。左侧悬停/聚焦时按最短角差平滑转至对应城市并锁定；右侧地球可按住拖拽旋转、松手惯性滑行，停稳 2.5s 后恢复缓慢自转。白墙叠加轻淡等高线；激活 BGP 脉冲头部 3 节与锁定雷达涟漪使用酸柠绿。地球四角为 HTML HUD：DRAG TO ORBIT / ORBITING、实时经纬度、L 型仪器角框。底部为 Telemetry 铭牌，主名切换执行 0.42s 字符解码。
- **#about**：36% / 64% 镜像尾声。左侧黑面底部人像带 ±12px 滚动纵深视差；右侧白面为放大的标题、简介、2×2 档案规格格、现场逐笔书写的签名与 ↺ REPLAY SIGNATURE 微提示，以及三段遥测落款，含仅在本幕运行时更新的 SHANGHAI · HH:MM:SS 实时时钟。

## 动态黑白对切

桌面端（≥901px）在 body 内固定一层 .split-backdrop，与首屏画布同样 inset 14px、圆角 24px。分割层只在滚入 #imprints / #about 时由数值进度平滑显形，并在 52% → 36% 精准对齐；manifesto 与 works 为全幅炭黑舞台，绝不会被对切线穿帮。滚动目标由缓存章节坐标以 smootherstep 计算，再用帧率无关指数阻尼逐帧写入元素 transform；减少动态效果时直接切目标值。

## 装置与微动效

- 地球 Canvas 只使用 #060606 / #f4f3ee 墨色，DPR 封顶 1.5；3,232 个真实陆地点按明暗档位映射到 8 枚离屏预渲染圆点 Sprite，DPR>=1.25 时每帧以设备像素 1:1 drawImage 绘制，低 DPR 自动回落为抗锯齿 Path2D 圆点以保持锐利；文字宽度在 resize 时一次性 measureText 缓存。由 IntersectionObserver 控制，仅 #imprints 在视口内渲染，离屏即暂停，标签页隐藏时同样暂停。
- 陆地点来自 Natural Earth 50m 陆地 TopoJSON（为台湾、新加坡等小岛保留真实轮廓），以 11,000 个斐波那契候选点做点在多边形判定后压缩为本地静态 world-dots.js（3,232 点 / 25.9KB）；运行时无任何地图数据外链。
- 桌面精确指针可在右侧白墙按住拖拽旋转地球，带惯性角速度衰减；手机端在横向拖动明确超过纵向时接管旋转，纵向滑动仍可正常滚动页面。停稳 2.5s 后恢复缓慢自转。悬停左侧入口或点击移动端城市胶囊会中断自转并按最短角差锁定城市。
- Works 使用缓存的卡片拓扑坐标（与 CSS 160px 间距严格一致）做 sticky 压叠 scrub；manifesto 三行错位、3 段能力/标尺/后缩编排、等高线纯 transform 位移、地球强调色与 About 时钟分别由纯数值滚动进度驱动，滚动帧内不读取任何布局。等高线不做 stroke-dashoffset 动画，work 背景等高线为 100svh sticky 单屏。
- Lenis 滚动速度直接以帧率无关阻尼写 imprint 列表与 About 文案的 transform；惯性静止立即停写并清除临时 will-change。
- 滚动热路径零 getBoundingClientRect() / document.elementFromPoint()：章节、首屏、Imprints/About 坐标与 scrollHeight 只在初始化/resize 时测量，滚动帧全部用缓存坐标和 scrollY 做纯数值计算。
- 对切层与滚动惯性直接写目标元素 transform，不再每帧写 :root CSS 变量；惯性静止后立即停写并清除临时 will-change。Lenis 开启时由 lenis.on('scroll') 同帧驱动 update 与惯性，lerp: .078；分割层阻尼已合入 Lenis 唯一主 rAF，不再另开循环。
- .film-grain 改用 mix-blend-mode: normal + .022 透明度与 180px 平铺，移除全屏 soft-light 混合；不再为幽灵编号、箭头、静态 reveal 预留常驻合成层。
- 全局光标仅对 hover:hover + pointer:fine 生效，首帧直接落位；触屏与减少动态效果下自动关闭。导航与胶囊按钮使用双层 Slot Roll 文字；导航下划线以独立 non-blend 元素 + transform/scaleX 0.42s 游标滑行。
- 首屏 WebGL 墨迹在 #home 离屏或标签页隐藏时真正 cancelAnimationFrame，回到首屏再启动；Works 王牌卡图版改为原生可交互 DOM 演示，无滚动内缩放/滤镜，文字保持矢量锐利。
- Manifesto 的 skewX 只写三条 manifesto-line 的 transform；Lenis velocity 驱动目标角度，主循环阻尼回正，不写 :root，也不新开 rAF。
- 首屏保持作者原构图；所有新增动画在 prefers-reduced-motion 下均为静态最终态。

manifesto / works 为不透明炭黑舞台；imprints / about 透明浮在分割层上。顶部导航与左下章节指示器保持 mix-blend-mode: difference，并用独立非混合的酸柠绿导航下划线保证点睛色纯正。全站酸柠绿仅用于选区、当前导航、journey 进度、宣言关键词、胶囊按钮 hover、Telemetry 微点与地球 BGP 脉冲。

## 移动端（≤900px）

隐藏固定对切层。首页完整保留 mobile-hero.css 构图；宣言带改为自然高度、无 sticky，三行与三栏能力全部静态可见；作品改为四张全宽圆角王牌卡与可筛选档案表自然纵向排列；印记以纯黑域名列表收束，并在其下以 min(82vw,340px) 的高清地球展台、精简 HUD、城市切换胶囊与 Telemetry 铭牌收束；关于为纸白单栏并以全宽无黑缝人像画框收尾，实时时钟继续运行。移动端不加载磁吸与滚动惯性；宣言显示两组文字并以 26s/30s/28s CSS 反向 marquee 运动；地球展台放大到 min(82vw,340px)，支持拇指横向拖拽、精简 HUD 与 AS218834/CN/JP/DE/US/SG/HK 城市胶囊；四张王牌卡改为自适应单栏产品窗口、无固定 390px 截断；辅助字号不低于 10px，筛选/标签触控热区不低于 36px；About 人像画框为 36px 上距 + 20px 侧距 + 16px 圆角。

## 文件

- index.html：完整页面与五幕内容。
- scroll.css：全局底座（首屏 65% 分割与人像合成、影院外框、章节基础布局）。
- portrait-fx.css：首屏人像 WebGL 墨迹样式，并引入 mobile-hero.css。
- mobile-hero.css：移动端首屏排版、角标与安全区适配（由 portrait-fx.css 引入）。
- aesthetic-pass.css：五幕舞台、sticky 叠层作品卡、宣言长字轨/能力矩阵/游标标尺、等高线、Slot Roll、工作规格/HUD/档案格、隔离的 .demo-* 交互演示、星盘与铭牌、光标与响应式样式。
- world-dots.js：Natural Earth 陆地点的压缩静态数据（Int16 base64，3,232 点 / 25.9KB），挂在 window.__QQSG_WORLD_DOTS__。
- site.js：滚动与对切插值（含 Lenis 单循环）、manifesto 长字轨/velocity skew、scroll-scrub、真实墨点地球与 BGP 飞线/经纬度 HUD、拖拽惯性、sticky 作品卡、原生演示交互、印记联动、字符解码、边界视差、磁吸、实时时钟与签名重播。
- portrait-fx.js：首屏人像墨迹 WebGL 交互，离屏/隐藏时停帧。
- hero-ink-fx.js：首屏墨迹拖尾 WebGL 交互，离屏/隐藏时停帧。
- vendor/lenis.min.js：平滑滚动库（许可证见 vendor/LENIS_LICENSE.txt）。
- portrait-cutout-clean.png：当前使用的人像抠图。
- assets/：真实项目界面截图（lowendcloud.jpg、1kbpage.jpg、blog.jpg、sla.jpg、nodeget.jpg）。
- SOURCES.md：内容与截图来源。

当前 index.html 实际加载链：scroll.css → portrait-fx.css（@import mobile-hero.css）→ aesthetic-pass.css → vendor/lenis.min.js → world-dots.js → site.js → portrait-fx.js → hero-ink-fx.js。

签名使用原版速度：长度乘 2.65，长笔画 240–1150 毫秒，点笔画 90 毫秒，笔间停顿 40 / 68 毫秒。

作品截图是截取时的界面，不是实时监控；lowend.cloud 与 1kb.page 为 2026-11-24 在 1200×800 浏览器视口下的真实首页截图，未使用 Cloudflare 质询页或空白错误页。域名按用户提供的信息列出，不代表每个域名均配置了网页服务。IDC 系统按用户要求未展示。

线上入口：https://www.qq.sg/（qq.sg 301 → www.qq.sg，Vercel 自动部署）。本地入口只需要 index.html。
