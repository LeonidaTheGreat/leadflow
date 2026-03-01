import { z } from "zod"

// Base schemas
export const textFieldSchema = z.string().min(1, "This field is required")

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email address")

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")

export const phoneSchema = z
  .string()
  .regex(/^\d{10}$/, "Phone number must be 10 digits")

export const stateSchema = z.enum([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC"
], {
  required_error: "Please select a state",
})

export const urlSchema = z
  .string()
  .url("Please enter a valid URL")
  .optional()
  .or(z.literal(""))

export const checkboxSchema = z.boolean()

// Brand voice options
export const brandVoiceOptions = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly & Approachable" },
  { value: "luxury", label: "Luxury & Exclusive" },
  { value: "casual", label: "Casual & Relaxed" },
  { value: "enthusiastic", label: "Enthusiastic & Energetic" },
] as const

export const brandVoiceSchema = z.enum([
  "professional",
  "friendly", 
  "luxury",
  "casual",
  "enthusiastic"
], {
  required_error: "Please select a brand voice",
})

// Response time options
export const responseTimeOptions = [
  { value: "immediate", label: "Immediate (within 1 minute)" },
  { value: "5min", label: "Within 5 minutes" },
  { value: "15min", label: "Within 15 minutes" },
  { value: "1hour", label: "Within 1 hour" },
] as const

export const responseTimeSchema = z.enum([
  "immediate",
  "5min",
  "15min",
  "1hour"
], {
  required_error: "Please select a response time",
})

// Lead source options
export const leadSourceOptions = [
  { value: "zillow", label: "Zillow" },
  { value: "realtor", label: "Realtor.com" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google Ads" },
  { value: "referral", label: "Referrals" },
  { value: "website", label: "Website" },
  { value: "other", label: "Other" },
] as const

// Complete agent onboarding schema
export const agentOnboardingSchema = z.object({
  // Account step
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  
  // Personal info step
  firstName: textFieldSchema,
  lastName: textFieldSchema,
  phoneNumber: phoneSchema,
  
  // Business details step
  brokerageName: z.string().min(1, "Brokerage name is required"),
  licenseNumber: z.string().min(1, "License number is required"),
  state: stateSchema,
  website: urlSchema,
  
  // Brand voice step
  brandVoice: brandVoiceSchema,
  customGreeting: z.string().max(200, "Greeting must be 200 characters or less").optional().or(z.literal("")),
  responseTime: responseTimeSchema,
  autoSchedule: z.boolean().default(true),
  
  // Calendar integration step
  calcomLink: urlSchema,
  smsPhoneNumber: phoneSchema.optional().or(z.literal("")),
  calendarProvider: z.enum(["calcom", "calendly", "google", "other"]).optional(),
  
  // Lead sources (optional)
  leadSources: z.array(z.string()).default([]),
  
  // Terms
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions",
  }),
  marketingConsent: z.boolean().default(false),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

export type AgentOnboardingData = z.infer<typeof agentOnboardingSchema>
export type BrandVoice = z.infer<typeof brandVoiceSchema>
export type ResponseTime = z.infer<typeof responseTimeSchema>
export type StateCode = z.infer<typeof stateSchema>

// States list for select dropdown
export const states: { value: StateCode; label: string }[] = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
]

// Default values for form
export const defaultOnboardingValues: Partial<AgentOnboardingData> = {
  email: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  lastName: "",
  phoneNumber: "",
  brokerageName: "",
  licenseNumber: "",
  state: undefined,
  website: "",
  brandVoice: undefined,
  customGreeting: "",
  responseTime: undefined,
  autoSchedule: true,
  calcomLink: "",
  smsPhoneNumber: "",
  calendarProvider: undefined,
  leadSources: [],
  termsAccepted: false,
  marketingConsent: false,
}

// Storage key for drafts
export const ONBOARDING_DRAFT_KEY = "leadflow_onboarding_draft"
