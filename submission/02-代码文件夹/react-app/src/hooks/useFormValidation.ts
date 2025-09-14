import Joi from 'joi';
import { useState, useCallback, useRef, useEffect } from 'react';

import { RealTimeValidator, ValidationResult } from '../utils/validation';
// import { ValidationError } from '../utils/validation';

// Hook 选项接口
interface UseFormValidationOptions {
  validationMode?: 'onChange' | 'onBlur' | 'onSubmit' | 'all';
  revalidateMode?: 'onChange' | 'onBlur';
  debounceMs?: number;
  validateOnMount?: boolean;
}

// Hook 返回值接口
interface UseFormValidationReturn<T = any> {
  // 数据状态
  values: T;
  errors: Record<string, string>;
  isValid: boolean;
  isValidating: boolean;
  isDirty: boolean;
  touchedFields: Record<string, boolean>;

  // 操作方法
  setValue: (field: keyof T, value: any) => void;
  setValues: (values: Partial<T>) => void;
  setError: (field: keyof T, message: string) => void;
  clearError: (field: keyof T) => void;
  clearAllErrors: () => void;
  validateField: (field: keyof T) => Promise<boolean>;
  validateAll: () => Promise<ValidationResult>;
  reset: (values?: Partial<T>) => void;
  setTouched: (field: keyof T, touched?: boolean) => void;

  // 表单处理方法
  handleChange: (
    field: keyof T
  ) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  handleBlur: (field: keyof T) => () => void;
  handleSubmit: (
    onSubmit: (values: T) => void | Promise<void>
  ) => (event: React.FormEvent) => Promise<void>;

  // 辅助方法
  getFieldProps: (field: keyof T) => {
    value: any;
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => void;
    onBlur: () => void;
    error: boolean;
    helperText: string;
  };
}

/**
 * 表单验证 Hook
 */
export function useFormValidation<T extends Record<string, any>>(
  schema: Joi.ObjectSchema,
  initialValues: T,
  options: UseFormValidationOptions = {}
): UseFormValidationReturn<T> {
  const {
    validationMode = 'onChange',
    revalidateMode = 'onChange',
    debounceMs = 300,
    validateOnMount = false,
  } = options;

  // 状态管理
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isDirty, setIsDirty] = useState(false);

  // 验证器实例
  const validatorRef = useRef<RealTimeValidator>();
  const debounceTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isInitialMount = useRef(true);

  // 初始化验证器
  useEffect(() => {
    validatorRef.current = new RealTimeValidator(schema);

    // 设置初始值
    Object.entries(initialValues).forEach(([field, value]) => {
      validatorRef.current?.setField(field, value);
    });

    // 如果需要在挂载时验证
    if (validateOnMount) {
      // 延迟执行validateAll以避免依赖顺序问题
      setTimeout(() => validateAll(), 0);
    }

    isInitialMount.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, validateOnMount, initialValues]);

  // 清理定时器
  useEffect(() => {
    const currentTimers = debounceTimersRef.current;
    return () => {
      currentTimers.forEach(timer => clearTimeout(timer));
    };
  }, []);

  // 计算是否有效
  const isValid = Object.keys(errors).length === 0;

  /**
   * 防抖验证函数
   */
  const debouncedValidate = useCallback(
    (field: keyof T, value: any) => {
      const fieldName = field as string;

      // 清除之前的定时器
      const existingTimer = debounceTimersRef.current.get(fieldName);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // 设置新的定时器
      const timer = setTimeout(() => {
        if (validatorRef.current) {
          const fieldErrors = validatorRef.current.setField(fieldName, value);
          const errorMessage = fieldErrors.length > 0 ? fieldErrors[0].message : '';

          setErrors(prev => ({
            ...prev,
            [fieldName]: errorMessage,
          }));
        }

        debounceTimersRef.current.delete(fieldName);
      }, debounceMs);

      debounceTimersRef.current.set(fieldName, timer);
    },
    [debounceMs]
  );

  /**
   * 设置单个字段值
   */
  const setValue = useCallback(
    (field: keyof T, value: any) => {
      setValuesState(prev => {
        const newValues = { ...prev, [field]: value };

        // 标记为已修改
        if (!isDirty) {
          setIsDirty(true);
        }

        // 根据验证模式进行验证
        if (validationMode === 'onChange' || validationMode === 'all') {
          if (touchedFields[field as string] || !isInitialMount.current) {
            debouncedValidate(field, value);
          }
        }

        return newValues;
      });
    },
    [validationMode, touchedFields, isDirty, debouncedValidate]
  );

  /**
   * 设置多个字段值
   */
  const setValues = useCallback(
    (newValues: Partial<T>) => {
      setValuesState(prev => {
        const updated = { ...prev, ...newValues };

        if (!isDirty) {
          setIsDirty(true);
        }

        // 如果是实时验证模式，验证所有更新的字段
        if (validationMode === 'onChange' || validationMode === 'all') {
          Object.entries(newValues).forEach(([field, value]) => {
            if (touchedFields[field] || !isInitialMount.current) {
              debouncedValidate(field as keyof T, value);
            }
          });
        }

        return updated;
      });
    },
    [validationMode, touchedFields, isDirty, debouncedValidate]
  );

  /**
   * 设置字段错误
   */
  const setError = useCallback((field: keyof T, message: string) => {
    setErrors(prev => ({
      ...prev,
      [field as string]: message,
    }));
  }, []);

  /**
   * 清除字段错误
   */
  const clearError = useCallback((field: keyof T) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field as string];
      return newErrors;
    });
  }, []);

  /**
   * 清除所有错误
   */
  const clearAllErrors = useCallback(() => {
    setErrors({});
    validatorRef.current?.clearErrors();
  }, []);

  /**
   * 验证单个字段
   */
  const validateField = useCallback(
    async (field: keyof T): Promise<boolean> => {
      if (!validatorRef.current) return false;

      setIsValidating(true);

      try {
        const value = values[field];
        const fieldErrors = validatorRef.current.setField(field as string, value);
        const errorMessage = fieldErrors.length > 0 ? fieldErrors[0].message : '';

        setErrors(prev => ({
          ...prev,
          [field as string]: errorMessage,
        }));

        return fieldErrors.length === 0;
      } finally {
        setIsValidating(false);
      }
    },
    [values]
  );

  /**
   * 验证所有字段
   */
  const validateAll = useCallback(async (): Promise<ValidationResult> => {
    if (!validatorRef.current) {
      return { isValid: false, errors: [] };
    }

    setIsValidating(true);

    try {
      // 设置所有当前值到验证器
      Object.entries(values).forEach(([field, value]) => {
        validatorRef.current?.setField(field, value);
      });

      const result = validatorRef.current.validateAll();

      // 更新错误状态
      const newErrors: Record<string, string> = {};
      result.errors.forEach(error => {
        newErrors[error.field] = error.message;
      });

      setErrors(newErrors);

      return result;
    } finally {
      setIsValidating(false);
    }
  }, [values]);

  /**
   * 设置字段为已触摸
   */
  const setTouched = useCallback((field: keyof T, touched: boolean = true) => {
    setTouchedFields(prev => ({
      ...prev,
      [field as string]: touched,
    }));
  }, []);

  /**
   * 重置表单
   */
  const reset = useCallback(
    (newValues?: Partial<T>) => {
      const resetValues = newValues ? { ...initialValues, ...newValues } : initialValues;

      setValuesState(resetValues);
      setErrors({});
      setTouchedFields({});
      setIsDirty(false);

      // 重置验证器
      if (validatorRef.current) {
        validatorRef.current.reset();
        Object.entries(resetValues).forEach(([field, value]) => {
          validatorRef.current?.setField(field, value);
        });
      }
    },
    [initialValues]
  );

  /**
   * 处理输入框变化
   */
  const handleChange = useCallback(
    (field: keyof T) => {
      return (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
      ) => {
        const { type, value } = event.target as HTMLInputElement;
        let fieldValue: any = value;

        // 处理特殊输入类型
        if (type === 'checkbox') {
          fieldValue = (event.target as HTMLInputElement).checked;
        } else if (type === 'number') {
          fieldValue = value === '' ? '' : Number(value);
        }

        setValue(field, fieldValue);
      };
    },
    [setValue]
  );

  /**
   * 处理失焦事件
   */
  const handleBlur = useCallback(
    (field: keyof T) => {
      return () => {
        setTouched(field, true);

        // 在失焦时验证字段
        if (
          validationMode === 'onBlur' ||
          validationMode === 'all' ||
          (revalidateMode === 'onBlur' && errors[field as string])
        ) {
          validateField(field);
        }
      };
    },
    [validationMode, revalidateMode, errors, setTouched, validateField]
  );

  /**
   * 处理表单提交
   */
  const handleSubmit = useCallback(
    (onSubmit: (values: T) => void | Promise<void>) => {
      return async (event: React.FormEvent) => {
        event.preventDefault();

        // 标记所有字段为已触摸
        const allTouched = Object.keys(values).reduce(
          (acc, field) => {
            acc[field] = true;
            return acc;
          },
          {} as Record<string, boolean>
        );
        setTouchedFields(allTouched);

        // 验证所有字段
        const result = await validateAll();

        if (result.isValid) {
          try {
            await onSubmit(result.value || values);
          } catch (error) {
            console.error('Form submission error:', error);
          }
        }
      };
    },
    [values, validateAll]
  );

  /**
   * 获取字段属性（用于快速绑定到表单控件）
   */
  const getFieldProps = useCallback(
    (field: keyof T) => {
      return {
        value: values[field] ?? '',
        onChange: handleChange(field),
        onBlur: handleBlur(field),
        error: Boolean(errors[field as string] && touchedFields[field as string]),
        helperText: touchedFields[field as string] ? errors[field as string] || '' : '',
      };
    },
    [values, errors, touchedFields, handleChange, handleBlur]
  );

  return {
    // 状态
    values,
    errors,
    isValid,
    isValidating,
    isDirty,
    touchedFields,

    // 操作方法
    setValue,
    setValues,
    setError,
    clearError,
    clearAllErrors,
    validateField,
    validateAll,
    reset,
    setTouched,

    // 表单处理方法
    handleChange,
    handleBlur,
    handleSubmit,

    // 辅助方法
    getFieldProps,
  };
}

export default useFormValidation;
