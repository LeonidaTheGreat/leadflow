import { useEffect, useCallback, useRef } from "react"
import { useFormContext } from "react-hook-form"

interface UseAutoSaveOptions<T> {
  storageKey: string
  debounceMs?: number
  onLoad?: (data: Partial<T>) => void
  onSave?: (data: Partial<T>) => void
  excludeFields?: string[]
}

interface SavedDraft<T> {
  data: Partial<T>
  timestamp: number
  currentStep: number
}

export function useAutoSave<T extends Record<string, unknown>>({
  storageKey,
  debounceMs = 2000,
  onLoad,
  onSave,
  excludeFields = ["password", "confirmPassword"],
}: UseAutoSaveOptions<T>) {
  const { watch, getValues } = useFormContext<T>()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentStepRef = useRef<number>(0)

  // Set current step for saving
  const setCurrentStep = useCallback((step: number) => {
    currentStepRef.current = step
  }, [])

  // Load saved draft from localStorage
  const loadDraft = useCallback((): SavedDraft<T> | null => {
    if (typeof window === "undefined") return null
    
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const draft: SavedDraft<T> = JSON.parse(saved)
        // Check if draft is not older than 7 days
        const oneWeek = 7 * 24 * 60 * 60 * 1000
        if (Date.now() - draft.timestamp < oneWeek) {
          onLoad?.(draft.data)
          return draft
        } else {
          // Clear expired draft
          localStorage.removeItem(storageKey)
        }
      }
    } catch (error) {
      console.error("Error loading draft:", error)
    }
    return null
  }, [storageKey, onLoad])

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    if (typeof window === "undefined") return

    try {
      const values = getValues()
      // Exclude sensitive fields
      const filteredValues = Object.entries(values).reduce<Partial<T>>((acc, [key, value]) => {
        if (!excludeFields.includes(key)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (acc as any)[key] = value
        }
        return acc
      }, {})

      const draft: SavedDraft<T> = {
        data: filteredValues,
        timestamp: Date.now(),
        currentStep: currentStepRef.current,
      }

      localStorage.setItem(storageKey, JSON.stringify(draft))
      onSave?.(filteredValues)
    } catch (error) {
      console.error("Error saving draft:", error)
    }
  }, [getValues, storageKey, excludeFields, onSave])

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return
    
    try {
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.error("Error clearing draft:", error)
    }
  }, [storageKey])

  // Auto-save effect
  useEffect(() => {
    const subscription = watch(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        if (typeof window !== "undefined") {
          const values = getValues()
          const filteredValues = Object.entries(values).reduce<Partial<T>>((acc, [key, value]) => {
            if (!excludeFields.includes(key)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (acc as any)[key] = value
            }
            return acc
          }, {})

          const draft: SavedDraft<T> = {
            data: filteredValues,
            timestamp: Date.now(),
            currentStep: currentStepRef.current,
          }

          localStorage.setItem(storageKey, JSON.stringify(draft))
          onSave?.(filteredValues)
        }
      }, debounceMs)
    })

    return () => {
      subscription.unsubscribe()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [watch, debounceMs, storageKey, excludeFields, getValues, onSave])

  return {
    loadDraft,
    saveDraft,
    clearDraft,
    setCurrentStep,
  }
}

// Hook to check if a draft exists
export function useDraftExists(storageKey: string): boolean {
  if (typeof window === "undefined") return false
  
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const draft: SavedDraft<unknown> = JSON.parse(saved)
      const oneWeek = 7 * 24 * 60 * 60 * 1000
      return Date.now() - draft.timestamp < oneWeek
    }
  } catch {
    return false
  }
  return false
}
