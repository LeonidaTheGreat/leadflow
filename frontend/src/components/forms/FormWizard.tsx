import * as React from "react"
import { useFormContext } from "react-hook-form"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react"

export interface FormStep {
  id: string
  title: string
  description?: string
  fields: string[]
  component: React.ReactNode
  validate?: (data: Record<string, unknown>) => boolean | string
}

export interface FormWizardProps {
  steps: FormStep[]
  onComplete: (data: Record<string, unknown>) => void | Promise<void>
  onCancel?: () => void
  allowSkip?: boolean
  className?: string
}

export function FormWizard({
  steps,
  onComplete,
  onCancel,
  allowSkip = false,
  className,
}: FormWizardProps) {
  const [currentStep, setCurrentStep] = React.useState(0)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const { trigger, getValues } = useFormContext()

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1
  const currentStepData = steps[currentStep]

  const validateStep = async (): Promise<boolean> => {
    const fieldsToValidate = currentStepData.fields
    const isValid = await trigger(fieldsToValidate)
    
    if (!isValid) return false

    if (currentStepData.validate) {
      const values = getValues()
      const result = currentStepData.validate(values)
      if (result !== true) {
        return false
      }
    }

    return true
  }

  const handleNext = async () => {
    const isValid = await validateStep()
    if (isValid && !isLastStep) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleComplete = async () => {
    const isValid = await validateStep()
    if (isValid) {
      setIsSubmitting(true)
      try {
        const values = getValues()
        await onComplete(values)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const goToStep = async (index: number) => {
    if (!allowSkip) return
    if (index < currentStep) {
      setCurrentStep(index)
    } else if (index > currentStep) {
      const isValid = await validateStep()
      if (isValid) {
        setCurrentStep(index)
      }
    }
  }

  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {currentStepData.title}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Step indicators */}
        <div className="flex justify-between mt-4">
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => goToStep(index)}
              disabled={!allowSkip && index > currentStep}
              className={cn(
                "flex flex-col items-center gap-1 transition-colors",
                index <= currentStep
                  ? "text-primary"
                  : "text-muted-foreground",
                allowSkip || index <= currentStep ? "cursor-pointer" : "cursor-default"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  index < currentStep && "bg-primary text-primary-foreground",
                  index === currentStep && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                  index > currentStep && "bg-muted text-muted-foreground"
                )}
              >
                {index < currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span className="text-xs hidden sm:block">{step.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        {currentStepData.description && (
          <p className="text-muted-foreground mb-6">
            {currentStepData.description}
          </p>
        )}
        
        <div className="space-y-6">
          {currentStepData.component}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <div>
          {!isFirstStep ? (
            <button
              type="button"
              onClick={handlePrevious}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
          ) : onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground bg-transparent hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          ) : null}
        </div>

        <div className="flex gap-3">
          {isLastStep ? (
            <button
              type="button"
              onClick={handleComplete}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Complete
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
