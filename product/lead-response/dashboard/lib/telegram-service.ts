/**
 * Telegram Service
 * Sends messages and alerts to Telegram via the Telegram Bot API
 */

import * as https from 'https'
import { logger } from '@/lib/logger'

interface TelegramMessage {
  chat_id?: number | string
  text: string
  message_thread_id?: number // For topic-based chats
  parse_mode?: 'HTML' | 'Markdown'
}

/**
 * Send a message via Telegram Bot API
 * Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID env vars
 */
export async function sendTelegramMessage(payload: TelegramMessage): Promise<boolean> {
  return new Promise((resolve) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.ORCHESTRATOR_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID || payload.chat_id

    if (!botToken || !chatId) {
      logger.warn('Telegram not configured: BOT_TOKEN or CHAT_ID missing')
      resolve(false)
      return
    }

    const message = {
      ...payload,
      chat_id: chatId,
    }

    const jsonPayload = JSON.stringify(message)
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonPayload),
      },
    }

    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (d) => {
        body += d
      })
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(true)
        } else {
          logger.error(`Telegram send failed (${res.statusCode}): ${body.slice(0, 200)}`)
          resolve(false)
        }
      })
    })

    req.on('error', (err) => {
      logger.error(`Telegram send error: ${err.message}`)
      resolve(false)
    })

    req.setTimeout(10000, () => {
      req.destroy()
      resolve(false)
    })

    req.write(jsonPayload)
    req.end()
  })
}

/**
 * Send a stuck pilot alert to Telegram
 */
export async function sendStuckPilotAlert(
  agentName: string,
  stage: string,
  hoursStuck: number,
  lastContactAt: string | null,
  lastContactType: string | null
): Promise<boolean> {
  const dashboardUrl = 'https://stojanadmins-mac-mini.tail3ca16c.ts.net/admin/pilots'

  const text = `⚠️ <b>Stuck Pilot Alert</b>

${agentName} has been in <b>'${stage}'</b> for <b>${Math.round(hoursStuck)}h</b>

${
  lastContactAt
    ? `Last contact: <b>${lastContactAt}</b> via <b>${lastContactType}</b>`
    : `No contact yet`
}

<a href="${dashboardUrl}">View Dashboard</a>`

  return sendTelegramMessage({
    text,
    parse_mode: 'HTML',
  })
}

/**
 * Send pilot cohort daily digest to Telegram
 */
export async function sendCohortDigest(
  byStage: Record<string, number>,
  stuckAgents: string[],
  recentConversions: string[],
  totalPilots: number
): Promise<boolean> {
  const stageEmojis: Record<string, string> = {
    signed_up: '📝',
    email_verified: '✉️',
    fub_connected: '🔗',
    first_lead_responded: '📊',
    aha_moment: '🎯',
    trial_started: '✅',
    paid: '💰',
  }

  const stageLines = Object.entries(byStage)
    .map(([stage, count]) => `${stageEmojis[stage] || '•'} ${stage}: ${count}`)
    .join('\n')

  const stuckLine =
    stuckAgents.length > 0
      ? `\n\n⚠️ <b>Stuck Pilots (>24h)</b>\n${stuckAgents.join('\n')}`
      : ''

  const conversionsLine =
    recentConversions.length > 0
      ? `\n\n🎉 <b>Recent Conversions</b>\n${recentConversions.join('\n')}`
      : ''

  const text = `📊 <b>Pilot Cohort Daily Digest</b>

Total: <b>${totalPilots} pilots</b>

<b>By Stage:</b>
${stageLines}${stuckLine}${conversionsLine}`

  return sendTelegramMessage({
    text,
    parse_mode: 'HTML',
  })
}
