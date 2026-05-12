'use client'

import React from 'react'
import { type LucideIcon } from 'lucide-react'

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon
  hasError?: boolean
}

export default function FormInput({
  icon: Icon,
  hasError = false,
  className = '',
  ...props
}: FormInputProps) {
  const base =
    'w-full py-3 min-h-[44px] bg-slate-700/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition'
  const errorBorder = hasError ? 'border-red-500/50' : 'border-slate-600/50'
  const padding = Icon ? 'pl-10 pr-4' : 'px-4'

  return (
    <div className="relative">
      {Icon && (
        <Icon
          className="absolute left-3 top-3 text-slate-500 w-5 h-5 pointer-events-none"
          aria-hidden="true"
        />
      )}
      <input
        {...props}
        aria-invalid={hasError ? true : undefined}
        className={`${base} ${errorBorder} ${padding} ${className}`}
      />
    </div>
  )
}
