# 转达 · 第 1 轮 · T-A2-v1

本轮收尾判据（任一命中即触发仲裁者收回评估）：
- 契约块升到 `v1.1.0`
- T-A2 / T-B2 / T-C2 全部通过验收
- 出现跨轨强依赖
- 总改动超过 3000 行
- 任一轨连续 2 轮无新回执

---

## 1. 身份与必读

你是 **T-A2**，职责对应契约中的 **T-A（表单控件轨）**。

开工前按顺序读：

1. `.parallel-agent/轨道启动手册.md`（`v1.0.0`）
2. `.parallel-agent/契约块.md`（`v1.0.0`，重点 §2.2、§4.1、§3）
3. 本文件

契约已冻结。不要修改契约、手册、奠基层文件，也不要读其他轨的转达单。

## 2. 目标

实现 7 个全自绘表单控件，并把 `form` 页做成可交互的控件展示页：

- Input
- Textarea
- Select
- Checkbox
- RadioGroup
- Switch
- Slider

全部使用原生 DOM/CSS 与现有设计令牌，不引入任何依赖。

## 3. 文件领地（只允许写这些）

允许新增/修改：

```
frontend/src/ui/controls/form/input.ts
frontend/src/ui/controls/form/textarea.ts
frontend/src/ui/controls/form/select.ts
frontend/src/ui/controls/form/checkbox.ts
frontend/src/ui/controls/form/radio-group.ts
frontend/src/ui/controls/form/switch.ts
frontend/src/ui/controls/form/slider.ts
frontend/src/ui/controls/form/form.css
frontend/src/ui/controls/form/index.ts        # 统一导出
frontend/src/app/pages/form-controls.ts
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
backend/**
config/**
```

需要改冻结文件时：在回执中写“越界申请 + 原因 + 期望 diff”，不要自行落盘。

## 4. 接口契约（必须逐字匹配）

完整签名见契约 §4.1。要点：

- 每个控件导出 `createXxx(options): XxxHandle`。
- Handle 至少包含 `el`、`destroy()`；状态类控件提供契约中列出的 getter/setter。
- `ControlSize` / `ControlVariant` / `ControlHandle` 从 `../primitives/types` 导入。
- 事件回调命名与参数类型严格按契约，不得改签名。
- 所有控件内部使用 `el()` 创建节点，禁止 `innerHTML` 注入动态内容。

## 5. 实现要求

### 5.1 共性

- 视觉只用 `var(--...)` 令牌；不得写死颜色、字号、间距、圆角、时长。
- 视觉语言：1px 细边框、低饱和、大留白、克制动效；禁止大面积渐变与重阴影。
- 每个控件必须有：默认、hover、focus-visible、disabled、invalid（适用时）状态；亮/暗主题下均正常。
- 禁用原生外观：不得使用 `<select>`；checkbox/radio/switch 不得使用原生 `<input type=checkbox|radio>`；slider 不得使用 `<input type=range>`。
- 文本编辑控件可在内部使用 `<input>` / `<textarea>`，但必须清除原生边框/背景/焦点环，外框、状态与图标全部自绘。
- 可键盘操作：
  - Input/Textarea：Tab 聚焦，Enter 触发 `onEnter`（Input）。
  - Select：Enter/Space/ArrowDown 打开；上下键移动；Home/End；Enter 选中；Esc 关闭；支持首字母 typeahead（可选但建议）。
  - Checkbox/Switch：Space 切换。
  - RadioGroup：方向键在组内移动并选中，Space/Enter 选中。
  - Slider：左右/上下键步进，Home/End 到端点，PageUp/PageDown 大步进。
- ARIA：
  - Select 使用 `role="combobox"` + `aria-expanded` + `aria-activedescendant`，弹层 `role="listbox"`、选项 `role="option"`。
  - Checkbox 使用 `role="checkbox"` + `aria-checked`（含 `mixed`）。
  - RadioGroup 使用 `role="radiogroup"`，选项 `role="radio"`。
  - Switch 使用 `role="switch"` + `aria-checked`。
  - Slider 使用 `role="slider"` + `aria-valuemin/max/now`。
- Select 弹层必须复用 `ui/core/overlay.ts` 的 `openOverlay({ mode:'anchored', anchor })`；选项列表超过 8 条时用 `ui/core/scroll-area.ts` 的 `createScrollArea({ axis:'y' })`，不得出现原生滚动条。
- 尺寸使用 `sm/md/lg`，高度对齐 `--control-h-*`。

### 5.2 各控件重点

- **Input**：支持 `type: text|password|search|number`；number 不显示原生增减按钮；search 可加自绘搜索图标（用 `ui/icons`）；`setInvalid` 切换错误边框与 `aria-invalid`。
- **Textarea**：支持 `rows`、`maxLength`；右下角可显示自绘字数计数（可选）；高度自适应或固定由调用方样式控制。
- **Select**：选项支持 `description` 与 `disabled`；支持 `setOptions` 后保持当前值（值不存在则回退 placeholder）；打开时高亮当前项并滚入可视区。
- **Checkbox**：支持 `indeterminate`（`aria-checked="mixed"`）；自绘勾选/横线图标。
- **RadioGroup**：`name` 用于生成唯一 name 属性（即使不渲染原生 input）；支持横向/纵向。
- **Switch**：自绘轨道 + 滑块，动效使用 `--motion-base`。
- **Slider**：自绘轨道、已填充段、拖拽拇指；支持 `showValue` 与 `format`；拖拽用 Pointer Events + `setPointerCapture`；`onInput` 连续触发，`onCommit` 在 pointerup/keyup 触发。

### 5.3 演示页

`renderFormControlsPage()` 返回一个可滚动、可读性好的页面：

- 使用 `createScrollArea({ axis:'y' })` 作为根滚动区，根节点 `height:100%`、`flex:1`、`min-height:0`。
- 分区：文本输入、选择、勾选与单选、开关与滑块。
- 每个控件至少展示：默认态、禁用态、错误态（适用时）、不同尺寸（至少 sm/md）。
- 页面内用只读状态区展示当前值（例如“当前值：xxx”），便于验收。
- 不引入 Toast/Table 等 T-B 控件；需要反馈时用页面内文本。

## 6. 验收与证据

在回执中附上：

```powershell
cd frontend
pnpm typecheck
pnpm build
```

- 两条命令必须给出退出码与结果。
- 若失败来自其他轨正在编辑的文件（错误路径不在你的领地），在回执中写“外部阻塞”，不要修改他人文件。
- 自查：逐个控件列出“鼠标可用 / 键盘可用 / 亮暗主题 / 无原生外观”四项结论。

## 7. 回执

完成后写：

```
.parallel-agent/回执/第1轮/T-A2-v1.md
```

格式按手册 §5。必须包含：改动清单（文件 + 行数）、验证命令与结果、自检字段、越界声明。

不要修改历史回执，不要写其他轨文件。
