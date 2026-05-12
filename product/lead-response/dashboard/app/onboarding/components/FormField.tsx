'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'

export interface FormFieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  required?: boolean
  optionalLabel?: string
  children: React.ReactNode
}

export default function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  optionalLabel,
  children,
}: FormFieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-200 mb-1.5">
        {label}
        {required && (
          <span className="text-red-400 ml-1" aria-hidden="true">
            *
          </span>
        )}
        {optionalLabel && (
          <span className="ml-2 text-xs text-slate-400 font-normal">{optionalLabel}</span>
        )}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
      {error && (
        <p role="alert" className="flex items-center gap-1.5 mt-1.5 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
