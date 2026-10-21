/** Slate 前端入口 [#A.016] */
import './styles/tokens.css';
import './styles/base.css';
import './styles/primitives.css';

import { renderFormControlsPage } from './app/pages/form-controls';
import { renderStructureControlsPage } from './app/pages/structure-controls';
import { renderSystemPage } from './app/pages/system';
import type { PageModule } from './app/router';
import { startRouter } from './app/router';
import { createShell } from './app/shell';
import { createTitlebar } from './app/titlebar';
import { bridge } from './bridge/client';
import { PROTOCOL_VERSION } from './bridge/protocol';
import { applyTheme } from './ui/core/theme';

const routes: PageModule[] = [
  {
    id: 'form',
    label: '表单控件',
    icon: 'sliders',
    description: '输入、选择与开关类控件的自绘实现与状态展示。',
    render: renderFormControlsPage,
  },
  {
    id: 'structure',
    label: '结构控件',
    icon: 'layers',
    description: '标签页、弹窗、Toast 与表格；滚动统一使用自绘滚动条。',
    render: renderStructureControlsPage,
  },
  {
    id: 'system',
    label: '运行状态',
    icon: 'activity',
    description: '桥接协议、后端信息、窗口状态与运行时配置。',
    render: renderSystemPage,
  },
];

async function boot(): Promise<void> {
  applyTheme('system');

  // 全局禁用右键菜单与文本拖拽（输入框内文本选择由 base.css 放行）
  document.addEventListener('contextmenu', (event) => event.preventDefault());
  document.addEventListener('dragstart', (event) => event.preventDefault());

  bridge.installEventSink();

  const shell = createShell(routes);
  const titlebar = createTitlebar({ title: 'Slate 工作台' });
  shell.titlebar.append(titlebar.el);
  document.getElementById('app')?.append(shell.el);
  startRouter(routes, shell);

  bridge.onStatus((status) => {
    if (status === 'connecting') shell.setStatus('正在连接后端…');
    if (status === 'unavailable') shell.setStatus('浏览器预览模式 · 后端未连接', 'warn');
  });

  bridge.on('system.tick', (payload) => {
    shell.setMeta(`tick #${payload.seq} · ${Math.round(payload.uptimeMs / 1000)}s`);
  });

  bridge.on('config.changed', (payload) => {
    applyTheme(payload.ui.theme);
  });

  try {
    await bridge.connect(4000);
    const hello = await bridge.call('bridge.hello', {
      client: 'slate-ui',
      protocol: PROTOCOL_VERSION,
    });
    shell.setStatus(`桥接就绪 · ${hello.server}`, 'ok');

    try {
      const config = await bridge.call('config.get', {});
      applyTheme(config.ui.theme);
      document.documentElement.dataset.density = config.ui.density;
    } catch (error) {
      console.warn('[boot] 读取配置失败', error);
    }
  } catch (error) {
    console.warn('[boot] 桥接不可用', error);
    shell.setStatus('浏览器预览模式 · 后端未连接', 'warn');
  }
}

void boot();
