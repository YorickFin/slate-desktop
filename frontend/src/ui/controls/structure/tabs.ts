/** T-B 领地：自绘标签页（只负责标签条，面板由调用方管理）[#A.010][#A.020] */
import { clear, el } from '../../core/dom';
import type { ControlSize } from '../primitives/types';

export interface TabItem {
  id: string;
  label: string;
  badge?: string;
  disabled?: boolean;
}

export interface TabsOptions {
  items: TabItem[];
  value?: string;
  size?: ControlSize;
  onChange?(id: string): void;
}

export interface TabsHandle {
  readonly el: HTMLElement;
  getValue(): string | null;
  setValue(id: string): void;
  setItems(list: TabItem[]): void;
  destroy(): void;
}

let instanceSeq = 0;

export function createTabs(options: TabsOptions): TabsHandle {
  instanceSeq += 1;
  const base = `ui-tabs-${instanceSeq}`;

  const root = el('div', {
    class: 'ui-tabs',
    dataset: { size: options.size ?? 'md', base },
  });

  const list = el('div', {
    class: 'ui-tabs-list',
    role: 'tablist',
    'aria-orientation': 'horizontal',
  });
  const indicator = el('span', { class: 'ui-tabs-indicator', 'aria-hidden': 'true' });
  root.append(list);

  let items: TabItem[] = options.items.slice();
  let value: string | null = options.value ?? null;
  const buttons = new Map<string, HTMLButtonElement>();

  const firstEnabledId = (): string | null => {
    const enabled = items.find((item) => !item.disabled);
    return (enabled ?? items[0])?.id ?? null;
  };

  const syncIndicator = (): void => {
    const active = value === null ? undefined : buttons.get(value);
    if (!active) {
      indicator.style.opacity = '0';
      return;
    }
    indicator.style.opacity = '1';
    indicator.style.width = `${active.offsetWidth}px`;
    indicator.style.transform = `translateX(${active.offsetLeft}px)`;
  };

  const applyValue = (next: string, notify: boolean): void => {
    const item = items.find((entry) => entry.id === next);
    if (!item || item.disabled || value === next) return;
    value = next;
    for (const [id, button] of buttons) {
      const active = id === next;
      button.dataset.active = active ? 'true' : 'false';
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.tabIndex = active ? 0 : -1;
    }
    syncIndicator();
    if (notify) options.onChange?.(next);
  };

  const onKeyDown = (event: KeyboardEvent, id: string): void => {
    const enabled = items.filter((item) => !item.disabled);
    if (enabled.length === 0) return;
    const index = Math.max(0, enabled.findIndex((item) => item.id === id));
    let targetIndex: number;
    if (event.key === 'ArrowRight') targetIndex = (index + 1) % enabled.length;
    else if (event.key === 'ArrowLeft') targetIndex = (index - 1 + enabled.length) % enabled.length;
    else if (event.key === 'Home') targetIndex = 0;
    else if (event.key === 'End') targetIndex = enabled.length - 1;
    else return;
    event.preventDefault();
    const target = enabled[targetIndex];
    applyValue(target.id, true);
    buttons.get(target.id)?.focus();
  };

  const render = (): void => {
    buttons.clear();
    clear(list);
    list.append(indicator);
    for (const item of items) {
      const selected = item.id === value;
      const tab = el(
        'button',
        {
          class: 'ui-tabs-tab',
          type: 'button',
          role: 'tab',
          id: `${base}-tab-${item.id}`,
          'aria-selected': selected ? 'true' : 'false',
          'aria-controls': `${base}-panel-${item.id}`,
          tabindex: selected ? '0' : '-1',
          disabled: item.disabled ?? false,
          dataset: { active: selected ? 'true' : 'false' },
        },
        [
          el('span', { class: 'ui-tabs-label', text: item.label }),
          item.badge ? el('span', { class: 'ui-tabs-badge', text: item.badge }) : null,
        ],
      );
      tab.addEventListener('click', () => applyValue(item.id, true));
      tab.addEventListener('keydown', (event) => onKeyDown(event, item.id));
      buttons.set(item.id, tab);
      list.append(tab);
    }
    window.requestAnimationFrame(syncIndicator);
  };

  if (value === null || !items.some((item) => item.id === value && !item.disabled)) {
    value = firstEnabledId();
  }
  render();

  const observer = new ResizeObserver(() => syncIndicator());
  observer.observe(list);

  return {
    el: root,
    getValue: () => value,
    setValue(id: string): void {
      applyValue(id, false);
    },
    setItems(next: TabItem[]): void {
      items = next.slice();
      if (value === null || !items.some((item) => item.id === value && !item.disabled)) {
        value = firstEnabledId();
      }
      render();
    },
    destroy(): void {
      observer.disconnect();
      root.remove();
    },
  };
}
