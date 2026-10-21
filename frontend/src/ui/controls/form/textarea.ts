/** 自绘多行文本框（T-A 领地） */
import { el } from '../../core/dom';
import type { ControlHandle, ControlSize } from '../primitives/types';

export interface TextareaOptions {
  value?: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  size?: ControlSize;
  disabled?: boolean;
  readonly?: boolean;
  invalid?: boolean;
  onInput?(value: string): void;
  onChange?(value: string): void;
}

export interface TextareaHandle extends ControlHandle<HTMLElement> {
  readonly textarea: HTMLTextAreaElement;
  getValue(): string;
  setValue(value: string): void;
  setInvalid(invalid: boolean): void;
  focus(): void;
}

export function createTextarea(options: TextareaOptions): TextareaHandle {
  const root = el('div', {
    class: 'ui-textarea',
    dataset: { size: options.size ?? 'md' },
  });

  const textarea = el('textarea', {
    class: 'ui-textarea-native',
    placeholder: options.placeholder ?? '',
    rows: String(options.rows ?? 3),
    spellcheck: 'false',
    autocomplete: 'off',
  });
  textarea.value = options.value ?? '';
  if (options.maxLength !== undefined) textarea.maxLength = options.maxLength;
  root.append(textarea);

  const meta =
    options.maxLength !== undefined
      ? el('span', { class: 'ui-textarea-meta', 'aria-live': 'polite' })
      : null;
  if (meta) root.append(meta);

  const syncMeta = (): void => {
    if (!meta || options.maxLength === undefined) return;
    meta.textContent = `${textarea.value.length} / ${options.maxLength}`;
  };

  const syncInvalid = (invalid: boolean): void => {
    root.dataset.invalid = invalid ? 'true' : 'false';
    if (invalid) textarea.setAttribute('aria-invalid', 'true');
    else textarea.removeAttribute('aria-invalid');
  };

  const syncDisabled = (): void => {
    const disabled = Boolean(options.disabled);
    root.dataset.disabled = disabled ? 'true' : 'false';
    textarea.disabled = disabled;
    textarea.readOnly = Boolean(options.readonly);
  };

  syncInvalid(Boolean(options.invalid));
  syncDisabled();
  syncMeta();

  textarea.addEventListener('input', () => {
    syncMeta();
    options.onInput?.(textarea.value);
  });
  textarea.addEventListener('change', () => options.onChange?.(textarea.value));

  return {
    el: root,
    textarea,
    getValue(): string {
      return textarea.value;
    },
    setValue(value: string): void {
      textarea.value = value;
      syncMeta();
    },
    setInvalid(invalid: boolean): void {
      syncInvalid(invalid);
    },
    focus(): void {
      textarea.focus();
    },
    destroy(): void {
      root.remove();
    },
  };
}
