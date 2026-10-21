/**
 * 控件公共契约 [#A.010]
 * 所有自绘控件均为工厂函数：入参 options，出参 handle。
 * handle 至少包含 el 与 destroy；不得依赖全局单例。
 */

export type ControlSize = 'sm' | 'md' | 'lg';
export type ControlVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ControlHandle<E extends HTMLElement = HTMLElement> {
  readonly el: E;
  destroy(): void;
}

export type ChangeHandler<T> = (value: T) => void;

export interface ControlStateOptions {
  disabled?: boolean;
  size?: ControlSize;
}
