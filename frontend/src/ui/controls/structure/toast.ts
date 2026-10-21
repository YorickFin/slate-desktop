/** T-B 领地：自绘 Toast —— 右下角堆叠、自动消失、悬停暂停 [#A.010][#A.020] */
import { el } from '../../core/dom';
import { icon, type IconName } from '../../icons';
import { createIconButton } from '../primitives/button';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ToastOptions {
  title: string;
  message?: string;
  tone?: ToastTone;
  /** 缺省 3200ms；0 表示常驻 */
  durationMs?: number;
}

export interface ToastHandle {
  close(): void;
}

const MAX_VISIBLE = 4;
const DEFAULT_DURATION = 3200;
/** 与 --motion-base 对齐，仅用于移除已淡出的节点 */
const EXIT_MS = 180;

interface Entry {
  el: HTMLElement;
  close(): void;
}

let host: HTMLElement | null = null;
let entries: Entry[] = [];

function ensureHost(): HTMLElement {
  if (host && document.contains(host)) return host;
  host = el('div', {
    class: 'ui-toast-host',
    role: 'region',
    'aria-label': '通知',
    'aria-live': 'polite',
    'aria-relevant': 'additions',
  });
  entries = [];
  document.body.append(host);
  return host;
}

const TONE_ICON: Record<ToastTone, IconName> = {
  info: 'info',
  success: 'success',
  warning: 'alert',
  danger: 'error',
};

export function toast(options: ToastOptions): ToastHandle {
  const root = ensureHost();
  const tone = options.tone ?? 'info';
  const duration = options.durationMs ?? DEFAULT_DURATION;

  const node = el(
    'div',
    {
      class: 'ui-toast',
      dataset: { tone },
      role: tone === 'danger' ? 'alert' : 'status',
    },
    [
      el('span', { class: 'ui-toast-icon' }, [icon(TONE_ICON[tone], 16)]),
      el('div', { class: 'ui-toast-body' }, [
        el('div', { class: 'ui-toast-title', text: options.title }),
        options.message ? el('p', { class: 'ui-toast-message', text: options.message }) : null,
      ]),
    ],
  );

  let timer = 0;
  let remaining = duration;
  let startedAt = 0;
  let closed = false;

  const start = (): void => {
    if (closed || remaining <= 0) return;
    startedAt = performance.now();
    timer = window.setTimeout(() => close(), remaining);
  };

  const pause = (): void => {
    if (!timer) return;
    window.clearTimeout(timer);
    timer = 0;
    remaining = Math.max(0, remaining - (performance.now() - startedAt));
  };

  const close = (): void => {
    if (closed) return;
    closed = true;
    window.clearTimeout(timer);
    timer = 0;
    entries = entries.filter((entry) => entry.el !== node);
    node.dataset.state = 'closing';
    window.setTimeout(() => node.remove(), EXIT_MS);
  };

  const closeButton = createIconButton({
    icon: 'close',
    ariaLabel: '关闭通知',
    size: 'sm',
    onClick: () => close(),
  });
  node.append(closeButton.el);
  node.addEventListener('pointerenter', pause);
  node.addEventListener('pointerleave', start);

  root.append(node);
  entries.push({ el: node, close });
  while (entries.length > MAX_VISIBLE) {
    entries.shift()?.close();
  }

  start();

  return { close };
}
