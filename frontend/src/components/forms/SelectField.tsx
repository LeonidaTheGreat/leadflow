import { useFormContext, Controller } from "react-hook-form"
import { Select, SelectOption } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface SelectFieldProps {
  name: string
  label?: string
  options: SelectOption[]
  placeholder?: string
  required?: boolean
  helperText?: string
  className?: string
  disabled?: boolean
}

export function SelectField({
  name,
  label,
  options,
  placeholder,
  required,
  helperText,
  className,
  disabled,
}: SelectFieldProps) {
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
          <Select
            id={name}
            options={options}
            placeholder={placeholder}
            error={error}
            disabled={disabled}
            {...field}
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
