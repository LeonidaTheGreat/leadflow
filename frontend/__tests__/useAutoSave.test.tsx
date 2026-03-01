import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAutoSave, useDraftExists } from '@/hooks/useAutoSave'
import React from 'react'

const schema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
})

type FormData = z.infer<typeof schema>

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  })
  return <FormProvider {...methods}>{children}</FormProvider>
}

describe('useAutoSave', () => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads saved draft from localStorage', () => {
    const draft = {
      data: { name: 'John', email: 'john@example.com' },
      timestamp: Date.now(),
      currentStep: 2,
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(draft))

    const onLoad = vi.fn()
    const { result } = renderHook(
      () => useAutoSave<FormData>({ storageKey: 'test_key', onLoad }),
      { wrapper }
    )

    act(() => {
      result.current.loadDraft()
    })

    expect(localStorageMock.getItem).toHaveBeenCalledWith('test_key')
    expect(onLoad).toHaveBeenCalledWith(draft.data)
  })

  it('returns null when no draft exists', () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(
      () => useAutoSave<FormData>({ storageKey: 'test_key' }),
      { wrapper }
    )

    let loadedDraft: ReturnType<typeof result.current.loadDraft>
    act(() => {
      loadedDraft = result.current.loadDraft()
    })

    expect(loadedDraft).toBeNull()
  })

  it('returns null when draft is expired (> 7 days)', () => {
    const expiredDraft = {
      data: { name: 'John' },
      timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago
      currentStep: 1,
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredDraft))

    const { result } = renderHook(
      () => useAutoSave<FormData>({ storageKey: 'test_key' }),
      { wrapper }
    )

    let loadedDraft: ReturnType<typeof result.current.loadDraft>
    act(() => {
      loadedDraft = result.current.loadDraft()
    })

    expect(loadedDraft).toBeNull()
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('test_key')
  })

  it('excludes sensitive fields when saving', () => {
    const { result } = renderHook(
      () => useAutoSave<FormData>({
        storageKey: 'test_key',
        excludeFields: ['password'],
      }),
      { wrapper }
    )

    act(() => {
      result.current.saveDraft()
    })

    const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
    expect(savedData.data).not.toHaveProperty('password')
    expect(savedData).toHaveProperty('timestamp')
    expect(savedData).toHaveProperty('currentStep')
  })

  it('clears draft from localStorage', () => {
    const { result } = renderHook(
      () => useAutoSave<FormData>({ storageKey: 'test_key' }),
      { wrapper }
    )

    act(() => {
      result.current.clearDraft()
    })

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('test_key')
  })

  it('sets current step correctly', () => {
    const { result } = renderHook(
      () => useAutoSave<FormData>({ storageKey: 'test_key' }),
      { wrapper }
    )

    act(() => {
      result.current.setCurrentStep(3)
    })

    // Save draft to verify step is saved
    act(() => {
      result.current.saveDraft()
    })

    const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
    expect(savedData.currentStep).toBe(3)
  })

  it('calls onSave callback when saving', () => {
    const onSave = vi.fn()
    const { result } = renderHook(
      () => useAutoSave<FormData>({ storageKey: 'test_key', onSave }),
      { wrapper }
    )

    act(() => {
      result.current.saveDraft()
    })

    expect(onSave).toHaveBeenCalled()
  })

  it('handles localStorage errors gracefully', () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage full')
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(
      () => useAutoSave<FormData>({ storageKey: 'test_key' }),
      { wrapper }
    )

    act(() => {
      result.current.saveDraft()
    })

    expect(consoleSpy).toHaveBeenCalledWith('Error saving draft:', expect.any(Error))
    consoleSpy.mockRestore()
  })
})

describe('useDraftExists', () => {
  const localStorageMock = {
    getItem: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
  })

  it('returns true when valid draft exists', () => {
    const draft = {
      data: { name: 'John' },
      timestamp: Date.now(),
      currentStep: 1,
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(draft))

    const { result } = renderHook(() => useDraftExists('test_key'))
    expect(result.current).toBe(true)
  })

  it('returns false when no draft exists', () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useDraftExists('test_key'))
    expect(result.current).toBe(false)
  })

  it('returns false when draft is expired', () => {
    const expiredDraft = {
      data: { name: 'John' },
      timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000,
      currentStep: 1,
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredDraft))

    const { result } = renderHook(() => useDraftExists('test_key'))
    expect(result.current).toBe(false)
  })

  it('returns false on localStorage error', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('Storage error')
    })

    const { result } = renderHook(() => useDraftExists('test_key'))
    expect(result.current).toBe(false)
  })
})
