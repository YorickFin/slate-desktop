# 转达 · 第 1 轮 · T-B2-v1

本轮收尾判据（任一命中即触发仲裁者收回评估）：
- 契约块升到 `v1.1.0`
- T-A2 / T-B2 / T-C2 全部通过验收
- 出现跨轨强依赖
- 总改动超过 3000 行
- 任一轨连续 2 轮无新回执

---

## 1. 身份与必读

你是 **T-B2**，职责对应契约中的 **T-B（结构/反馈控件轨）**。

开工前按顺序读：

1. `.parallel-agent/轨道启动手册.md`（`v1.0.0`）
2. `.parallel-agent/契约块.md`（`v1.0.0`，重点 §2.3、§4.2、§3）
3. 本文件

契约已冻结。不要修改契约、手册、奠基层文件，也不要读其他轨的转达单。

## 2. 目标

实现 4 个全自绘结构与反馈控件，并把 `structure` 页做成可交互展示页：

- Tabs
- Dialog（含 `confirmDialog`）
- Toast
- Table

全部使用原生 DOM/CSS 与现有设计令牌，不引入任何依赖。

## 3. 文件领地（只允许写这些）

允许新增/修改：

```
frontend/src/ui/controls/structure/tabs.ts
frontend/src/ui/controls/structure/dialog.ts
frontend/src/ui/controls/structure/toast.ts
frontend/src/ui/controls/structure/table.ts
frontend/src/ui/controls/structure/structure.css
frontend/src/ui/controls/structure/index.ts        # 统一导出
frontend/src/app/pages/structure-controls.ts
```

只读，禁止修改：

```
frontend/src/ui/core/**
frontend/src/ui/controls/primitives/**
frontend/src/ui/icons/index.ts
frontend/src/styles/**
frontend/src/bridge/**
frontend/src/app/shell.*
frontend/src/app/router.ts
frontend/src/main.ts
frontend/src/app/titlebar.*
frontend/src/ui/controls/form/**        # T-A2 领地
backend/**
config/**
```

需要改冻结文件时：在回执中写“越界申请 + 原因 + 期望 diff”，不要自行落盘。

## 4. 接口契约（必须逐字匹配）

完整签名见契约 §4.2。要点：

- `createTabs` / `createDialog` / `confirmDialog` / `toast` / `createTable` 的 options 与 handle 字段必须与契约一致。
- 可复用 `ui/core/overlay.ts`、`ui/core/scroll-area.ts`、`ui/core/focus.ts`、`ui/controls/primitives/button.ts`、`ui/icons`。
- 不得从 `ui/controls/form/**` 导入任何东西。
- 所有节点用 `el()` 创建，禁止 `innerHTML` 注入动态内容。

## 5. 实现要求

### 5.1 共性

- 视觉只用 `var(--...)` 令牌；不得写死颜色、字号、间距、圆角、时长。
- 1px 细边框、低饱和、大留白、克制动效；禁止大面积渐变与重阴影。
- 亮/暗主题下均正常；focus-visible 清晰可见。
- 禁用原生外观：不得使用原生 `<dialog>`、`alert/confirm`、原生滚动条、原生 table 样式（可以语义化使用 `<table>` 但必须完全重置外观）。

### 5.2 Tabs

- 横向标签条，自绘下划线/指示条；支持 `sm|md` 尺寸。
- ARIA：容器 `role="tablist"`，标签 `role="tab"` + `aria-selected` + `aria-controls`，面板由调用方提供时使用 `role="tabpanel"`。
- 键盘：左右方向键循环切换，Home/End 到首尾；`tabindex` 采用 roving tabindex。
- `setItems` 后保持当前值（不存在则回退第一项）。
- 面板内容由演示页管理，Tabs 只负责标签条。

### 5.3 Dialog / confirmDialog

- 必须复用 `openOverlay({ mode:'modal' })`，不得自己造遮罩与焦点陷阱。
- `createDialog` 创建时默认关闭；`open()` 打开；`close()` 关闭；重复调用幂等。
- `dismissible` 控制 ESC/遮罩是否可关闭；`actions` 用基础 Button 渲染，右对齐。
- 标题、描述、内容区结构清晰；内容超出时内部使用 `createScrollArea({ axis:'y' })`。
- `confirmDialog` 返回 `Promise<boolean>`：确认 resolve true，取消/ESC/遮罩 resolve false；不得使用原生 `window.confirm`。
- 关闭后焦点回到打开前元素（overlay 已处理，勿破坏）。

### 5.4 Toast

- 自建固定定位的 toast host（右下角），`z-index: var(--z-toast)`。
- 支持 `info|success|warning|danger` 四种 tone，使用自绘图标 + 左侧 1px 色条或小圆点，不做大面积色块。
- 堆叠显示，最多同时 4 条；超出时移除最旧一条。
- 默认 `durationMs=3200` 自动关闭；`0` 常驻；hover 暂停计时。
- 手动关闭按钮自绘（用 `close` 图标）。
- ARIA：host `aria-live="polite"`；danger 可用 `role="alert"`。
- 提供 `toast()` 返回值 `{ close }`。

### 5.5 Table

- 自绘表头、行、单元格、选中态、hover、空态；禁止原生表格视觉。
- 滚动必须使用 `createScrollArea({ axis:'both' })`；表头在纵向滚动时保持 sticky（可在 scroll content 内实现）。
- 列支持 `width`、`align`、`render`；`sortable` 列点击切换 asc/desc/none，表头显示自绘排序图标（`ui/icons` 的 `sort`/`chevron-up`/`chevron-down` 可组合），并设置 `aria-sort`。
- `selectable` 时每行左侧有自绘勾选框（表头全选/半选）；`getSelectedKeys` / `setSelectedKeys` 与 `rowKey` 一致。
- `onRowClick` 在行点击时触发；点击勾选框不触发行点击。
- 空态显示 `emptyText`。
- 数据量至少支持 50 行流畅滚动，不要求虚拟化。

### 5.6 演示页

`renderStructureControlsPage()` 返回一个可滚动、可读性好的页面：

- 根节点 `height:100%`、`flex:1`、`min-height:0`，使用 `createScrollArea({ axis:'y' })`。
- Tabs 演示：3 个标签，每个面板展示不同说明与内容。
- Dialog 演示：普通对话框、危险确认、长内容滚动对话框。
- Toast 演示：四个 tone 各一个按钮。
- Table 演示：至少 30 行示例数据、5 列、可排序、可多选；展示空态切换按钮。
- 不引入 T-A2 的表单控件；需要输入时使用页面内自绘按钮/选择器，或直接固定数据。

## 6. 验收与证据

在回执中附上：

```powershell
cd frontend
pnpm typecheck
pnpm build
```

- 两条命令必须给出退出码与结果。
- 若失败来自其他轨正在编辑的文件（错误路径不在你的领地），在回执中写“外部阻塞”，不要修改他人文件。
- 自查：Tabs 键盘、Dialog 焦点陷阱/ESC、Toast 堆叠/自动关闭、Table 排序/选中/滚动 逐项给出结论。

## 7. 回执

完成后写：

```
.parallel-agent/回执/第1轮/T-B2-v1.md
```

格式按手册 §5。必须包含：改动清单（文件 + 行数）、验证命令与结果、自检字段、越界声明。

不要修改历史回执，不要写其他轨文件。
