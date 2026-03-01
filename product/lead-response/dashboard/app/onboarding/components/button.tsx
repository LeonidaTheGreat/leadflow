import React from 'react'

interface OnboardingButtonProps {
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  children: React.ReactNode
  className?: string
}

export default function OnboardingButton({
  onClick,
  disabled = false,
  variant = 'primary',
  children,
  className = '',
}: OnboardingButtonProps) {
  const baseStyles = 'px-6 py-3 font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2'

  const variants = {
    primary: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white disabled:opacity-50',
    secondary: 'bg-slate-700/50 border border-slate-600/50 text-slate-200 hover:bg-slate-700 disabled:opacity-50',
    ghost: 'bg-transparent border border-slate-600/50 text-slate-300 hover:bg-slate-700/20 disabled:opacity-50',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
