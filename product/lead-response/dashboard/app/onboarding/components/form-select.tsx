'use client'

import { type ReactNode } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: ReactNode
  hasError?: boolean
  placeholder?: string
  options: SelectOption[]
}

export default function FormSelect({
  icon,
  hasError,
  placeholder,
  options,
  className = '',
  value,
  ...props
}: FormSelectProps) {
  const classes = [
    'w-full py-3 min-h-[44px]',
    'bg-slate-700/50 border rounded-lg',
    'appearance-none',
    'focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500',
    'transition',
    icon ? 'pl-10 pr-4' : 'px-4',
    hasError ? 'border-red-500/50' : 'border-slate-600/50',
    value ? 'text-white' : 'text-slate-400',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-3 text-slate-500 pointer-events-none">
          {icon}
        </span>
      )}
      <select className={classes} value={value} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
