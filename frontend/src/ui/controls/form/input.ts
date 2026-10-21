/** 自绘文本输入框（T-A 领地） */
import { el } from '../../core/dom';
import { icon } from '../../icons';
import type { ControlHandle, ControlSize } from '../primitives/types';

export interface InputOptions {
  value?: string;
  placeholder?: string;
  type?: 'text' | 'password' | 'search' | 'number';
  size?: ControlSize;
  disabled?: boolean;
  readonly?: boolean;
  invalid?: boolean;
  onInput?(value: string): void;
  onChange?(value: string): void;
  onEnter?(value: string): void;
}

export interface InputHandle extends ControlHandle<HTMLElement> {
  readonly input: HTMLInputElement;
  getValue(): string;
  setValue(value: string): void;
  setInvalid(invalid: boolean): void;
  focus(): void;
}

export function createInput(options: InputOptions): InputHandle {
  const root = el('div', {
    class: 'ui-input',
    dataset: { size: options.size ?? 'md' },
  });

  if (options.type === 'search') {
    root.append(el('span', { class: 'ui-input-icon', 'aria-hidden': 'true' }, [icon('search', 14)]));
  }

  const input = el('input', {
    class: 'ui-input-native',
    type: options.type ?? 'text',
    placeholder: options.placeholder ?? '',
    spellcheck: 'false',
    autocomplete: 'off',
  });
  input.value = options.value ?? '';
  root.append(input);

  const syncInvalid = (invalid: boolean): void => {
    root.dataset.invalid = invalid ? 'true' : 'false';
    if (invalid) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  };

  const syncDisabled = (): void => {
    const disabled = Boolean(options.disabled);
    root.dataset.disabled = disabled ? 'true' : 'false';
    input.disabled = disabled;
    input.readOnly = Boolean(options.readonly);
  };

  syncInvalid(Boolean(options.invalid));
  syncDisabled();

  input.addEventListener('input', () => options.onInput?.(input.value));
  input.addEventListener('change', () => options.onChange?.(input.value));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') options.onEnter?.(input.value);
  });

  return {
    el: root,
    input,
    getValue(): string {
      return input.value;
    },
    setValue(value: string): void {
      input.value = value;
    },
    setInvalid(invalid: boolean): void {
      syncInvalid(invalid);
    },
    focus(): void {
      input.focus();
    },
    destroy(): void {
      root.remove();
    },
  };
}
