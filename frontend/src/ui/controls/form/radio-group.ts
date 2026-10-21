/** 自绘单选组（T-A 领地） */
import { clear, el } from '../../core/dom';
import type { ControlHandle } from '../primitives/types';
import type { SelectOption } from './select';

export interface RadioGroupOptions {
  name: string;
  value?: string;
  options: SelectOption[];
  direction?: 'vertical' | 'horizontal';
  disabled?: boolean;
  onChange?(value: string): void;
}

export interface RadioGroupHandle extends ControlHandle<HTMLElement> {
  getValue(): string;
  setValue(value: string): void;
  setOptions(list: SelectOption[]): void;
}

let uid = 0;

export function createRadioGroup(options: RadioGroupOptions): RadioGroupHandle {
  let items = options.options.slice();
  const name = options.name;
  const groupId = `ui-radio-${name}-${++uid}`;
  const disabled = Boolean(options.disabled);
  let value = options.value ?? '';

  const root = el('div', {
    class: 'ui-radio-group',
    role: 'radiogroup',
    dataset: {
      direction: options.direction ?? 'vertical',
      disabled: disabled ? 'true' : 'false',
      name,
    },
  });

  let nodes: HTMLElement[] = [];

  const firstEnabled = (): number => items.findIndex((item) => !item.disabled);

  const sync = (): void => {
    const tabbable = value
      ? items.findIndex((item) => item.value === value && !item.disabled)
      : firstEnabled();
    nodes.forEach((node, index) => {
      const item = items[index];
      const checked = item.value === value;
      node.dataset.checked = checked ? 'true' : 'false';
      node.setAttribute('aria-checked', checked ? 'true' : 'false');
      node.setAttribute('aria-disabled', item.disabled ? 'true' : 'false');
      node.tabIndex = !disabled && item.disabled !== true && index === tabbable ? 0 : -1;
    });
    if (disabled) root.setAttribute('aria-disabled', 'true');
    else root.removeAttribute('aria-disabled');
  };

  const build = (): void => {
    clear(root);
    nodes = items.map((item, index) => {
      const node = el(
        'div',
        {
          class: 'ui-radio',
          role: 'radio',
          id: `${groupId}-${index}`,
          dataset: { checked: 'false', disabled: item.disabled ? 'true' : 'false' },
        },
        [
          el('span', { class: 'ui-choice-dot', 'aria-hidden': 'true' }),
          el('span', { class: 'ui-choice-text' }, [
            el('span', { class: 'ui-choice-label', text: item.label }),
            item.description ? el('span', { class: 'ui-choice-desc', text: item.description }) : null,
          ]),
        ],
      );
      node.addEventListener('click', () => select(index, true));
      root.append(node);
      return node;
    });
    sync();
  };

  const select = (index: number, fire: boolean): void => {
    if (disabled) return;
    const item = items[index];
    if (!item || item.disabled) return;
    if (item.value === value) return;
    value = item.value;
    sync();
    if (fire) options.onChange?.(value);
  };

  const move = (step: number): void => {
    if (disabled || items.length === 0) return;
    const current = items.findIndex((item) => item.value === value);
    let next = current >= 0 ? current : step > 0 ? -1 : 0;
    for (let i = 0; i < items.length; i += 1) {
      next = (next + step + items.length) % items.length;
      if (!items[next].disabled) break;
    }
    const target = nodes[next];
    if (!target) return;
    target.focus();
    select(next, true);
  };

  root.addEventListener('keydown', (event) => {
    if (disabled) return;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        move(-1);
        break;
      case ' ':
      case 'Enter': {
        event.preventDefault();
        const index = nodes.indexOf(document.activeElement as HTMLElement);
        if (index >= 0) select(index, true);
        break;
      }
      default:
        break;
    }
  });

  const setOptions = (list: SelectOption[]): void => {
    items = list.slice();
    if (!items.some((item) => item.value === value && !item.disabled)) value = '';
    build();
  };

  build();

  return {
    el: root,
    getValue(): string {
      return value;
    },
    setValue(next: string): void {
      value = items.some((item) => item.value === next && !item.disabled) ? next : '';
      sync();
    },
    setOptions,
    destroy(): void {
      root.remove();
    },
  };
}
