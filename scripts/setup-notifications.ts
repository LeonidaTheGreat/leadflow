#!/usr/bin/env node
/**
 * Project Notification Config
 * 
 * Configures notification targets for new projects.
 * Run once per project setup.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function ask(question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, resolve)
  })
}

interface NotificationConfig {
  projectName: string
  discord: {
    enabled: boolean
    channelId?: string
    useThreads: boolean
  }
  telegram: {
    enabled: boolean
    target: string  // Format: telegram:GROUP_ID or telegram:GROUP_ID:topic:TOPIC_ID
    bidirectional: boolean
  }
  primaryInterface: 'discord' | 'telegram'
}

async function main() {
  console.log('🔔 Project Notification Setup\n')
  console.log('This configures where your orchestrator sends updates.\n')

  const projectName = await ask('Project name (e.g., leadflow-ai): ')
  
  console.log('\n--- Discord Configuration ---')
  const discordEnabled = (await ask('Enable Discord notifications? (y/n): ')).toLowerCase() === 'y'
  
  let discordConfig = { enabled: false, useThreads: false }
  if (discordEnabled) {
    const channelId = await ask('Discord channel ID (right-click channel → Copy ID): ')
    const useThreads = (await ask('Use threads for orchestrator sessions? (y/n): ')).toLowerCase() === 'y'
    discordConfig = { enabled: true, channelId, useThreads }
  }

  console.log('\n--- Telegram Configuration ---')
  const telegramEnabled = (await ask('Enable Telegram notifications? (y/n): ')).toLowerCase() === 'y'
  
  let telegramConfig = { enabled: false, target: '', bidirectional: false }
  if (telegramEnabled) {
    console.log('\nTo find your Telegram group/topic ID:')
    console.log('1. Add @userinfobot to your group')
    console.log('2. It will reply with the group ID (negative number)')
    console.log('3. For topics: ID format is GROUP_ID:TOPIC_ID')
    console.log('   Example: -1003852328909:10171\n')
    
    const target = await ask('Telegram target (format: telegram:GROUP_ID:topic:TOPIC_ID): ')
    const bidirectional = (await ask('Enable bidirectional (Telegram → Discord)? (y/n): ')).toLowerCase() === 'y'
    telegramConfig = { enabled: true, target, bidirectional }
  }

  console.log('\n--- Primary Interface ---')
  const primary = await ask('Primary control interface (discord/telegram): ')

  const config: NotificationConfig = {
    projectName,
    discord: discordConfig,
    telegram: telegramConfig,
    primaryInterface: primary as 'discord' | 'telegram'
  }

  // Save config
  const configPath = path.join(process.cwd(), '.notifications.json')
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

  console.log('\n✅ Configuration saved to .notifications.json')
  console.log('\nSummary:')
  console.log(`  Discord: ${config.discord.enabled ? '✅' : '❌'} ${config.discord.useThreads ? '(with threads)' : ''}`)
  console.log(`  Telegram: ${config.telegram.enabled ? '✅' : '❌'} ${config.telegram.target}`)
  console.log(`  Primary: ${config.primaryInterface}`)
  
  if (config.telegram.enabled && config.discord.enabled) {
    console.log('\n🌉 Bridge: Discord ↔ Telegram enabled')
  }

  rl.close()
}

main().catch(err => {
  console.error(err)
  rl.close()
  process.exit(1)
})
