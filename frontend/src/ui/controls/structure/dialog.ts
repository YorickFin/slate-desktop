/** T-B 领地：自绘对话框与确认框；遮罩、焦点陷阱、ESC 统一复用 overlay [#A.013] */
import { clear, el } from '../../core/dom';
import { openOverlay, type OverlayHandle } from '../../core/overlay';
import { createScrollArea, type ScrollAreaHandle } from '../../core/scroll-area';
import { createButton } from '../primitives/button';
import type { ControlVariant } from '../primitives/types';

export interface DialogAction {
  label: string;
  variant?: ControlVariant;
  closeOnClick?: boolean;
  onClick?(): void;
}

export interface DialogOptions {
  title: string;
  description?: string;
  content: HTMLElement | string;
  width?: number;
  dismissible?: boolean;
  actions?: DialogAction[];
}

export interface DialogHandle {
  readonly el: HTMLElement;
  open(): void;
  close(): void;
  setContent(node: HTMLElement | string): void;
  destroy(): void;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

interface InternalDialogOptions extends DialogOptions {
  onClose?(): void;
}

function buildDialog(options: InternalDialogOptions): DialogHandle {
  const header = el('header', { class: 'ui-dialog-header' }, [
    el('h2', { class: 'ui-dialog-title', text: options.title }),
    options.description ? el('p', { class: 'ui-dialog-desc', text: options.description }) : null,
  ]);

  const content = el('div', { class: 'ui-dialog-content' });
  const scroll: ScrollAreaHandle = createScrollArea({
    axis: 'y',
    class: 'ui-dialog-scroll',
    label: options.title,
  });
  scroll.content.append(content);

  const footer = el('footer', { class: 'ui-dialog-actions' });
  const root = el('div', { class: 'ui-dialog' }, [
    header,
    scroll.el,
    options.actions && options.actions.length > 0 ? footer : null,
  ]);

  let overlay: OverlayHandle | null = null;
  let destroyed = false;

  const syncBodyHeight = (): void => {
    // 内容区最多占视口一半，短内容按实际高度收缩，长内容交给 ScrollArea
    const max = Math.max(96, Math.round(window.innerHeight * 0.52));
    scroll.el.style.height = `${Math.min(content.scrollHeight, max)}px`;
    scroll.refresh();
  };

  const applyContent = (node: HTMLElement | string): void => {
    clear(content);
    if (typeof node === 'string') {
      content.append(el('p', { class: 'ui-dialog-text', text: node }));
    } else {
      content.append(node);
    }
  };

  const requestClose = (): void => {
    overlay?.close();
  };

  applyContent(options.content);

  for (const action of options.actions ?? []) {
    const button = createButton({
      label: action.label,
      variant: action.variant ?? 'secondary',
      onClick: () => {
        action.onClick?.();
        if (action.closeOnClick ?? true) requestClose();
      },
    });
    footer.append(button.el);
  }

  return {
    el: root,
    open(): void {
      if (destroyed || overlay) return;
      overlay = openOverlay({
        content: root,
        mode: 'modal',
        width: options.width,
        closeOnBackdrop: options.dismissible ?? true,
        closeOnEscape: options.dismissible ?? true,
        label: options.title,
        onClose: () => {
          overlay = null;
          window.removeEventListener('resize', syncBodyHeight);
          options.onClose?.();
        },
      });
      window.addEventListener('resize', syncBodyHeight);
      window.requestAnimationFrame(syncBodyHeight);
    },
    close(): void {
      requestClose();
    },
    setContent(node: HTMLElement | string): void {
      applyContent(node);
      if (overlay) window.requestAnimationFrame(syncBodyHeight);
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      requestClose();
      scroll.destroy();
      root.remove();
    },
  };
}

export function createDialog(options: DialogOptions): DialogHandle {
  return buildDialog(options);
}

export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    let dialog: DialogHandle | null = null;

    const finish = (value: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(value);
      queueMicrotask(() => dialog?.destroy());
    };

    dialog = buildDialog({
      title: options.title,
      content: options.message,
      width: 400,
      dismissible: true,
      actions: [
        { label: options.cancelLabel ?? '取消', variant: 'secondary', onClick: () => finish(false) },
        {
          label: options.confirmLabel ?? '确认',
          variant: options.tone === 'danger' ? 'danger' : 'primary',
          onClick: () => finish(true),
        },
      ],
      onClose: () => finish(false),
    });
    dialog.open();
  });
}
