# QQ.SG 个人网站 · 五幕动态黑白对切

双击 index.html 即可打开，也可整份目录放到任意静态服务器。无需构建或安装依赖。

## 结构

首页 → 宣言 → 作品 → 网络印记 → 关于，共五幕。

- **#home**：作者原创首屏。左侧 65% 黑 / 右侧白，人像与手写签名、WebGL 墨迹交互保持原样。
- **#manifesto**：桌面端 320svh（粘性行程 220svh）三段式长卷。三行超宽不换行字轨（实心 / 描边 / 酸柠绿重复片段）以纯 GPU 横滚：0→-46vw、-48→+2vw、-4→-42vw；Lenis 速度驱动 ±6° skewX 迎风倾斜并在停滚时阻尼归零。保留 3 栏能力矩阵、00–100 精密标尺、末段内容 scale(.94) 退暗；移动端/reduced 仅显示首组完整文字。
- **#works**：四张近全幅 sticky 叠层瑞士画廊卡（LowEndCloud / 1Kb.Page / 聶.NET / NIE-SLA），左侧约 38% 为 Inter 紧字距标题、JetBrains Mono 规格表与双机械按钮，右侧约 62% 为真实截图灰度展板，含四角 + 十字、FIG 编号、1:1 实时标记与 hover 显影。主页面初始 DOM **0 个 iframe**；点击展板或 LAUNCH REPLICA 才在 80 层全屏剧场按需创建单枚 iframe，以 100% 原生尺寸加载 demos/*.html，顶部 01–04 Tab 可切换，ESC / CLOSE / 遮罩边缘均可关闭并卸载 iframe。
- **#imprints**：52% / 48% 暗场网络版图。左侧黑面为 AS218834 与 APAC 5 / Europe 4 / North America 6 的 15 机房 IATA 胶囊矩阵，底部保留 AS218834 / 080112.xyz / as6.org / NIE-SLA 四个独立网络入口；右侧仍为 Natural Earth 50m 海岸/国界线框地球，15 个机房全量信标，仅以 HKG / PEK / FRA / LAX / NYC 为骨干飞线。总览或自由拖动只绘制最多 5 个正面枢纽标签并做 36px 最小像素间距去重；选中任意机房时优先绘制酸柠绿靶心与白描边折线标签，其他近邻标签自动退让，无左上角强塞兜底。白墙 English 地名、经纬/说明与 ghost IATA 三字码同步，水印右侧与底部留出安全距离。
- **#about**：36% / 64% 瑞士钟表 Colophon。左侧黑白人像带 ±12px 滚动纵深视差；右侧为 Inter 700 “Kaixiang Nie.”、JetBrains Mono 2×2 规格格、可重播手写签名、直角机械外链与 SHANGHAI · UTC+8 · HH:MM:SS + 1Hz 酸柠脉动点，时钟由视口 observer 启停。

## 微应用源码采集

- LowEndCloud：读取线上 https://www.lowend.cloud/ 的真实 DOM / CSS 变量（accent #0052ff、border #e2e5ec、浅灰网格与 MiSans 字系），保留真实导航、徽章、主标语、拓扑舞台与 deploy-preview 语言；套餐和地区按任务指定静态数据集驱动。
- 1KB.Page：按 https://1kb.page/ 原始 GBK HTML 逐项还原（Georgia、#f5f1e9、48em 留白、虚线文章分隔、20 格 transfer 点阵），扩展为本地多视图与字节构成提示。
- 聶.NET：读取本地 NIE-Higan-Blog-sync 的 Higan tokens（accent #42b983、text #50616d、border #f0f2f5）与线上真实头像，复刻头部、签名、搜索、文章列表与明暗主题。
- NIE-SLA：读取本地 NIE-SLA/frontend/themes/nodeget-nie-sla 与线上 sla.niekaixiang.com 的 NodeGet / NIE 主题 tokens（IBM Plex Sans / JetBrains Mono、绿色语义、8px 圆角、卡片阴影），以干净节点命名重建 30 格遥测与故障记录。

## 动态黑白对切

桌面端（≥901px）在 body 内固定一层 .split-backdrop，与首屏画布同样 inset 14px、圆角 24px。分割层只在滚入 #imprints / #about 时由数值进度平滑显形，并在 52% → 36% 精准对齐；manifesto 与 works 为全幅炭黑舞台，绝不会被对切线穿帮。滚动目标由缓存章节坐标以 smootherstep 计算，再用帧率无关指数阻尼逐帧写入元素 transform；减少动态效果时直接切目标值。

## 装置与微动效

- 地球 Canvas 只使用 #060606 / #f4f3ee 墨色，DPR 封顶 2；底图使用 DPR 同步的 mapCacheCanvas，缓存球体微晕、经纬网、Natural Earth 50m 海岸/湖泊、国界与主轮廓，静止锁定后只 drawImage 一次；文字宽度在 resize 时一次性 measureText 缓存。由 IntersectionObserver 控制，仅 #imprints 在视口内渲染，离屏即暂停，标签页隐藏时同样暂停。
- 海岸/湖泊与国界来自 Natural Earth 50m 数据，压缩为本地 world-coastlines.js（74.7KB / 548 条折线 / 7,783 点；358 条国界 / 2,009 点；15 个湖泊）；运行时无任何地图数据外链。
- 桌面精确指针可在右侧白墙按住拖拽旋转地球，带惯性角速度衰减；手机端在横向拖动明确超过纵向时接管旋转，纵向滑动仍可正常滚动页面。停稳 2.5s 后恢复缓慢自转。悬停左侧机房或点击移动端城市胶囊会中断自转并按最短角差锁定城市；移动端地理快捷保留 AS218834 / 亚太 / 欧洲 / 北美 4 枚。
- Works 使用缓存的卡片拓扑坐标（与 CSS 160px 间距严格一致）做 sticky 压叠 scrub；manifesto 三行错位、3 段能力/标尺/后缩编排、等高线纯 transform 位移、地球强调色与 About 时钟分别由纯数值滚动进度驱动，滚动帧内不读取任何布局。等高线不做 stroke-dashoffset 动画，work 背景等高线为 100svh sticky 单屏。
- Lenis 主 raf 只推进滚动与 manifesto skewX；imprint 列表与 About 文案不再写滚动惯性 transform，静止时无惯性样式写入。
- 滚动热路径零 getBoundingClientRect() / document.elementFromPoint()：章节、首屏、Imprints/About 坐标与 scrollHeight 只在初始化/resize 时测量，滚动帧全部用缓存坐标和 scrollY 做纯数值计算。
- 对切层与滚动进度直接写目标元素 transform，不再每帧写 :root CSS 变量；Lenis lerp 为 .145，分割层阻尼合入 Lenis 唯一主 rAF，不再另开循环。
- .film-grain 全站 display:none；为保持 #home 0 pixel diff，Home 状态保留同一原噪点层，离开首章立即停止合成；不再为幽灵编号、箭头、静态 reveal 预留常驻合成层。
- 全局光标仅对 hover:hover + pointer:fine 生效，首帧直接落位；触屏与减少动态效果下自动关闭。导航与胶囊按钮使用双层 Slot Roll 文字；导航下划线以独立 non-blend 元素 + transform/scaleX 0.42s 游标滑行。
- 首屏 WebGL 墨迹在 #home 离屏或标签页隐藏时真正 cancelAnimationFrame，回到首屏再启动；Works 王牌卡图版改为原生可交互 DOM 演示，无滚动内缩放/滤镜，文字保持矢量锐利。
- Manifesto 的 skewX 只写三条 manifesto-line 的 transform；Lenis velocity 驱动目标角度，主循环阻尼回正，不写 :root，也不新开 rAF。
- 首屏保持作者原构图；所有新增动画在 prefers-reduced-motion 下均为静态最终态。

manifesto / works 为不透明炭黑舞台；imprints / about 透明浮在分割层上。顶部导航与左下章节指示器保持 mix-blend-mode: difference，并用独立非混合的酸柠绿导航下划线保证点睛色纯正。全站酸柠绿仅用于选区、当前导航、journey 进度、宣言关键词、胶囊按钮 hover、Telemetry 微点与地球 BGP 脉冲。

## 移动端（≤900px）

隐藏固定对切层。首页完整保留 mobile-hero.css 构图；宣言带改为自然高度、无 sticky，三行与三栏能力全部静态可见；作品改为四张全宽圆角王牌卡与可筛选档案表自然纵向排列；印记以 3 大洲 15 机房胶囊矩阵与 4 个网络入口收束，并在其下以 min(82vw,340px) 的高清地球展台、精简 HUD、AS/亚太/欧洲/北美 快捷胶囊与 Telemetry 铭牌收束；关于为纸白单栏并以全宽无黑缝人像画框收尾，实时时钟继续运行。移动端不加载磁吸与滚动惯性；宣言显示两组文字并以 26s/30s/28s CSS 反向 marquee 运动；地球展台放大到 min(82vw,340px)，支持拇指横向拖拽、精简 HUD 与 AS218834/亚太/欧洲/北美 快捷胶囊；四张王牌卡改用 100% 宽 iframe 微应用、560px 视口并触发原站移动布局；辅助字号不低于 10px，筛选/标签触控热区不低于 36px；About 人像画框为 36px 上距 + 20px 侧距 + 16px 圆角。

## 文件

- index.html：完整页面与五幕内容。
- scroll.css：全局底座（首屏 65% 分割与人像合成、影院外框、章节基础布局）。
- portrait-fx.css：首屏人像 WebGL 墨迹样式，并引入 mobile-hero.css。
- mobile-hero.css：移动端首屏排版、角标与安全区适配（由 portrait-fx.css 引入）。
- aesthetic-pass.css：五幕舞台、sticky 叠层作品卡、宣言长字轨/能力矩阵/游标标尺、等高线、Slot Roll、工作规格/HUD/档案格、iframe 产品窗框、星盘与铭牌、光标与响应式样式。
- demos/：四个完全独立的同源静态微应用：lowendcloud.html、1kbpage.html、blog.html、sla.html，以及本地真实头像 assets/avatar.jpg；全部内联 CSS/JS、无后端、无统计脚本。
- world-coastlines.js：Natural Earth 50m 海岸/湖泊/国界压缩静态数据，挂在 window.__QQSG_COASTLINES__。
- site.js：滚动与对切插值（含 Lenis 单循环）、manifesto 长字轨/velocity skew、scroll-scrub、真实墨点地球与 BGP 飞线/经纬度 HUD、拖拽惯性、sticky 作品卡、iframe 等比缩放与滚轮透传、印记联动、字符解码、边界视差、磁吸、实时时钟与签名重播。
- portrait-fx.js：首屏人像墨迹 WebGL 交互，离屏/隐藏时停帧。
- hero-ink-fx.js：首屏墨迹拖尾 WebGL 交互，离屏/隐藏时停帧。
- vendor/lenis.min.js：平滑滚动库（许可证见 vendor/LENIS_LICENSE.txt）。
- portrait-cutout-clean.png：当前使用的人像抠图。
- assets/：真实项目界面截图（lowendcloud.jpg、1kbpage.jpg、blog.jpg、sla.jpg、nodeget.jpg）。
- SOURCES.md：内容与截图来源。

当前 index.html 实际加载链：scroll.css → portrait-fx.css（@import mobile-hero.css）→ aesthetic-pass.css → vendor/lenis.min.js → world-coastlines.js → site.js → portrait-fx.js → hero-ink-fx.js。

签名使用原版速度：长度乘 2.65，长笔画 240–1150 毫秒，点笔画 90 毫秒，笔间停顿 40 / 68 毫秒。

作品截图是截取时的界面，不是实时监控；lowend.cloud 与 1kb.page 为 2026-11-24 在 1200×800 浏览器视口下的真实首页截图，未使用 Cloudflare 质询页或空白错误页。域名按用户提供的信息列出，不代表每个域名均配置了网页服务。IDC 系统按用户要求未展示。

线上入口：https://www.qq.sg/（qq.sg 301 → www.qq.sg，Vercel 自动部署）。本地入口只需要 index.html。


## 审查修复（20261125c）

- iframe 透传：4 个 demo 的 postMessage 使用 location.origin；wheel/touch 带 kind；主站只读 layout.maxScroll，对 delta 做有限数/±2400 限幅，wheel 以 lenis.targetScroll 叠加并使用 lerp .078，touch 使用 immediate。
- NIE-SLA：6 张干净节点卡、30 格独立遥测、全部 / VPS / Web / 商家 / 国家地区 / 价格档 / 机器类型均有真实筛选或排序变化；故障面板 40 条、内部滚动、总高 ≤240px。
- LowEndCloud/SLA 移动端媒体块各合并为 1 块；LowEnd 套餐单列、公告可关闭、导航/登录/注册有反馈；SLA 移动端单列展示前 3 张完整卡，字号 ≥10px。
- 1KB.Page 默认锁定暖纸色，手动 ☾/☀ 切换；RSS 指向真实 https://1kb.page/feed.xml 并展示只读预览。
- Blog 5 篇文章、顶栏导航/联系入口全部可达、筛选单篇不再被 flex 拉伸；移除废弃角标 CSS。


## 移动原生滚动修复（20261125d）

- 四个 demos 完全移除 touchstart / touchmove / touchend 模拟滚动；html/body 统一 touch-action: pan-y 与 overscroll-behavior-y: auto，只保留 wheel 透传。
- 手机端 Lenis 条件收紧为 finePointer 与 desktop 同时匹配；未命中时走原生 scroll 监听，不再空转 lenis.raf。
- 900px 以下或 coarse pointer：iframe 默认 pointer-events: none，viewport 可自然滚动；点击 viewport（位移 <8px）或顶栏状态按钮进入 is-interactive，iframe 才接收交互。顶栏显示 轻点交互 / 完成 ✕，并提供低干扰点按提示；页面有效滚动 >24px 自动退出交互。
- 桌面 >900px 且 fine pointer：iframe 始终 pointer-events: auto，状态保持 INTERACTIVE REPLICA，滚轮透传与直接点击不变。


## 截图级视觉重构（20261125f）

- 四个 demos 依据 assets 下四张真实截图重新构图，不再沿用上一版自拟版式。
- Blog：移除列表竖线与页脚线、筛选药丸和摘要；补回绿色近期发布、五枚 SVG 社交圆标、日期/标题/置顶/标签三级文章行与三枚悬浮圆钮。
- LowEndCloud：白底公告、上下双行 Logo、纯黑居中双行主标题、居中双 CTA 和实时摘要、左拓扑白卡 + 右 deploy-preview；套餐售罄、2×2 规格、胶囊与底部命令条。
- 1KB.Page：删除挑战大标题与说明，保留近期双链接；页脚回到紧凑 transfer 长条 + 点阵余量；纸墨切换收进右下低干扰文字按钮。
- NIE-SLA：纯白背景、纯字标头、整宽状态横幅与居中汇总行、拼接式分组条、整宽故障卡，以及单列 VPS 大白卡内 4 行节点；移动端保留 3 行完整节点。
- 保留 1200px iframe 等比装裱、桌面 wheel 透传、移动原生滚动与轻点解锁。


## Network Footprint（20261125g）

- #imprints 左侧改为 AS218834 + 3 大洲 15 机房矩阵：APAC 5、Europe 4、North America 6；每项为 IATA + 城市，底部保留 4 个独立网络入口。
- 右侧地球扩展至 15 个信标；核心 total view/自由拖动只绘制 5 个跨洲枢纽标签，并按 36px 最小像素间距去重；选中机房强制优先绘制酸柠绿靶心折线标签，其他近邻标签自动退让，取消左上角强塞兜底。
- 全部标签在 fillText 前使用 rgba(242,241,234,.88)、3px strokeText 纸白描边；骨干弧只连接 HKG / PEK / FRA / LAX / NYC，选中非骨干节点时只增补该节点一条弧。
- 白墙地名、经纬、说明与 ghost 三字码联动；ghost 右侧与底部留出安全距离，不再裁切。
- 移动端 15 个机房胶囊为双列、最小 34px 高、字号 ≥10px；地理快捷仅保留 AS218834 / 亚太 / 欧洲 / 北美 4 枚。
- update() 在自然滚离旧锚点后静默 replaceState 清除过期 #hash。


## 瑞士画廊与全屏剧场（20261126a）

- 字体升级为 Inter + JetBrains Mono；除 #home 首屏外，旧 Cormorant Garamond / Space Grotesk 已从加载链与 token 中移除。编号、规格、状态、按钮统一等宽 + tabular-nums。
- Works 主页面不再常驻 iframe，也不再做 1200px 画布缩放、移动端 pointer-events 解锁或 postMessage wheel 透传。四张展板只使用 assets 下真实截图，默认 grayscale(100%) contrast(1.06) brightness(.94)，hover 缓慢显影并 scale(1.025)。
- .replica-modal 全屏剧场：48px 深炭控制条 / 01–04 项目 Tab / 域名胶囊 / OPEN SITE / CLOSE [ESC]；iframe 按需创建，容器百分比铺满，关闭时 src 置 about:blank 并从 DOM 移除。
- Lenis 在剧场打开时 stop、关闭时 start；主页面/页头/journey 在剧场内 inert，焦点回到触发按钮。
- 首次且非 reduced-motion 才显示 0.85 秒开幕幕布：000→100、酸柠进度轨、90ms 停顿、720ms 上拉，并在上拉瞬间触发首屏签名；sessionStorage 记录，刷新或 reduced-motion 直接跳过，1.8s 硬超时兜底。
- 机械光标仅在精细桌面指针显示，#home 内完全隐藏：9px 默认点、78px LAUNCH 实心盘（明卡深底 / 暗卡酸柠底）、70px ORBIT 细环、38px 链接细环，按压 scale(.98)。
- 历史章节中关于“常驻 iframe / 1200px 缩放 / 轻点解锁 / wheel 透传”的描述为当时版本记录，已由本节替代。


## 瑞士终幕（20261126b）

- Works 展板改为 object-fit: contain，四张 1200×800 截图完整呈现，不再裁掉左右边缘；浅卡内衬 #ebe9e1、深卡 #141414；卡高改为 calc(100svh - 130px)，缓存 workSlots 同步 130px，journey 仅在离开 #home 后下移至 bottom:20px，Home 像素保持不变。移动端隐藏 1:1 状态徽章，仅保留 FIG 与底部 launch 提示。
- #manifesto 保持 320svh sticky 行程，改为 4 列制图网格 + 四角十字、左对齐三行 Inter 700 建筑字、逐行 0.16→1 聚焦与 2–20px 微沉降；01/02/03 等宽微序号；SYSTEMS 仅在聚焦段变酸柠绿；能力带改 3 列 1px 铭牌与顺序状态点；右侧 21 道游标卡尺刻度（00/25/50/75/100）与酸柠针随 p 移动；旧重复跑马灯 DOM 全部删除，移动端为无动画垂直排版。
- #imprints 改为 36% / 64%：左侧 AS218834 + APAC 05 / EU 04 / NA 06 三段机械切换与无框 52px 城市行（移动端 46px）（三字码 / 中文 / 纬度），右侧黑曜石地球获得 64% 画布；Tab 切换同步 astrolabe.setView，node 悬停/点击锁定路由；全部 15 城保留。底栏移动端只留 AS218834 总览。
- #about 统一 36 / 64：Inter 700 “Kaixiang Nie.”、JetBrains Mono 2×2 规格表、直角机械外链、深墨手写签名与 ↺ REPLAY SIGNATURE；上海时钟升级 SHANGHAI · UTC+8 · HH:MM:SS + 1Hz 酸柠脉动点，增补 IntersectionObserver 启停，移动端同样正确走时。
- 版本升级为 20261126b；Home 与阶段 1 全屏剧场、Preloader、机械光标、Inter/JetBrains Mono token 全部保留。


## 无缝章节与矢量地球（20261126f）

- 删除 split-backdrop 的 36px 羽化带与滚动淡入；桌面 ii 在 #imprints / #about 使用自身 36/64 实色平面：左 #0b0b0a、右 #f2f1ea，margin 归零，右侧仅保留 1px rgba(11,11,10,.08) 刀锋细线；章节间用 100% 宽、左明右暗的 1px 分界。about-visual 回到纯黑底、肖像 contain 居中。
- #imprints 地球由暗色点阵改为 Natural Earth 50m 海岸线线框球（world-coastlines.js，74.7KB / 548 条折线 / 7,783 点，358 条国界 / 2,009 点）：骨白纸面上绘制正/背双层经纬网与海岸线、球体轮廓、1.09R 120 格表圈与 36px 防重叠标签胶囊；DPR 上限 2，静态底图由 mapCacheCanvas 缓存。
- 15 城 P2P 池：桌面 18 条 / 移动 11 条预分配流，15 城独立随机发射；按球面角距 1.35–3.2s 飞行；选中城市保证 3 条双向高亮流；深墨/酸柠双色彗星、12 节尾迹、TX/RX 双环脉冲；reduced-motion 下静态弧线。
- 版本统一为 20261126e；Fullscreen Theater、Archive 预解码堆叠、Preloader、机械光标保持不变。

- 20261126f：Work 顶部安全条移入 work-stack，并在 work-chapter / work-stack 加 overflow: clip，彻底阻断 68px 黑条溢出到 Imprints；P2P 普通轨线与彗星头在骨白底上加深，背面酸柠核降至 .26；Archive 条目文案同步为 3D 矢量地球。


## 轨道拖拽与 Live Theater（20261126g）

- 桌面鼠标 / 触控笔解除横向方向锁，2px 位移即进入 360° 拖拽；灵敏度 0.0085 / 0.0075，惯性限幅 11 / 8、阻尼 exp(-2.2dt)；触屏仍保留竖滑让路、横滑捕获。松手自由停驻，2.5s 后恢复自转。
- Works 剧场改为 4 个真实站点 iframe：lowend.cloud、1kb.page、www.niekaixiang.com、sla.niekaixiang.com；无 sandbox，允许 fullscreen / clipboard-write，referrerpolicy=no-referrer-when-downgrade；4.5s 加载兜底与 OPEN SITE 提示。
- 顶部 / 展板文案统一为 LIVE 语义；缓存版本 20261126g。


## 50m 地理与 About 收口（20261126i）

- 地球升级 Natural Earth 50m：548 条海岸/湖泊线 / 7,783 点 + 358 条陆地国界 / 2,009 点；国界仅正面绘制，海岸/国界在 z=0 做线性插值贴边；三级墨色与 50m 轮廓在 DPR2 下保持 <1ms 中位绘制。
- About 右侧新增 about-lower 双栏：签名与三枚机械链接收进左列，右列加入真实 Colophon 技术铭牌（域名、ASN、CRAFT、字体、四角 +、ONLINE 与标尺）；1440/1280 单屏内完成收口，移动端单列且所有铭牌文字 ≥10px。
- 版本升级 20261126i（历史记录；当前 20261126k，见下节）。


## Retina / 120Hz 渲染收口（20261126k）

- 地球新增 DPR 同步的 mapCacheCanvas：球体微晕、经纬网、50m 海岸/湖泊、陆界和主轮廓按 yaw/pitch 0.00018 阈值缓存；静止锁定时一次 drawImage 贴图，只叠加 P2P、节点与标签；拖拽状态下使用原生 path 直绘，避免离屏缓存每帧重光栅。线条改为 bevel/butt，海岸/国界应用 <1.22px 屏幕空间抽稀，z=0 地平线插值保留。
- P2P 轨道按墨色分组，彗星尾迹按 alpha 桶、彗星头按颜色合并 fill；脉冲涟漪批量为最多 4 次 stroke。GLOBE_PERF 暴露 cacheHits / cacheMisses / drawCalls / canvasDrawCalls / meshCalls / pulseCalls / jsMs。
- 全站 film-grain 关闭；为保持 #home 0 pixel diff，原噪点仅由首页专属层在 home 状态显示，其余章节不合成。Work 卡阴影归零，未使用 plate 图层的 clip-path/scale will-change 清除。
- gallery-cursor 直接写 style.transform（按压 scale 0.98），CSS 不再依赖 --cursor-x/y/scale，will-change 收窄为 transform。
- Lenis lerp 0.145；主 raf 移除 advanceSplit 与滚动 skewY 惯性，静止时仅保留必要帧调用。
