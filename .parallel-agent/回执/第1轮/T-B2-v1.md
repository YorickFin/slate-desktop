# 回执 · 第1轮 · T-B2-v1

- 裁决编号引用：[#A.010] [#A.012] [#A.013] [#A.014] [#A.015] [#A.020]
- 完成时点：2026-10-22T02:11:43+08:00
- 证据形式：命令退出码 + 构建输出 + 浏览器运行时断言（Vite dev + 外部 Chrome）
- 实际改动：7 个文件，全部在本轮转达指定领地内

## 结论

完成。Tabs / Dialog（含 confirmDialog）/ Toast / Table 四个自绘控件与 structure 演示页已实现，`pnpm typecheck` 与 `pnpm build` 均通过，浏览器运行时逐项自查通过。

## 改动清单

- `frontend/src/ui/controls/structure/tabs.ts`（新增，138 行）
- `frontend/src/ui/controls/structure/dialog.ts`（新增，153 行）
- `frontend/src/ui/controls/structure/toast.ts`（新增，104 行）
- `frontend/src/ui/controls/structure/table.ts`（新增，301 行）
- `frontend/src/ui/controls/structure/structure.css`（新增，438 行）
- `frontend/src/ui/controls/structure/index.ts`（5 → 18 行，统一导出 + 引入 CSS）
- `frontend/src/app/pages/structure-controls.ts`（15 → 238 行，演示页）

## 证据

### 命令

```powershell
cd frontend
pnpm typecheck   # 退出码 0，tsc --noEmit 无输出
pnpm build       # 退出码 0，vite build 成功：41 modules，dist/assets 产出正常
```

### 运行时自查（http://127.0.0.1:5199/#/structure）

- Tabs 键盘：聚焦标签后 `ArrowRight` 由「键盘操作」切至「使用约定」，`Home` 回到「概览」，`End` 到「使用约定」；`aria-selected`、roving `tabindex`（0/-1/-1 → 0 随选中移动）与面板 `hidden` 同步；焦点始终停在标签条内。
- Dialog：`普通对话框` 打开后存在 `.ui-overlay-backdrop` 与 `role=dialog[aria-modal=true]`，焦点进入面板；`Tab` 后焦点落在「取消」按钮（焦点陷阱生效）；`ESC` 关闭后焦点回到触发按钮「普通对话框」。长内容对话框内容区高度被夹到 449px，内部 viewport `scrollHeight 827 > clientHeight 447`，由 ScrollArea 承接滚动。
- confirmDialog：危险确认呈现「保留 / 删除」按钮；`ESC` 以 `false` 结束并回调提示文本「已取消操作」，未使用原生 confirm。
- Toast：连点四档按钮后同时存在 4 条，tone 依次为 info/success/warning/danger，host `aria-live=polite`；此前已有一条时总数仍为 4（最旧一条被移除）；约 3.2s 后全部自动消失；新开一条后点击自绘关闭按钮，1s 内节点移除。
- Toast 悬停暂停：浏览器 hover 通道未稳定投递 pointer 事件，改用页面内 `PointerEvent('pointerenter')` 触发验证：4s 后仍保留 1 条，派发 `pointerleave` 后 3s 内移除（计时逻辑正确；真实鼠标 hover 依赖浏览器事件投递，代码路径为同一监听器）。
- Table：点击「按 名称 排序」依次得到 `aria-sort=ascending`（首行工作项 01）→ `descending`（首行工作项 40）→ `none`（恢复工作项 01）；行勾选后行 `data-selected=true`、该行 `aria-checked=true`、表头 `aria-checked=mixed`；点表头全选后 40/40 行选中、表头 `true`，再点清空为 0；空态按钮切换后 `tbody` 显示「暂无数据，点击「切换空态」恢复示例数据。」，再次点击恢复 40 行；滚动根 `data-axis=both`、viewport `overflow-y=auto`、`th` 计算样式 `position=sticky`；点击表格主体触发行点击 Toast（「行点击 / 工作项 04 · 资源」），点击行勾选框只改变选中、不触发行点击。
- 控制台无非预期错误，仅有浏览器预览模式下的预期告警 `[boot] 桥接不可用`。

## 自检

- 错误率：约 15%（浏览器工具调用失败 4 次 / 约 26 次；原因均为外部浏览器页签被关闭、或目标按钮被滚动容器遮挡导致命中测试失败，重试或滚动后成功，非代码缺陷）
- 健康度：良好
- 建议：继续

## 越界声明

无。未修改冻结文件、未读取其他轨转达单、未引入任何依赖；所有新增/修改均在转达 §3 允许列表内。
