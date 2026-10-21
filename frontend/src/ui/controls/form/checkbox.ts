/** 自绘复选框（T-A 领地） */
import { el } from '../../core/dom';
import { icon } from '../../icons';
import type { ControlHandle } from '../primitives/types';

export interface CheckboxOptions {
  checked?: boolean;
  label?: string;
  description?: string;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange?(checked: boolean): void;
}

export interface CheckboxHandle extends ControlHandle<HTMLElement> {
  get checked(): boolean;
  setChecked(checked: boolean): void;
  setIndeterminate(indeterminate: boolean): void;
}

export function createCheckbox(options: CheckboxOptions): CheckboxHandle {
  let checked = Boolean(options.checked);
  let indeterminate = Boolean(options.indeterminate);
  const disabled = Boolean(options.disabled);

  const box = el('span', { class: 'ui-checkbox-box', 'aria-hidden': 'true' });
  const text = el('span', { class: 'ui-checkbox-text' }, [
    options.label ? el('span', { class: 'ui-choice-label', text: options.label }) : null,
    options.description ? el('span', { class: 'ui-choice-desc', text: options.description }) : null,
  ]);

  const root = el(
    'div',
    {
      class: 'ui-checkbox',
      role: 'checkbox',
      dataset: { disabled: disabled ? 'true' : 'false' },
    },
    [box, text],
  );

  const sync = (): void => {
    root.dataset.checked = checked && !indeterminate ? 'true' : 'false';
    root.dataset.indeterminate = indeterminate ? 'true' : 'false';
    root.setAttribute('aria-checked', indeterminate ? 'mixed' : checked ? 'true' : 'false');
    root.tabIndex = disabled ? -1 : 0;
    if (disabled) root.setAttribute('aria-disabled', 'true');
    else root.removeAttribute('aria-disabled');

    box.replaceChildren();
    if (indeterminate) {
      box.append(el('span', { class: 'ui-checkbox-dash' }));
    } else if (checked) {
      box.append(icon('check', 12));
    }
  };

  const toggle = (): void => {
    if (disabled) return;
    indeterminate = false;
    checked = !checked;
    sync();
    options.onChange?.(checked);
  };

  root.addEventListener('click', toggle);
  root.addEventListener('keydown', (event) => {
    if (event.key !== ' ') return;
    event.preventDefault();
    toggle();
  });

  sync();

  return {
    el: root,
    get checked(): boolean {
      return checked;
    },
    setChecked(next: boolean): void {
      checked = next;
      sync();
    },
    setIndeterminate(next: boolean): void {
      indeterminate = next;
      sync();
    },
    destroy(): void {
      root.remove();
    },
  };
}
