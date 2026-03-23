#!/usr/bin/env node
/**
 * System Validator - Autonomous Status Checker
 * 
 * This script validates the actual system state vs documented state
 * and reports discrepancies. Run via cron or heartbeat.
 * 
 * Usage: node scripts/validate-system.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

config()

interface ValidationResult {
  component: string
  expected: string
  actual: string
  status: 'ok' | 'warning' | 'error'
  message: string
}

interface SystemState {
  timestamp: string
  results: ValidationResult[]
  summary: {
    ok: number
    warning: number
    error: number
  }
}

async function validateSystem(): Promise<SystemState> {
  const results: ValidationResult[] = []

  // 1. Validate FUB API
  try {
    const fubKey = process.env.FUB_API_KEY
    if (!fubKey) {
      results.push({
        component: 'FUB API',
        expected: 'API key configured',
        actual: 'Missing',
        status: 'error',
        message: 'FUB_API_KEY not found in environment'
      })
    } else {
      // Test API connectivity
      const auth = Buffer.from(`${fubKey}:`).toString('base64')
      const response = await axios.get('https://api.followupboss.com/v1/me', {
        headers: { Authorization: `Basic ${auth}` },
        timeout: 5000
      })
      
      results.push({
        component: 'FUB API',
        expected: 'Connected',
        actual: `Connected (User: ${response.data?.firstName || 'Unknown'})`,
        status: 'ok',
        message: 'FUB API responding normally'
      })
    }
  } catch (error: any) {
    results.push({
      component: 'FUB API',
      expected: 'Connected',
      actual: 'Error',
      status: 'error',
      message: error.message || 'Failed to connect to FUB API'
    })
  }

  // 2. Validate Twilio
  try {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID
    const twilioToken = process.env.TWILIO_AUTH_TOKEN
    
    if (!twilioSid || !twilioToken) {
      results.push({
        component: 'Twilio',
        expected: 'Credentials configured',
        actual: 'Missing',
        status: 'error',
        message: 'Twilio credentials not found'
      })
    } else {
      // Test Twilio API
      const response = await axios.get(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}.json`,
        {
          auth: { username: twilioSid, password: twilioToken },
          timeout: 5000
        }
      )
      
      results.push({
        component: 'Twilio',
        expected: 'Connected',
        actual: `Connected (Status: ${response.data?.status})`,
        status: 'ok',
        message: 'Twilio API responding normally'
      })
    }
  } catch (error: any) {
    results.push({
      component: 'Twilio',
      expected: 'Connected',
      actual: 'Error',
      status: 'error',
      message: error.message || 'Failed to connect to Twilio'
    })
  }

  // 3. Validate Supabase
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      results.push({
        component: 'Supabase',
        expected: 'Configured',
        actual: 'Missing',
        status: 'error',
        message: 'Supabase credentials not found'
      })
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data, error } = await supabase.from('real_estate_agents').select('count')
      
      if (error) throw error
      
      results.push({
        component: 'Supabase',
        expected: 'Connected',
        actual: `Connected (${data?.length || 0} agents)`,
        status: 'ok',
        message: 'Database accessible'
      })
    }
  } catch (error: any) {
    results.push({
      component: 'Supabase',
      expected: 'Connected',
      actual: 'Error',
      status: 'error',
      message: error.message || 'Failed to connect to Supabase'
    })
  }

  // 4. Validate Next.js build
  try {
    const fs = await import('fs')
    const buildExists = fs.existsSync('./.next')
    
    results.push({
      component: 'Next.js Build',
      expected: 'Built',
      actual: buildExists ? 'Built' : 'Not built',
      status: buildExists ? 'ok' : 'warning',
      message: buildExists ? 'Ready for deployment' : 'Run npm run build'
    })
  } catch (error: any) {
    results.push({
      component: 'Next.js Build',
      expected: 'Built',
      actual: 'Error',
      status: 'warning',
      message: error.message
    })
  }

  // 5. Check for critical files
  const criticalFiles = [
    'app/api/webhook/fub/route.ts',
    'app/api/webhook/twilio/route.ts',
    'lib/ai.ts',
    'lib/twilio.ts',
    'lib/supabase.ts'
  ]
  
  const fs = await import('fs')
  const missingFiles = criticalFiles.filter(f => !fs.existsSync(f))
  
  if (missingFiles.length > 0) {
    results.push({
      component: 'Critical Files',
      expected: 'All present',
      actual: `${missingFiles.length} missing`,
      status: 'error',
      message: `Missing: ${missingFiles.join(', ')}`
    })
  } else {
    results.push({
      component: 'Critical Files',
      expected: 'All present',
      actual: 'All present',
      status: 'ok',
      message: 'All critical files found'
    })
  }

  // Summary
  const summary = {
    ok: results.filter(r => r.status === 'ok').length,
    warning: results.filter(r => r.status === 'warning').length,
    error: results.filter(r => r.status === 'error').length
  }

  return {
    timestamp: new Date().toISOString(),
    results,
    summary
  }
}

// Run validation
validateSystem()
  .then(state => {
    console.log('\n🔍 System Validation Results')
    console.log('===========================\n')
    
    state.results.forEach(r => {
      const icon = r.status === 'ok' ? '✅' : r.status === 'warning' ? '⚠️' : '❌'
      console.log(`${icon} ${r.component}`)
      console.log(`   Expected: ${r.expected}`)
      console.log(`   Actual:   ${r.actual}`)
      console.log(`   ${r.message}\n`)
    })
    
    console.log('===========================')
    console.log(`Summary: ${state.summary.ok} OK, ${state.summary.warning} Warnings, ${state.summary.error} Errors`)
    
    // Write state to file for dashboard updater
    const fs = require('fs')
    fs.writeFileSync(
      './system-state.json',
      JSON.stringify(state, null, 2)
    )
    
    // Exit with error code if critical errors
    process.exit(state.summary.error > 0 ? 1 : 0)
  })
  .catch(error => {
    console.error('Validation failed:', error)
    process.exit(1)
  })
