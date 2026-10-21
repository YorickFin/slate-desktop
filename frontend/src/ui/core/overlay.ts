/** 统一遮罩层：弹窗与浮层共用，保证层级与 ESC 行为一致 [#A.013] */
import './overlay.css';
import { clamp, el } from './dom';
import { createFocusTrap, type FocusTrap } from './focus';

export type OverlayMode = 'modal' | 'anchored';

export interface OverlayOptions {
  content: HTMLElement;
  mode?: OverlayMode;
  anchor?: HTMLElement;
  width?: number;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  label?: string;
  onClose?: () => void;
}

export interface OverlayHandle {
  readonly el: HTMLElement;
  close(): void;
}

interface Entry {
  close(): void;
  closeOnEscape: boolean;
}

const stack: Entry[] = [];
let root: HTMLElement | null = null;

function ensureRoot(): HTMLElement {
  if (root && document.contains(root)) return root;
  root = el('div', { class: 'ui-overlay-root', id: 'ui-overlay-root', 'aria-live': 'polite' });
  document.body.append(root);
  return root;
}

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || stack.length === 0) return;
  const top = stack[stack.length - 1];
  if (!top.closeOnEscape) return;
  event.preventDefault();
  event.stopPropagation();
  top.close();
});

export function openOverlay(options: OverlayOptions): OverlayHandle {
  const mode: OverlayMode = options.mode ?? 'modal';
  const layer = el('div', { class: 'ui-overlay-layer', dataset: { mode } });
  const panel = el('div', {
    class: 'ui-overlay-panel',
    role: mode === 'modal' ? 'dialog' : 'presentation',
    'aria-modal': mode === 'modal' ? 'true' : 'false',
    'aria-label': options.label ?? '',
  });

  let trap: FocusTrap | null = null;
  let closed = false;
  let restoreFocus: HTMLElement | null = null;

  const close = (): void => {
    if (closed) return;
    closed = true;
    window.removeEventListener('pointerdown', onOutside, true);
    window.removeEventListener('resize', reposition);
    trap?.deactivate();
    layer.remove();
    const index = stack.findIndex((entry) => entry.close === close);
    if (index >= 0) stack.splice(index, 1);
    if (mode === 'anchored' && restoreFocus && document.contains(restoreFocus)) {
      restoreFocus.focus();
    }
    options.onClose?.();
  };

  const onOutside = (event: PointerEvent): void => {
    const target = event.target as Node | null;
    if (!target) return;
    if (panel.contains(target)) return;
    if (options.anchor?.contains(target)) return;
    if (mode === 'modal' && !options.closeOnBackdrop) return;
    close();
  };

  const reposition = (): void => {
    if (mode !== 'anchored' || !options.anchor || !document.contains(options.anchor)) return;
    const rect = options.anchor.getBoundingClientRect();
    const width = options.width ?? Math.max(rect.width, 160);
    panel.style.width = `${width}px`;
    panel.style.left = `${clamp(rect.left, 8, window.innerWidth - width - 8)}px`;

    const height = panel.offsetHeight || 240;
    const below = rect.bottom + 6;
    const above = rect.top - height - 6;
    panel.style.top = `${below + height > window.innerHeight - 8 && above > 8 ? above : below}px`;
  };

  if (mode === 'modal') {
    const backdrop = el('div', { class: 'ui-overlay-backdrop' });
    backdrop.addEventListener('pointerdown', () => {
      if (options.closeOnBackdrop ?? true) close();
    });
    layer.append(backdrop);
    if (options.width) panel.style.width = `${options.width}px`;
  } else {
    panel.dataset.anchored = 'true';
  }

  panel.append(options.content);
  layer.append(panel);
  ensureRoot().append(layer);

  if (mode === 'modal') {
    restoreFocus = document.activeElement as HTMLElement | null;
    trap = createFocusTrap(panel);
    trap.activate();
  } else {
    restoreFocus = options.anchor ?? null;
    window.addEventListener('resize', reposition);
    reposition();
  }

  window.addEventListener('pointerdown', onOutside, true);

  const entry: Entry = { close, closeOnEscape: options.closeOnEscape ?? true };
  stack.push(entry);

  return { el: panel, close };
}
