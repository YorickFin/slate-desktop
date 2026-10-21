# 回执 · 第1轮 · T-C2-v1

## 结论

完成。窗口状态记忆、标题栏补全、系统页三件事均已实现，并在真实桌面窗口中完成移动/缩放/最大化/重启恢复、主题与密度持久化、四种协议自测的点击验证。

## 改动清单

- `backend/app/window_state.py`（新增，317 行）：状态文件读取/校验/尺寸夹紧/屏幕外居中/损坏备份 `.bak`、400ms 去抖保存、maximized/restored/closing/closed 事件、`window.state` 推送。
- `backend/app/bridge.py`（+5 行）：新增私有 `_set_maximized()`，启动恢复时同步最大化标记且不触发事件。
- `backend/main.py`（+23 / -14）：接入 `WindowStateManager`，`create_window` 使用恢复几何，最大化改为 `shown` 后调用 `window.maximize()`。
- `frontend/src/app/pages/system.ts`（856 行，重写占位页）：滚动容器 + 桥接状态 / 系统信息 / 事件流 / 窗口状态 / 外观设置 / 协议自测六个分区。
- `frontend/src/app/titlebar.ts`（89 行，补全）：统一 `syncState()`，最大化图标与 `aria-label`/`title`/`data-maximized` 同步，双击拖拽区切换最大化。
- `config/runtime/window-state.json`（运行时产物）：由应用实际写入；验证结束时为 `normal · 420,260 · 1200×760`。
- `config/runtime/ui-state.json`（运行时产物）：验证过程中写入 dark/compact，结束后已通过界面恢复为 `light/comfortable`。

未改动任何冻结文件（`frontend/src/bridge/**`、`ui/core/**`、`ui/icons/index.ts`、`styles/**`、`shell.*`、`router.ts`、`main.ts`、`config/app.config.json`、`pyproject.toml`）。

## 证据

命令：

```powershell
cd frontend
pnpm typecheck     # 通过（无输出）
pnpm build         # 通过，41 modules，dist/assets/index-DpA4YyNZ.js
cd ..
uv run python -m compileall -q backend   # 通过（compileall OK）
uv run python backend/main.py            # 生产模式启动成功（多次）
```

窗口状态逻辑单测（临时脚本 `C:\Users\Anni\AppData\Local\Temp\slate_tc2_window_state_test.py`，不落项目）：15/15 通过，覆盖缺失/损坏回退与 `.bak`、版本非法、尺寸夹紧、屏幕外居中、最大化保留 normal bounds、去抖前后落盘、最大化期间忽略几何、还原、关闭前落盘。

真实窗口验证（Windows 原生窗口句柄 + SetWindowPos/ShowWindow/GetWindowPlacement 操作，截图存 `E:\Cache\Temp\`）：

| 步骤 | 操作 | 结果 |
|---|---|---|
| 1 | 启动，读取恢复日志 | `窗口状态恢复：state=normal bounds={'x': 300, 'y': 200, 'width': 1100, 'height': 700}`，实际 rect=300,200,1100,700 |
| 2 | `SetWindowPos(420,260,1200,760)` 后等 1.2s | `window-state.json` 变为 `420,260,1200,760`（去抖 400ms 生效） |
| 3 | `WM_CLOSE` 关闭 | 进程退出，文件保持 `normal · 420,260 · 1200×760` |
| 4 | 再次启动 | 恢复日志与 rect 均为 `420,260,1200×760`（截图 `slate_shot_01.png`） |
| 5 | 最大化后查看文件 | `state=maximized` 且 `bounds` 仍为 `420,260,1200×760`（不写入最大化几何） |
| 6 | 最大化状态关闭 → 重启 | 启动即最大化：`showCmd=3`，rect=0,0,2560,1440，normal rect 保留 420,260,1200×760（截图 `slate_shot_max2.png`） |
| 7 | 系统页外观设置点击「暗色」「紧凑」 | `ui-state.json` 立即变为 `dark/compact`，界面即时变暗（截图 `slate_shot_dark2.png`） |
| 8 | 重启后进入系统页 | 仍为暗色/紧凑，分区选中态正确，提示「已读取 config/runtime/ui-state.json」（截图 `slate_shot_restart_sys.png`） |
| 9 | 协议自测点击「正常调用」 | 展示 `OK 回声：ping（delay 0ms） 2ms`（`slate_shot_echo2.png`） |
| 10 | 点击「业务错误」 | 展示 `E_DEMO 协议自测：预期业务错误 2ms`（`slate_shot_fail.png`） |
| 11 | 点击「前端超时」 | 3s 拒绝，展示 `E_TIMEOUT 命令超时: demo.slow 3001ms`（`slate_shot_timeout.png`） |
| 12 | 点击「未知命令」 | 展示 `E_UNKNOWN_CMD 未知命令: demo.unknown 2ms`（`slate_shot_unknown.png`） |
| 13 | 点击「复制诊断信息」 | 页面内提示「诊断信息已复制到剪贴板」，无原生对话框（`slate_shot_copy.png`） |
| 14 | 点击「亮色」「舒适」还原 | `ui-state.json` 回到 `light/comfortable`，应用已正常关闭 |

界面状态另经截图核对：桥接状态「就绪」、服务端 `slate-backend`、协议 v1、客户端 `edgechromium`；系统信息含 Python 3.12.12 / pywebview 6.2.1+local.2 / PID / 启动时间 / 配置目录 / 构建产物；事件流 tick 数与 seq 持续增长；窗口状态显示「常规 · 420,260 · 1200×760」。

## 过程中发现并修复的问题（均在领地内）

1. **frameless 启动即最大化几何错误**：`create_window(maximized=True)` 得到 rect=420,260,2560×1440（部分越屏）。改为 `window.events.shown` 中调用 `window.maximize()`，重启最大化后 rect=0,0,2560×1440，正常铺满。
2. **最大化瞬间 move 事件抢占 normal bounds**：Windows 先派发 move/resize 再派发 maximized，导致 bounds 被写成 0,0。改为 move/resize 只记入待定值，去抖落盘时若已最大化则丢弃；最大化/还原时清空待定值。复测 bounds 稳定保留 `420,260,1200×760`。
3. **主屏判断**：本机 `webview.screens` 首项不是主屏（首项 x=2560），改为以包含坐标原点的屏幕为主屏，屏幕外居中结果 690,310 正确。
4. **系统页服务端显示 `—`**：页面晚于 `bridge.ready` 挂载，改为进入页面时补一次 `bridge.hello` 填充服务端名（截图已显示 `slate-backend`）。

## 自检

- 错误率：约 8%（约 5/60 次工具调用失败：一次 pywebview 属性探测报错、一次 `FindWindow` 返回 0、两次屏幕坐标估算偏差点击未命中、一次编辑拼接错误已立即修正）。
- 健康度：良好。
- 建议：继续。

## 越界声明

无。未申请契约变更；未新增前端依赖；`Bridge` 仍只有 `rpc` 一个公开方法；所有新增能力经 `_register` 或私有下划线方法实现。

附注：验证结束时 `ui-state.json` 已还原为 `light/comfortable`；`window-state.json` 保留真实退出位置 `normal · 420,260 · 1200×760`。临时测试脚本与截图均位于系统临时目录，未写入项目。
