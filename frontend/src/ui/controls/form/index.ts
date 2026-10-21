/**
 * T-A 文件领地：表单控件统一导出。
 * 禁止其他轨编辑本文件。
 */
import './form.css';

export { createInput } from './input';
export type { InputHandle, InputOptions } from './input';

export { createTextarea } from './textarea';
export type { TextareaHandle, TextareaOptions } from './textarea';

export { createSelect } from './select';
export type { SelectHandle, SelectOption, SelectOptions } from './select';

export { createCheckbox } from './checkbox';
export type { CheckboxHandle, CheckboxOptions } from './checkbox';

export { createRadioGroup } from './radio-group';
export type { RadioGroupHandle, RadioGroupOptions } from './radio-group';

export { createSwitch } from './switch';
export type { SwitchHandle, SwitchOptions } from './switch';

export { createSlider } from './slider';
export type { SliderHandle, SliderOptions } from './slider';
