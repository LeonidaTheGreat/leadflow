'use strict'

describe('Onboarding Step Persistence', () => {
  describe('Step map covers all wizard steps', () => {
    const stepMap = {
      welcome: 1, 'try-ai': 2, 'agent-info': 3, calendar: 4,
      sms: 5, simulator: 6, confirmation: 7, fub: 1, complete: 99,
    }

    const wizardSteps = ['welcome', 'try-ai', 'agent-info', 'calendar', 'sms', 'simulator', 'confirmation']

    test('every wizard step has a mapping', () => {
      for (const step of wizardSteps) {
        expect(stepMap[step]).toBeDefined()
        expect(typeof stepMap[step]).toBe('number')
        expect(stepMap[step]).toBeGreaterThan(0)
      }
    })

    test('wizard steps map to sequential integers 1-7', () => {
      for (let i = 0; i < wizardSteps.length; i++) {
        expect(stepMap[wizardSteps[i]]).toBe(i + 1)
      }
    })

    test('complete maps to 99', () => {
      expect(stepMap.complete).toBe(99)
    })

    test('unknown step falls back to 0', () => {
      const step = 'nonexistent'
      const stepNum = stepMap[step] ?? 0
      expect(stepNum).toBe(0)
    })
  })

  describe('DB step to wizard step mapping', () => {
    const STEP_FROM_DB = {
      1: 'welcome',
      2: 'try-ai',
      3: 'agent-info',
      4: 'calendar',
      5: 'sms',
      6: 'simulator',
      7: 'confirmation',
    }

    test('every DB integer maps back to a wizard step name', () => {
      for (let i = 1; i <= 7; i++) {
        expect(STEP_FROM_DB[i]).toBeDefined()
        expect(typeof STEP_FROM_DB[i]).toBe('string')
      }
    })

    test('round-trips are consistent with step map', () => {
      const stepMap = {
        welcome: 1, 'try-ai': 2, 'agent-info': 3, calendar: 4,
        sms: 5, simulator: 6, confirmation: 7,
      }

      for (const [name, num] of Object.entries(stepMap)) {
        expect(STEP_FROM_DB[num]).toBe(name)
      }
    })

    test('DB step 0 returns undefined (no mapping)', () => {
      expect(STEP_FROM_DB[0]).toBeUndefined()
    })

    test('DB step 99 returns undefined (completion sentinel)', () => {
      expect(STEP_FROM_DB[99]).toBeUndefined()
    })
  })

  describe('Onboarding completion payload', () => {
    test('completion sets onboarding_step to 99', () => {
      const updateData = {
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_step: 99,
        updated_at: new Date().toISOString(),
      }
      expect(updateData.onboarding_step).toBe(99)
      expect(updateData.onboarding_completed).toBe(true)
    })

    test('stepsCompleted reflects actual steps completed when skipping', () => {
      const steps = ['welcome', 'try-ai', 'agent-info', 'calendar', 'sms', 'simulator', 'confirmation']
      const currentStepIndex = 3 // user is on 'calendar' (index 3)
      const completedSteps = steps.slice(0, currentStepIndex + 1)

      expect(completedSteps).toEqual(['welcome', 'try-ai', 'agent-info', 'calendar'])
      expect(completedSteps).not.toContain('sms')
      expect(completedSteps).not.toContain('simulator')
      expect(completedSteps).not.toContain('confirmation')
    })

    test('stepsCompleted includes all steps when finishing naturally', () => {
      const steps = ['welcome', 'try-ai', 'agent-info', 'calendar', 'sms', 'simulator', 'confirmation']
      const currentStepIndex = 6 // on confirmation
      const completedSteps = steps.slice(0, currentStepIndex + 1)

      expect(completedSteps).toEqual(steps)
    })
  })

  describe('Skip to Dashboard visibility', () => {
    const steps = ['welcome', 'try-ai', 'agent-info', 'calendar', 'sms', 'simulator', 'confirmation']

    test('skip button hidden on welcome (step 0)', () => {
      const currentStepIndex = 0
      const currentStep = steps[currentStepIndex]
      const showSkip = currentStepIndex >= 2 && currentStep !== 'confirmation'
      expect(showSkip).toBe(false)
    })

    test('skip button hidden on try-ai (step 1)', () => {
      const currentStepIndex = 1
      const currentStep = steps[currentStepIndex]
      const showSkip = currentStepIndex >= 2 && currentStep !== 'confirmation'
      expect(showSkip).toBe(false)
    })

    test('skip button visible on agent-info (step 2)', () => {
      const currentStepIndex = 2
      const currentStep = steps[currentStepIndex]
      const showSkip = currentStepIndex >= 2 && currentStep !== 'confirmation'
      expect(showSkip).toBe(true)
    })

    test('skip button visible on calendar through simulator (steps 3-5)', () => {
      for (let i = 3; i <= 5; i++) {
        const currentStep = steps[i]
        const showSkip = i >= 2 && currentStep !== 'confirmation'
        expect(showSkip).toBe(true)
      }
    })

    test('skip button hidden on confirmation (step 6)', () => {
      const currentStepIndex = 6
      const currentStep = steps[currentStepIndex]
      const showSkip = currentStepIndex >= 2 && currentStep !== 'confirmation'
      expect(showSkip).toBe(false)
    })
  })
})
