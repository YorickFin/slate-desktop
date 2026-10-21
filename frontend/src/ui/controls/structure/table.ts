/** T-B 领地：自绘表格 —— 粘性表头、排序、选中、空态；滚动复用 ScrollArea [#A.010][#A.014] */
import { clear, el } from '../../core/dom';
import { createScrollArea, type ScrollAreaHandle } from '../../core/scroll-area';
import { icon } from '../../icons';

export interface TableColumn<T> {
  key: string;
  title: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?(row: T): Node | string;
}

export interface TableOptions<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey(row: T): string;
  selectable?: boolean;
  onRowClick?(row: T): void;
  emptyText?: string;
}

export interface TableHandle<T> {
  readonly el: HTMLElement;
  setRows(rows: T[]): void;
  getSelectedKeys(): string[];
  setSelectedKeys(keys: string[]): void;
  destroy(): void;
}

type SortDirection = 'asc' | 'desc';

export function createTable<T>(options: TableOptions<T>): TableHandle<T> {
  let rows = options.rows.slice();
  let sortKey: string | null = null;
  let sortDirection: SortDirection | null = null;
  const selected = new Set<string>();

  const scroll: ScrollAreaHandle = createScrollArea({
    axis: 'both',
    class: 'ui-table-scroll',
    label: '数据表格',
  });

  const table = el('table', { class: 'ui-table-table', 'aria-label': '数据表格' });
  const thead = el('thead');
  const headRow = el('tr');
  const tbody = el('tbody');
  thead.append(headRow);
  table.append(thead, tbody);
  scroll.content.append(table);

  const root = el('div', { class: 'ui-table' }, [scroll.el]);

  const headerCells = new Map<string, HTMLTableCellElement>();
  const sortSlots = new Map<string, HTMLElement>();
  const rowEls = new Map<string, HTMLTableRowElement>();
  const rowChecks = new Map<string, HTMLButtonElement>();
  let headerCheck: HTMLButtonElement | null = null;

  const keys = (): string[] => rows.map((row) => options.rowKey(row));

  const rawValue = (row: T, key: string): unknown => (row as Record<string, unknown>)[key];

  const selectionState = (): 'none' | 'some' | 'all' => {
    const all = keys();
    if (all.length === 0) return 'none';
    let count = 0;
    for (const key of all) if (selected.has(key)) count += 1;
    return count === 0 ? 'none' : count === all.length ? 'all' : 'some';
  };

  const createCheck = (label: string, onClick: (event: MouseEvent) => void): HTMLButtonElement => {
    const check = el(
      'button',
      {
        class: 'ui-check',
        type: 'button',
        role: 'checkbox',
        'aria-checked': 'false',
        'aria-label': label,
        dataset: { state: 'none' },
      },
      [
        el('span', { class: 'ui-check-mark' }, [icon('check', 11)]),
        el('span', { class: 'ui-check-dash', 'aria-hidden': 'true' }),
      ],
    );
    check.addEventListener('click', onClick);
    return check;
  };

  const syncHeader = (): void => {
    if (headerCheck) {
      const state = selectionState();
      headerCheck.dataset.state = state;
      headerCheck.setAttribute('aria-checked', state === 'all' ? 'true' : state === 'some' ? 'mixed' : 'false');
      headerCheck.setAttribute('aria-label', state === 'all' ? '取消全选' : '全选');
    }
    for (const column of options.columns) {
      const cell = headerCells.get(column.key);
      if (!cell) continue;
      const direction = sortKey === column.key ? sortDirection : null;
      cell.setAttribute(
        'aria-sort',
        direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none',
      );
      const slot = sortSlots.get(column.key);
      if (slot) {
        slot.replaceChildren(
          icon(direction === 'asc' ? 'chevron-up' : direction === 'desc' ? 'chevron-down' : 'sort', 12),
        );
        slot.dataset.active = direction ? 'true' : 'false';
      }
    }
  };

  const syncSelection = (): void => {
    for (const [key, row] of rowEls) {
      const on = selected.has(key);
      row.dataset.selected = on ? 'true' : 'false';
      const check = rowChecks.get(key);
      if (check) {
        check.dataset.state = on ? 'all' : 'none';
        check.setAttribute('aria-checked', on ? 'true' : 'false');
        check.setAttribute('aria-label', on ? '取消选择该行' : '选择该行');
      }
    }
    syncHeader();
  };

  const toggleRow = (key: string): void => {
    if (selected.has(key)) selected.delete(key);
    else selected.add(key);
    syncSelection();
  };

  const toggleAll = (): void => {
    const all = keys();
    if (selectionState() === 'all') {
      for (const key of all) selected.delete(key);
    } else {
      for (const key of all) selected.add(key);
    }
    syncSelection();
  };

  const sortedRows = (): T[] => {
    const key = sortKey;
    const direction = sortDirection;
    if (!key || !direction) return rows;
    const factor = direction === 'asc' ? 1 : -1;
    return rows.slice().sort((a, b) => {
      const left = rawValue(a, key);
      const right = rawValue(b, key);
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * factor;
      const leftText = left === null || left === undefined ? '' : String(left);
      const rightText = right === null || right === undefined ? '' : String(right);
      return leftText.localeCompare(rightText, 'zh-Hans-CN', { numeric: true }) * factor;
    });
  };

  const renderRows = (): void => {
    clear(tbody);
    rowEls.clear();
    rowChecks.clear();
    const list = sortedRows();
    const columnCount = options.columns.length + (options.selectable ? 1 : 0);

    if (list.length === 0) {
      const row = el('tr', { class: 'ui-table-empty-row' });
      row.append(
        el('td', {
          class: 'ui-table-empty',
          colspan: String(columnCount),
          text: options.emptyText ?? '暂无数据',
        }),
      );
      tbody.append(row);
      return;
    }

    for (const item of list) {
      const key = options.rowKey(item);
      const on = selected.has(key);
      const row = el('tr', {
        class: 'ui-table-row',
        dataset: {
          key,
          selected: on ? 'true' : 'false',
          clickable: options.onRowClick ? 'true' : 'false',
        },
      });
      if (options.onRowClick) {
        row.addEventListener('click', () => options.onRowClick?.(item));
      }
      if (options.selectable) {
        const cell = el('td', { class: 'ui-table-check-cell' });
        cell.addEventListener('click', (event) => event.stopPropagation());
        const check = createCheck(on ? '取消选择该行' : '选择该行', (event) => {
          event.stopPropagation();
          toggleRow(key);
        });
        if (on) {
          check.dataset.state = 'all';
          check.setAttribute('aria-checked', 'true');
        }
        cell.append(check);
        row.append(cell);
        rowChecks.set(key, check);
      }
      for (const column of options.columns) {
        const cell = el('td', {
          class: 'ui-table-td',
          dataset: { align: column.align ?? 'left' },
        });
        if (column.render) {
          const output = column.render(item);
          if (typeof output === 'string') cell.textContent = output;
          else cell.append(output);
        } else {
          const value = rawValue(item, column.key);
          cell.textContent = value === null || value === undefined ? '—' : String(value);
        }
        row.append(cell);
      }
      rowEls.set(key, row);
      tbody.append(row);
    }
  };

  const toggleSort = (key: string): void => {
    if (sortKey !== key) {
      sortKey = key;
      sortDirection = 'asc';
    } else if (sortDirection === 'asc') {
      sortDirection = 'desc';
    } else if (sortDirection === 'desc') {
      sortDirection = null;
      sortKey = null;
    } else {
      sortDirection = 'asc';
    }
    syncHeader();
    renderRows();
  };

  const buildHeader = (): void => {
    headerCells.clear();
    sortSlots.clear();
    clear(headRow);
    if (options.selectable) {
      const cell = el('th', { class: 'ui-table-check-cell', scope: 'col' });
      headerCheck = createCheck('全选', () => toggleAll());
      cell.append(headerCheck);
      headRow.append(cell);
    }
    for (const column of options.columns) {
      const cell = el('th', {
        scope: 'col',
        class: 'ui-table-th',
        dataset: { align: column.align ?? 'left' },
        style: column.width ? { width: column.width } : {},
      });
      if (column.sortable) {
        const slot = el(
          'span',
          { class: 'ui-table-sort-icon', dataset: { active: 'false' } },
          [icon('sort', 12)],
        );
        sortSlots.set(column.key, slot);
        const button = el(
          'button',
          {
            class: 'ui-table-sort',
            type: 'button',
            'aria-label': `按 ${column.title} 排序`,
          },
          [el('span', { text: column.title }), slot],
        );
        button.addEventListener('click', () => toggleSort(column.key));
        cell.append(button);
      } else {
        cell.append(el('span', { class: 'ui-table-th-label', text: column.title }));
      }
      headerCells.set(column.key, cell);
      headRow.append(cell);
    }
    syncHeader();
  };

  const render = (): void => {
    buildHeader();
    renderRows();
  };

  render();
  scroll.refresh();

  return {
    el: root,
    setRows(next: T[]): void {
      rows = next.slice();
      const valid = new Set(keys());
      for (const key of Array.from(selected)) {
        if (!valid.has(key)) selected.delete(key);
      }
      renderRows();
      syncHeader();
      scroll.refresh();
    },
    getSelectedKeys(): string[] {
      return Array.from(selected);
    },
    setSelectedKeys(list: string[]): void {
      const valid = new Set(keys());
      selected.clear();
      for (const key of list) if (valid.has(key)) selected.add(key);
      syncSelection();
    },
    destroy(): void {
      scroll.destroy();
      root.remove();
    },
  };
}
