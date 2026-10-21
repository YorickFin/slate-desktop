/** 自绘按钮与图标按钮 [#A.011] */
import { el } from '../../core/dom';
import { icon, type IconName } from '../../icons';
import type { ControlHandle, ControlSize, ControlVariant } from './types';

export interface ButtonOptions {
  label: string;
  variant?: ControlVariant;
  size?: ControlSize;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  title?: string;
  type?: 'button' | 'submit';
  onClick?: (event: MouseEvent) => void;
}

export interface ButtonHandle extends ControlHandle<HTMLButtonElement> {
  setLabel(label: string): void;
  setDisabled(disabled: boolean): void;
  setLoading(loading: boolean): void;
  setVariant(variant: ControlVariant): void;
}

export function createButton(options: ButtonOptions): ButtonHandle {
  const label = el('span', { class: 'ui-button-label', text: options.label });
  const iconSlot = el('span', { class: 'ui-button-icon' }, options.icon ? [icon(options.icon, 14)] : []);
  const spinner = el('span', { class: 'ui-spinner', 'aria-hidden': 'true' });

  const button = el(
    'button',
    {
      class: 'ui-button',
      type: options.type ?? 'button',
      title: options.title ?? '',
      dataset: {
        variant: options.variant ?? 'secondary',
        size: options.size ?? 'md',
      },
      disabled: options.disabled ?? false,
    },
    [iconSlot, label],
  );

  let loading = false;
  const sync = (): void => {
    button.disabled = Boolean(options.disabled) || loading;
    button.setAttribute('aria-busy', loading ? 'true' : 'false');
  };

  if (options.loading) {
    loading = true;
    button.append(spinner);
  }
  if (options.icon) {
    iconSlot.hidden = false;
  } else {
    iconSlot.hidden = true;
  }
  sync();

  button.addEventListener('click', (event) => {
    if (button.disabled) return;
    options.onClick?.(event);
  });

  return {
    el: button,
    setLabel(next: string): void {
      label.textContent = next;
    },
    setDisabled(next: boolean): void {
      options.disabled = next;
      sync();
    },
    setLoading(next: boolean): void {
      if (loading === next) return;
      loading = next;
      if (next) button.append(spinner);
      else spinner.remove();
      sync();
    },
    setVariant(next: ControlVariant): void {
      button.dataset.variant = next;
    },
    destroy(): void {
      button.remove();
    },
  };
}

export interface IconButtonOptions {
  icon: IconName;
  ariaLabel: string;
  size?: ControlSize;
  variant?: 'ghost' | 'secondary' | 'danger';
  disabled?: boolean;
  title?: string;
  onClick?: (event: MouseEvent) => void;
}

export interface IconButtonHandle extends ControlHandle<HTMLButtonElement> {
  setDisabled(disabled: boolean): void;
  setIcon(next: IconName): void;
}

export function createIconButton(options: IconButtonOptions): IconButtonHandle {
  let current = icon(options.icon, options.size === 'lg' ? 18 : 15);
  const button = el(
    'button',
    {
      class: 'ui-icon-button',
      type: 'button',
      title: options.title ?? options.ariaLabel,
      'aria-label': options.ariaLabel,
      dataset: {
        size: options.size ?? 'md',
        variant: options.variant ?? 'ghost',
      },
      disabled: options.disabled ?? false,
    },
    [current],
  );

  button.addEventListener('click', (event) => {
    if (button.disabled) return;
    options.onClick?.(event);
  });

  return {
    el: button,
    setDisabled(next: boolean): void {
      button.disabled = next;
    },
    setIcon(next: IconName): void {
      const replacement = icon(next, options.size === 'lg' ? 18 : 15);
      current.replaceWith(replacement);
      current = replacement;
    },
    destroy(): void {
      button.remove();
    },
  };
}
