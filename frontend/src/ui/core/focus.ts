/** 焦点陷阱：弹窗/抽屉内循环 Tab [#A.012] */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (node) => node.offsetParent !== null || node === document.activeElement,
  );
}

export interface FocusTrap {
  activate(): void;
  deactivate(): void;
}

export function createFocusTrap(root: HTMLElement): FocusTrap {
  let previous: HTMLElement | null = null;

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') return;
    const items = focusableWithin(root);
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;
    const inside = active !== null && root.contains(active);

    if (event.shiftKey && (!inside || active === first)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (!inside || active === last)) {
      event.preventDefault();
      first.focus();
    }
  };

  return {
    activate(): void {
      previous = document.activeElement as HTMLElement | null;
      root.addEventListener('keydown', onKeyDown);
      const target = root.querySelector<HTMLElement>('[data-autofocus]') ?? focusableWithin(root)[0] ?? root;
      if (!target.hasAttribute('tabindex') && target === root) target.setAttribute('tabindex', '-1');
      target.focus();
    },
    deactivate(): void {
      root.removeEventListener('keydown', onKeyDown);
      if (previous && document.contains(previous)) previous.focus();
      previous = null;
    },
  };
}
