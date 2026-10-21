/**
 * DOM 构建工具 [#A.012]
 * 约束：不使用 innerHTML 注入动态内容；所有控件通过本模块创建节点。
 */

export type Child = Node | string | number | null | undefined | false;

type AttrValue = string | number | boolean | null | undefined | EventListener;
export interface ElementAttrs {
  class?: string;
  text?: string;
  dataset?: Record<string, string | number | boolean | null | undefined>;
  style?: Record<string, string | number | null | undefined>;
  [key: string]: unknown;
}

const toKebab = (key: string): string => key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

function appendChild(node: Node, child: Child): void {
  if (child === null || child === undefined || child === false) return;
  node.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
}

export function append(parent: Node, children: Child | Child[]): void {
  if (Array.isArray(children)) {
    for (const child of children) appendChild(parent, child);
    return;
  }
  appendChild(parent, children);
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: ElementAttrs = {},
  children: Child | Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  for (const [key, raw] of Object.entries(attrs)) {
    if (raw === null || raw === undefined || raw === false) continue;
    const value = raw as AttrValue;

    if (key === 'class') {
      node.className = String(value);
    } else if (key === 'text') {
      node.textContent = String(value);
    } else if (key === 'dataset') {
      for (const [dataKey, dataValue] of Object.entries(
        value as unknown as Record<string, string | number | boolean | null | undefined>,
      )) {
        if (dataValue === null || dataValue === undefined) continue;
        node.dataset[dataKey] = String(dataValue);
      }
    } else if (key === 'style') {
      if (typeof value === 'string') {
        node.style.cssText = value;
      } else {
        for (const [styleKey, styleValue] of Object.entries(
          value as unknown as Record<string, string | number | null | undefined>,
        )) {
          if (styleValue === null || styleValue === undefined) continue;
          node.style.setProperty(toKebab(styleKey), String(styleValue));
        }
      }
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (value === true) {
      node.setAttribute(key, '');
    } else {
      node.setAttribute(key, String(value));
    }
  }

  append(node, children);
  return node;
}

export function clear(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function fragment(...children: Child[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  append(frag, children);
  return frag;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
