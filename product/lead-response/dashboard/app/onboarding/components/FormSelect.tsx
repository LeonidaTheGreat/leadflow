'use client'

import React from 'react'
import { type LucideIcon } from 'lucide-react'

export type SelectOption = { value: string; label: string } | string

export interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: LucideIcon
  hasError?: boolean
  placeholder?: string
  options: SelectOption[]
}

export default function FormSelect({
  icon: Icon,
  hasError = false,
  placeholder,
  options,
  value,
  className = '',
  ...props
}: FormSelectProps) {
  const base =
    'w-full py-3 min-h-[44px] bg-slate-700/50 border rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition appearance-none'
  const errorBorder = hasError ? 'border-red-500/50' : 'border-slate-600/50'
  const padding = Icon ? 'pl-10 pr-4' : 'px-4'
  const textColor = !value ? 'text-slate-400' : 'text-white'
  const controlledProps = value !== undefined ? { value } : {}

  return (
    <div className="relative">
      {Icon && (
        <Icon
          className="absolute left-3 top-3 text-slate-500 w-5 h-5 pointer-events-none"
          aria-hidden="true"
        />
      )}
      <select
        {...props}
        {...controlledProps}
        aria-invalid={hasError ? true : undefined}
        className={`${base} ${errorBorder} ${padding} ${textColor} ${className}`}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((opt) => {
          if (typeof opt === 'string') {
            return (
              <option key={opt} value={opt}>
                {opt}
              </option>
            )
          }
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )
        })}
      </select>
    </div>
  )
}
