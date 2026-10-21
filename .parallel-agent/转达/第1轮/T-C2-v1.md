# 转达 · 第 1 轮 · T-C2-v1

本轮收尾判据（任一命中即触发仲裁者收回评估）：
- 契约块升到 `v1.1.0`
- T-A2 / T-B2 / T-C2 全部通过验收
- 出现跨轨强依赖
- 总改动超过 3000 行
- 任一轨连续 2 轮无新回执

---

## 1. 身份与必读

你是 **T-C2**，职责对应契约中的 **T-C（壳、桥与运行状态轨）**。

开工前按顺序读：

1. `.parallel-agent/轨道启动手册.md`（`v1.0.0`）
2. `.parallel-agent/契约块.md`（`v1.0.0`，重点 §2.1、§2.4、§4.3、§3）
3. 本文件

契约已冻结。不要修改契约、手册、奠基层文件，也不要读其他轨的转达单。

## 2. 目标

完成三件事：

1. 窗口尺寸/位置/最大化状态记忆，写入 `config/runtime/window-state.json`；
2. 标题栏补全（最小化/最大化/关闭、双击拖拽区切换最大化、图标随状态切换）；
3. `system` 页展示桥接状态、系统信息、事件计数、窗口几何，并支持主题/密度持久化。

## 3. 文件领地（只允许写这些）

允许新增/修改：

```
backend/main.py
backend/app/**
frontend/src/app/titlebar.ts
frontend/src/app/titlebar.css
frontend/src/app/pages/system.ts
config/runtime/**                 # 仅运行时产物，不手写 app.config.json
```

只读，禁止修改：

```
frontend/src/ui/core/**
frontend/src/ui/controls/primitives/**
frontend/src/ui/controls/form/**        # T-A2 领地
frontend/src/ui/controls/structure/**   # T-B2 领地
frontend/src/ui/icons/index.ts
frontend/src/styles/**
frontend/src/bridge/**
frontend/src/app/shell.*
frontend/src/app/router.ts
frontend/src/main.ts
config/app.config.json
pyproject.toml
```

需要改冻结文件时：在回执中写“越界申请 + 原因 + 期望 diff”，不要自行落盘。

## 4. 窗口状态记忆（重点）

新增 `backend/app/window_state.py`，实现：

- 读取 `config/runtime/window-state.json`，格式严格按契约 §A.031：
  ```json
  {
    "version": 1,
    "state": "normal",
    "bounds": { "x": 120, "y": 90, "width": 1180, "height": 780 }
  }
  ```
- 文件缺失/损坏：返回默认值；损坏文件重命名为 `.bak`，不得阻塞启动。
- 启动时：
  - 若 `config.window.rememberState !== true`，忽略文件；
  - 应用 `bounds`，并用 `maximized` 参数恢复最大化；
  - bounds 夹紧到 `minWidth/minHeight`；
  - 若窗口完全落在所有屏幕工作区之外，居中到主屏；
  - 最大化时保留 normal bounds，不要把最大化后的几何写进 `bounds`。
- 保存时机：
  - `window.events.moved`（参数 `x, y`）与 `window.events.resized`（参数 `width, height`）去抖 400ms；
  - `maximized` / `restored` 事件；
  - 关闭前（`closing` 或 `closed`）。
- 只保存 normal 状态的几何；最大化/最小化只保存 `state`。
- 写入必须原子替换（临时文件 + `os.replace`），UTF-8、两空格缩进。
- `window.state` 事件保持契约结构；moved/resized 后推送最新 snapshot（去抖后推送一次即可）。

注意 pywebview 事件签名：

- `moved`：`def on_moved(x, y)`
- `resized`：`def on_resized(width, height)`
- `maximized` / `restored` / `closed`：无参数

## 5. 标题栏

现有 `frontend/src/app/titlebar.ts` 是奠基层给出的可用版本，可在领地内补全：

- 左侧拖拽区必须保留 `.pywebview-drag-region`；双击拖拽区切换最大化。
- 右侧三键：最小化 / 最大化-还原 / 关闭；图标随 `window.state` 事件切换。
- 最大化时按钮 `aria-label` 为“还原”，normal 时为“最大化”。
- 关闭按钮 hover 使用危险色（已有样式可复用）。
- 不引入 T-A2/T-B2 控件；只用 `ui/controls/primitives` 与 `ui/icons`。
- 不新增公开 js_api 方法；所有窗口命令走 `bridge.call`。

## 6. 系统页

重写 `renderSystemPage()`：

- 根节点使用 `createScrollArea({ axis:'y' })`，`height:100%`、`flex:1`、`min-height:0`。
- 分区：桥接状态、系统信息、事件流、窗口状态、外观设置、协议自测。
- 数据来源：
  - `bridge.status` / `bridge.onStatus`；
  - `bridge.call('system.info', {})`；
  - `bridge.on('system.tick')` 累计事件数与最后 seq；
  - `bridge.call('window.state', {})` 与 `bridge.on('window.state')`；
  - `bridge.call('config.get', {})` 与 `config.changed` 事件。
- 外观设置：
  - 主题：亮色 / 暗色 / 跟随系统；密度：舒适 / 紧凑；
  - 通过 `bridge.call('config.patchUi', {...})` 持久化；
  - 主题切换后调用现有 `applyTheme()`；
  - 控件只能用基础 Button/IconButton 或本页局部自绘，不得依赖 T-A2/T-B2。
- 协议自测：
  - “正常调用” → `system.echo`；
  - “业务错误” → `demo.fail`，展示 `E_DEMO`；
  - “前端超时” → `demo.slow({ delayMs: 9000 })` 且 `{ timeoutMs: 3000 }`，展示 `E_TIMEOUT`；
  - “未知命令”可选；
  - 结果用页面内状态行展示，不引入 T-B2 的 Toast。
- “复制诊断信息”可用 `navigator.clipboard.writeText`；失败时降级为页面内提示，不弹原生对话框。
- 页面不得出现原生 `alert/confirm/prompt`。

## 7. 后端约束

- `Bridge` 只允许 `rpc` 一个公开方法；新增能力必须通过 `bridge._register(cmd, handler)`。
- 不改变已冻结的请求/响应/事件信封字段。
- `config/runtime/ui-state.json` 继续由 `config.patchUi` 原子写入；非法值回退默认。
- 日志不得写入 `config/app.config.json`。
- 窗口状态读写失败不得导致启动失败；记录 warning 并继续。

## 8. 验收与证据

在回执中附上：

```powershell
cd frontend
pnpm typecheck
pnpm build

cd ..
uv run python -m compileall -q backend
uv run python backend/main.py
```

窗口状态验证步骤（必须实际执行并记录）：

1. 启动应用，移动/缩放窗口，关闭；
2. 检查 `config/runtime/window-state.json` 已更新；
3. 再次启动，确认位置/尺寸恢复；
4. 最大化后关闭，再启动，确认最大化状态恢复；
5. 系统页切换主题/密度，重启后确认保持；
6. 触发 `demo.fail` 与超时用例，确认错误码展示正确。

若失败来自其他轨正在编辑的文件（错误路径不在你的领地），在回执中写“外部阻塞”，不要修改他人文件。

## 9. 回执

完成后写：

```
.parallel-agent/回执/第1轮/T-C2-v1.md
```

格式按手册 §5。必须包含：改动清单（文件 + 行数）、验证命令与结果、窗口状态验证记录、自检字段、越界声明。

不要修改历史回执，不要写其他轨文件。
