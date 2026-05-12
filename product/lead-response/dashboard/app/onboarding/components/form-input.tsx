'use client'

import { forwardRef, type ReactNode } from 'react'

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
  hasError?: boolean
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(function FormInput(
  { icon, hasError, className = '', ...props },
  ref
) {
  const classes = [
    'w-full py-3 min-h-[44px]',
    'bg-slate-700/50 border rounded-lg',
    'text-white placeholder-slate-500',
    'focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500',
    'transition',
    icon ? 'pl-10 pr-4' : 'px-4',
    hasError ? 'border-red-500/50' : 'border-slate-600/50',
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
      <input ref={ref} className={classes} {...props} />
    </div>
  )
})

export default FormInput
