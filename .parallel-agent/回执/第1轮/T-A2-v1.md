# 回执 · 第1轮 · T-A2-v1

## 结论

完成：7 个全自绘表单控件（Input / Textarea / Select / Checkbox / RadioGroup / Switch / Slider）与 `form` 演示页已落地；`pnpm typecheck`、`pnpm build` 均通过，浏览器实测交互正常、控制台 0 报错。

## 改动清单

均为 T-A 领地内文件，无越界。

| 文件 | 行数 | 说明 |
|---|---|---|
| `frontend/src/ui/controls/form/input.ts` | 88（新增） | Input 工厂 + handle |
| `frontend/src/ui/controls/form/textarea.ts` | 97（新增） | Textarea 工厂 + 字数计数 |
| `frontend/src/ui/controls/form/select.ts` | 312（新增） | Select 工厂 + 锚定弹层 + 自绘滚动 |
| `frontend/src/ui/controls/form/checkbox.ts` | 92（新增） | Checkbox（含 mixed） |
| `frontend/src/ui/controls/form/radio-group.ts` | 157（新增） | RadioGroup（roving tabindex） |
| `frontend/src/ui/controls/form/switch.ts` | 72（新增） | Switch（role=switch） |
| `frontend/src/ui/controls/form/slider.ts` | 168（新增） | Slider（Pointer Events + setPointerCapture） |
| `frontend/src/ui/controls/form/form.css` | 642（新增） | 控件与演示页样式，仅引用令牌 |
| `frontend/src/ui/controls/form/index.ts` | 26（重写） | 统一导出 + 引入 form.css |
| `frontend/src/app/pages/form-controls.ts` | 259（重写，原 16 行占位页） | 4 分区演示页 + 只读值展示 |

合计约 1913 行（新增/重写），未超 3000 行收尾阈值。

## 证据

### 命令

```powershell
cd frontend
pnpm typecheck   # 退出码 0
pnpm build       # 退出码 0
```

- `pnpm typecheck`：`tsc --noEmit` 无输出，退出码 **0**。
- `pnpm build`：`41 modules transformed`，产物 `dist/assets/index-C-3tur4j.css` 34.88 kB、`dist/assets/index-Z3bPcLGg.js` 64.69 kB，`✓ built in 254ms`，退出码 **0**。

### 浏览器实测（`pnpm dev` → `http://127.0.0.1:5173/#/form`）

- 页面渲染 4 个分区（文本输入 / 选择 / 勾选与单选 / 开关与滑块），根节点为自绘 ScrollArea；控制台消息为空（0 错误、0 警告）。
- **Input**：输入 `abc` 后只读区更新；按 Enter 后变为「已回车：abc」，`onEnter` 生效。
- **Textarea**：输入 6 个字符，右下角计数显示 `6 / 120`，只读区显示「当前长度：6」。
- **Select（键盘）**：点击打开后 `aria-expanded=true`；ArrowDown 两次使 `aria-activedescendant` 从 `opt-0`→`opt-2`，再次 ArrowDown 跳过 disabled 的「榴莲」（opt-3）到 `opt-4`；Enter 选中「接骨木果」，弹层关闭、焦点回到触发框。
- **Select（鼠标）**：点击禁用项「榴莲」无反应且弹层保持打开；点击「樱桃」后弹层关闭、标签更新为「樱桃」、焦点回到 `ui-select`。
- **Select（弹层）**：12 选项时命中 `.ui-select-menu-scroll` 自绘滚动区，`scrollHeight=476 / clientHeight=238`；弹层与触发框对齐（trigger x=261/w=383，panel x=261/w=383，y=trigger 底部 +6）。
- **Select（键盘打开/关闭）**：Esc 后 `aria-expanded=false`；再按 Enter 重新打开。
- **Checkbox**：点击后 `aria-checked` 由 `false`→`true`，只读区「已勾选」；对同一控件派发 Space keydown 后回到 `false` 且 `defaultPrevented=true`。
- **RadioGroup**：聚焦「均衡」按 ArrowDown，焦点与选中移到 `ui-radio-density-1-2`（宽松），只读区更新为「当前值：cozy」。
- **Switch**：点击后 `aria-checked=false`，只读区「当前：关闭」。
- **Slider**：点击轨道中段得到 `aria-valuenow=50` 并触发 `onCommit`（只读区「已提交：50」）；Home→0、End→100、PageDown→90，右侧显示值同步为 90。
- **主题**：运行时为暗色令牌（`--color-surface` → `rgb(28,29,26)`、文本 `rgb(233,233,227)`）；`form.css` 中无任何 `#hex` / `rgb()` / `ms` 写死值（grep 0 命中），亮/暗切换由令牌整体换肤。

### 自查矩阵（每控件四项）

| 控件 | 鼠标可用 | 键盘可用 | 亮/暗主题 | 无原生外观 |
|---|---|---|---|---|
| Input | 是（实测输入/聚焦） | 是（Tab 聚焦、Enter→onEnter 实测） | 是（令牌） | 是（`<input>` 仅作文本载体，外框/图标自绘） |
| Textarea | 是（实测输入/计数） | 是（Tab） | 是 | 是（`resize:none`、无原生边框） |
| Select | 是（打开/选中/禁用项实测） | 是（Enter/↑/↓/Home/End/Esc/Tab/typeahead） | 是 | 是（无 `<select>`，`role=combobox`） |
| Checkbox | 是（实测点击） | 是（Space，合成事件实测） | 是 | 是（无原生 checkbox，`role=checkbox`） |
| RadioGroup | 是（点击选中） | 是（方向键移动并选中实测） | 是 | 是（无原生 radio，`role=radiogroup`） |
| Switch | 是（实测点击） | 是（原生 `button` + Space/Enter 语义） | 是 | 是（无原生 checkbox，`role=switch`） |
| Slider | 是（点击定位 + 拖拽 Pointer Events） | 是（方向键/Home/End/PageUp/PageDown 实测） | 是 | 是（无 `<input type=range>`，`role=slider`） |

说明：浏览器自动化工具未能成功派发空格键（Arrow/Enter/Home/End/Page 均正常），Checkbox 的 Space 行为改用页面内派发 `KeyboardEvent('keydown',{key:' '})` 验证，结果为切换成功且阻止默认；Switch 依赖原生 `button` 的空格激活语义。Slider 的连续拖拽未做自动化连续指针移动验证，代码路径为 `pointerdown + setPointerCapture + pointermove`。

## 自检

- 错误率：约 9%（工具调用失败 4 / 总约 45）。失败均为浏览器自动化桥接问题（选择器未命中、桥接 30s 超时、离屏元素 hit test 命中标题栏），与产物代码无关；无 TS/构建错误。
- 健康度：良好
- 建议：继续

## 越界声明

无。仅写入转达单 §3 允许的 11 个路径；未改动 `ui/core/**`、`ui/controls/primitives/**`、`styles/**`、`bridge/**`、`app/shell.*`、`router.ts`、`main.ts`、`titlebar.*`、`backend/**`、`config/**`。

附注：验证时执行了 `pnpm dev`（5173，已停止）与 `pnpm build`（生成 `frontend/dist/` 构建产物，非源码）。
