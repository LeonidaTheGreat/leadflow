'use client'

import { AlertCircle } from 'lucide-react'

interface FormFieldProps {
  label: string
  htmlFor?: string
  error?: string
  optional?: boolean
  hint?: string
  children: React.ReactNode
}

export default function FormField({
  label,
  htmlFor,
  error,
  optional,
  hint,
  children,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-slate-200 mb-1.5"
      >
        {label}
        {optional && (
          <span className="ml-2 text-xs text-slate-400 font-normal">(optional)</span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      )}
      {error && (
        <p role="alert" className="flex items-center gap-1.5 mt-1.5 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
