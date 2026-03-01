import * as React from "react"
import { useFormContext, Controller } from "react-hook-form"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

export interface CheckboxFieldProps {
  name: string
  label?: React.ReactNode
  required?: boolean
  className?: string
  disabled?: boolean
}

export function CheckboxField({
  name,
  label,
  required,
  className,
  disabled,
}: CheckboxFieldProps) {
  const { control, formState: { errors } } = useFormContext()
  const error = errors[name]?.message as string | undefined

  return (
    <div className={cn("space-y-2", className)}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <div className="flex items-start space-x-2">
            <Checkbox
              id={name}
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              error={error}
              disabled={disabled}
            />
            {label && (
              <label
                htmlFor={name}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
          </div>
        )}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
