import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import './ValidatedInput.css';

interface ValidatedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onFocus' | 'onBlur'> {
  label?: string;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  variant?: 'outlined' | 'filled' | 'standard';
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  multiline?: boolean;
  rows?: number;
  maxRows?: number;
  showPasswordToggle?: boolean;
  loading?: boolean;
  success?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const ValidatedInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, ValidatedInputProps>(
  (
    {
      label,
      error = false,
      helperText,
      required = false,
      fullWidth = false,
      variant = 'outlined',
      startAdornment,
      endAdornment,
      multiline = false,
      rows,
      maxRows,
      showPasswordToggle = false,
      loading = false,
      success = false,
      type = 'text',
      className = '',
      disabled = false,
      placeholder,
      value,
      onChange,
      onBlur,
      onFocus,
      ...rest
    },
    ref
  ) => {
    const { t } = useTranslation();
    const [showPassword, setShowPassword] = React.useState(false);
    const [focused, setFocused] = React.useState(false);

    // 生成唯一ID
    const inputId = React.useId();

    // 处理密码显示切换
    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    // 处理焦点事件
    const handleFocus = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFocused(true);
      onFocus?.(event);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFocused(false);
      onBlur?.(event);
    };

    // 确定实际的输入类型
    const actualType =
      showPasswordToggle && type === 'password' ? (showPassword ? 'text' : 'password') : type;

    // 构建类名
    const containerClasses = [
      'validated-input-container',
      `variant-${variant}`,
      fullWidth && 'full-width',
      error && 'error',
      success && 'success',
      disabled && 'disabled',
      focused && 'focused',
      loading && 'loading',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const inputClasses = [
      'validated-input',
      startAdornment && 'with-start-adornment',
      (endAdornment || showPasswordToggle) && 'with-end-adornment',
    ]
      .filter(Boolean)
      .join(' ');

    // 渲染输入框或文本域
    const renderInput = () => {
      const commonProps = {
        id: inputId,
        className: inputClasses,
        disabled: disabled || loading,
        value: value ?? '',
        onChange,
        onFocus: handleFocus,
        onBlur: handleBlur,
        placeholder: focused ? placeholder : undefined,
        'aria-invalid': error,
        'aria-describedby': helperText ? `${inputId}-helper` : undefined,
        ...rest,
      };

      if (multiline) {
        const textareaProps = {
          id: inputId,
          className: inputClasses,
          disabled: disabled || loading,
          value: value ?? '',
          onChange,
          onFocus: handleFocus,
          onBlur: handleBlur,
          placeholder: focused ? placeholder : undefined,
          'aria-invalid': error,
          'aria-describedby': helperText ? `${inputId}-helper` : undefined,
        };
        return (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            rows={rows}
            style={maxRows ? { maxHeight: `${maxRows * 1.2}em` } : undefined}
            {...textareaProps}
          />
        );
      }

      return <input ref={ref as React.Ref<HTMLInputElement>} type={actualType} {...commonProps} />;
    };

    return (
      <div className={containerClasses}>
        {/* 标签 */}
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
            {required && <span className="required-indicator">*</span>}
          </label>
        )}

        {/* 输入框容器 */}
        <div className="input-wrapper">
          {/* 前置装饰 */}
          {startAdornment && (
            <div className="input-adornment start-adornment">{startAdornment}</div>
          )}

          {/* 输入框 */}
          {renderInput()}

          {/* 后置装饰 */}
          {(endAdornment || showPasswordToggle) && (
            <div className="input-adornment end-adornment">
              {showPasswordToggle && type === 'password' && (
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  disabled={disabled || loading}
                  aria-label={showPassword ? t('common.hidePassword') : t('common.showPassword')}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                  )}
                </button>
              )}
              {endAdornment}
            </div>
          )}

          {/* 状态指示器 */}
          {loading && (
            <div className="input-adornment end-adornment">
              <div className="loading-spinner"></div>
            </div>
          )}

          {/* 成功指示器 */}
          {success && !error && !loading && (
            <div className="input-adornment end-adornment">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="success-icon"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
          )}

          {/* 错误指示器 */}
          {error && !loading && (
            <div className="input-adornment end-adornment">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="error-icon"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
          )}
        </div>

        {/* 辅助文本 */}
        {helperText && (
          <div
            id={`${inputId}-helper`}
            className={`helper-text ${error ? 'error' : success ? 'success' : ''}`}
          >
            {helperText}
          </div>
        )}

        {/* 字符计数 */}
        {rest.maxLength && value && (
          <div className="character-count">
            {String(value).length}/{rest.maxLength}
          </div>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';

export default ValidatedInput;
