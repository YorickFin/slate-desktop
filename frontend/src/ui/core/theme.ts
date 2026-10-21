/** 主题解析：light / dark / system [#A.020] */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const media = window.matchMedia('(prefers-color-scheme: dark)');
let mode: ThemeMode = 'system';

function resolve(next: ThemeMode): ResolvedTheme {
  if (next === 'system') return media.matches ? 'dark' : 'light';
  return next;
}

export function applyTheme(next: ThemeMode): void {
  mode = next;
  const resolved = resolve(next);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;

  root.classList.add('theme-switching');
  window.setTimeout(() => root.classList.remove('theme-switching'), 260);
}

export function getThemeMode(): ThemeMode {
  return mode;
}

media.addEventListener('change', () => {
  if (mode === 'system') applyTheme('system');
});
