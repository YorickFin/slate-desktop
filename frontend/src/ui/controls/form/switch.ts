/** 自绘开关（T-A 领地） */
import { el } from '../../core/dom';
import type { ControlHandle } from '../primitives/types';

export interface SwitchOptions {
  checked?: boolean;
  label?: string;
  description?: string;
  disabled?: boolean;
  onChange?(checked: boolean): void;
}

export interface SwitchHandle extends ControlHandle<HTMLElement> {
  get checked(): boolean;
  setChecked(checked: boolean): void;
}

export function createSwitch(options: SwitchOptions): SwitchHandle {
  let checked = Boolean(options.checked);
  const disabled = Boolean(options.disabled);

  const thumb = el('span', { class: 'ui-switch-thumb', 'aria-hidden': 'true' });
  const button = el(
    'button',
    {
      class: 'ui-switch',
      type: 'button',
      role: 'switch',
      dataset: { checked: 'false' },
    },
    [thumb],
  );
  button.disabled = disabled;

  const text = el('span', { class: 'ui-choice-text' }, [
    options.label ? el('span', { class: 'ui-choice-label', text: options.label }) : null,
    options.description ? el('span', { class: 'ui-choice-desc', text: options.description }) : null,
  ]);

  const root = el('div', { class: 'ui-switch-field' }, [button, text]);

  const sync = (): void => {
    button.dataset.checked = checked ? 'true' : 'false';
    button.setAttribute('aria-checked', checked ? 'true' : 'false');
  };

  const toggle = (): void => {
    if (disabled) return;
    checked = !checked;
    sync();
    options.onChange?.(checked);
  };

  button.addEventListener('click', toggle);
  text.addEventListener('click', toggle);

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
    destroy(): void {
      root.remove();
    },
  };
}
