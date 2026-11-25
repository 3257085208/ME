# 内容来源

用户提供：Kaixiang Nie、GitHub 3257085208、博客地址、ASN AS218834、域名聶.NET / 080112.xyz / as6.org / QQ.SG / lowend.cloud / 1kb.page。

查阅日期：2026-11-24（Asia/Shanghai）。

- GitHub：https://github.com/3257085208
- 博客：https://www.niekaixiang.com
- 博客引擎：https://github.com/3257085208/NIE-Higan-Blog
- 状态探针：https://github.com/3257085208/NIE-SLA
- NIE-SLA 公开页面：https://sla.niekaixiang.com
- NodeGet 主题：https://github.com/3257085208/NIE-Theme-NodeGet
- NodeGet Minecraft 主题：https://github.com/3257085208/NodeGet-Theme-MC
- Gotraffic：https://github.com/3257085208/Gotraffic
- LowEndCloud：https://lowend.cloud
- 1Kb.Page：https://1kb.page
- ASN 名称：https://radar.cloudflare.com/as218834
- ASN 查看入口：https://bgp.he.net/AS218834

assets/blog.jpg 和 assets/sla.jpg 为公开界面的浏览器截图，数据为截取时状态。
assets/nodeget.jpg 为 README 展示图的浏览器截图。公开演示 status.qq.sg 查阅时显示后端连接超时，所以展示部分采用作者仓库内现有的截图。
assets/lowendcloud.jpg 与 assets/1kbpage.jpg 为 2026-11-24 使用本地无头浏览器、统一 1200×800 视口直接访问 https://lowend.cloud 与 https://1kb.page 得到的真实首页 JPG（quality 85）；未出现 Cloudflare 质询页、白屏或错误页。lowendcloud.jpg 显示 LowEnd.Cloud 首页与实时套餐信息，1kbpage.jpg 显示 1 KiB PAGE CHALLENGE 的极简首页与字节预算条。

Works 四张王牌卡右侧的 .demo-* 为基于上述真实首页截图的原生 HTML/CSS 高保真交互复刻，并非伪造截图：LowEndCloud 套餐与命令、1KB 文章/字节预算、聶.NET 标签筛选、NIE-SLA 节点状态均由页面内真实文案与交互状态驱动；assets/*.jpg 在 20261126a 中同时用于 Works 瑞士画廊展板；主页面不再内嵌 iframe，截图仅作灰度艺术指导图版，真实微应用按需在全屏剧场加载。

About 的短介绍为基于用户资料拟写的首页文案，未加入年龄、地址、学历等个人信息。
IDC 系统按用户要求不展示。


## 微应用源码采集（demos/）

- LowEndCloud：线上 https://www.lowend.cloud/ 的真实 DOM 与 CSS tokens（accent #0052ff、border #e2e5ec、浅灰网格、MiSans 字系）；保留真实导航、徽章、主标语、LIVE TOPOLOGY 与 deploy-preview 语义。
- 1KB.Page：https://1kb.page/ 的原始 GBK HTML/CSS（Georgia、#f5f1e9、48em 留白、虚线分隔、transfer 834 B / 1024 B 点阵），本地扩展多视图与字节构成提示。
- 聶.NET：本地 NIE-Higan-Blog-sync 的 Higan CSS tokens（accent #42b983、text #50616d、border #f0f2f5）与线上真实头像（demos/assets/avatar.jpg）；复刻头部、签名、搜索、文章列表、明暗主题与正文抽屉。
- NIE-SLA：本地 NIE-SLA/frontend/themes/nodeget-nie-sla 与线上 sla.niekaixiang.com 的 NodeGet / NIE tokens（IBM Plex Sans / JetBrains Mono、绿色语义、8px 圆角、卡片阴影）；节点命名已做干净化处理，遥测数据为真实结构的静态样例。

四个页面均内联 CSS/JS，不依赖外部后端、统计脚本或远程字体；滚轮/纵向触摸通过 postMessage 转发给主站 Lenis。


## Network Footprint 数据

#imprints 的 15 机房坐标与 IATA 命名来自本轮提供的真实网络节点清单：PEK / SHA / HKG / TYO / SIN / FRA / RBX / GRA / TRN / LAX / FMT / PDX / PHX / NYC / BHS；未展示 IP，未添加厂商广告。AS218834 与 NIE-SLA 外链保留。
