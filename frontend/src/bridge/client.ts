/**
 * 前端桥接客户端 [#A.001]-[#A.006]
 * 只有这里可以触碰 window.pywebview；业务代码一律通过 bridge.call / bridge.on。
 */
import { Emitter, type Unsubscribe } from '../ui/core/emitter';
import {
  DEFAULT_TIMEOUT_MS,
  MAX_TIMEOUT_MS,
  MIN_TIMEOUT_MS,
  PROTOCOL_VERSION,
  ProtocolError,
  parseEvent,
  parseResponse,
  type BridgeEvent,
  type CommandName,
  type CommandParams,
  type CommandResult,
  type EventMap,
  type RpcErrorCode,
  type RpcRequest,
} from './protocol';

export type BridgeStatus = 'idle' | 'connecting' | 'ready' | 'unavailable';

export class BridgeError extends Error {
  readonly code: RpcErrorCode;
  readonly details?: unknown;

  constructor(code: RpcErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'BridgeError';
    this.code = code;
    this.details = details;
  }
}

interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timer: number;
}

interface PywebviewBridge {
  api?: {
    rpc?: (envelope: string) => Promise<string>;
  };
  platform?: string;
}

declare global {
  interface Window {
    pywebview?: PywebviewBridge;
    __SLATE_EVENTS__?: {
      receive: (raw: string) => void;
    };
  }
}

const newId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `r-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
};

class BridgeClient {
  private readonly emitter = new Emitter<EventMap>();
  private readonly pending = new Map<string, PendingCall>();
  private readonly statusListeners = new Set<(status: BridgeStatus) => void>();
  private currentStatus: BridgeStatus = 'idle';

  get status(): BridgeStatus {
    return this.currentStatus;
  }

  get platform(): string {
    return window.pywebview?.platform ?? 'browser';
  }

  private hasApi(): boolean {
    return typeof window.pywebview?.api?.rpc === 'function';
  }

  private setStatus(next: BridgeStatus): void {
    if (this.currentStatus === next) return;
    this.currentStatus = next;
    for (const listener of this.statusListeners) listener(next);
  }

  onStatus(listener: (status: BridgeStatus) => void): Unsubscribe {
    this.statusListeners.add(listener);
    listener(this.currentStatus);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /** 等待 pywebview 注入 js_api；浏览器预览会以 E_UNAVAILABLE 结束。 */
  async connect(timeoutMs = 4000): Promise<void> {
    if (this.hasApi()) {
      this.setStatus('ready');
      return;
    }

    this.setStatus('connecting');
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let timer = 0;

      const finish = (ok: boolean, reason?: BridgeError): void => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        window.removeEventListener('pywebviewready', onReady);
        if (ok) {
          this.setStatus('ready');
          resolve();
        } else {
          this.setStatus('unavailable');
          reject(reason);
        }
      };

      const onReady = (): void => {
        if (this.hasApi()) finish(true);
      };

      timer = window.setTimeout(
        () => finish(false, new BridgeError('E_UNAVAILABLE', 'pywebview 桥接未就绪')),
        timeoutMs,
      );
      window.addEventListener('pywebviewready', onReady);
      if (this.hasApi()) onReady();
    });
  }

  /** 注册事件接收器；必须在首条事件到达前调用。 */
  installEventSink(): void {
    window.__SLATE_EVENTS__ = {
      receive: (raw: string): void => this.handleEvent(raw),
    };
  }

  call<C extends CommandName>(
    cmd: C,
    params: CommandParams<C>,
    options: { timeoutMs?: number } = {},
  ): Promise<CommandResult<C>> {
    const api = window.pywebview?.api?.rpc;
    if (typeof api !== 'function') {
      return Promise.reject(new BridgeError('E_UNAVAILABLE', 'pywebview 桥接不可用'));
    }

    const timeoutMs = Math.min(
      Math.max(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, MIN_TIMEOUT_MS),
      MAX_TIMEOUT_MS,
    );
    const id = newId();
    const envelope: RpcRequest<CommandParams<C>> = {
      v: PROTOCOL_VERSION,
      id,
      cmd,
      params,
      timeoutMs,
    };

    return new Promise<CommandResult<C>>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id);
        reject(new BridgeError('E_TIMEOUT', `命令超时：${cmd}`, { cmd, timeoutMs }));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });

      api(JSON.stringify(envelope))
        .then((raw) => {
          try {
            const response = parseResponse(raw);
            if (response.id !== id) {
              throw new ProtocolError('E_BAD_ENVELOPE', `响应 id 不匹配：${response.id}`);
            }
            const pending = this.pending.get(id);
            if (!pending) return; // 已超时，丢弃迟到响应
            this.pending.delete(id);
            window.clearTimeout(pending.timer);

            if (response.ok) {
              pending.resolve(response.result);
            } else {
              const error = response.error ?? { code: 'E_INTERNAL' as const, message: '未知后端错误' };
              pending.reject(new BridgeError(error.code, error.message, error.details));
            }
          } catch (error) {
            this.rejectPending(id, error);
          }
        })
        .catch((error: unknown) => {
          this.rejectPending(id, new BridgeError('E_INTERNAL', String(error)));
        });
    });
  }

  on<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void): Unsubscribe {
    return this.emitter.on(event, listener);
  }

  private rejectPending(id: string, error: unknown): void {
    const pending = this.pending.get(id);
    if (!pending) return;
    this.pending.delete(id);
    window.clearTimeout(pending.timer);
    pending.reject(error);
  }

  private handleEvent(raw: string): void {
    let event: BridgeEvent;
    try {
      event = parseEvent(raw);
    } catch (error) {
      console.warn('[bridge] 非法事件被丢弃', error);
      return;
    }
    this.emitter.emit(
      event.event as keyof EventMap,
      event.data as EventMap[keyof EventMap],
    );
  }
}

export const bridge = new BridgeClient();
