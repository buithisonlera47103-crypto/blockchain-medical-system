/**
 * 类名值类型
 */
export type ClassValue = string | number | boolean | undefined | null | ClassValue[];

/**
 * 简单的类名合并函数
 * @param inputs - 类名输入
 * @returns 合并后的类名字符串
 */
export function cn(...inputs: ClassValue[]): string {
  return inputs.flat().filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * 条件性地应用类名
 * @param condition - 条件
 * @param trueClasses - 条件为真时的类名
 * @param falseClasses - 条件为假时的类名
 * @returns 类名字符串
 */
export function conditionalClass(
  condition: boolean,
  trueClasses: string,
  falseClasses: string = ''
): string {
  return condition ? trueClasses : falseClasses;
}

/**
 * 根据变体生成类名
 * @param base - 基础类名
 * @param variants - 变体映射
 * @param selectedVariant - 选中的变体
 * @returns 类名字符串
 */
export function variantClass<T extends string>(
  base: string,
  variants: Record<T, string>,
  selectedVariant: T
): string {
  return cn(base, variants[selectedVariant]);
}

/**
 * 生成响应式类名
 * @param classes - 响应式类名映射
 * @returns 类名字符串
 */
export function responsiveClass(classes: {
  base?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  '2xl'?: string;
}): string {
  const { base, sm, md, lg, xl, '2xl': xl2 } = classes;

  return cn(
    base,
    sm && `sm:${sm}`,
    md && `md:${md}`,
    lg && `lg:${lg}`,
    xl && `xl:${xl}`,
    xl2 && `2xl:${xl2}`
  );
}

/**
 * 生成状态类名
 * @param base - 基础类名
 * @param states - 状态映射
 * @returns 类名字符串
 */
export function stateClass(
  base: string,
  states: {
    hover?: string;
    focus?: string;
    active?: string;
    disabled?: string;
    loading?: string;
  }
): string {
  const { hover, focus, active, disabled, loading } = states;

  return cn(
    base,
    hover && `hover:${hover}`,
    focus && `focus:${focus}`,
    active && `active:${active}`,
    disabled && `disabled:${disabled}`,
    loading && `loading:${loading}`
  );
}

/**
 * 生成主题类名
 * @param lightClasses - 浅色主题类名
 * @param darkClasses - 深色主题类名
 * @returns 类名字符串
 */
export function themeClass(lightClasses: string, darkClasses: string): string {
  return cn(lightClasses, `dark:${darkClasses}`);
}
