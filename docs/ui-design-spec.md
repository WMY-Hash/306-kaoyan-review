# 306 考研复习系统 · UI 设计规范（v2 · 夜森林玻璃辉光）

> 范围：**全局视觉重做**。风格方向：**暗色玻璃辉光 × 夜森林融合（深炭绿底 + 暖金 hero 辉光 + 冷青/淡绿点缀）**。
> 依据：现有代码为纯前端（`index.html` + `css/style.css` + `js/app.js`），无构建步骤；当前主题已是 Catppuccin Mocha 暗色、顶部栏带 `backdrop-filter` 毛玻璃雏形。本规范在其基础上把整套表面、组件、光感统一升级为玻璃拟态。
> 状态：草案，待你确认方向后进入实现阶段（实现 = 替换 `:root` 变量 + 改写 `css/style.css` 各组件样式，必要时微调 `index.html` 结构与 `js/app.js` 渲染模板）。

---

## 1. 设计目标与原则

- **像"能天天盯的工具"而不是"花哨 Demo"**：玻璃质感用于面板/卡片/弹窗，主体仍沉稳读得久。
- **信息层级靠"玻璃深度"而非粗描边**：越浮在前的元素越透亮、越有光。
- **零构建、可离线**：所有效果用原生 CSS（`backdrop-filter`、渐变、阴影）实现，不引入框架。
- **可读性优先**：正文对比度达标；玻璃背景只在暗底之上，绝不在亮图之上。
- **克制用色**：保留现有学科 6 色编码（蓝/绿/红/黄…），仅把"强调色"升级为带辉光的渐变。

---

## 2. 配色系统

夜森林方向（深炭绿底 + 暖金 hero 辉光），新增"玻璃/辉光" token。

### 2.1 语义色（与现有一致，仅作为引用）

| 角色 | 值 | 用途 |
|---|---|---|
| 蓝 accent | `#89b4fa` | 主强调、链接、内科 |
| 绿 accent2 | `#a6e3a1` | 成功、已掌握、生理 |
| 红 red | `#f38ba8` | 危险、错题、删除 |
| 黄 yellow | `#f9e2af` | 警告、选中连线 |
| 桃 peach | `#fab387` | 外科学 |
| 紫 mauve | `#cba6f7` | 渐变辅助、人文 |
| 青 teal | `#94e2d5` | 生化 |
| 天 sky | `#89dceb` | 病理 |

### 2.2 表面与玻璃 token（新增/调整）

| token | 值 | 说明 |
|---|---|---|
| `--bg-base` | `#16161f` | 比原 `#1e1e2e` 更深一档，衬托玻璃 |
| `--bg-crust` | `#0d0d14` | 最底层（页面背景） |
| `--glass` | `rgba(255,255,255,.055)` | 玻璃面基础填充 |
| `--glass-strong` | `rgba(255,255,255,.09)` | 浮层/弹窗玻璃填充 |
| `--glass-border` | `rgba(255,255,255,.12)` | 玻璃 1px 描边 |
| `--glass-hi` | `inset 0 1px 0 rgba(255,255,255,.10)` | 玻璃顶部高光内阴影 |
| `--on-glass` | `rgba(205,214,244,.92)` | 玻璃上的正文色（略提亮） |
| `--glow-gold` | `0 8px 30px rgba(232,200,121,.28)` | 暖金 hero 辉光 |
| `--glow-warm` | `0 8px 30px rgba(240,169,160,.22)` | 暖色辉光 |

### 2.3 建议落地的 `:root`（实现时直接替换）

```css
:root{
  /* 夜森林基底（深炭绿 → 墨蓝） */
  --bg-crust:#070b0a; --bg-base:#0c1311; --bg-mantle:#0f1816;
  --bg-surface0:#16201d; --bg-surface1:#1d2a26; --bg-surface2:#283a34;
  /* 文本（更亮、雾感） */
  --text:#e8f0ec; --text-subtle:#b9c8c2; --text-muted:#7e918b;
  /* 学科 6 色编码（保留语义，微调更通透） */
  --blue:#8fb8f0; --green:#a6e3a1; --red:#f38ba8; --yellow:#f9e2af;
  --peach:#fab387; --mauve:#cba6f7; --teal:#94e2d5; --sky:#89dceb;
  /* hero 辉光：暖金（与冷青/淡绿点缀并存） */
  --gold:#e8c879; --gold-hi:#fff0c8; --accent:#e8c879; --accent2:#a6e3a1;

  --glass:rgba(255,255,255,.055);
  --glass-strong:rgba(255,255,255,.09);
  --glass-border:rgba(255,255,255,.13);
  --glass-hi:inset 0 1px 0 rgba(255,255,255,.10);
  --on-glass:rgba(232,240,236,.92);
  --glow-gold:0 8px 30px rgba(232,200,121,.28);
  --glow-warm:0 8px 30px rgba(240,169,160,.22);

  --sidebar-w:268px; --detail-w:400px; --topbar-h:60px;
  --radius:14px; --radius-lg:22px; --radius-pill:999px;
  --transition:.24s cubic-bezier(.4,0,.2,1);
  --shadow-sm:0 2px 10px rgba(0,0,0,.30);
  --shadow-md:0 10px 30px rgba(0,0,0,.40);
  --shadow-lg:0 24px 60px rgba(0,0,0,.55);
  --grad-accent:linear-gradient(135deg,#e8c879 0%,#fff0c8 100%);
  --grad-warm:linear-gradient(135deg,#f0a9a0 0%,#f38ba8 100%);
  --grad-cool:linear-gradient(135deg,#94e2d5 0%,#89b4fa 100%);
}
```

### 2.4 页面背景（替换 `body` 背景）

```css
body{
  background:
    radial-gradient(1200px 760px at 82% -12%, rgba(232,200,121,.12), transparent 60%),
    radial-gradient(1000px 680px at 10% 112%, rgba(148,226,213,.09), transparent 58%),
    radial-gradient(900px 600px at 50% 46%, rgba(168,230,160,.05), transparent 60%),
    linear-gradient(160deg, #0c1311 0%, #0a1216 55%, #070b0a 100%);
}
```

---

## 3. 字体与层级

- 字体族不变：`"Noto Sans SC", -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`；代码/ID 用等宽 `"JetBrains Mono", ui-monospace, SFMono-Regular, monospace`。
- 字号阶梯（比当前更克制、层级更分明）：

| 层级 | 字号 | 字重 | 行高 | 示例 |
|---|---|---|---|---|
| 显示/大标题 | 22px | 700 | 1.3 | 模块标题、KPI 数字 |
| 标题 H3 | 17px | 600 | 1.4 | 考点名、面板标题 |
| 正文 | 14px | 400 | 1.65 | body、列表 |
| 次要 | 12.5px | 400 | 1.5 | 说明、hint |
| 微标 | 11px | 600 | 1.2 | 标签、badge（大写/字距） |

---

## 4. 间距 / 圆角 / 栅格

- 间距基准 4px 网格：4 / 8 / 12 / 16 / 24 / 32。
- 圆角：卡片/面板 `--radius` 14px；大容器/弹窗 `--radius-lg` 22px；按钮/标签 `--radius-pill` 全圆。
- 主区采用自适应网格（章节卡、考点卡 `repeat(auto-fill, minmax(220px,1fr))`）。

---

## 5. 玻璃拟态通用配方（核心）

所有"浮层面板"复用同一配方，保证一致性：

```css
.glass{
  background:var(--glass);
  backdrop-filter:blur(22px) saturate(150%);
  -webkit-backdrop-filter:blur(22px) saturate(150%);
  border:1px solid var(--glass-border);
  border-radius:var(--radius);
  box-shadow:var(--shadow-md), var(--glass-hi);
  color:var(--on-glass);
}
.glass-strong{ background:var(--glass-strong); backdrop-filter:blur(30px) saturate(160%); }
```

> 实现时把现有 `.star-info`、`.card-modal`、侧栏、详情面板等套上 `.glass` 语义（不必每个都加 class，直接在其选择器里套用上述属性即可）。

---

## 6. 组件规范

### 6.1 顶部栏 `#top-bar`
- 改成 `.glass` 横条，底部细光边；品牌字距收紧、加渐变文字（`background:var(--grad-accent); -webkit-background-clip:text`）。
- 搜索框：玻璃内嵌输入框，聚焦时边框转 accent + 轻微辉光。

### 6.2 左侧科目导航 `.subject-list`
- 整条侧栏玻璃化（`position` 固定、右缘 1px 光边）。
- 科目项：常态半透明，hover 轻微上浮 + 左侧 accent 细条；权重徽章用对应学科色胶囊（带辉光）。
- 进度条：细轨道（`rgba(255,255,255,.08)`）+ 学科色渐变填充。

### 6.3 主区浏览（章节卡 `.chapter-card` / 考点列表 `.point-list`）
- 章节卡：玻璃卡片，hover 上浮 4px + `box-shadow` 加深；标题区左侧一小条学科色。
- 考点项：行高放宽，hover 背景 `var(--glass)`，右侧"掌握度"小圆点（灰→蓝→绿三态）。

### 6.4 详情面板 `.detail-panel` / 星图信息面板 `.star-info`
- 统一为 `.glass-strong` 浮层，顶部高光；标题渐变/学科色徽标。
- 正文段落间距加大，关键术语可加 `<mark>` 高亮（accent 半透明底）。

### 6.5 按钮
| 类型 | 样式 |
|---|---|
| 主按钮 `.btn-known` | `var(--grad-accent)` 文字白、`--radius-pill`、`box-shadow:var(--glow-accent)`；hover 提亮 |
| 次按钮 `.btn-pill` | 玻璃底 + 1px 边，hover 填充 `var(--glass-strong)` |
| 危险 `.btn-wrong` | 红描边/红字，hover 红底 `rgba(243,139,168,.16)` |
| 图标按钮 `.btn-icon` | 圆形玻璃，hover 旋转/提亮 |

### 6.6 卡片复习弹窗 `.card-modal` + `.card-face`
- 整窗 `.glass-strong`，大圆角；卡片翻转用 3D `transform: rotateY`，正/背两面皆玻璃。
- 正面问题大字居中；背面答案分点；底部"认识/不认识"两枚辉光按钮。

### 6.7 进度看板（`.kpi` / `.bar-row` / `.radar` / `.queue-item`）
- KPI 卡：玻璃卡片，数字用显示字号 + 学科色；图标用渐变圆底。
- 条形图轨道/填充沿用玻璃+渐变；雷达 SVG 描边提亮、网格更淡。
- 复习队列项：玻璃行，hover 左缘 accent 条。

### 6.8 计划闭环 `.plan-view`
- 周块玻璃卡片，完成度环用 conic-gradient 或 SVG 环形进度；勾选框玻璃方 + 选中态 accent 填充带对勾。

### 6.9 知识星图（`#star-graph` 周边）
- 工具栏 `.star-toolbar` / 图例 `.star-legend`：玻璃小药丸，浮在画布角。
- 连线说明浮层 `#star-link-label`：玻璃小卡 + 暖黄描边（保持现有逻辑）。
- 节点信息面板 `.star-info`：`.glass-strong`。

### 6.10 表单与输入
- `input/select/textarea`：玻璃内嵌，聚焦态 accent 边 + 微辉光；标签 12.5px 次要色。

### 6.11 标签与徽标 `.point-tag` / 权重徽章
- 胶囊化，`font-size:11px`、字距 `.04em`、半透明学科色底 + 同色字。

---

## 7. 动效（克制）

- 全局过渡 `var(--transition)`。
- 面板/弹窗入场：`opacity 0→1` + `translateY(8px)→0`（或 `scale(.96)→1`），`cubic-bezier(.4,0,.2,1)`。
- hover：卡片 `translateY(-4px)` + 阴影加深；按钮亮度 +8%。
- 避免持续动画（除星图引擎自转外），防眩晕、省电。

---

## 8. 可读性与可访问性

- 玻璃仅在 `#0d0d14` 深底之上使用；浮层文字用 `--on-glass`（提亮），确保对比度 ≥ 4.5:1。
- 不依赖颜色 alone 传达状态（掌握度同时用形状/位置）。
- 保留 `prefers-reduced-motion` 兜底：动效降级为瞬时。

---

## 9. 实施清单（确认后执行）

1. 替换 `css/style.css` 的 `:root` 与 `body` 背景（§2.3 / §2.4）。
2. 增加 `.glass` / `.glass-strong` 通用配方（§5）。
3. 顶部栏 + 搜索框玻璃化（§6.1）。
4. 侧栏导航玻璃化 + 进度条/徽章（§6.2）。
5. 主区章节卡/考点列表悬浮玻璃（§6.3）。
6. 详情/星图信息面板玻璃（§6.4）。
7. 按钮体系四型（§6.5）。
8. 卡片复习弹窗 3D 翻转玻璃（§6.6）。
9. 看板 KPI/图表/队列玻璃（§6.7）。
10. 计划闭环玻璃 + 环形进度（§6.8）。
11. 星图工具栏/图例/说明浮层玻璃（§6.9）。
12. 表单输入 + 标签徽标（§6.10/§6.11）。
13. 动效与 `prefers-reduced-motion`（§7）。
14. 跑 `smoke_test.js` + `star_label_test.js` 回归，强刷验证。

---

## 10. 验收标准

- [ ] 全站统一玻璃质感，无"裸色块"与硬描边残留。
- [ ] 玻璃浮层在深底上文字清晰、对比度达标。
- [ ] 学科 6 色编码与"掌握/未掌握/错题"状态仍一眼可辨。
- [ ] 所有现有功能（搜索/翻卡/看板/计划/星图编辑）外观更新后行为不变。
- [ ] 冒烟测试 160 + 浮层测试 14 仍全绿；强刷无控制台报错。
- [ ] 纯前端、双击 `index.html` 可用、离线可用（不引入任何新依赖）。
