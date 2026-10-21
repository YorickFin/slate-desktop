/** T-B 领地：结构/反馈控件演示页。 */
import { el } from '../../ui/core/dom';
import { createScrollArea } from '../../ui/core/scroll-area';
import { createButton } from '../../ui/controls/primitives/button';
import {
  confirmDialog,
  createDialog,
  createTable,
  createTabs,
  toast,
} from '../../ui/controls/structure';
import type { TableColumn, ToastTone } from '../../ui/controls/structure';

interface DemoRow {
  id: string;
  name: string;
  kind: string;
  status: string;
  updated: string;
  size: number;
}

const KINDS = ['控件', '页面', '脚本', '资源'] as const;
const STATUSES = ['正常', '待审', '归档'] as const;

function createRows(): DemoRow[] {
  return Array.from({ length: 40 }, (_, index) => ({
    id: `row-${index + 1}`,
    name: `工作项 ${String(index + 1).padStart(2, '0')}`,
    kind: KINDS[index % KINDS.length],
    status: STATUSES[index % STATUSES.length],
    updated: `2026-10-${String((index % 28) + 1).padStart(2, '0')}`,
    size: 16 + index * 6,
  }));
}

function section(title: string, description: string, body: HTMLElement): HTMLElement {
  return el('section', { class: 'structure-section' }, [
    el('header', { class: 'structure-section-head' }, [
      el('h2', { class: 'structure-section-title', text: title }),
      el('p', { class: 'structure-section-desc', text: description }),
    ]),
    body,
  ]);
}

function tabsSection(): HTMLElement {
  const panels = new Map<string, HTMLElement>();
  const tabs = createTabs({
    items: [
      { id: 'overview', label: '概览' },
      { id: 'keyboard', label: '键盘操作' },
      { id: 'usage', label: '使用约定', badge: '3' },
    ],
    value: 'overview',
    onChange: (id) => {
      for (const [key, panel] of panels) panel.hidden = key !== id;
    },
  });

  const base = tabs.el.dataset.base ?? '';

  const buildPanel = (id: string, title: string, children: HTMLElement[]): void => {
    const panel = el(
      'div',
      {
        class: 'structure-panel',
        role: 'tabpanel',
        id: `${base}-panel-${id}`,
        'aria-labelledby': `${base}-tab-${id}`,
        tabindex: '0',
        hidden: true,
      },
      [el('h3', { class: 'structure-panel-title', text: title }), ...children],
    );
    panels.set(id, panel);
  };

  buildPanel('overview', '自绘标签条', [
    el('p', {
      text: 'Tabs 只负责标签条与选中态，面板内容由调用方渲染；下划指示条使用令牌动效平滑移动。',
    }),
    el('p', {
      text: '切换标签后，面板通过 hidden 属性显隐，并保持 aria-controls 与 aria-labelledby 的对应关系。',
    }),
  ]);

  buildPanel('keyboard', '键盘操作', [
    el('p', { text: '聚焦标签后可用键盘完成全部切换，焦点始终停留在标签条内。' }),
    el('ul', {}, [
      el('li', {}, [el('code', { text: '← / →' }), ' 在前后的可用标签间循环切换']),
      el('li', {}, [el('code', { text: 'Home / End' }), ' 跳到首个或最后一个可用标签']),
      el('li', {}, [el('code', { text: 'Tab' }), ' 离开标签条进入面板或下一个焦点区']),
    ]),
  ]);

  buildPanel('usage', '使用约定', [
    el('ul', {}, [
      el('li', { text: '标签与面板的 id 由基础 id 派生，面板需使用相同规则拼接。' }),
      el('li', { text: 'setItems 后若当前值不存在，会回退到第一个可用项。' }),
      el('li', { text: '禁用标签保留在视觉序列中，但不参与键盘循环。' }),
    ]),
  ]);

  const first = panels.get('overview');
  if (first) first.hidden = false;

  const panelBox = el('div', {}, Array.from(panels.values()));
  const body = el('div', { class: 'structure-block' }, [tabs.el, panelBox]);
  return section('Tabs 标签页', '横向标签条、下划指示条与 roving tabindex。', body);
}

function dialogSection(): HTMLElement {
  const basicDialog = createDialog({
    title: '新建工作区',
    description: '普通对话框包含标题、描述、内容与右对齐操作区。',
    content: el('div', {}, [
      el('p', {
        text: '对话框使用统一的遮罩层与焦点陷阱，打开后焦点进入对话框，关闭后回到触发按钮。',
      }),
      el('p', { text: '按 ESC 或点击遮罩即可关闭；焦点循环被限制在对话框内部。' }),
    ]),
    actions: [
      { label: '取消' },
      {
        label: '创建工作区',
        variant: 'primary',
        onClick: () => {
          toast({ title: '工作区已创建', message: '这是主操作按钮的回调。', tone: 'success' });
        },
      },
    ],
  });

  const longContent = el('div', {});
  for (let index = 1; index <= 18; index += 1) {
    longContent.append(
      el('p', {
        text: `第 ${index} 段：内容超出可视高度时改由自绘 ScrollArea 承接滚动，标题与操作区保持固定。`,
      }),
    );
  }
  const longDialog = createDialog({
    title: '长内容对话框',
    description: '内容超过最大高度时在对话框内部滚动。',
    content: longContent,
    width: 520,
    actions: [{ label: '关闭' }],
  });

  const actions = el('div', { class: 'structure-actions' }, [
    createButton({ label: '普通对话框', onClick: () => basicDialog.open() }).el,
    createButton({
      label: '危险确认',
      variant: 'danger',
      onClick: () => {
        void confirmDialog({
          title: '删除工作区',
          message: '该操作不可撤销，工作区内的所有记录都会被移除。',
          confirmLabel: '删除',
          cancelLabel: '保留',
          tone: 'danger',
        }).then((confirmed) => {
          toast({
            title: confirmed ? '已确认删除' : '已取消操作',
            message: confirmed ? '危险动作需要在确认框中二次确认。' : '取消或 ESC 都会以 false 结束。',
            tone: confirmed ? 'danger' : 'info',
          });
        });
      },
    }).el,
    createButton({ label: '长内容对话框', onClick: () => longDialog.open() }).el,
  ]);

  return section('Dialog 与确认框', '模态遮罩、焦点陷阱、危险确认与长内容滚动。', actions);
}

function toastSection(): HTMLElement {
  const tones: ToastTone[] = ['info', 'success', 'warning', 'danger'];
  const labels: Record<ToastTone, string> = {
    info: '信息',
    success: '成功',
    warning: '警告',
    danger: '危险',
  };
  const messages: Record<ToastTone, string> = {
    info: '普通通知，3200ms 后自动关闭。',
    success: '操作已完成，可继续下一步。',
    warning: '需要注意的边界情况，请确认后再继续。',
    danger: '出现了失败或危险动作，请尽快处理。',
  };

  const row = el('div', { class: 'structure-actions' });
  for (const tone of tones) {
    row.append(
      createButton({
        label: labels[tone],
        onClick: () => {
          toast({ title: `${labels[tone]}通知`, message: messages[tone], tone });
        },
      }).el,
    );
  }

  return section('Toast 通知', '右下角堆叠，最多同时 4 条，悬停暂停自动关闭计时。', row);
}

function tableSection(): HTMLElement {
  const rows = createRows();
  const columns: TableColumn<DemoRow>[] = [
    { key: 'name', title: '名称', width: '12rem', sortable: true },
    { key: 'kind', title: '类型', width: '7rem' },
    { key: 'status', title: '状态', width: '7rem', align: 'center' },
    { key: 'updated', title: '更新时间', width: '9rem', sortable: true },
    {
      key: 'size',
      title: '大小 (KB)',
      width: '8rem',
      align: 'right',
      sortable: true,
      render: (row) => `${row.size} KB`,
    },
  ];

  const table = createTable<DemoRow>({
    columns,
    rows,
    rowKey: (row) => row.id,
    selectable: true,
    emptyText: '暂无数据，点击「切换空态」恢复示例数据。',
    onRowClick: (row) => {
      toast({ title: '行点击', message: `${row.name} · ${row.kind}`, durationMs: 1800 });
    },
  });

  let empty = false;
  const toggle = createButton({
    label: '切换空态',
    onClick: () => {
      empty = !empty;
      table.setRows(empty ? [] : rows);
      toggle.setLabel(empty ? '恢复示例数据' : '切换空态');
    },
  });

  const head = el('div', { class: 'structure-actions' }, [toggle.el]);
  const box = el('div', { class: 'structure-table-box' }, [table.el]);
  const body = el('div', { class: 'structure-block' }, [head, box]);
  return section('Table 表格', '40 行示例数据，5 列，可排序、可多选，粘性表头与自绘滚动。', body);
}

export function renderStructureControlsPage(): HTMLElement {
  const page = createScrollArea({ axis: 'y', class: 'structure-page', label: '结构控件演示' });
  const stack = el('div', { class: 'structure-stack' }, [
    tabsSection(),
    dialogSection(),
    toastSection(),
    tableSection(),
  ]);
  page.content.append(stack);
  return page.el;
}
