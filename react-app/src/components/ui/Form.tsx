import React, { createContext, useContext, useCallback, useState } from 'react';

import { cn } from '../../utils/cn';

import Button from './Button';
import Input from './Input';
import Loading from './Loading';

// 表单验证规则类型
export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  validator?: (value: any, formData: Record<string, any>) => string | null;
  message?: string;
}

// 表单字段配置
export interface FormField {
  name: string;
  label?: string;
  type?:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'tel'
    | 'url'
    | 'search'
    | 'textarea'
    | 'select'
    | 'checkbox'
    | 'radio'
    | 'file'
    | 'date'
    | 'time'
    | 'datetime-local'
    | 'custom';
  placeholder?: string;
  defaultValue?: any;
  rules?: ValidationRule[];
  disabled?: boolean;
  hidden?: boolean;
  options?: Array<{ label: string; value: any; disabled?: boolean }>;
  render?: (props: {
    value: any;
    onChange: (value: any) => void;
    error?: string;
    field: FormField;
  }) => React.ReactNode;
  dependencies?: string[]; // 依赖的其他字段
  className?: string;
  description?: string;
  tooltip?: string;
}

// 表单错误类型
export interface FormErrors {
  [fieldName: string]: string;
}

// 表单值类型
export interface FormValues {
  [fieldName: string]: any;
}

// 表单上下文类型
interface FormContextType {
  values: FormValues;
  errors: FormErrors;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValidating: boolean;
  setValue: (name: string, value: any) => void;
  setError: (name: string, error: string) => void;
  clearError: (name: string) => void;
  setTouched: (name: string, touched: boolean) => void;
  validateField: (name: string) => Promise<boolean>;
  validateForm: () => Promise<boolean>;
  resetForm: () => void;
  submitForm: () => Promise<void>;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

// Hook for accessing form context
export const useForm = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useForm must be used within a Form component');
  }
  return context;
};

// 表单项组件属性
export interface FormItemProps {
  name: string;
  label?: string;
  required?: boolean;
  error?: string;
  description?: string;
  tooltip?: string;
  layout?: 'vertical' | 'horizontal' | 'inline';
  labelWidth?: string | number;
  className?: string;
  labelClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

// 表单项组件
export const FormItem: React.FC<FormItemProps> = ({
  name,
  label,
  required,
  error,
  description,
  tooltip,
  layout = 'vertical',
  labelWidth,
  className,
  labelClassName,
  contentClassName,
  children,
}) => {
  const { errors, touched } = useForm();
  const fieldError = error || (touched[name] ? errors[name] : undefined);
  const hasError = Boolean(fieldError);

  const layoutClasses = {
    vertical: 'flex flex-col gap-2',
    horizontal: 'flex items-start gap-4',
    inline: 'flex items-center gap-2',
  };

  return (
    <div className={cn('form-item', layoutClasses[layout], className)}>
      {/* 标签 */}
      {label && (
        <label
          htmlFor={name}
          className={cn(
            'block text-sm font-medium text-gray-700 dark:text-gray-300',
            layout === 'horizontal' && 'flex-shrink-0',
            hasError && 'text-red-600 dark:text-red-400',
            labelClassName
          )}
          style={layout === 'horizontal' ? { width: labelWidth } : undefined}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          {tooltip && (
            <span className="ml-1 text-gray-400 hover:text-gray-600 cursor-help" title={tooltip}>
              <span className="w-3 h-3 inline">ℹ️</span>
            </span>
          )}
        </label>
      )}

      {/* 内容区域 */}
      <div className={cn('flex-1', contentClassName)}>
        {children}

        {/* 描述文本 */}
        {description && !hasError && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}

        {/* 错误信息 */}
        {hasError && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <span className="w-3 h-3">⚠️</span>
            {fieldError}
          </p>
        )}
      </div>
    </div>
  );
};

// 表单字段组件
export interface FormFieldProps {
  field: FormField;
  layout?: 'vertical' | 'horizontal' | 'inline';
  labelWidth?: string | number;
  className?: string;
}

export const FormFieldComponent: React.FC<FormFieldProps> = ({
  field,
  layout = 'vertical',
  labelWidth,
  className,
}) => {
  const { values, errors, touched, setValue, setTouched, validateField } = useForm();

  const value = values[field.name] ?? field.defaultValue ?? '';
  const error = touched[field.name] ? errors[field.name] : undefined;
  const hasError = Boolean(error);

  const handleChange = useCallback(
    async (newValue: any) => {
      setValue(field.name, newValue);
      setTouched(field.name, true);

      // 延迟验证以避免输入时频繁验证
      setTimeout(() => {
        validateField(field.name);
      }, 300);
    },
    [field.name, setValue, setTouched, validateField]
  );

  const handleBlur = useCallback(() => {
    setTouched(field.name, true);
    validateField(field.name);
  }, [field.name, setTouched, validateField]);

  // 如果字段被隐藏，不渲染
  if (field.hidden) {
    return null;
  }

  // 自定义渲染
  if (field.render) {
    return (
      <FormItem
        name={field.name}
        label={field.label}
        required={field.rules?.some(rule => rule.required)}
        error={error}
        description={field.description}
        tooltip={field.tooltip}
        layout={layout}
        labelWidth={labelWidth}
        className={className}
      >
        {field.render({
          value,
          onChange: handleChange,
          error,
          field,
        })}
      </FormItem>
    );
  }

  // 渲染不同类型的输入组件
  const renderInput = () => {
    const commonProps = {
      id: field.name,
      name: field.name,
      value,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
      ) => {
        const newValue =
          field.type === 'checkbox'
            ? (e.target as HTMLInputElement).checked
            : field.type === 'number'
              ? Number(e.target.value)
              : e.target.value;
        handleChange(newValue);
      },
      onBlur: handleBlur,
      disabled: field.disabled,
      placeholder: field.placeholder,
      error: hasError,
      className: field.className,
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={4}
            className={cn(
              'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100',
              hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              field.disabled && 'opacity-50 cursor-not-allowed',
              field.className
            )}
          />
        );

      case 'select':
        return (
          <select
            {...commonProps}
            className={cn(
              'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100',
              hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              field.disabled && 'opacity-50 cursor-not-allowed',
              field.className
            )}
          >
            {field.placeholder && <option value="">{field.placeholder}</option>}
            {field.options?.map(option => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              {...commonProps}
              type="checkbox"
              checked={Boolean(value)}
              className={cn(
                'rounded border-gray-300 text-blue-600 focus:ring-blue-500',
                hasError && 'border-red-500 focus:ring-red-500',
                field.disabled && 'opacity-50 cursor-not-allowed',
                field.className
              )}
            />
            {field.label && (
              <label htmlFor={field.name} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {field.label}
              </label>
            )}
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <div key={option.value} className="flex items-center">
                <input
                  id={`${field.name}-${option.value}`}
                  name={field.name}
                  type="radio"
                  value={option.value}
                  checked={value === option.value}
                  onChange={e => handleChange(e.target.value)}
                  onBlur={handleBlur}
                  disabled={field.disabled || option.disabled}
                  className={cn(
                    'border-gray-300 text-blue-600 focus:ring-blue-500',
                    hasError && 'border-red-500 focus:ring-red-500',
                    (field.disabled || option.disabled) && 'opacity-50 cursor-not-allowed'
                  )}
                />
                <label
                  htmlFor={`${field.name}-${option.value}`}
                  className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );

      case 'file':
        return (
          <input
            {...commonProps}
            type="file"
            onChange={e => {
              const files = e.target.files;
              handleChange(files ? Array.from(files) : null);
            }}
            className={cn(
              'block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300',
              hasError && 'border-red-500',
              field.disabled && 'opacity-50 cursor-not-allowed',
              field.className
            )}
          />
        );

      default:
        return (
          <Input
            id={field.name}
            name={field.name}
            type={field.type || 'text'}
            value={value}
            onChange={e => handleChange(e.target.value)}
            onBlur={handleBlur}
            disabled={field.disabled}
            placeholder={field.placeholder}
            className={field.className}
            state={hasError ? 'error' : touched[field.name] ? 'success' : 'default'}
            errorMessage={hasError ? error : undefined}
          />
        );
    }
  };

  return (
    <FormItem
      name={field.name}
      label={field.type === 'checkbox' ? undefined : field.label}
      required={field.rules?.some(rule => rule.required)}
      error={error}
      description={field.description}
      tooltip={field.tooltip}
      layout={layout}
      labelWidth={labelWidth}
      className={className}
    >
      {renderInput()}
    </FormItem>
  );
};

// 主表单组件属性
export interface FormProps {
  fields?: FormField[];
  initialValues?: FormValues;
  onSubmit?: (values: FormValues) => Promise<void> | void;
  onValuesChange?: (changedValues: FormValues, allValues: FormValues) => void;
  layout?: 'vertical' | 'horizontal' | 'inline';
  labelWidth?: string | number;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  submitText?: string;
  resetText?: string;
  showSubmitButton?: boolean;
  showResetButton?: boolean;
  submitButtonProps?: any;
  resetButtonProps?: any;
}

// 主表单组件
export const Form: React.FC<FormProps> = ({
  fields = [],
  initialValues = {},
  onSubmit,
  onValuesChange,
  layout = 'vertical',
  labelWidth,
  size = 'md',
  disabled = false,
  loading = false,
  className,
  children,
  validateOnChange = true,
  validateOnBlur = true,
  submitText = '提交',
  resetText = '重置',
  showSubmitButton = true,
  showResetButton = false,
  submitButtonProps = {},
  resetButtonProps = {},
}) => {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouchedState] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // 验证单个字段
  const validateField = useCallback(
    async (name: string): Promise<boolean> => {
      const field = fields.find(f => f.name === name);
      if (!field || !field.rules) return true;

      const value = values[name];
      let error: string | null = null;

      for (const rule of field.rules) {
        // Required validation
        if (rule.required && (value === undefined || value === null || value === '')) {
          error = rule.message || `${field.label || field.name} 是必填项`;
          break;
        }

        // Skip other validations if value is empty and not required
        if (!rule.required && (value === undefined || value === null || value === '')) {
          continue;
        }

        // Min/Max validation for numbers
        if (typeof value === 'number') {
          if (rule.min !== undefined && value < rule.min) {
            error = rule.message || `${field.label || field.name} 不能小于 ${rule.min}`;
            break;
          }
          if (rule.max !== undefined && value > rule.max) {
            error = rule.message || `${field.label || field.name} 不能大于 ${rule.max}`;
            break;
          }
        }

        // MinLength/MaxLength validation for strings
        if (typeof value === 'string') {
          if (rule.minLength !== undefined && value.length < rule.minLength) {
            error =
              rule.message || `${field.label || field.name} 长度不能少于 ${rule.minLength} 个字符`;
            break;
          }
          if (rule.maxLength !== undefined && value.length > rule.maxLength) {
            error =
              rule.message || `${field.label || field.name} 长度不能超过 ${rule.maxLength} 个字符`;
            break;
          }
        }

        // Pattern validation
        if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
          error = rule.message || `${field.label || field.name} 格式不正确`;
          break;
        }

        // Custom validator
        if (rule.validator) {
          error = rule.validator(value, values);
          if (error) break;
        }
      }

      if (error) {
        setErrors(prev => ({ ...prev, [name]: error! }));
        return false;
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
        return true;
      }
    },
    [fields, values]
  );

  // 验证整个表单
  const validateForm = useCallback(async (): Promise<boolean> => {
    setIsValidating(true);

    const validationPromises = fields.map(field => validateField(field.name));
    const results = await Promise.all(validationPromises);

    setIsValidating(false);
    return results.every(result => result);
  }, [fields, validateField]);

  // 设置字段值
  const setValue = useCallback(
    (name: string, value: any) => {
      setValues(prev => {
        const newValues = { ...prev, [name]: value };
        onValuesChange?.({ [name]: value }, newValues);
        return newValues;
      });
    },
    [onValuesChange]
  );

  // 设置字段错误
  const setError = useCallback((name: string, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  // 清除字段错误
  const clearError = useCallback((name: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }, []);

  // 设置字段触摸状态
  const setTouched = useCallback((name: string, touched: boolean) => {
    setTouchedState(prev => ({ ...prev, [name]: touched }));
  }, []);

  // 重置表单
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouchedState({});
  }, [initialValues]);

  // 提交表单
  const submitForm = useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // 标记所有字段为已触摸
      const allTouched = fields.reduce(
        (acc, field) => {
          acc[field.name] = true;
          return acc;
        },
        {} as Record<string, boolean>
      );
      setTouchedState(allTouched);

      // 验证表单
      const isValid = await validateForm();

      if (isValid && onSubmit) {
        await onSubmit(values);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, fields, validateForm, onSubmit, values]);

  const contextValue: FormContextType = {
    values,
    errors,
    touched,
    isSubmitting,
    isValidating,
    setValue,
    setError,
    clearError,
    setTouched,
    validateField,
    validateForm,
    resetForm,
    submitForm,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm();
  };

  return (
    <FormContext.Provider value={contextValue}>
      <form
        onSubmit={handleSubmit}
        className={cn('space-y-6', disabled && 'opacity-50 pointer-events-none', className)}
      >
        {/* 加载遮罩 */}
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex items-center justify-center z-10">
            <Loading />
          </div>
        )}

        {/* 渲染字段 */}
        {fields.map(field => (
          <FormFieldComponent
            key={field.name}
            field={field}
            layout={layout}
            labelWidth={labelWidth}
          />
        ))}

        {/* 自定义内容 */}
        {children}

        {/* 按钮组 */}
        {(showSubmitButton || showResetButton) && (
          <div className="flex items-center gap-4 pt-4">
            {showSubmitButton && (
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={disabled || isSubmitting}
                size={size}
                {...submitButtonProps}
              >
                {submitText}
              </Button>
            )}

            {showResetButton && (
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                disabled={disabled || isSubmitting}
                size={size}
                {...resetButtonProps}
              >
                {resetText}
              </Button>
            )}
          </div>
        )}
      </form>
    </FormContext.Provider>
  );
};

export default Form;
