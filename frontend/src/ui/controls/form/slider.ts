/** 自绘滑块（T-A 领地） */
import { clamp, el } from '../../core/dom';
import type { ControlHandle } from '../primitives/types';

export interface SliderOptions {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  disabled?: boolean;
  showValue?: boolean;
  format?(value: number): string;
  onInput?(value: number): void;
  onCommit?(value: number): void;
}

export interface SliderHandle extends ControlHandle<HTMLElement> {
  getValue(): number;
  setValue(value: number): void;
}

const STEP_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

export function createSlider(options: SliderOptions): SliderHandle {
  const min = options.min ?? 0;
  const max = options.max ?? 100;
  const step = options.step !== undefined && options.step > 0 ? options.step : 1;
  const disabled = Boolean(options.disabled);

  const quantize = (input: number): number => {
    const steps = Math.round((clamp(input, min, max) - min) / step);
    return Number((min + steps * step).toFixed(6));
  };

  let value = quantize(options.value ?? min);

  const fill = el('div', { class: 'ui-slider-fill' });
  const rail = el('div', { class: 'ui-slider-rail', 'aria-hidden': 'true' }, [fill]);
  const thumb = el('div', { class: 'ui-slider-thumb', 'aria-hidden': 'true' });
  const track = el(
    'div',
    {
      class: 'ui-slider-track',
      role: 'slider',
      tabindex: disabled ? '-1' : '0',
      'aria-valuemin': String(min),
      'aria-valuemax': String(max),
      'aria-valuenow': String(value),
    },
    [rail, thumb],
  );
  if (disabled) track.setAttribute('aria-disabled', 'true');

  const valueLabel = options.showValue ? el('span', { class: 'ui-slider-value' }) : null;
  const root = el('div', { class: 'ui-slider', dataset: { size: 'md' } }, [
    track,
    valueLabel,
  ]);
  if (disabled) root.dataset.disabled = 'true';

  const format = (input: number): string => options.format?.(input) ?? String(input);

  const render = (): void => {
    const ratio = (value - min) / (max - min);
    const percent = clamp(ratio * 100, 0, 100);
    fill.style.width = `${percent}%`;
    thumb.style.left = `${percent}%`;
    track.setAttribute('aria-valuenow', String(value));
    if (options.format) track.setAttribute('aria-valuetext', format(value));
    if (valueLabel) valueLabel.textContent = format(value);
  };

  const setValue = (next: number, fire: boolean): void => {
    const normalized = quantize(next);
    if (normalized === value) return;
    value = normalized;
    render();
    if (fire) options.onInput?.(value);
  };

  const updateFromPointer = (clientX: number): void => {
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    setValue(min + ratio * (max - min), true);
  };

  track.addEventListener('pointerdown', (event) => {
    if (disabled) return;
    event.preventDefault();
    track.focus();
    track.setPointerCapture(event.pointerId);
    updateFromPointer(event.clientX);
  });

  track.addEventListener('pointermove', (event) => {
    if (disabled || !track.hasPointerCapture(event.pointerId)) return;
    updateFromPointer(event.clientX);
  });

  const endDrag = (event: PointerEvent): void => {
    if (disabled) return;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    options.onCommit?.(value);
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  track.addEventListener('keydown', (event) => {
    if (disabled) return;
    let next = value;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = value + step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = value - step;
        break;
      case 'PageUp':
        next = value + step * 10;
        break;
      case 'PageDown':
        next = value - step * 10;
        break;
      case 'Home':
        next = min;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }
    event.preventDefault();
    setValue(next, true);
  });

  track.addEventListener('keyup', (event) => {
    if (disabled || !STEP_KEYS.has(event.key)) return;
    options.onCommit?.(value);
  });

  render();

  return {
    el: root,
    getValue(): number {
      return value;
    },
    setValue(next: number): void {
      setValue(next, false);
    },
    destroy(): void {
      root.remove();
    },
  };
}
