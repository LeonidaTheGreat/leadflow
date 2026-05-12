'use client'

import React, { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean
  showStrengthHints?: boolean
}

function StrengthHints({ value }: { value: string }) {
  const issues: string[] = []
  if (value.length < 8) issues.push('At least 8 characters')
  if (!/[A-Z]/.test(value)) issues.push('Add an uppercase letter')
  if (!/[a-z]/.test(value)) issues.push('Add a lowercase letter')
  if (!/[0-9]/.test(value)) issues.push('Add a number')

  if (issues.length === 0) return null

  return (
    <ul className="mt-2 space-y-1" aria-label="Password requirements">
      {issues.map((issue) => (
        <li key={issue} className="text-xs text-amber-400">
          • {issue}
        </li>
      ))}
    </ul>
  )
}

export default function PasswordInput({
  hasError = false,
  showStrengthHints = false,
  value,
  className = '',
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  const base =
    'w-full pl-10 pr-10 py-3 min-h-[44px] bg-slate-700/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition'
  const errorBorder = hasError ? 'border-red-500/50' : 'border-slate-600/50'
  const controlledProps = value !== undefined ? { value } : {}

  return (
    <>
      <div className="relative">
        <Lock
          className="absolute left-3 top-3 text-slate-500 w-5 h-5 pointer-events-none"
          aria-hidden="true"
        />
        <input
          {...props}
          {...controlledProps}
          type={visible ? 'text' : 'password'}
          aria-invalid={hasError ? true : undefined}
          className={`${base} ${errorBorder} ${className}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? (
            <EyeOff className="w-5 h-5" aria-hidden="true" />
          ) : (
            <Eye className="w-5 h-5" aria-hidden="true" />
          )}
        </button>
      </div>
      {showStrengthHints && value && typeof value === 'string' && value.length > 0 && (
        <StrengthHints value={value} />
      )}
    </>
  )
}
