import * as React from "react"
import { FormProvider } from "@/components/forms/FormProvider"
import { FormWizard, FormStep } from "@/components/forms/FormWizard"
import { TextField } from "@/components/forms/TextField"
import { SelectField } from "@/components/forms/SelectField"
import { CheckboxField } from "@/components/forms/CheckboxField"
import { 
  agentOnboardingSchema, 
  states, 
  brandVoiceOptions, 
  responseTimeOptions,
  leadSourceOptions,
  AgentOnboardingData,
  defaultOnboardingValues,
  ONBOARDING_DRAFT_KEY,
} from "@/lib/validation"
import { useAutoSave } from "@/hooks/useAutoSave"
import { authService } from "@/services/auth"
import { cn } from "@/lib/utils"
import { Building2, Calendar, CheckCircle, AlertCircle, RefreshCcw } from "lucide-react"

interface OnboardingWizardProps {
  onComplete?: () => void
  onCancel?: () => void
  className?: string
}

export function AgentOnboardingWizard({ 
  onComplete, 
  onCancel,
  className 
}: OnboardingWizardProps) {
  const [isComplete, setIsComplete] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [savedDraft, setSavedDraft] = React.useState<{ currentStep: number } | null>(null)
  const [showDraftPrompt, setShowDraftPrompt] = React.useState(false)
  
  // Pre-fill email from landing page
  const [initialValues, setInitialValues] = React.useState(defaultOnboardingValues)
  
  React.useEffect(() => {
    const savedEmail = sessionStorage.getItem('leadflow_signup_email')
    if (savedEmail) {
      setInitialValues(prev => ({
        ...prev,
        email: savedEmail
      }))
    }
  }, [])

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    setError(null)

    try {
      const result = await authService.register(data as AgentOnboardingData)
      
      if (result.success) {
        setIsComplete(true)
        onComplete?.()
      } else {
        setError(result.error || "Registration failed. Please try again.")
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
    }
  }

  const steps: FormStep[] = [
    {
      id: "account",
      title: "Account",
      description: "Create your account credentials",
      fields: ["email", "password", "confirmPassword"],
      component: <AccountStep />,
    },
    {
      id: "personal",
      title: "Personal",
      description: "Tell us about yourself",
      fields: ["firstName", "lastName", "phoneNumber"],
      component: <PersonalStep />,
    },
    {
      id: "business",
      title: "Business",
      description: "Your real estate business details",
      fields: ["brokerageName", "licenseNumber", "state", "website"],
      component: <BusinessStep />,
    },
    {
      id: "brand",
      title: "Brand Voice",
      description: "Customize how your AI assistant communicates",
      fields: ["brandVoice", "customGreeting", "responseTime", "autoSchedule"],
      component: <BrandVoiceStep />,
    },
    {
      id: "calendar",
      title: "Calendar",
      description: "Connect your scheduling tools",
      fields: ["calcomLink", "smsPhoneNumber", "leadSources"],
      component: <CalendarStep />,
    },
    {
      id: "confirm",
      title: "Confirm",
      description: "Review and complete your setup",
      fields: ["termsAccepted", "marketingConsent"],
      component: <ConfirmStep />,
    },
  ]

  if (isComplete) {
    return <SuccessView />
  }

  return (
    <div className={cn("min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 sm:p-6 lg:p-8", className)}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Welcome to LeadFlow AI
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Complete the steps below to set up your AI assistant and start converting more leads
          </p>
        </div>

        {/* Draft Prompt */}
        {showDraftPrompt && savedDraft && (
          <DraftPrompt 
            onContinue={() => setShowDraftPrompt(false)}
            onDismiss={() => {
              localStorage.removeItem(ONBOARDING_DRAFT_KEY)
              setShowDraftPrompt(false)
              setSavedDraft(null)
            }}
          />
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold">Registration Error</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-card border border-border rounded-2xl shadow-sm">
          <FormProvider
            schema={agentOnboardingSchema}
            defaultValues={initialValues}
            onSubmit={handleFormSubmit}
          >
            <AutoSaveWrapper storageKey={ONBOARDING_DRAFT_KEY}>
              <FormWizard
                steps={steps}
                onComplete={handleFormSubmit}
                onCancel={onCancel}
                allowSkip={false}
              />
            </AutoSaveWrapper>
          </FormProvider>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Your information is securely stored and never shared with third parties.
        </p>
      </div>
    </div>
  )
}

// Auto-save wrapper component
interface AutoSaveWrapperProps {
  children: React.ReactNode
  storageKey: string
}

function AutoSaveWrapper({ children, storageKey }: AutoSaveWrapperProps) {
  const { loadDraft } = useAutoSave<AgentOnboardingData>({
    storageKey,
    debounceMs: 2000,
  })

  React.useEffect(() => {
    loadDraft()
  }, [loadDraft])

  return <>{children}</>
}

// Draft Prompt Component
function DraftPrompt({ 
  onContinue, 
  onDismiss 
}: { 
  onContinue: () => void
  onDismiss: () => void 
}) {
  return (
    <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
      <div className="flex items-start gap-3">
        <RefreshCcw className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900">Welcome back!</h3>
          <p className="text-sm text-blue-800 mt-1">
            We found a saved draft of your onboarding progress. Would you like to continue where you left off?
          </p>
          <div className="flex gap-3 mt-3">
            <button
              onClick={onContinue}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Continue with Draft
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
            >
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Step Components
function AccountStep() {
  return (
    <div className="space-y-4">
      <TextField
        name="email"
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        required
      />
      <TextField
        name="password"
        label="Password"
        type="password"
        helperText="Must be at least 8 characters with uppercase, lowercase, and number"
        required
      />
      <TextField
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        required
      />
    </div>
  )
}

function PersonalStep() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          name="firstName"
          label="First Name"
          placeholder="John"
          required
        />
        <TextField
          name="lastName"
          label="Last Name"
          placeholder="Doe"
          required
        />
      </div>
      <TextField
        name="phoneNumber"
        label="Phone Number"
        placeholder="5551234567"
        helperText="10-digit US phone number for your AI assistant"
        required
      />
    </div>
  )
}

function BusinessStep() {
  return (
    <div className="space-y-4">
      <TextField
        name="brokerageName"
        label="Brokerage Name"
        placeholder="Keller Williams Realty"
        required
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          name="licenseNumber"
          label="License Number"
          placeholder="12345678"
          required
        />
        <SelectField
          name="state"
          label="State"
          options={states}
          placeholder="Select your state"
          required
        />
      </div>
      <TextField
        name="website"
        label="Website (Optional)"
        type="url"
        placeholder="https://yourwebsite.com"
      />
    </div>
  )
}

function BrandVoiceStep() {
  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium mb-3 block">
          How would you like your AI assistant to communicate?
        </label>
        <SelectField
          name="brandVoice"
          label="Brand Voice"
          options={[...brandVoiceOptions]}
          placeholder="Select a brand voice"
          required
        />
      </div>
      
      <TextField
        name="customGreeting"
        label="Custom Greeting (Optional)"
        placeholder="Hi! I'm your AI assistant..."
        helperText="Customize how your AI greets leads. Max 200 characters."
      />
      
      <SelectField
        name="responseTime"
        label="Target Response Time"
        options={[...responseTimeOptions]}
        placeholder="Select response time"
        helperText="How quickly should your AI respond to new leads?"
        required
      />
      
      <CheckboxField
        name="autoSchedule"
        label="Automatically schedule appointments when leads express interest"
      />
    </div>
  )
}

function CalendarStep() {
  return (
    <div className="space-y-6">
      <div className="bg-muted/50 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Calendar Integration</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Connect your scheduling tool so your AI can book appointments directly into your calendar.
        </p>
      </div>
      
      <TextField
        name="calcomLink"
        label="Cal.com Booking Link"
        type="url"
        placeholder="https://cal.com/yourname"
        helperText="Your Cal.com scheduling link for automated bookings"
      />
      
      <TextField
        name="smsPhoneNumber"
        label="SMS Phone Number (Optional)"
        placeholder="5551234567"
        helperText="Phone number for sending SMS notifications to leads (if different from your number)"
      />
      
      <div className="space-y-3">
        <label className="text-sm font-medium">Lead Sources (Optional)</label>
        <p className="text-sm text-muted-foreground">
          Select where your leads typically come from:
        </p>
        <div className="grid grid-cols-2 gap-3">
          {leadSourceOptions.map((source) => (
            <CheckboxField
              key={source.value}
              name={`leadSources.${source.value}`}
              label={source.label}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ConfirmStep() {
  return (
    <div className="space-y-6">
      <div className="bg-muted/50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">What happens next?</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Your account will be created immediately</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>You'll receive a confirmation email with next steps</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Your AI assistant will be activated within 24 hours</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Our team will reach out to help you connect your lead sources</span>
          </li>
        </ul>
      </div>
      
      <CheckboxField
        name="termsAccepted"
        label={
          <span>
            I agree to the{" "}
            <a href="/terms" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
          </span>
        }
        required
      />
      
      <CheckboxField
        name="marketingConsent"
        label="I want to receive product updates and tips for maximizing my lead conversion (optional)"
      />
    </div>
  )
}

function SuccessView() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold mb-3">You're All Set!</h2>
        <p className="text-muted-foreground mb-8">
          Your LeadFlow AI account has been created successfully. Check your email for confirmation and next steps.
        </p>
        <div className="space-y-3">
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center w-full px-6 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </a>
          <a
            href="/help"
            className="inline-flex items-center justify-center w-full px-6 py-3 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Get Help
          </a>
        </div>
      </div>
    </div>
  )
}

export default AgentOnboardingWizard
