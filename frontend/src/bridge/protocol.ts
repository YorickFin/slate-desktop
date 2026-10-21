/**
 * 统一桥接协议 · 契约块 [#A.001]-[#A.007]
 *
 * [#A.001] Python 只通过一个 js_api 对象 Bridge 暴露一个公开方法 rpc(envelopeJson)。
 *          前端不得直接调用任何其他后端方法。
 * [#A.002] 请求信封：{ v, id, cmd, params, timeoutMs }；响应信封：
 *          { v, id, ok, result?, error?, meta:{ durationMs, ts } }。
 * [#A.003] 后端永远返回合法 JSON 字符串，业务/参数/内部错误一律编码进 error，
 *          不向 js_api 抛异常。
 * [#A.004] 超时由前端强制执行（计时器 + 迟到响应丢弃）；timeoutMs 仅作后端参考，
 *          后端不做超时中断。
 * [#A.005] 事件推送：后端 evaluate_js 调用
 *          window.__SLATE_EVENTS__.receive("<json 字符串>")；事件信封
 *          { v, type:'event', event, seq, ts, data }。
 * [#A.006] id 由前端生成（crypto.randomUUID 优先），同一请求 id 全局唯一。
 * [#A.007] 字段命名统一 camelCase；命令名使用 dot.kebab 命名空间。
 */

export const PROTOCOL_VERSION = 1;
export const DEFAULT_TIMEOUT_MS = 8000;
export const MIN_TIMEOUT_MS = 500;
export const MAX_TIMEOUT_MS = 60_000;

export type RpcId = string;

export interface RpcRequest<P = unknown> {
  v: typeof PROTOCOL_VERSION;
  id: RpcId;
  cmd: string;
  params: P;
  timeoutMs: number;
}

export type RpcErrorCode =
  | 'E_BAD_ENVELOPE'
  | 'E_UNKNOWN_CMD'
  | 'E_INVALID_PARAMS'
  | 'E_TIMEOUT'
  | 'E_UNAVAILABLE'
  | 'E_CANCELLED'
  | 'E_INTERNAL'
  | 'E_DEMO';

export interface RpcError {
  code: RpcErrorCode;
  message: string;
  details?: unknown;
}

export interface RpcResponse<R = unknown> {
  v: typeof PROTOCOL_VERSION;
  id: RpcId;
  ok: boolean;
  result?: R;
  error?: RpcError;
  meta: {
    durationMs: number;
    ts: number;
  };
}

export interface BridgeEvent<D = unknown> {
  v: typeof PROTOCOL_VERSION;
  type: 'event';
  event: string;
  seq: number;
  ts: number;
  data: D;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type WindowVisualState = 'normal' | 'maximized';
export type ThemeMode = 'light' | 'dark' | 'system';
export type DensityMode = 'comfortable' | 'compact';

export interface UiState {
  theme: ThemeMode;
  density: DensityMode;
}

export interface SystemInfo {
  platform: string;
  python: string;
  pywebview: string;
  arch: string;
  pid: number;
  configDir: string;
  distDir: string;
  distReady: boolean;
  startedAt: string;
}

export interface WindowSnapshot {
  state: WindowVisualState;
  bounds: Bounds;
}

/**
 * 命令登记表 · 接口签名冻结 [#A.008]
 * 参数/返回值只允许在此扩展；扩展需提升契约版本并通知所有轨。
 */
export interface CommandMap {
  'bridge.hello': {
    params: { client: string; protocol: number };
    result: { server: string; protocol: number; pid: number; startedAt: string };
  };
  'system.info': {
    params: Record<string, never>;
    result: SystemInfo;
  };
  'system.echo': {
    params: { text: string; delayMs?: number };
    result: { text: string; delayMs: number };
  };
  'demo.fail': {
    params: { message?: string };
    result: null;
  };
  'demo.slow': {
    params: { delayMs: number };
    result: { delayMs: number };
  };
  'window.minimize': {
    params: Record<string, never>;
    result: { state: WindowVisualState };
  };
  'window.toggleMaximize': {
    params: Record<string, never>;
    result: WindowSnapshot;
  };
  'window.close': {
    params: Record<string, never>;
    result: { closed: boolean };
  };
  'window.state': {
    params: Record<string, never>;
    result: WindowSnapshot;
  };
  'config.get': {
    params: Record<string, never>;
    result: { ui: UiState; window: WindowSnapshot };
  };
  'config.patchUi': {
    params: Partial<UiState>;
    result: UiState;
  };
}

export type CommandName = keyof CommandMap;
export type CommandParams<C extends CommandName> = CommandMap[C]['params'];
export type CommandResult<C extends CommandName> = CommandMap[C]['result'];

/** 后端 → 前端事件登记表 [#A.005] */
export interface EventMap {
  'bridge.ready': { protocol: number; server: string };
  'system.tick': { seq: number; uptimeMs: number };
  'window.state': WindowSnapshot;
  'config.changed': { ui: UiState };
}

export class ProtocolError extends Error {
  readonly code: RpcErrorCode;

  constructor(code: RpcErrorCode, message: string) {
    super(message);
    this.name = 'ProtocolError';
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(raw: unknown): unknown {
  if (typeof raw !== 'string') {
    throw new ProtocolError('E_BAD_ENVELOPE', '响应必须是 JSON 字符串');
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new ProtocolError('E_BAD_ENVELOPE', '响应不是合法 JSON');
  }
}

export function parseResponse(raw: unknown): RpcResponse {
  const data = parseJson(raw);
  if (!isRecord(data)) throw new ProtocolError('E_BAD_ENVELOPE', '响应必须是对象');
  if (data.v !== PROTOCOL_VERSION) throw new ProtocolError('E_BAD_ENVELOPE', '协议版本不匹配');
  if (typeof data.id !== 'string' || !data.id) throw new ProtocolError('E_BAD_ENVELOPE', '响应缺少 id');
  if (typeof data.ok !== 'boolean') throw new ProtocolError('E_BAD_ENVELOPE', '响应缺少 ok');
  if (!isRecord(data.meta)) throw new ProtocolError('E_BAD_ENVELOPE', '响应缺少 meta');
  return data as unknown as RpcResponse;
}

export function parseEvent(raw: unknown): BridgeEvent {
  const data = parseJson(raw);
  if (!isRecord(data)) throw new ProtocolError('E_BAD_ENVELOPE', '事件必须是对象');
  if (data.v !== PROTOCOL_VERSION) throw new ProtocolError('E_BAD_ENVELOPE', '事件协议版本不匹配');
  if (data.type !== 'event') throw new ProtocolError('E_BAD_ENVELOPE', '事件 type 非法');
  if (typeof data.event !== 'string' || !data.event) {
    throw new ProtocolError('E_BAD_ENVELOPE', '事件缺少 event');
  }
  if (typeof data.seq !== 'number' || typeof data.ts !== 'number') {
    throw new ProtocolError('E_BAD_ENVELOPE', '事件缺少 seq/ts');
  }
  return data as unknown as BridgeEvent;
}
