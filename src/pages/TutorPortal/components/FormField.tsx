import React from 'react';
import styles from './FormField.module.css';

interface BaseFieldProps {
    label: string;
    name: string;
    error?: string;
    required?: boolean;
    hint?: string;
}

interface InputFieldProps extends BaseFieldProps {
    type: 'text' | 'email' | 'number' | 'password' | 'url';
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    maxLength?: number;
    min?: number;
    max?: number;
    disabled?: boolean;
}

interface TextareaFieldProps extends BaseFieldProps {
    type: 'textarea';
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    maxLength?: number;
    minLength?: number;
    rows?: number;
    disabled?: boolean;
}

interface SelectFieldProps extends BaseFieldProps {
    type: 'select';
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    disabled?: boolean;
}

interface RadioFieldProps extends BaseFieldProps {
    type: 'radio';
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    disabled?: boolean;
}

interface CheckboxFieldProps extends BaseFieldProps {
    type: 'checkbox';
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

type FormFieldProps =
    | InputFieldProps
    | TextareaFieldProps
    | SelectFieldProps
    | RadioFieldProps
    | CheckboxFieldProps;

const FormField: React.FC<FormFieldProps> = (props) => {
    const { label, name, error, required, hint } = props;

    const renderInput = () => {
        switch (props.type) {
            case 'text':
            case 'email':
            case 'number':
            case 'password':
            case 'url':
                return (
                    <div className={styles.inputWrapper}>
                        <input
                            id={name}
                            name={name}
                            type={props.type}
                            value={props.value}
                            onChange={(e) => props.onChange(e.target.value)}
                            placeholder={props.placeholder}
                            maxLength={props.maxLength}
                            min={props.min}
                            max={props.max}
                            disabled={props.disabled}
                            className={`${styles.input} ${error ? styles.inputError : ''}`}
                            aria-invalid={!!error}
                            aria-describedby={error ? `${name}-error` : undefined}
                        />
                        {props.maxLength && (
                            <span className={styles.charCounter}>
                                {props.value.length}/{props.maxLength}
                            </span>
                        )}
                    </div>
                );

            case 'textarea':
                return (
                    <div className={styles.textareaWrapper}>
                        <textarea
                            id={name}
                            name={name}
                            value={props.value}
                            onChange={(e) => props.onChange(e.target.value)}
                            placeholder={props.placeholder}
                            maxLength={props.maxLength}
                            rows={props.rows || 4}
                            disabled={props.disabled}
                            className={`${styles.textarea} ${error ? styles.inputError : ''}`}
                            aria-invalid={!!error}
                            aria-describedby={error ? `${name}-error` : undefined}
                        />
                        {props.maxLength && (
                            <span className={styles.charCounter}>
                                {props.value.length}/{props.maxLength}
                            </span>
                        )}
                    </div>
                );

            case 'select':
                return (
                    <div className={styles.selectWrapper}>
                        <select
                            id={name}
                            name={name}
                            value={props.value}
                            onChange={(e) => props.onChange(e.target.value)}
                            disabled={props.disabled}
                            className={`${styles.select} ${error ? styles.inputError : ''}`}
                            aria-invalid={!!error}
                            aria-describedby={error ? `${name}-error` : undefined}
                        >
                            {props.placeholder && (
                                <option value="">{props.placeholder}</option>
                            )}
                            {props.options.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <div className={styles.selectArrow}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                );

            case 'radio':
                return (
                    <div className={styles.radioGroup}>
                        {props.options.map((option) => (
                            <label key={option.value} className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    name={name}
                                    value={option.value}
                                    checked={props.value === option.value}
                                    onChange={(e) => props.onChange(e.target.value)}
                                    disabled={props.disabled}
                                    className={styles.radioInput}
                                />
                                <span className={styles.radioCustom} />
                                <span className={styles.radioText}>{option.label}</span>
                            </label>
                        ))}
                    </div>
                );

            case 'checkbox':
                return (
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            name={name}
                            checked={props.checked}
                            onChange={(e) => props.onChange(e.target.checked)}
                            disabled={props.disabled}
                            className={styles.checkboxInput}
                        />
                        <span className={styles.checkboxCustom}>
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>
                        <span className={styles.checkboxText}>{label}</span>
                    </label>
                );

            default:
                return null;
        }
    };

    // Checkbox has its own label rendering
    if (props.type === 'checkbox') {
        return (
            <div className={`${styles.field} ${error ? styles.hasError : ''}`}>
                {renderInput()}
                {error && (
                    <span id={`${name}-error`} className={styles.error}>
                        {error}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className={`${styles.field} ${error ? styles.hasError : ''}`}>
            <label htmlFor={name} className={styles.label}>
                {label}
                {required && <span className={styles.required}>*</span>}
            </label>
            {hint && <span className={styles.hint}>{hint}</span>}
            {renderInput()}
            {error && (
                <span id={`${name}-error`} className={styles.error}>
                    {error}
                </span>
            )}
        </div>
    );
};

export default FormField;
