/** T-C 领地：运行状态 / 桥接调试页。 */
import { bridge, BridgeError, type BridgeStatus } from '../../bridge/client';
import {
  PROTOCOL_VERSION,
  type Bounds,
  type SystemInfo,
  type UiState,
  type WindowSnapshot,
} from '../../bridge/protocol';
import { createButton } from '../../ui/controls/primitives/button';
import { el } from '../../ui/core/dom';
import { createScrollArea } from '../../ui/core/scroll-area';
import { applyTheme } from '../../ui/core/theme';

type Tone = 'neutral' | 'ok' | 'warning' | 'error';

const STYLE_ID = 'sys-page-style';

const STYLE_TEXT = `
.sys-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-bottom: var(--space-2);
}

.sys-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-4);
  align-items: start;
}

.sys-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: var(--border-w) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.sys-card--wide {
  grid-column: 1 / -1;
}

.sys-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-height: var(--control-h-sm);
}

.sys-card-title {
  color: var(--color-text);
  font-size: var(--fs-13);
  font-weight: var(--fw-semibold);
}

.sys-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  height: var(--control-h-sm);
  padding: 0 var(--space-3);
  border: var(--border-w) solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  color: var(--color-text-muted);
  font-size: var(--fs-11);
}

.sys-pill::before {
  content: '';
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: 50%;
  background: currentColor;
}

.sys-pill[data-tone='ok'] {
  border-color: var(--color-success);
  background: var(--color-success-soft);
  color: var(--color-success);
}

.sys-pill[data-tone='warning'] {
  border-color: var(--color-warning);
  background: var(--color-warning-soft);
  color: var(--color-warning);
}

.sys-pill[data-tone='error'] {
  border-color: var(--color-danger);
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.sys-rows {
  display: flex;
  flex-direction: column;
}

.sys-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.sys-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-1) 0;
  border-bottom: var(--border-w) solid var(--color-border);
}

.sys-row:last-child {
  border-bottom: 0;
}

.sys-key {
  flex: none;
  color: var(--color-text-muted);
  font-size: var(--fs-12);
}

.sys-val {
  overflow: hidden;
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: var(--fs-11);
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sys-val[data-mono='false'] {
  font-family: var(--font-sans);
  font-size: var(--fs-12);
}

.sys-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.sys-field-label {
  color: var(--color-text-muted);
  font-size: var(--fs-11);
}

.sys-segments {
  display: inline-flex;
  gap: var(--space-1);
  width: fit-content;
  padding: var(--space-1);
  border: var(--border-w) solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
}

.sys-segment {
  height: var(--control-h-sm);
  padding: 0 var(--space-3);
  border-radius: var(--radius-xs);
  color: var(--color-text-muted);
  font-size: var(--fs-12);
  transition:
    background-color var(--motion-fast) var(--ease-out),
    color var(--motion-fast) var(--ease-out);
}

.sys-segment:hover:not(:disabled) {
  color: var(--color-text);
  background: var(--color-surface-3);
}

.sys-segment[data-active='true'] {
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  color: var(--color-text);
  font-weight: var(--fw-medium);
}

.sys-segment:disabled {
  opacity: 0.45;
}

.sys-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.sys-result {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--control-h-md);
  padding: var(--space-2) var(--space-3);
  border: var(--border-w) dashed var(--color-border-strong);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  font-size: var(--fs-12);
}

.sys-result[data-tone='ok'] {
  border-color: var(--color-success);
  background: var(--color-success-soft);
  color: var(--color-success);
}

.sys-result[data-tone='error'] {
  border-color: var(--color-danger);
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.sys-code {
  padding: 1px var(--space-1);
  border-radius: var(--radius-xs);
  background: var(--color-surface-2);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: var(--fs-11);
}

.sys-hint {
  color: var(--color-text-subtle);
  font-size: var(--fs-11);
  line-height: var(--lh-base);
}

.sys-hint[data-tone='ok'] {
  color: var(--color-success);
}

.sys-hint[data-tone='warning'] {
  color: var(--color-warning);
}

.sys-hint[data-tone='error'] {
  color: var(--color-danger);
}
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = el('style', { id: STYLE_ID });
  style.textContent = STYLE_TEXT;
  document.head.append(style);
}

interface RowHandle {
  el: HTMLElement;
  value: HTMLElement;
}

interface CardHandle {
  el: HTMLElement;
  body: HTMLElement;
  head: HTMLElement;
}

function makeRow(label: string, initial: string, mono = true): RowHandle {
  const value = el('span', {
    class: 'sys-val',
    text: initial,
    dataset: { mono: mono ? 'true' : 'false' },
  });
  const row = el('div', { class: 'sys-row' }, [
    el('span', { class: 'sys-key', text: label }),
    value,
  ]);
  return { el: row, value };
}

function makeCard(title: string, wide = false): CardHandle {
  const head = el('div', { class: 'sys-card-head' }, [
    el('span', { class: 'sys-card-title', text: title }),
  ]);
  const body = el('div', { class: 'sys-rows' });
  const card = el('section', { class: `sys-card${wide ? ' sys-card--wide' : ''}` }, [head, body]);
  return { el: card, body, head };
}

interface SegmentItem<T extends string> {
  value: T;
  label: string;
}

interface SegmentsHandle<T extends string> {
  el: HTMLElement;
  setValue(value: T): void;
  setDisabled(disabled: boolean): void;
}

function createSegments<T extends string>(
  items: SegmentItem<T>[],
  onSelect: (value: T) => void,
): SegmentsHandle<T> {
  const buttons = new Map<T, HTMLButtonElement>();
  const root = el('div', { class: 'sys-segments', role: 'group' });

  for (const item of items) {
    const button = el('button', {
      class: 'sys-segment',
      type: 'button',
      text: item.label,
      'aria-pressed': 'false',
      dataset: { active: 'false' },
    });
    button.addEventListener('click', () => onSelect(item.value));
    buttons.set(item.value, button);
    root.append(button);
  }

  return {
    el: root,
    setValue(value: T): void {
      for (const [key, button] of buttons) {
        const active = key === value;
        button.dataset.active = active ? 'true' : 'false';
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      }
    },
    setDisabled(disabled: boolean): void {
      for (const button of buttons.values()) button.disabled = disabled;
    },
  };
}

function describeError(error: unknown): { code: string; message: string } {
  if (error instanceof BridgeError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof Error) {
    return { code: 'E_INTERNAL', message: error.message };
  }
  return { code: 'E_INTERNAL', message: String(error) };
}

function formatBounds(bounds: Bounds): string {
  return `${bounds.width} × ${bounds.height} @ ${bounds.x}, ${bounds.y}`;
}

function formatUptime(ms: number): string {
  if (!ms) return '—';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatClock(ts: number): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false });
}

function setHint(node: HTMLElement, text: string, tone: Tone): void {
  node.textContent = text;
  node.dataset.tone = tone;
}

let activeCleanup: (() => void) | null = null;

export function renderSystemPage(): HTMLElement {
  activeCleanup?.();
  ensureStyle();

  let disposed = false;
  const unsubs: (() => void)[] = [];

  const scroll = createScrollArea({ axis: 'y', label: '运行状态' });
  scroll.el.style.height = '100%';
  scroll.el.style.flex = '1';
  scroll.el.style.minHeight = '0';

  const page = el('div', { class: 'sys-page' });
  const grid = el('div', { class: 'sys-grid' });
  page.append(grid);
  scroll.content.append(page);

  // ---------------------------------------------------------------- 桥接状态
  const bridgeCard = makeCard('桥接状态');
  const statusPill = el('span', { class: 'sys-pill', text: '未连接', dataset: { tone: 'neutral' } });
  bridgeCard.head.append(statusPill);

  const statusRow = makeRow('连接状态', '未连接', false);
  const serverRow = makeRow('服务端', '—');
  const protocolRow = makeRow('协议版本', `v${PROTOCOL_VERSION}`);
  const clientRow = makeRow('客户端平台', bridge.platform, false);
  bridgeCard.body.append(statusRow.el, serverRow.el, protocolRow.el, clientRow.el);

  // ---------------------------------------------------------------- 系统信息
  const infoCard = makeCard('系统信息');
  const refreshInfo = createButton({
    label: '刷新',
    size: 'sm',
    variant: 'ghost',
    icon: 'refresh',
    onClick: () => {
      void loadInfo();
    },
  });
  infoCard.head.append(refreshInfo.el);

  const infoRows = {
    platform: makeRow('平台', '—'),
    arch: makeRow('架构', '—'),
    python: makeRow('Python', '—'),
    pywebview: makeRow('pywebview', '—'),
    pid: makeRow('进程 PID', '—'),
    startedAt: makeRow('启动时间', '—'),
    configDir: makeRow('配置目录', '—'),
    dist: makeRow('构建产物', '—'),
  };
  infoCard.body.append(
    infoRows.platform.el,
    infoRows.arch.el,
    infoRows.python.el,
    infoRows.pywebview.el,
    infoRows.pid.el,
    infoRows.startedAt.el,
    infoRows.configDir.el,
    infoRows.dist.el,
  );
  const infoHint = el('span', { class: 'sys-hint', text: '等待桥接就绪' });
  infoCard.body.append(infoHint);

  // ---------------------------------------------------------------- 事件流
  const eventCard = makeCard('事件流');
  const tickCountRow = makeRow('tick 事件数', '0');
  const lastSeqRow = makeRow('最后 seq', '—');
  const uptimeRow = makeRow('运行时长', '—');
  const lastEventRow = makeRow('最近事件', '—');
  eventCard.body.append(tickCountRow.el, lastSeqRow.el, uptimeRow.el, lastEventRow.el, el('span', {
    class: 'sys-hint',
    text: '事件不重放，seq 跳号属正常现象。',
  }));

  // ---------------------------------------------------------------- 窗口状态
  const windowCard = makeCard('窗口状态');
  const refreshWindow = createButton({
    label: '刷新',
    size: 'sm',
    variant: 'ghost',
    icon: 'refresh',
    onClick: () => {
      void loadSnapshot();
    },
  });
  windowCard.head.append(refreshWindow.el);

  const windowStateRow = makeRow('状态', '—', false);
  const windowPosRow = makeRow('位置', '—');
  const windowSizeRow = makeRow('尺寸', '—');
  windowCard.body.append(windowStateRow.el, windowPosRow.el, windowSizeRow.el);
  const windowHint = el('span', { class: 'sys-hint', text: '窗口几何由后端 window.state 推送' });
  windowCard.body.append(windowHint);

  // ---------------------------------------------------------------- 外观设置
  const appearanceCard = makeCard('外观设置');
  const themeSegments = createSegments<UiState['theme']>(
    [
      { value: 'light', label: '亮色' },
      { value: 'dark', label: '暗色' },
      { value: 'system', label: '跟随系统' },
    ],
    (value) => {
      void patchUi({ theme: value });
    },
  );
  const densitySegments = createSegments<UiState['density']>(
    [
      { value: 'comfortable', label: '舒适' },
      { value: 'compact', label: '紧凑' },
    ],
    (value) => {
      void patchUi({ density: value });
    },
  );

  appearanceCard.body.append(
    el('div', { class: 'sys-field' }, [
      el('span', { class: 'sys-field-label', text: '主题' }),
      themeSegments.el,
    ]),
    el('div', { class: 'sys-field' }, [
      el('span', { class: 'sys-field-label', text: '密度' }),
      densitySegments.el,
    ]),
  );
  const appearanceHint = el('span', { class: 'sys-hint', text: '写入 config/runtime/ui-state.json' });
  appearanceCard.body.append(appearanceHint);

  // ---------------------------------------------------------------- 协议自测
  const testCard = makeCard('协议自测', true);
  testCard.body.classList.replace('sys-rows', 'sys-stack');

  const result = el('div', { class: 'sys-result', dataset: { tone: 'neutral' } }, [
    el('span', { text: '尚未执行。' }),
  ]);

  const actions = el('div', { class: 'sys-actions' });
  const testButtons: HTMLButtonElement[] = [];
  const addTestButton = (label: string, run: () => void): void => {
    const button = createButton({ label, size: 'sm', variant: 'secondary', onClick: run });
    testButtons.push(button.el);
    actions.append(button.el);
  };

  addTestButton('正常调用', () => void runTest('echo'));
  addTestButton('业务错误', () => void runTest('fail'));
  addTestButton('前端超时', () => void runTest('timeout'));
  addTestButton('未知命令', () => void runTest('unknown'));

  const copyButton = createButton({
    label: '复制诊断信息',
    size: 'sm',
    variant: 'ghost',
    icon: 'copy',
    onClick: () => {
      void copyDiagnostics();
    },
  });
  actions.append(copyButton.el);

  const testHint = el('span', {
    class: 'sys-hint',
    text: '预期：业务错误 → E_DEMO；前端超时 → E_TIMEOUT（3s 内拒绝）；未知命令 → E_UNKNOWN_CMD。',
  });
  const copyHint = el('span', { class: 'sys-hint', text: '' });

  testCard.body.append(actions, result, testHint, copyHint);

  grid.append(
    bridgeCard.el,
    infoCard.el,
    eventCard.el,
    windowCard.el,
    appearanceCard.el,
    testCard.el,
  );

  // ---------------------------------------------------------------- 状态与渲染
  let tickCount = 0;
  let lastSeq = 0;
  let lastUptimeMs = 0;
  let lastEventAt = 0;
  let uiState: UiState = { theme: 'system', density: 'comfortable' };
  let systemInfo: SystemInfo | null = null;
  let snapshot: WindowSnapshot | null = null;
  let serverName: string | null = null;

  const renderTick = (): void => {
    tickCountRow.value.textContent = String(tickCount);
    lastSeqRow.value.textContent = lastSeq ? `#${lastSeq}` : '—';
    uptimeRow.value.textContent = formatUptime(lastUptimeMs);
    lastEventRow.value.textContent = formatClock(lastEventAt);
  };

  const renderSnapshot = (): void => {
    if (!snapshot) {
      windowStateRow.value.textContent = '—';
      windowPosRow.value.textContent = '—';
      windowSizeRow.value.textContent = '—';
      return;
    }
    windowStateRow.value.textContent = snapshot.state === 'maximized' ? '最大化' : '常规';
    windowPosRow.value.textContent = `${snapshot.bounds.x}, ${snapshot.bounds.y}`;
    windowSizeRow.value.textContent = `${snapshot.bounds.width} × ${snapshot.bounds.height}`;
    setHint(windowHint, '已与后端 window.state 同步', 'ok');
  };

  const renderInfo = (): void => {
    if (!systemInfo) {
      infoHint.textContent = '系统信息不可用';
      infoHint.dataset.tone = 'warning';
      return;
    }
    infoRows.platform.value.textContent = systemInfo.platform;
    infoRows.arch.value.textContent = systemInfo.arch;
    infoRows.python.value.textContent = systemInfo.python;
    infoRows.pywebview.value.textContent = systemInfo.pywebview;
    infoRows.pid.value.textContent = String(systemInfo.pid);
    infoRows.startedAt.value.textContent = systemInfo.startedAt;
    infoRows.configDir.value.textContent = systemInfo.configDir;
    infoRows.dist.value.textContent = systemInfo.distReady ? '已就绪' : '缺失';
    setHint(infoHint, '来源：system.info', 'ok');
  };

  const applyUi = (next: UiState): void => {
    uiState = next;
    applyTheme(next.theme);
    document.documentElement.dataset.density = next.density;
    themeSegments.setValue(next.theme);
    densitySegments.setValue(next.density);
  };

  const setStatusControlsEnabled = (enabled: boolean): void => {
    refreshInfo.setDisabled(!enabled);
    refreshWindow.setDisabled(!enabled);
    themeSegments.setDisabled(!enabled);
    densitySegments.setDisabled(!enabled);
    copyButton.setDisabled(!enabled);
  };

  const applyStatus = (status: BridgeStatus): void => {
    const map: Record<BridgeStatus, { label: string; tone: Tone }> = {
      idle: { label: '未连接', tone: 'neutral' },
      connecting: { label: '连接中', tone: 'warning' },
      ready: { label: '就绪', tone: 'ok' },
      unavailable: { label: '不可用', tone: 'error' },
    };
    const meta = map[status];
    statusPill.textContent = meta.label;
    statusPill.dataset.tone = meta.tone;
    statusRow.value.textContent = meta.label;
    setStatusControlsEnabled(status === 'ready');

    if (status === 'ready') {
      void loadHello();
      void loadInfo();
      void loadSnapshot();
      void loadConfig();
    } else {
      setHint(infoHint, '桥接未就绪，系统信息不可用', 'warning');
      setHint(windowHint, '桥接未就绪，窗口几何不可用', 'warning');
    }
  };

  const loadHello = async (): Promise<void> => {
    try {
      const hello = await bridge.call('bridge.hello', {
        client: 'slate-ui-system',
        protocol: PROTOCOL_VERSION,
      });
      if (disposed) return;
      serverName = hello.server;
      serverRow.value.textContent = hello.server;
    } catch (error) {
      if (disposed) return;
      const err = describeError(error);
      serverRow.value.textContent = `不可用（${err.code}）`;
    }
  };

  const loadInfo = async (): Promise<void> => {
    if (bridge.status !== 'ready') return;
    refreshInfo.setLoading(true);
    try {
      systemInfo = await bridge.call('system.info', {});
      if (!disposed) renderInfo();
    } catch (error) {
      if (disposed) return;
      const err = describeError(error);
      setHint(infoHint, `读取失败：${err.code} · ${err.message}`, 'error');
    } finally {
      refreshInfo.setLoading(false);
    }
  };

  const loadSnapshot = async (): Promise<void> => {
    if (bridge.status !== 'ready') return;
    refreshWindow.setLoading(true);
    try {
      snapshot = await bridge.call('window.state', {});
      if (!disposed) renderSnapshot();
    } catch (error) {
      if (disposed) return;
      const err = describeError(error);
      setHint(windowHint, `读取失败：${err.code} · ${err.message}`, 'error');
    } finally {
      refreshWindow.setLoading(false);
    }
  };

  const loadConfig = async (): Promise<void> => {
    if (bridge.status !== 'ready') return;
    try {
      const config = await bridge.call('config.get', {});
      if (disposed) return;
      snapshot = config.window;
      renderSnapshot();
      applyUi(config.ui);
      setHint(appearanceHint, '已读取 config/runtime/ui-state.json', 'neutral');
    } catch (error) {
      if (disposed) return;
      const err = describeError(error);
      setHint(appearanceHint, `读取配置失败：${err.code} · ${err.message}`, 'error');
    }
  };

  const patchUi = async (partial: Partial<UiState>): Promise<void> => {
    if (bridge.status !== 'ready') {
      setHint(appearanceHint, '桥接未就绪，无法保存外观设置', 'warning');
      return;
    }
    try {
      const next = await bridge.call('config.patchUi', partial);
      if (disposed) return;
      applyUi(next);
      setHint(appearanceHint, '已写入 config/runtime/ui-state.json', 'ok');
    } catch (error) {
      if (disposed) return;
      const err = describeError(error);
      setHint(appearanceHint, `保存失败：${err.code} · ${err.message}`, 'error');
    }
  };

  const showResult = (tone: Tone, code: string, message: string, durationMs?: number): void => {
    result.dataset.tone = tone === 'ok' ? 'ok' : tone === 'error' ? 'error' : 'neutral';
    result.replaceChildren(
      el('span', { class: 'sys-code', text: code }),
      el('span', { text: message }),
      durationMs === undefined
        ? el('span', { class: 'sys-hint', text: '' })
        : el('span', { class: 'sys-hint', text: `${Math.round(durationMs)}ms` }),
    );
  };

  type TestKind = 'echo' | 'fail' | 'timeout' | 'unknown';

  const callRaw = (cmd: string, params: Record<string, unknown>): Promise<unknown> =>
    (
      bridge.call as unknown as (
        name: string,
        values: Record<string, unknown>,
      ) => Promise<unknown>
    )(cmd, params);

  const runTest = async (kind: TestKind): Promise<void> => {
    if (bridge.status !== 'ready') {
      showResult('error', 'E_UNAVAILABLE', '桥接未就绪，无法执行自测');
      return;
    }

    for (const button of testButtons) button.disabled = true;
    showResult('neutral', 'RUNNING', '正在执行…');
    const started = performance.now();

    try {
      if (kind === 'echo') {
        const echoed = await bridge.call('system.echo', { text: 'ping' });
        showResult('ok', 'OK', `回声：${echoed.text}（delay ${echoed.delayMs}ms）`, performance.now() - started);
      } else if (kind === 'fail') {
        await bridge.call('demo.fail', { message: '协议自测：预期业务错误' });
        showResult('error', 'E_UNEXPECTED', '未收到预期错误', performance.now() - started);
      } else if (kind === 'timeout') {
        await bridge.call('demo.slow', { delayMs: 9000 }, { timeoutMs: 3000 });
        showResult('error', 'E_UNEXPECTED', '未触发前端超时', performance.now() - started);
      } else {
        await callRaw('demo.unknown', {});
        showResult('error', 'E_UNEXPECTED', '未知命令未被拒绝', performance.now() - started);
      }
    } catch (error) {
      const err = describeError(error);
      const expected =
        (kind === 'fail' && err.code === 'E_DEMO') ||
        (kind === 'timeout' && err.code === 'E_TIMEOUT') ||
        (kind === 'unknown' && err.code === 'E_UNKNOWN_CMD');
      showResult(expected ? 'ok' : 'error', err.code, err.message, performance.now() - started);
    } finally {
      for (const button of testButtons) button.disabled = false;
    }
  };

  const diagnosticsText = (): string => {
    const lines = [
      'Slate 诊断信息',
      `时间：${new Date().toISOString()}`,
      `桥接状态：${bridge.status}`,
      `协议版本：v${PROTOCOL_VERSION}`,
      `服务端：${serverName ?? '—'}`,
    ];
    if (systemInfo) {
      lines.push(
        `平台：${systemInfo.platform}（${systemInfo.arch}）`,
        `Python：${systemInfo.python} · pywebview：${systemInfo.pywebview}`,
        `进程 PID：${systemInfo.pid}`,
        `启动时间：${systemInfo.startedAt}`,
        `配置目录：${systemInfo.configDir}`,
        `构建产物：${systemInfo.distDir}（${systemInfo.distReady ? '已就绪' : '缺失'}）`,
      );
    } else {
      lines.push('系统信息：未获取');
    }
    lines.push(
      `窗口：${snapshot ? `${snapshot.state} · ${formatBounds(snapshot.bounds)}` : '未获取'}`,
      `外观：theme=${uiState.theme} · density=${uiState.density}`,
      `事件：tick=${tickCount} · lastSeq=${lastSeq} · uptime=${formatUptime(lastUptimeMs)}`,
    );
    return lines.join('\n');
  };

  const copyDiagnostics = async (): Promise<void> => {
    const text = diagnosticsText();
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('clipboard unavailable');
      }
      await navigator.clipboard.writeText(text);
      setHint(copyHint, '诊断信息已复制到剪贴板', 'ok');
    } catch {
      setHint(copyHint, '复制失败：当前环境不允许访问剪贴板，请从上方分区手动记录。', 'warning');
    }
  };

  // ---------------------------------------------------------------- 订阅
  unsubs.push(
    bridge.onStatus(applyStatus),
    bridge.on('bridge.ready', (payload) => {
      serverName = payload.server;
      if (!disposed) serverRow.value.textContent = payload.server;
    }),
    bridge.on('system.tick', (payload) => {
      if (disposed) return;
      tickCount += 1;
      lastSeq = payload.seq;
      lastUptimeMs = payload.uptimeMs;
      lastEventAt = Date.now();
      renderTick();
    }),
    bridge.on('window.state', (payload) => {
      if (disposed) return;
      snapshot = payload;
      renderSnapshot();
    }),
    bridge.on('config.changed', (payload) => {
      if (disposed) return;
      applyUi(payload.ui);
      setHint(appearanceHint, '已由后端推送 config.changed', 'ok');
    }),
  );

  activeCleanup = () => {
    disposed = true;
    for (const off of unsubs) off();
    activeCleanup = null;
  };

  renderTick();
  renderSnapshot();
  themeSegments.setValue(uiState.theme);
  densitySegments.setValue(uiState.density);
  setStatusControlsEnabled(bridge.status === 'ready');

  return scroll.el;
}
