/** T-A 领地：表单控件演示页。 */
import { el } from '../../ui/core/dom';
import { createScrollArea } from '../../ui/core/scroll-area';
import {
  createCheckbox,
  createInput,
  createRadioGroup,
  createSelect,
  createSlider,
  createSwitch,
  createTextarea,
  type SelectOption,
} from '../../ui/controls/form';

function readout(text: string): HTMLElement {
  return el('span', { class: 'ui-form-readout', text });
}

function field(label: string, control: HTMLElement, note?: HTMLElement, wide = false): HTMLElement {
  return el('div', { class: `ui-form-field${wide ? ' ui-form-field--wide' : ''}` }, [
    el('span', { class: 'ui-form-field-label', text: label }),
    control,
    note ?? null,
  ]);
}

function section(title: string, desc: string, items: HTMLElement[]): HTMLElement {
  return el('section', { class: 'ui-form-section' }, [
    el('div', { class: 'ui-form-section-head' }, [
      el('h2', { class: 'ui-form-section-title', text: title }),
      el('p', { class: 'ui-form-section-desc', text: desc }),
    ]),
    el('div', { class: 'ui-form-grid' }, items),
  ]);
}

export function renderFormControlsPage(): HTMLElement {
  const scroll = createScrollArea({ axis: 'y', class: 'ui-form-page', label: '表单控件演示' });

  /* ---------- 文本输入 ---------- */
  const inputValue = readout('当前值：');
  const input = createInput({
    placeholder: '输入文本…',
    onInput: (value) => {
      inputValue.textContent = `当前值：${value || '（空）'}`;
    },
    onEnter: (value) => {
      inputValue.textContent = `已回车：${value || '（空）'}`;
    },
  });

  const searchInput = createInput({ type: 'search', size: 'sm', placeholder: '搜索关键字' });
  const passwordInput = createInput({ type: 'password', size: 'lg', placeholder: '密码' });
  const numberInput = createInput({ type: 'number', value: '12', placeholder: '数字' });
  const disabledInput = createInput({ value: '不可编辑内容', disabled: true });
  const invalidInput = createInput({ value: '格式不正确', invalid: true });

  const textareaValue = readout('当前长度：0');
  const textarea = createTextarea({
    rows: 3,
    maxLength: 120,
    placeholder: '多行文本，限 120 字',
    onInput: (value) => {
      textareaValue.textContent = `当前长度：${value.length}`;
    },
  });
  const invalidTextarea = createTextarea({ rows: 2, value: '内容超出限制', invalid: true });
  const disabledTextarea = createTextarea({ rows: 2, value: '禁用状态的多行文本', disabled: true });

  const textSection = section(
    '文本输入',
    'Input 与 Textarea 内部使用原生编辑元素，但边框、焦点环与错误态全部自绘；数字类型不显示原生增减按钮。',
    [
      field('默认（md）', input.el, inputValue),
      field('搜索（sm）', searchInput.el, readout('type = search')),
      field('密码（lg）', passwordInput.el, readout('type = password')),
      field('数字（md）', numberInput.el, readout('type = number')),
      field('禁用态', disabledInput.el),
      field('错误态', invalidInput.el),
      field('多行文本（限 120 字）', textarea.el, textareaValue, true),
      field('多行 · 错误态', invalidTextarea.el),
      field('多行 · 禁用态', disabledTextarea.el),
    ],
  );

  /* ---------- 选择 ---------- */
  const fruitOptions: SelectOption[] = [
    { value: 'apple', label: '苹果', description: '清脆、微酸' },
    { value: 'banana', label: '香蕉' },
    { value: 'cherry', label: '樱桃', description: '当季限量' },
    { value: 'durian', label: '榴莲', description: '暂不可选', disabled: true },
    { value: 'elderberry', label: '接骨木果' },
  ];

  const selectValue = readout('当前值：');
  const select = createSelect({
    placeholder: '请选择水果',
    options: fruitOptions,
    onChange: (value) => {
      selectValue.textContent = `当前值：${value}`;
    },
  });

  const smallSelect = createSelect({
    size: 'sm',
    value: 'banana',
    options: fruitOptions,
  });

  const invalidSelect = createSelect({ placeholder: '未选择（错误态）', invalid: true, options: fruitOptions });
  const disabledSelect = createSelect({ value: 'apple', disabled: true, options: fruitOptions });

  const manyOptions: SelectOption[] = Array.from({ length: 12 }, (_, index) => ({
    value: `opt-${index + 1}`,
    label: `选项 ${String(index + 1).padStart(2, '0')}`,
    description: index % 3 === 0 ? '带描述文本，列表超过 8 条时使用自绘滚动区' : undefined,
  }));
  const manyValue = readout('当前值：');
  const manySelect = createSelect({
    placeholder: '选择一项（12 个选项）',
    options: manyOptions,
    onChange: (value) => {
      manyValue.textContent = `当前值：${value}`;
    },
  });

  const selectSection = section(
    '选择',
    'Select 弹层锚定在触发框下方，必要时自动上翻；选项超过 8 条时启用自绘滚动区，不出现原生滚动条。',
    [
      field('默认（含描述与禁用项）', select.el, selectValue),
      field('大小 sm', smallSelect.el, readout('size = sm')),
      field('错误态', invalidSelect.el),
      field('禁用态', disabledSelect.el),
      field('大量选项（自绘滚动）', manySelect.el, manyValue, true),
    ],
  );

  /* ---------- 勾选与单选 ---------- */
  const checkboxValue = readout('未勾选');
  const checkbox = createCheckbox({
    label: '接收更新通知',
    description: '每周一封，仅包含重要变更',
    onChange: (checked) => {
      checkboxValue.textContent = checked ? '已勾选' : '未勾选';
    },
  });

  const indeterminate = createCheckbox({
    checked: true,
    indeterminate: true,
    label: '部分选中（indeterminate）',
    description: 'aria-checked = mixed',
  });

  const disabledCheckbox = createCheckbox({ checked: true, disabled: true, label: '禁用且已勾选' });

  const radioValue = readout('当前值：balanced');
  const radio = createRadioGroup({
    name: 'density',
    value: 'balanced',
    options: [
      { value: 'compact', label: '紧凑', description: '同屏显示更多内容' },
      { value: 'balanced', label: '均衡', description: '默认密度' },
      { value: 'cozy', label: '宽松', description: '更大留白' },
    ],
    onChange: (value) => {
      radioValue.textContent = `当前值：${value}`;
    },
  });

  const horizontalRadio = createRadioGroup({
    name: 'align',
    value: 'left',
    direction: 'horizontal',
    options: [
      { value: 'left', label: '左对齐' },
      { value: 'center', label: '居中' },
      { value: 'right', label: '右对齐' },
    ],
  });

  const disabledRadio = createRadioGroup({
    name: 'locked',
    value: 'on',
    disabled: true,
    options: [
      { value: 'on', label: '已启用' },
      { value: 'off', label: '已停用' },
    ],
  });

  const choiceSection = section(
    '勾选与单选',
    'Checkbox 支持 mixed 状态；RadioGroup 采用 roving tabindex，方向键在组内移动并立即选中。',
    [
      field('复选框', checkbox.el, checkboxValue),
      field('复选框 · mixed', indeterminate.el),
      field('复选框 · 禁用', disabledCheckbox.el),
      field('单选 · 纵向', radio.el, radioValue),
      field('单选 · 横向', horizontalRadio.el),
      field('单选 · 禁用', disabledRadio.el),
    ],
  );

  /* ---------- 开关与滑块 ---------- */
  const switchValue = readout('当前：开启');
  const switchControl = createSwitch({
    checked: true,
    label: '自动保存',
    description: '修改后 2 秒写入本地配置',
    onChange: (checked) => {
      switchValue.textContent = `当前：${checked ? '开启' : '关闭'}`;
    },
  });

  const disabledSwitch = createSwitch({ checked: true, disabled: true, label: '禁用开关' });

  const sliderValue = readout('当前值：40');
  const slider = createSlider({
    value: 40,
    showValue: true,
    onInput: (value) => {
      sliderValue.textContent = `当前值：${value}`;
    },
    onCommit: (value) => {
      sliderValue.textContent = `已提交：${value}`;
    },
  });

  const percentSlider = createSlider({
    min: 0,
    max: 100,
    step: 5,
    value: 60,
    showValue: true,
    format: (value) => `${value}%`,
  });

  const disabledSlider = createSlider({ value: 30, disabled: true, showValue: true });

  const rangeSection = section(
    '开关与滑块',
    'Switch 的轨道与滑块全部自绘；Slider 使用 Pointer Events + setPointerCapture，键盘可按步进、Home/End 与 PageUp/PageDown 调整。',
    [
      field('开关', switchControl.el, switchValue),
      field('开关 · 禁用', disabledSwitch.el),
      field('滑块（步进 1）', slider.el, sliderValue),
      field('滑块（格式化为百分比，步进 5）', percentSlider.el),
      field('滑块 · 禁用', disabledSlider.el),
    ],
  );

  scroll.content.append(
    el('div', { class: 'ui-form-page-inner' }, [textSection, selectSection, choiceSection, rangeSection]),
  );

  return scroll.el;
}
