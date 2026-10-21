/**
 * 自绘滚动容器 [#A.014]
 * 原生滚动条已全局隐藏，此处绘制轨道与滑块并接管拖拽/点击翻页。
 */
import './scroll-area.css';
import { el } from './dom';

export type ScrollAxis = 'y' | 'x' | 'both';

export interface ScrollAreaOptions {
  axis?: ScrollAxis;
  class?: string;
  label?: string;
}

export interface ScrollToOptions {
  top?: number;
  left?: number;
  behavior?: ScrollBehavior;
}

export interface ScrollAreaHandle {
  readonly el: HTMLElement;
  readonly viewport: HTMLElement;
  readonly content: HTMLElement;
  scrollTo(options: ScrollToOptions): void;
  refresh(): void;
  destroy(): void;
}

interface Bar {
  el: HTMLElement;
  thumb: HTMLElement;
}

function createBar(axis: 'x' | 'y'): Bar {
  const thumb = el('div', { class: 'ui-scrollbar-thumb' });
  const bar = el('div', { class: `ui-scrollbar ui-scrollbar-${axis}`, 'aria-hidden': 'true' }, [thumb]);
  return { el: bar, thumb };
}

export function createScrollArea(options: ScrollAreaOptions = {}): ScrollAreaHandle {
  const axis: ScrollAxis = options.axis ?? 'y';
  const root = el('div', {
    class: `ui-scroll-area${options.class ? ` ${options.class}` : ''}`,
    dataset: { axis },
    role: 'region',
    'aria-label': options.label ?? '',
  });
  const viewport = el('div', { class: 'ui-scroll-viewport', tabindex: '0' });
  const content = el('div', { class: 'ui-scroll-content' });
  viewport.append(content);
  root.append(viewport);

  const vertical = createBar('y');
  const horizontal = createBar('x');
  if (axis !== 'x') root.append(vertical.el);
  if (axis !== 'y') root.append(horizontal.el);

  let frame = 0;
  let activeTimer = 0;

  const update = (): void => {
    if (axis !== 'x') {
      const track = vertical.el.clientHeight;
      const total = viewport.scrollHeight;
      const view = viewport.clientHeight;
      const visible = total > view + 1 && track > 0;
      vertical.el.style.display = visible ? '' : 'none';
      if (visible) {
        const thumbSize = Math.max(24, (view / total) * track);
        const maxThumb = track - thumbSize;
        const maxScroll = total - view;
        const offset = maxScroll > 0 ? (viewport.scrollTop / maxScroll) * maxThumb : 0;
        vertical.thumb.style.height = `${thumbSize}px`;
        vertical.thumb.style.transform = `translateY(${offset}px)`;
      }
    }
    if (axis !== 'both' && axis !== 'x') return;

    const track = horizontal.el.clientWidth;
    const total = viewport.scrollWidth;
    const view = viewport.clientWidth;
    const visible = total > view + 1 && track > 0;
    horizontal.el.style.display = visible ? '' : 'none';
    if (visible) {
      const thumbSize = Math.max(24, (view / total) * track);
      const maxThumb = track - thumbSize;
      const maxScroll = total - view;
      const offset = maxScroll > 0 ? (viewport.scrollLeft / maxScroll) * maxThumb : 0;
      horizontal.thumb.style.width = `${thumbSize}px`;
      horizontal.thumb.style.transform = `translateX(${offset}px)`;
    }
  };

  const scheduleUpdate = (): void => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };

  const markActive = (): void => {
    root.dataset.active = 'true';
    window.clearTimeout(activeTimer);
    activeTimer = window.setTimeout(() => {
      delete root.dataset.active;
    }, 700);
  };

  const bindDrag = (bar: Bar, direction: 'x' | 'y'): void => {
    let startPointer = 0;
    let startScroll = 0;

    bar.thumb.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      bar.thumb.setPointerCapture(event.pointerId);
      startPointer = direction === 'y' ? event.clientY : event.clientX;
      startScroll = direction === 'y' ? viewport.scrollTop : viewport.scrollLeft;
      root.dataset.dragging = direction;
      markActive();
    });

    bar.thumb.addEventListener('pointermove', (event) => {
      if (!bar.thumb.hasPointerCapture(event.pointerId)) return;
      const track = direction === 'y' ? bar.el.clientHeight : bar.el.clientWidth;
      const thumbSize = direction === 'y' ? bar.thumb.offsetHeight : bar.thumb.offsetWidth;
      const maxThumb = track - thumbSize;
      if (maxThumb <= 0) return;

      const delta = (direction === 'y' ? event.clientY : event.clientX) - startPointer;
      const view = direction === 'y' ? viewport.clientHeight : viewport.clientWidth;
      const total = direction === 'y' ? viewport.scrollHeight : viewport.scrollWidth;
      const maxScroll = total - view;
      const target = startScroll + (delta / maxThumb) * maxScroll;

      if (direction === 'y') viewport.scrollTop = target;
      else viewport.scrollLeft = target;
    });

    const end = (event: PointerEvent): void => {
      if (bar.thumb.hasPointerCapture(event.pointerId)) bar.thumb.releasePointerCapture(event.pointerId);
      delete root.dataset.dragging;
    };
    bar.thumb.addEventListener('pointerup', end);
    bar.thumb.addEventListener('pointercancel', end);

    bar.el.addEventListener('pointerdown', (event) => {
      if (event.target === bar.thumb) return;
      event.preventDefault();
      const rect = bar.el.getBoundingClientRect();
      if (direction === 'y') {
        const ratio = (event.clientY - rect.top) / rect.height;
        viewport.scrollTop = ratio * viewport.scrollHeight - viewport.clientHeight / 2;
      } else {
        const ratio = (event.clientX - rect.left) / rect.width;
        viewport.scrollLeft = ratio * viewport.scrollWidth - viewport.clientWidth / 2;
      }
      markActive();
    });
  };

  bindDrag(vertical, 'y');
  bindDrag(horizontal, 'x');

  const onScroll = (): void => {
    scheduleUpdate();
    markActive();
  };

  viewport.addEventListener('scroll', onScroll, { passive: true });
  viewport.addEventListener('pointerenter', markActive);

  const observer = new ResizeObserver(scheduleUpdate);
  observer.observe(viewport);
  observer.observe(content);
  window.addEventListener('resize', scheduleUpdate);

  scheduleUpdate();

  return {
    el: root,
    viewport,
    content,
    scrollTo(to: ScrollToOptions): void {
      viewport.scrollTo({
        top: to.top,
        left: to.left,
        behavior: to.behavior ?? 'auto',
      });
    },
    refresh(): void {
      scheduleUpdate();
    },
    destroy(): void {
      observer.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
      window.clearTimeout(activeTimer);
      if (frame) cancelAnimationFrame(frame);
      root.remove();
    },
  };
}
