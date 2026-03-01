import * as React from "react"
import { useForm, FormProvider as RHFFormProvider, UseFormReturn, DefaultValues, Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ZodSchema } from "zod"

interface FormProviderProps<T extends Record<string, unknown>> {
  children: React.ReactNode
  schema: ZodSchema
  defaultValues?: DefaultValues<T>
  onSubmit: (data: T) => void | Promise<void>
  mode?: "onSubmit" | "onBlur" | "onChange" | "onTouched" | "all"
}

export function FormProvider<T extends Record<string, unknown>>({
  children,
  schema,
  defaultValues,
  onSubmit,
  mode = "onSubmit",
}: FormProviderProps<T>) {
  const methods = useForm<T>({
    resolver: zodResolver(schema) as Resolver<T>,
    defaultValues,
    mode,
  })

  return (
    <RHFFormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        {children}
      </form>
    </RHFFormProvider>
  )
}

export type { UseFormReturn }
