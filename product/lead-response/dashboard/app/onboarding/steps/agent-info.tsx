'use client'

import { useState } from 'react'
import { User, Phone, MapPin, Globe } from 'lucide-react'
import FormField from '../components/form-field'
import FormInput from '../components/form-input'
import FormSelect from '../components/form-select'

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
]

const CANADIAN_PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
  'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
  'Quebec', 'Saskatchewan', 'Yukon',
]

const COUNTRY_OPTIONS = [
  { value: 'us', label: '🇺🇸 United States' },
  { value: 'ca', label: '🇨🇦 Canada' },
]

export default function OnboardingAgentInfo({
  onNext,
  onBack,
  agentData,
  setAgentData,
}: {
  onNext: () => void
  onBack: () => void
  agentData: any
  setAgentData: (data: any) => void
}) {
  const [firstName, setFirstName] = useState(agentData.firstName || '')
  const [lastName, setLastName] = useState(agentData.lastName || '')
  const [phoneNumber, setPhoneNumber] = useState(agentData.phoneNumber || '')
  const [country, setCountry] = useState(agentData.country || 'us')
  const [state, setState] = useState(agentData.state || '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validatePhone = (phone: string) => phone.replace(/\D/g, '').length === 10

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  }

  const handleContinue = () => {
    setErrors({})
    const newErrors: Record<string, string> = {}

    if (!firstName.trim()) newErrors.firstName = 'First name is required'
    if (!lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required'
    else if (!validatePhone(phoneNumber)) newErrors.phoneNumber = 'Please enter a valid 10-digit phone number'
    if (!state) newErrors.state = 'State is required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setAgentData({
      ...agentData,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phoneNumber.replace(/\D/g, ''),
      country,
      state,
      market: country === 'ca' ? 'ca-ontario' : 'us-national',
    })

    onNext()
  }

  const regionOptions =
    country === 'ca'
      ? CANADIAN_PROVINCES.map((p) => ({ value: p, label: p }))
      : US_STATES.map((s) => ({ value: s, label: s }))

  return (
    <div className="animate-in fade-in-up duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Tell us about you</h2>
          <p className="text-slate-300">We'll use this to personalize your experience</p>
        </div>

        <div className="space-y-5 mb-8">
          <FormField label="First Name" htmlFor="agent-first-name" error={errors.firstName}>
            <FormInput
              id="agent-first-name"
              data-testid="first-name"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value)
                setErrors((p) => ({ ...p, firstName: '' }))
              }}
              placeholder="John"
              hasError={!!errors.firstName}
              icon={<User className="w-5 h-5" />}
            />
          </FormField>

          <FormField label="Last Name" htmlFor="agent-last-name" error={errors.lastName}>
            <FormInput
              id="agent-last-name"
              data-testid="last-name"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value)
                setErrors((p) => ({ ...p, lastName: '' }))
              }}
              placeholder="Smith"
              hasError={!!errors.lastName}
            />
          </FormField>

          <FormField label="Phone Number" htmlFor="agent-phone" error={errors.phoneNumber}>
            <FormInput
              id="agent-phone"
              data-testid="phone"
              type="tel"
              autoComplete="tel"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(formatPhone(e.target.value))
                setErrors((p) => ({ ...p, phoneNumber: '' }))
              }}
              placeholder="(555) 123-4567"
              maxLength={12}
              hasError={!!errors.phoneNumber}
              icon={<Phone className="w-5 h-5" />}
            />
          </FormField>

          <FormField label="Country" htmlFor="agent-country">
            <FormSelect
              id="agent-country"
              data-testid="country"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value)
                setState('')
              }}
              options={COUNTRY_OPTIONS}
              icon={<Globe className="w-5 h-5" />}
            />
          </FormField>

          <FormField
            label={country === 'ca' ? 'Operating Province' : 'Operating State'}
            htmlFor="agent-region"
            error={errors.state}
          >
            <FormSelect
              id="agent-region"
              data-testid="state"
              value={state}
              onChange={(e) => {
                setState(e.target.value)
                setErrors((p) => ({ ...p, state: '' }))
              }}
              placeholder={country === 'ca' ? 'Select your province...' : 'Select your state...'}
              options={regionOptions}
              hasError={!!errors.state}
              icon={<MapPin className="w-5 h-5" />}
            />
          </FormField>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 px-4 py-3 min-h-[44px] border border-slate-600/50 text-slate-300 font-semibold rounded-lg hover:bg-slate-700/30 transition-all duration-200"
          >
            ← Back
          </button>
          <button
            onClick={handleContinue}
            className="flex-1 px-4 py-3 min-h-[44px] bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  )
}
