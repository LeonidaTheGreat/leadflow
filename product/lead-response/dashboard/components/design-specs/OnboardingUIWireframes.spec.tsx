/**
 * DESIGN SPEC - Onboarding UI Wireframes
 * ======================================
 * Non-production wireframe spec for /dashboard/onboarding.
 * This defines structure, hierarchy, and responsive behavior for
 * the onboarding experience without changing runtime flows.
 */

type WireframeStepId =
  | 'welcome'
  | 'try-ai'
  | 'agent-info'
  | 'calendar'
  | 'sms'
  | 'simulator'
  | 'confirmation'

interface WireframeStep {
  id: WireframeStepId
  title: string
  goal: string
  primaryCta: string
  secondaryCta?: string
}

const ONBOARDING_STEPS: WireframeStep[] = [
  { id: 'welcome', title: 'Welcome', goal: 'Set expectations in under 10 seconds', primaryCta: 'Start setup' },
  { id: 'try-ai', title: 'Try AI', goal: 'Show immediate product value', primaryCta: 'Run a sample response', secondaryCta: 'Skip for now' },
  { id: 'agent-info', title: 'Agent profile', goal: 'Collect minimum identity details', primaryCta: 'Save and continue' },
  { id: 'calendar', title: 'Calendar link', goal: 'Enable appointment booking', primaryCta: 'Connect calendar', secondaryCta: 'Continue without calendar' },
  { id: 'sms', title: 'SMS setup', goal: 'Configure sending phone path', primaryCta: 'Verify SMS', secondaryCta: 'Skip temporarily' },
  { id: 'simulator', title: 'Response simulator', goal: 'Demonstrate sub-30s response behavior', primaryCta: 'Run simulator', secondaryCta: 'Skip simulation' },
  { id: 'confirmation', title: 'Finish', goal: 'Confirm readiness and enter dashboard', primaryCta: 'Go to dashboard' },
]

function StepRail({ currentStep }: { currentStep: number }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 md:p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Setup steps</p>
      <ol className="mt-3 space-y-2">
        {ONBOARDING_STEPS.map((step, index) => {
          const done = index < currentStep
          const active = index === currentStep

          return (
            <li key={step.id} className="flex items-start gap-3 rounded-lg px-2 py-2">
              <span
                className={[
                  'mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                  done ? 'bg-emerald-500 text-white' : '',
                  active ? 'border border-emerald-400 bg-emerald-500/10 text-emerald-300' : '',
                  !done && !active ? 'bg-slate-800 text-slate-400' : '',
                ].join(' ')}
              >
                {done ? '✓' : index + 1}
              </span>
              <div className="min-w-0">
                <p className={['text-sm font-medium', active ? 'text-white' : 'text-slate-300'].join(' ')}>{step.title}</p>
                <p className="text-xs text-slate-500">{step.goal}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function StepCanvas({ step }: { step: WireframeStep }) {
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 md:p-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">{step.title}</p>
        <h2 className="text-2xl font-semibold text-white">{step.goal}</h2>
        <p className="text-sm text-slate-400">Keep this step focused on one action and one decision.</p>
      </header>

      <div className="mt-6 space-y-3">
        <div className="h-12 rounded-lg border border-slate-700 bg-slate-950/60" />
        <div className="h-12 rounded-lg border border-slate-700 bg-slate-950/60" />
        <div className="h-28 rounded-lg border border-slate-700 bg-slate-950/60" />
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {step.secondaryCta ? (
          <button className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200">
            {step.secondaryCta}
          </button>
        ) : null}
        <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">
          {step.primaryCta}
        </button>
      </div>
    </section>
  )
}

export function OnboardingDesktopWireframe() {
  const currentStep = 2

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
        <aside>
          <StepRail currentStep={currentStep} />
        </aside>
        <main>
          <StepCanvas step={ONBOARDING_STEPS[currentStep]} />
        </main>
      </div>
    </div>
  )
}

export function OnboardingMobileWireframe() {
  const currentStep = 2

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 p-4">
      <header className="mb-4 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
          Step {currentStep + 1} of {ONBOARDING_STEPS.length}
        </p>
        <p className="mt-1 text-lg font-semibold text-white">{ONBOARDING_STEPS[currentStep].title}</p>
      </header>

      <StepCanvas step={ONBOARDING_STEPS[currentStep]} />

      <section className="mt-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Up next</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-300">
          {ONBOARDING_STEPS.slice(currentStep + 1, currentStep + 3).map((step) => (
            <li key={step.id}>{step.title}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

// Placeholder test so Jest treats this as a valid spec artifact.
describe('OnboardingUIWireframes.spec.tsx', () => {
  it('captures onboarding wireframe layout intent', () => {
    expect(ONBOARDING_STEPS.length).toBe(7)
  })
})
