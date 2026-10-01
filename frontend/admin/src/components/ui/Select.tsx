import React from 'react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  hidden?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  options,
  error,
  helperText,
  className = '',
  id,
  ...props
}, ref) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1 text-left">
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}
      <select
        id={selectId}
        ref={ref}
        className={`w-full bg-white border rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 transition-all cursor-pointer shadow-2xs ${
          error
            ? 'border-red-500 focus:ring-red-500/20'
            : 'border-slate-200 focus:border-[#0284C7] focus:ring-[#0284C7]/20'
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option
            key={opt.value || opt.label}
            value={opt.value}
            disabled={opt.disabled}
            hidden={opt.hidden}
            className="bg-white text-slate-900"
          >
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
      {helperText && !error && <span className="text-xs text-slate-500">{helperText}</span>}
    </div>
  );
});

Select.displayName = 'Select';

