/**
 * T-B 文件领地：结构/反馈控件统一导出。
 * 禁止其他轨编辑本文件。
 */
import './structure.css';

export { createTabs } from './tabs';
export type { TabItem, TabsHandle, TabsOptions } from './tabs';

export { createDialog, confirmDialog } from './dialog';
export type {
  ConfirmDialogOptions,
  DialogAction,
  DialogHandle,
  DialogOptions,
} from './dialog';

export { toast } from './toast';
export type { ToastHandle, ToastOptions, ToastTone } from './toast';

export { createTable } from './table';
export type { TableColumn, TableHandle, TableOptions } from './table';
