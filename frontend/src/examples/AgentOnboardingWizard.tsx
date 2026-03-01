import * as React from "react"
import { FormProvider } from "@/components/forms/FormProvider"
import { FormWizard, FormStep } from "@/components/forms/FormWizard"
import { TextField } from "@/components/forms/TextField"
import { SelectField } from "@/components/forms/SelectField"
import { CheckboxField } from "@/components/forms/CheckboxField"
import { agentOnboardingSchema, states, AgentOnboardingData } from "@/lib/validation"

/**
 * AgentOnboardingWizard - Example implementation of a multi-step onboarding form
 * 
 * This demonstrates how to use the form components together:
 * - FormProvider for form state management with Zod validation
 * - FormWizard for multi-step navigation
 * - TextField, SelectField, CheckboxField for form inputs
 * - React Hook Form for form handling
 */

export function AgentOnboardingWizard() {
  const [isComplete, setIsComplete] = React.useState(false)

  const handleComplete = async (data: Record<string, unknown>) => {
    console.log("Form submitted:", data)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsComplete(true)
  }

  const handleCancel = () => {
    console.log("Form cancelled")
  }

  const steps: FormStep[] = [
    {
      id: "account",
      title: "Account",
      description: "Create your account credentials",
      fields: ["email", "password", "confirmPassword"],
      component: (
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
      ),
    },
    {
      id: "profile",
      title: "Profile",
      description: "Tell us about yourself",
      fields: ["firstName", "lastName", "phoneNumber", "state"],
      component: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
            helperText="10-digit US phone number"
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
      ),
    },
    {
      id: "integrations",
      title: "Integrations",
      description: "Connect your tools (optional)",
      fields: ["calcomLink", "smsPhoneNumber"],
      component: (
        <div className="space-y-4">
          <TextField
            name="calcomLink"
            label="Cal.com Booking Link"
            type="url"
            placeholder="https://cal.com/yourname"
            helperText="Your Cal.com scheduling link for automated bookings"
          />
          <TextField
            name="smsPhoneNumber"
            label="SMS Phone Number"
            placeholder="5551234567"
            helperText="Phone number for sending SMS notifications to leads"
          />
        </div>
      ),
    },
    {
      id: "confirm",
      title: "Confirm",
      description: "Review and confirm your information",
      fields: ["termsAccepted"],
      component: (
        <div className="space-y-6">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">What happens next?</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Your account will be created immediately</li>
              <li>You will receive a confirmation email</li>
              <li>You can start setting up your lead sources</li>
              <li>Our team will reach out within 24 hours</li>
            </ul>
          </div>
          <CheckboxField
            name="termsAccepted"
            label={
              <span>
                I agree to the{" "}
                <a href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </a>
              </span>
            }
            required
          />
        </div>
      ),
    },
  ]

  const defaultValues: Partial<AgentOnboardingData> = {
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    state: undefined,
    calcomLink: "",
    smsPhoneNumber: "",
    termsAccepted: false,
  }

  if (isComplete) {
    return (
      <div className="w-full max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Welcome to LeadFlow!</h2>
        <p className="text-muted-foreground">
          Your account has been created successfully. Check your email for next steps.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Agent Onboarding</h1>
          <p className="text-muted-foreground">
            Complete the steps below to set up your LeadFlow account
          </p>
        </div>

        <FormProvider
          schema={agentOnboardingSchema}
          defaultValues={defaultValues}
          onSubmit={handleComplete}
        >
          <FormWizard
            steps={steps}
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        </FormProvider>
      </div>
    </div>
  )
}

export default AgentOnboardingWizard
