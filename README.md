# slate-desktop

> A pywebview + Vite + TypeScript desktop app with a fully hand-drawn control library.
> Built as a validation project for **ParallelAgent-v1.1.0**.

> **项目定位**：本项目是 **ParallelAgent-v1.1.0** 的测试验证项目，用于验证多轨并行开发、契约冻结、文件领地正交与回执验收流程。应用本身是一个自绘控件展示台，不是生产业务系统。

## 特性

- **pywebview frameless 窗口**：自定义标题栏，支持拖拽区、最小化、最大化/还原、关闭、双击拖拽区切换最大化。
- **窗口状态记忆**：位置、尺寸、最大化状态持久化到 `config/runtime/window-state.json`。
- **全自绘控件库**：不引入 React / Vue / 任何 UI 组件库，不使用系统原生控件外观。
- **设计令牌**：颜色、字号、行高、间距、圆角、边框、阴影、动效时长统一走 CSS 变量。
- **亮 / 暗主题**：低饱和配色 + 大留白 + 1px 细边框 + 克制动效。
- **统一桥接协议**：Python 只暴露一个 `js_api` 对象 `Bridge`，所有调用走同一个 request/response 信封，包含命令名、参数、错误码、超时与后端 → 前端事件推送。
- **配置集中管理**：初始化配置与运行时状态全部位于项目 `config/` 目录。
- **禁用右键菜单与文本选中**：输入框/文本域内保留正常编辑选择。

## 控件清单

| 分类 | 控件 |
|---|---|
| 基础 | Button、IconButton、ScrollArea、Overlay、Titlebar |
| 表单 | Input、Textarea、Select、Checkbox、RadioGroup、Switch、Slider |
| 结构/反馈 | Tabs、Dialog、confirmDialog、Toast、Table |

所有控件均返回统一的 handle：`{ el, destroy() }`，状态类控件额外提供 getter/setter。

## 技术栈

- **壳**：pywebview 6.2.x（Windows 使用 Edge WebView2）
- **前端**：Vite 7 + TypeScript 5.9 + 原生 DOM/CSS
- **后端**：Python 3.12+
- **包管理**：uv（Python）/ pnpm（前端）

> 依赖固定到 PyPI 的 `pywebview 6.2.1` wheel，避免本地开发机上的 wheel 路径进入公开仓库。

## 快速开始

前置要求：

- Windows 10/11（已在 Windows 10 上验证）
- Python 3.12+
- [uv](https://docs.astral.sh/uv/)
- Node.js 20+
- pnpm

```powershell
git clone https://github.com/YorickFin/slate-desktop.git
cd slate-desktop

# 后端依赖（项目级 .venv）
uv sync

# 前端依赖与生产构建
cd frontend
pnpm install
pnpm build
cd ..

# 启动桌面应用
uv run python backend/main.py
```

开发模式（两个终端）：

```powershell
# 终端 1
cd frontend
pnpm dev

# 终端 2
uv run python backend/main.py --dev
```

开发模式加载 `http://127.0.0.1:5173`，生产模式加载 `frontend/dist`。

## 项目结构

```text
slate-desktop/
├─ backend/
│  ├─ main.py                 # 应用入口
│  └─ app/
│     ├─ bridge.py            # 唯一 js_api 对象 + 协议分发
│     ├─ config.py            # 配置读写
│     ├─ window_state.py      # 窗口几何/最大化记忆
│     ├─ paths.py
│     └─ commands/            # system / demo / window / config
├─ config/
│  ├─ app.config.json         # 初始化配置（只读）
│  └─ runtime/                # ui-state.json / window-state.json（运行时生成）
├─ frontend/
│  ├─ src/
│  │  ├─ main.ts              # 前端入口
│  │  ├─ app/                 # 壳、路由、标题栏、页面
│  │  ├─ bridge/              # 协议类型 + 客户端
│  │  ├─ styles/              # 设计令牌与全局基线
│  │  └─ ui/
│  │     ├─ core/             # DOM / 事件 / 焦点 / 遮罩 / 滚动 / 主题
│  │     ├─ icons/            # 内联 SVG 图标
│  │     └─ controls/         # primitives / form / structure
│  └─ index.html
├─ .parallel-agent/           # ParallelAgent 运行记录（契约/转达/回执/交接）
├─ pyproject.toml
└─ LICENSE
```

## 桥接协议

前端只调用一个方法：

```ts
const raw = await window.pywebview.api.rpc(
  JSON.stringify({
    v: 1,
    id: crypto.randomUUID(),
    cmd: 'system.info',
    params: {},
    timeoutMs: 8000,
  }),
);
```

响应：

```json
{
  "v": 1,
  "id": "…",
  "ok": true,
  "result": {},
  "meta": { "durationMs": 2.1, "ts": 1792600000000 }
}
```

失败时 `ok=false`，并返回 `error: { code, message, details? }`。错误码为封闭集合：

`E_BAD_ENVELOPE`、`E_UNKNOWN_CMD`、`E_INVALID_PARAMS`、`E_TIMEOUT`、`E_UNAVAILABLE`、`E_CANCELLED`、`E_INTERNAL`、`E_DEMO`。

后端 → 前端事件通过：

```js
window.__SLATE_EVENTS__.receive("<event-json>");
```

事件信封：`{ v, type: "event", event, seq, ts, data }`。

## 配置

- `config/app.config.json`：窗口默认尺寸、最小尺寸、主题默认值、桥接超时、开发服务器地址等；应用只读。
- `config/runtime/ui-state.json`：主题与密度，由 `config.patchUi` 原子写入。
- `config/runtime/window-state.json`：窗口位置、尺寸、最大化状态，由 `window_state.py` 去抖写入。

所有写操作使用临时文件 + `os.replace` 原子替换；损坏文件会备份为 `.bak` 并使用默认值继续启动。

## ParallelAgent-v1.1.0 验证记录

本仓库保留 `.parallel-agent/` 目录，包含本次并行开发的完整流程证据：

- [契约块 v1.0.0](.parallel-agent/契约块.md)：协议、命令、控件签名、文件领地。
- [轨道启动手册](.parallel-agent/轨道启动手册.md)：三轨职责与验收方式。
- [快照](.parallel-agent/快照.md)：阶段状态与独立实检结果。
- [交接手册](.parallel-agent/交接手册/第1版-阶段3收尾.md)：阶段 2 → 3 收尾结论。
- `转达/第1轮/`、`回执/第1轮/`：每轨任务单与交付回执。

本轮实际使用 `T-A2 / T-B2 / T-C2` 三个代际轨号（编排器身份表存在历史残留记录），职责分别对应表单控件、结构控件、壳与桥。三轨全部交付后，契约保持 `v1.0.0`，阶段 2 收回并进入阶段 3。

## 验证

```powershell
cd frontend
pnpm typecheck
pnpm build

cd ..
uv run python -m compileall -q backend
uv run python backend/main.py
```

验证覆盖：

- 三个页面均可切换，无占位页残留。
- 表单控件鼠标/键盘可用，亮暗主题正常。
- Dialog 焦点陷阱 + ESC 关闭；Toast 堆叠与自动消失；Table 排序/选中/自绘滚动。
- 窗口移动/缩放/最大化状态在重启后恢复。
- 主题/密度写入 `config/runtime/ui-state.json` 并在重启后保持。
- 后端仅暴露 `rpc` 一个公开 js_api 方法。

## 已知限制

- 主要在 Windows 10 上验证；pywebview 支持的其他平台未逐一验证。
- 未提供 PyInstaller 打包、安装器或自动更新。
- 界面是控件展示台，未接入真实业务数据。
- 部分交互（Toast 真实 hover 暂停、Slider 连续拖拽轨迹）由合成事件验证，未做完整自动化轨迹录制。

## License

[MIT](LICENSE)
