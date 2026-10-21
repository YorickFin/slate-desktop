/**
 * 自定义标题栏 [#A.017]
 * 拖拽交给 pywebview 的 .pywebview-drag-region；窗口命令统一走 bridge。
 */
import './titlebar.css';
import { bridge } from '../bridge/client';
import type { WindowSnapshot } from '../bridge/protocol';
import { el } from '../ui/core/dom';
import { createIconButton } from '../ui/controls/primitives/button';

export interface TitlebarOptions {
  title: string;
}

export interface TitlebarHandle {
  readonly el: HTMLElement;
  setTitle(title: string): void;
}

export function createTitlebar(options: TitlebarOptions): TitlebarHandle {
  const title = el('span', { class: 'titlebar-title', text: options.title });
  const drag = el('div', { class: 'pywebview-drag-region titlebar-drag' }, [
    el('span', { class: 'titlebar-mark', 'aria-hidden': 'true' }),
    title,
  ]);

  const minimize = createIconButton({
    icon: 'minimize',
    ariaLabel: '最小化',
    size: 'sm',
    onClick: () => {
      void bridge.call('window.minimize', {}).catch(() => undefined);
    },
  });

  const maximize = createIconButton({
    icon: 'maximize',
    ariaLabel: '最大化',
    size: 'sm',
    onClick: () => {
      void bridge.call('window.toggleMaximize', {}).catch(() => undefined);
    },
  });

  const close = createIconButton({
    icon: 'close',
    ariaLabel: '关闭',
    size: 'sm',
    onClick: () => {
      void bridge.call('window.close', {}).catch(() => undefined);
    },
  });
  close.el.classList.add('titlebar-close');

  const actions = el('div', { class: 'titlebar-actions' }, [minimize.el, maximize.el, close.el]);
  const root = el('div', { class: 'titlebar' }, [drag, actions]);

  const toggleMaximize = (): void => {
    void bridge.call('window.toggleMaximize', {}).catch(() => undefined);
  };

  // 双击拖拽区切换最大化 [#A.017]
  drag.addEventListener('dblclick', toggleMaximize);

  const syncState = (snapshot: WindowSnapshot): void => {
    const maximized = snapshot.state === 'maximized';
    maximize.setIcon(maximized ? 'restore' : 'maximize');
    maximize.el.setAttribute('aria-label', maximized ? '还原' : '最大化');
    maximize.el.title = maximized ? '还原' : '最大化';
    root.dataset.maximized = maximized ? 'true' : 'false';
  };

  bridge.on('window.state', syncState);

  bridge.onStatus((status) => {
    if (status !== 'ready') return;
    void bridge
      .call('window.state', {})
      .then(syncState)
      .catch(() => undefined);
  });

  return {
    el: root,
    setTitle(next: string): void {
      title.textContent = next;
    },
  };
}
