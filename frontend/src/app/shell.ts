/** 应用外壳：标题栏挂载点 / 侧边导航 / 内容出口 / 状态栏 [#A.016] */
import './shell.css';
import { el } from '../ui/core/dom';
import { icon, type IconName } from '../ui/icons';

export interface ShellRoute {
  id: string;
  label: string;
  icon: IconName;
}

export type StatusTone = 'neutral' | 'ok' | 'warn' | 'error';

export interface Shell {
  readonly el: HTMLElement;
  readonly titlebar: HTMLElement;
  readonly outlet: HTMLElement;
  setPage(title: string, description: string): void;
  setActive(id: string): void;
  setStatus(text: string, tone?: StatusTone): void;
  setMeta(text: string): void;
}

export function createShell(routes: ShellRoute[]): Shell {
  const navItems = new Map<string, HTMLButtonElement>();
  const navList = el('div', { class: 'app-nav-list' });

  for (const route of routes) {
    const item = el(
      'button',
      {
        class: 'app-nav-item',
        type: 'button',
        dataset: { route: route.id },
        'aria-label': route.label,
      },
      [
        el('span', { class: 'app-nav-icon' }, [icon(route.icon, 16)]),
        el('span', { class: 'app-nav-label', text: route.label }),
      ],
    );
    item.addEventListener('click', () => {
      if (location.hash !== `#/${route.id}`) location.hash = `#/${route.id}`;
    });
    navItems.set(route.id, item);
    navList.append(item);
  }

  const brand = el('div', { class: 'app-brand' }, [
    el('span', { class: 'app-brand-mark', 'aria-hidden': 'true' }),
    el('span', { class: 'app-brand-name', text: 'Slate' }),
  ]);

  const sidebarFoot = el('div', { class: 'app-nav-foot' }, [
    el('span', { class: 'app-nav-foot-text', text: 'v0.1.0 · 奠基骨架' }),
  ]);

  const sidebar = el('nav', { class: 'app-sidebar', 'aria-label': '主导航' }, [
    brand,
    navList,
    sidebarFoot,
  ]);

  const titlebar = el('header', { class: 'app-titlebar' });
  const pageTitle = el('h1', { class: 'app-page-title' });
  const pageDesc = el('p', { class: 'app-page-desc' });
  const head = el('div', { class: 'app-page-head' }, [pageTitle, pageDesc]);
  const outlet = el('div', { class: 'app-outlet' });
  const main = el('main', { class: 'app-main' }, [head, outlet]);

  const statusDot = el('span', { class: 'app-status-dot', dataset: { tone: 'neutral' } });
  const statusText = el('span', { class: 'app-status-text', text: '正在启动' });
  const statusMeta = el('span', { class: 'app-status-meta' });
  const statusbar = el('footer', { class: 'app-statusbar' }, [
    el('span', { class: 'app-status-left' }, [statusDot, statusText]),
    statusMeta,
  ]);

  const root = el('div', { class: 'app-shell' }, [
    titlebar,
    el('div', { class: 'app-body' }, [sidebar, main]),
    statusbar,
  ]);

  return {
    el: root,
    titlebar,
    outlet,
    setPage(title: string, description: string): void {
      pageTitle.textContent = title;
      pageDesc.textContent = description;
    },
    setActive(id: string): void {
      for (const [routeId, item] of navItems) {
        const active = routeId === id;
        item.dataset.active = active ? 'true' : 'false';
        if (active) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      }
    },
    setStatus(text: string, tone: StatusTone = 'neutral'): void {
      statusText.textContent = text;
      statusDot.dataset.tone = tone;
    },
    setMeta(text: string): void {
      statusMeta.textContent = text;
    },
  };
}
