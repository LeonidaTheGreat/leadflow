import { supabaseServer as supabase } from '@/lib/supabase-server'
import BaseEmailService from '../../../../../lib/services/EmailService.js'

type DeliveryMethod = 'send' | 'sendVerification' | 'sendPilotConversion' | 'sendActivationOutreach'

interface EmailEvent {
  customer_id: string
  email_type: string
  recipient: string
  subject: string
  status: 'sent' | 'failed' | 'queued'
  sent_at?: string
  error_message?: string
  metadata?: any
}

interface LoggedSendParams {
  customerId: string
  emailType: string
  recipient: string
  subject: string
  metadata?: any
  method?: DeliveryMethod
  to?: string | string[]
  html?: string
  text?: string
  from?: string
  tags?: Array<{ name: string; value: string }>
  clickTracking?: boolean
  failIfUnconfigured?: boolean
  firstName?: string
  appUrl?: string
}

export class EmailService {
  private readonly transport: BaseEmailService

  constructor(transport?: BaseEmailService) {
    this.transport =
      transport ||
      new BaseEmailService({
        apiKey: process.env.RESEND_API_KEY,
        fromEmail: process.env.FROM_EMAIL,
      })
  }

  isConfigured(): boolean {
    return this.transport.isConfigured()
  }

  async send(params: any) {
    return this.transport.send(params)
  }

  async sendVerification(params: any) {
    return this.transport.sendVerification(params)
  }

  async sendPilotConversion(params: any) {
    return this.transport.sendPilotConversion(params)
  }

  async sendActivationOutreach(params: any) {
    return this.transport.sendActivationOutreach(params)
  }

  async sendLogged(params: LoggedSendParams): Promise<boolean> {
    const method = params.method || 'send'
    const deliveryParams = {
      to: params.to || params.recipient,
      subject: params.subject,
      html: params.html,
      text: params.text,
      from: params.from,
      tags: params.tags,
      clickTracking: params.clickTracking,
      failIfUnconfigured: params.failIfUnconfigured,
      firstName: params.firstName,
      appUrl: params.appUrl,
    }

    try {
      const result = await (this[method] as (args: any) => Promise<any>)(deliveryParams)
      await this.logEmailEvent({
        customer_id: params.customerId,
        email_type: params.emailType,
        recipient: params.recipient,
        subject: params.subject,
        status: result.success ? (result.mock ? 'queued' : 'sent') : 'failed',
        sent_at: result.success && !result.mock ? new Date().toISOString() : undefined,
        error_message: result.success ? undefined : result.error,
        metadata: result.success ? { ...params.metadata, resend_id: result.id || result.resend_id } : params.metadata,
      })
      return !!result.success
    } catch (error: any) {
      await this.logEmailEvent({
        customer_id: params.customerId,
        email_type: params.emailType,
        recipient: params.recipient,
        subject: params.subject,
        status: 'failed',
        error_message: error.message,
        metadata: params.metadata,
      })
      return false
    }
  }

  private async logEmailEvent(event: EmailEvent): Promise<void> {
    try {
      const query = supabase.from('email_events')
      if (typeof (query as any).insert !== 'function') {
        return
      }
      await (query as any).insert(event)
    } catch (error) {
      console.error('Error logging email event:', error)
    }
  }
}

export const emailService = new EmailService()
