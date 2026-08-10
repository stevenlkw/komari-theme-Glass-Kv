# Komari Glass Kv

Kv 定制的 Komari 毛玻璃监控主题，基于
[Komari Glassmorphism](https://github.com/sanrokamlan-prog/komari-theme-Glassmorphism)
v3.3.3 二次开发。

![预览](docs/preview.png)

## 下载与安装

下载 [Komari-Glass-Kv-3.3.3-kv.4.zip](./Komari-Glass-Kv-3.3.3-kv.4.zip)，
进入 Komari 后台的主题管理页面，直接导入 ZIP。

主题信息：

- 名称：Komari Glass Kv
- 版本：3.3.3-kv.4
- 作者：Kv
- 默认卡片密度：compact
- 支持浅色、深色及北京时间自动模式

## Kv 定制内容

- 节点卡片改为纵向信息面板，服务商、系统、硬件、费用和期限按行展示
- CPU、内存、Swap、硬盘和流量使用独立彩色进度轨道
- 增加实时上传/下载与累计上传/下载
- 增加 CPU 核心、架构、CPU 型号、虚拟化、系统和内核提示
- 剩余时间不足 10 天或已过期时显示红色警示
- 增加电信、联通、移动线路名、延迟、丢包与明确标注的五级线路质量短柱
- 保留原版聚合延迟与丢包离散短柱
- 保留费用、收藏、搜索、详情图表、地图和高级工具
- 保留 Komari 原有后台、终端和管理页面

三网识别依赖 Ping 任务名称包含“电信、联通、移动”或相应英文关键词。
未配置对应任务时，该线路显示 `-`。

Komari 暂无独立的带宽和三网线路类型字段，可在节点标签中配置：

```text
带宽:1000G;电信:CN2/CN2;联通:CMI/CMI;移动:4837/4837
```

这些结构化标签会进入卡片对应位置，不会再作为普通标签重复显示。三网五格短柱明确标注为“质量”，按延迟和丢包中较差的等级计算，不代表网速；丢包数值也会按风险显示颜色。底部综合短柱仍来自真实历史记录。

## 开发与构建

要求 Bun 1.2 或更高版本：

```bash
bun install
bun run lint
bun run build
```

## 上游与许可证

本项目基于 sanrokamlan 的 Komari Glassmorphism 开发，并保留完整上游说明：
[README-UPSTREAM.md](./README-UPSTREAM.md)。

本项目继续遵循 [MIT License](./LICENSE)。
