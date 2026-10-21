/** 哈希路由：页面模块契约 [#A.016] */
import type { Shell, ShellRoute } from './shell';

export interface PageModule extends ShellRoute {
  description: string;
  /** 每次进入路由调用一次；返回的节点由外壳挂载。 */
  render(): HTMLElement;
}

export function startRouter(routes: PageModule[], shell: Shell): () => void {
  const byId = new Map(routes.map((route) => [route.id, route]));
  const fallback = routes[0];

  const currentId = (): string => {
    const raw = location.hash.replace(/^#\/?/, '').trim();
    return byId.has(raw) ? raw : fallback.id;
  };

  const render = (): void => {
    const id = currentId();
    const page = byId.get(id) ?? fallback;
    shell.outlet.replaceChildren(page.render());
    shell.setPage(page.label, page.description);
    shell.setActive(page.id);
    if (location.hash !== `#/${page.id}`) {
      history.replaceState(null, '', `#/${page.id}`);
    }
  };

  window.addEventListener('hashchange', render);
  render();

  return () => window.removeEventListener('hashchange', render);
}
