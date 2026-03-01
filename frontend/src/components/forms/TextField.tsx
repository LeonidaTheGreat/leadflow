import * as React from "react"
import { useFormContext, Controller } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string
  label?: string
  helperText?: string
  required?: boolean
}

export function TextField({
  name,
  label,
  helperText,
  required,
  className,
  ...props
}: TextFieldProps) {
  const { control, formState: { errors } } = useFormContext()
  const error = errors[name]?.message as string | undefined

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={name} required={required}>
          {label}
        </Label>
      )}
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Input
            id={name}
            {...field}
            {...props}
            error={error}
            value={field.value || ""}
          />
        )}
      />
      {helperText && !error && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  )
}
