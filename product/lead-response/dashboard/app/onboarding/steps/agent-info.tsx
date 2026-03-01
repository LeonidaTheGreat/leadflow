'use client'

import { useState } from 'react'
import { User, Phone, MapPin, AlertCircle } from 'lucide-react'
import OnboardingButton from '../components/button'

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
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
  const [state, setState] = useState(agentData.state || '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validatePhone = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    return cleanPhone.length === 10
  }

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
      state,
    })

    onNext()
  }

  return (
    <div className="animate-in fade-in-up duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Tell us about you</h2>
          <p className="text-slate-300">We'll use this to personalize your experience</p>
        </div>

        <div className="space-y-5 mb-8">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              First Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className={`w-full pl-10 pr-4 py-3 bg-slate-700/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition ${
                  errors.firstName ? 'border-red-500/50' : 'border-slate-600/50'
                }`}
              />
            </div>
            {errors.firstName && (
              <div className="flex items-center gap-2 mt-1 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" />
                {errors.firstName}
              </div>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Smith"
              className={`w-full px-4 py-3 bg-slate-700/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition ${
                errors.lastName ? 'border-red-500/50' : 'border-slate-600/50'
              }`}
            />
            {errors.lastName && (
              <div className="flex items-center gap-2 mt-1 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" />
                {errors.lastName}
              </div>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(formatPhone(e.target.value))}
                placeholder="(555) 123-4567"
                maxLength={12}
                className={`w-full pl-10 pr-4 py-3 bg-slate-700/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition ${
                  errors.phoneNumber ? 'border-red-500/50' : 'border-slate-600/50'
                }`}
              />
            </div>
            {errors.phoneNumber && (
              <div className="flex items-center gap-2 mt-1 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" />
                {errors.phoneNumber}
              </div>
            )}
          </div>

          {/* State */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Operating State
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-slate-500 w-5 h-5 pointer-events-none" />
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 bg-slate-700/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition appearance-none ${
                  errors.state ? 'border-red-500/50' : 'border-slate-600/50'
                }`}
              >
                <option value="">Select your state...</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {errors.state && (
              <div className="flex items-center gap-2 mt-1 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" />
                {errors.state}
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 px-4 py-3 border border-slate-600/50 text-slate-300 font-semibold rounded-lg hover:bg-slate-700/30 transition-all duration-200"
          >
            ← Back
          </button>
          <button
            onClick={handleContinue}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  )
}
