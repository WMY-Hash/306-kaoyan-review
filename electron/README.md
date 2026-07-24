# 306 考研复习 — Electron 桌面版

把仓库里的纯前端单页应用打包成 Windows 桌面软件。本目录是独立子工程，与上层
`/index.html` 解耦：开发模式下通过 `../index.html` 加载；打包后 electron-builder
会把整个仓库（除本目录外）作为 `extraResources` 拷到 `resources/app/`，主进程按
`app.isPackaged` 自动切路径。

> 不需要后端服务、不修改任何 306 业务逻辑。

---

## 0. 前置条件

- Node.js ≥ 18（推荐 LTS 20.x）。  
  下载：<https://nodejs.org/zh-cn/>
- npm 自带。如果你在中国大陆，首次安装依赖可能撞墙 —— 见下方「国内镜像」一节。

## 1. 安装依赖

```bash
cd electron
npm install
```

这一步会下载：
- `electron`（~250 MB，主运行时）
- `electron-builder`（打包工具）

### 国内镜像（强烈建议）

GFW 经常阻断 npmjs.org。先设置淘宝镜像再安装：

```bash
npm config set registry https://registry.npmmirror.com
# 可选：electron 二进制也走镜像
npm config set ELECTRON_MIRROR https://npmmirror.com/mirrors/electron/
npm config set ELECTRON_BUILDER_BINARIES_MIRROR https://npmmirror.com/mirrors/electron-builder-binaries/
```

验证镜像生效：

```bash
npm config get registry    # 应输出 https://registry.npmmirror.com
```

## 2. 开发模式运行

```bash
npm start
```

会弹出一个 1280×820 的窗口，标题"306 考研复习"，加载本仓库根目录的 `index.html`。
任何对 `index.html / css / js / data / vendor / icons` 的修改，**Ctrl+R 刷新**即生效（菜单 视图 → 刷新）。

## 3. 打包 Windows 安装包

```bash
npm run build
```

输出落在仓库根的 `release/` 目录：

| 文件 | 说明 |
|---|---|
| `306 考研复习 Setup 0.1.0.exe` | NSIS 安装版，可选安装路径、桌面/开始菜单快捷方式 |
| `306-kaoyan-review-0.1.0-portable.exe` | 绿色版，双击即用，无需安装 |

只想要绿色版可以：

```bash
npm run build:portable
```

只验证打包配置、不出安装包（产出未压缩目录）：

```bash
npm run build:dir
# → release/win-unpacked/306 考研复习.exe
```

## 4. 常见坑 & 学习成本

| 问题 | 说明 |
|---|---|
| 首次 `npm install` 慢 / 失败 | 设置 `registry.npmmirror.com`，见上 |
| 打包时 winCodeSign / app-builder-bin 下载失败 | `ELECTRON_BUILDER_BINARIES_MIRROR` 已设即可 |
| 360 / 杀软误报 | NSIS 安装包没有微软签名是常见现象；点"仍要运行"或申请代码签名证书（OV，~¥300/年） |
| 体积大 | Electron 框架本身 ~80MB，306 业务文件 ~2MB，加上 ≈ ~85MB 正常 |
| 修改业务文件后没生效 | 重新 `npm start` 即可；打包后请重新 `npm run build` |
| service worker 在 file:// 不注册 | 是的，预期行为。PWA 完整离线能力需要 HTTPS 部署（如 GitHub Pages） |

学习成本预估：
- 会 npm 命令：`npm install` / `npm start` / `npm run build`，三条命令，0.5 小时上手
- 不会 npm：先看 <https://docs.npmjs.com/getting-started>（15 分钟），其余照本文档即可

## 5. 文件说明

```
electron/
├── main.js         # 主进程：创建窗口 + 加载本地 index.html
├── package.json    # 依赖 & electron-builder 配置
└── README.md       # 本文档
```

业务文件（index.html / css / js / data / vendor / icons / manifest.webmanifest /
sw.js）保持在仓库根目录，**不要复制进 electron/** ——electron-builder 会自动
用 `extraResources` 把它们打进 `resources/app/`。

## 6. 进阶（不在本期范围）

- 自动更新（electron-updater）
- 代码签名（解决杀软误报）
- macOS / Linux 打包（`npm run build -- --mac` / `--linux`）
- 多窗口 / 系统托盘

需要哪一项再单独做即可。