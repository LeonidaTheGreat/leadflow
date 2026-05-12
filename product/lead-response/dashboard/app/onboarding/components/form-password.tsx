'use client'

import { useState, forwardRef } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'

interface FormPasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  hasError?: boolean
}

const FormPasswordInput = forwardRef<HTMLInputElement, FormPasswordInputProps>(
  function FormPasswordInput({ hasError, className = '', ...props }, ref) {
    const [show, setShow] = useState(false)

    const classes = [
      'w-full pl-10 pr-10 py-3 min-h-[44px]',
      'bg-slate-700/50 border rounded-lg',
      'text-white placeholder-slate-500',
      'focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500',
      'transition',
      hasError ? 'border-red-500/50' : 'border-slate-600/50',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className="relative">
        <Lock className="absolute left-3 top-3 text-slate-500 w-5 h-5 pointer-events-none" />
        <input ref={ref} type={show ? 'text' : 'password'} className={classes} {...props} />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    )
  }
)

export default FormPasswordInput
