/** 自绘下拉选择（T-A 领地） */
import { el } from '../../core/dom';
import { openOverlay, type OverlayHandle } from '../../core/overlay';
import { createScrollArea, type ScrollAreaHandle } from '../../core/scroll-area';
import { icon } from '../../icons';
import type { ControlHandle, ControlSize } from '../primitives/types';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface SelectOptions {
  value?: string;
  placeholder?: string;
  options: SelectOption[];
  size?: ControlSize;
  disabled?: boolean;
  invalid?: boolean;
  onChange?(value: string): void;
}

export interface SelectHandle extends ControlHandle<HTMLElement> {
  getValue(): string;
  setValue(value: string): void;
  setOptions(list: SelectOption[]): void;
  open(): void;
  close(): void;
}

let uid = 0;

export function createSelect(options: SelectOptions): SelectHandle {
  let items = options.options.slice();
  let value = options.value ?? '';
  const disabled = Boolean(options.disabled);
  const menuId = `ui-select-menu-${++uid}`;

  let open = false;
  let activeIndex = -1;
  let overlay: OverlayHandle | null = null;
  let menu: HTMLElement | null = null;
  let listScroll: ScrollAreaHandle | null = null;
  let optionNodes: HTMLElement[] = [];
  let typeahead = '';
  let typeTimer = 0;

  const label = el('span', { class: 'ui-select-label' });
  const root = el(
    'div',
    {
      class: 'ui-select',
      role: 'combobox',
      tabindex: disabled ? '-1' : '0',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false',
      'aria-controls': menuId,
      dataset: {
        size: options.size ?? 'md',
        invalid: options.invalid ? 'true' : 'false',
        disabled: disabled ? 'true' : 'false',
        open: 'false',
      },
    },
    [label, el('span', { class: 'ui-select-chevron', 'aria-hidden': 'true' }, [icon('chevron-down', 14)])],
  );
  if (disabled) root.setAttribute('aria-disabled', 'true');

  const syncLabel = (): void => {
    const current = items.find((item) => item.value === value);
    label.textContent = current ? current.label : options.placeholder ?? '';
    label.dataset.placeholder = current ? 'false' : 'true';
  };

  const updateActive = (): void => {
    optionNodes.forEach((node, index) => {
      node.dataset.active = index === activeIndex ? 'true' : 'false';
    });
    const active = activeIndex >= 0 ? optionNodes[activeIndex] : null;
    if (active) root.setAttribute('aria-activedescendant', active.id);
    else root.removeAttribute('aria-activedescendant');
  };

  const scrollActiveIntoView = (): void => {
    const node = activeIndex >= 0 ? optionNodes[activeIndex] : null;
    if (node) node.scrollIntoView({ block: 'nearest' });
  };

  const moveActive = (step: number): void => {
    if (items.length === 0) return;
    let next = activeIndex;
    for (let i = 0; i < items.length; i += 1) {
      next = (next + step + items.length) % items.length;
      if (!items[next].disabled) break;
    }
    activeIndex = next;
    updateActive();
    scrollActiveIntoView();
  };

  const moveActiveEdge = (direction: 1 | -1): void => {
    const index =
      direction === 1
        ? items.findIndex((item) => !item.disabled)
        : items.reduce((found, item, i) => (!item.disabled ? i : found), -1);
    if (index < 0) return;
    activeIndex = index;
    updateActive();
    scrollActiveIntoView();
  };

  const onWindowScroll = (event: Event): void => {
    if (!open) return;
    const target = event.target as Node | null;
    if (target && menu?.contains(target)) return;
    close();
  };

  const handleClosed = (): void => {
    open = false;
    overlay = null;
    menu = null;
    listScroll = null;
    optionNodes = [];
    activeIndex = -1;
    root.dataset.open = 'false';
    root.setAttribute('aria-expanded', 'false');
    root.removeAttribute('aria-activedescendant');
    window.removeEventListener('scroll', onWindowScroll, true);
  };

  const buildMenu = (): HTMLElement => {
    const list = el('div', { class: 'ui-select-menu', role: 'listbox', id: menuId, tabindex: '-1' });
    optionNodes = items.map((item, index) => {
      const selected = item.value === value;
      const node = el(
        'div',
        {
          class: 'ui-select-option',
          role: 'option',
          id: `${menuId}-opt-${index}`,
          'aria-selected': selected ? 'true' : 'false',
          'aria-disabled': item.disabled ? 'true' : 'false',
          dataset: { active: 'false', disabled: item.disabled ? 'true' : 'false' },
        },
        [
          el('span', { class: 'ui-select-option-main' }, [
            el('span', { class: 'ui-select-option-label', text: item.label }),
            item.description
              ? el('span', { class: 'ui-select-option-desc', text: item.description })
              : null,
          ]),
          selected
            ? el('span', { class: 'ui-select-check', 'aria-hidden': 'true' }, [icon('check', 14)])
            : null,
        ],
      );
      node.addEventListener('click', () => choose(index));
      list.append(node);
      return node;
    });

    if (items.length > 8) {
      listScroll = createScrollArea({ axis: 'y', class: 'ui-select-menu-scroll', label: '选项列表' });
      listScroll.content.append(list);
      return listScroll.el;
    }
    return list;
  };

  const openMenu = (): void => {
    if (disabled || open || items.length === 0) return;
    open = true;
    const selected = items.findIndex((item) => item.value === value && !item.disabled);
    activeIndex = selected >= 0 ? selected : items.findIndex((item) => !item.disabled);
    menu = buildMenu();
    overlay = openOverlay({
      content: menu,
      mode: 'anchored',
      anchor: root,
      closeOnEscape: true,
      onClose: handleClosed,
    });
    root.dataset.open = 'true';
    root.setAttribute('aria-expanded', 'true');
    updateActive();
    scrollActiveIntoView();
    window.addEventListener('scroll', onWindowScroll, true);
  };

  const close = (): void => {
    if (!open) return;
    overlay?.close();
  };

  const choose = (index: number): void => {
    const item = items[index];
    if (!item || item.disabled) return;
    const changed = item.value !== value;
    value = item.value;
    syncLabel();
    if (changed) options.onChange?.(value);
    close();
    root.focus();
  };

  const typeaheadSearch = (char: string): void => {
    typeahead += char.toLowerCase();
    window.clearTimeout(typeTimer);
    typeTimer = window.setTimeout(() => {
      typeahead = '';
    }, 500);
    const total = items.length;
    for (let offset = 1; offset <= total; offset += 1) {
      const index = (activeIndex + offset + total) % total;
      const item = items[index];
      if (!item.disabled && item.label.toLowerCase().startsWith(typeahead)) {
        activeIndex = index;
        updateActive();
        scrollActiveIntoView();
        return;
      }
    }
  };

  root.addEventListener('click', () => {
    if (disabled) return;
    if (open) close();
    else openMenu();
  });

  root.addEventListener('keydown', (event) => {
    if (disabled) return;
    const key = event.key;

    if (!open) {
      if (key === 'Enter' || key === ' ' || key === 'ArrowDown' || key === 'ArrowUp') {
        event.preventDefault();
        openMenu();
        if (key === 'ArrowUp') moveActiveEdge(-1);
      }
      return;
    }

    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveActive(-1);
        break;
      case 'Home':
        event.preventDefault();
        moveActiveEdge(1);
        break;
      case 'End':
        event.preventDefault();
        moveActiveEdge(-1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeIndex >= 0) choose(activeIndex);
        break;
      case 'Tab':
        close();
        break;
      default:
        if (key.length === 1 && key !== ' ') {
          event.preventDefault();
          typeaheadSearch(key);
        }
        break;
    }
  });

  const setOptions = (list: SelectOption[]): void => {
    items = list.slice();
    if (!items.some((item) => item.value === value)) value = '';
    syncLabel();
    if (open) close();
  };

  syncLabel();

  return {
    el: root,
    getValue(): string {
      return value;
    },
    setValue(next: string): void {
      value = next;
      syncLabel();
      if (open) close();
    },
    setOptions,
    open(): void {
      openMenu();
    },
    close(): void {
      close();
    },
    destroy(): void {
      close();
      root.remove();
    },
  };
}
