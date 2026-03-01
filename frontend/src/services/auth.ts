import { AgentOnboardingData } from "@/lib/validation"

export interface AuthResponse {
  success: boolean
  user?: {
    id: string
    email: string
    firstName: string
    lastName: string
  }
  token?: string
  error?: string
}

export interface OnboardingResponse {
  success: boolean
  message?: string
  error?: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api"

class AuthService {
  private token: string | null = null

  constructor() {
    // Try to load token from localStorage on init
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("leadflow_token")
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }
    return headers
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== "undefined") {
      localStorage.setItem("leadflow_token", token)
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("leadflow_token")
    }
  }

  getToken(): string | null {
    return this.token
  }

  isAuthenticated(): boolean {
    return !!this.token
  }

  async register(data: AgentOnboardingData): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phoneNumber: data.phoneNumber,
          brokerageName: data.brokerageName,
          licenseNumber: data.licenseNumber,
          state: data.state,
          website: data.website,
          brandVoice: data.brandVoice,
          customGreeting: data.customGreeting,
          responseTime: data.responseTime,
          autoSchedule: data.autoSchedule,
          calcomLink: data.calcomLink,
          smsPhoneNumber: data.smsPhoneNumber,
          calendarProvider: data.calendarProvider,
          leadSources: data.leadSources,
          marketingConsent: data.marketingConsent,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: result.error || "Registration failed",
        }
      }

      if (result.token) {
        this.setToken(result.token)
      }

      return {
        success: true,
        user: result.user,
        token: result.token,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      }
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: result.error || "Login failed",
        }
      }

      if (result.token) {
        this.setToken(result.token)
      }

      return {
        success: true,
        user: result.user,
        token: result.token,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      }
    }
  }

  async logout(): Promise<void> {
    this.clearToken()
  }

  async verifyEmail(token: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ token }),
      })

      const result = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: result.error || "Email verification failed",
        }
      }

      return {
        success: true,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      }
    }
  }

  async resendVerification(email: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: result.error || "Failed to resend verification",
        }
      }

      return {
        success: true,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      }
    }
  }

  async getCurrentUser(): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: this.getHeaders(),
      })

      const result = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: result.error || "Failed to get user",
        }
      }

      return {
        success: true,
        user: result.user,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      }
    }
  }

  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/check-email`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ email }),
      })

      const result = await response.json()
      return result.exists || false
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const authService = new AuthService()

// React hook for auth state
export function useAuth() {
  return {
    isAuthenticated: authService.isAuthenticated(),
    token: authService.getToken(),
    login: authService.login.bind(authService),
    logout: authService.logout.bind(authService),
    register: authService.register.bind(authService),
    getCurrentUser: authService.getCurrentUser.bind(authService),
    checkEmailExists: authService.checkEmailExists.bind(authService),
  }
}
