#!/usr/bin/env node
/**
 * Dashboard HTML Validator
 * 
 * Validates that dashboard.html contains all required sections.
 * Run via: node scripts/validate-dashboard.js
 */

const fs = require('fs')
const path = require('path')

const DASHBOARD_HTML = path.join(process.cwd(), 'dashboard.html')

// Required elements and their check patterns
const REQUIRED_ELEMENTS = [
  {
    id: 'KICKOFF_BANNER',
    name: 'Kickoff Status Banner',
    check: (content) => {
      // Check for kickoff banner by id, class, or content
      const hasId = content.includes('id="kickoff-banner"')
      const hasClass = content.includes('class="card ok kickoff-status"')
      const hasComment = content.includes('KICKOFF STATUS BANNER')
      const hasText = content.includes('Kickoff Status:') || content.includes('PROJECT KICKOFF')
      return hasId && hasClass && hasComment && hasText
    }
  },
  {
    id: 'AGENTS_OBJECT',
    name: 'AGENTS JavaScript Object',
    check: (content) => {
      return content.includes('const AGENTS =') && content.includes('dev:')
    }
  },
  {
    id: 'BLOCKED_BANNER',
    name: 'Blocked Agents Banner',
    check: (content) => {
      return content.includes('BLOCKED') && content.includes('OF') && content.includes('AGENTS BLOCKED')
    }
  },
  {
    id: 'NEXT_ACTION',
    name: 'Next Action Section',
    check: (content) => {
      return content.includes('<!-- NEXT ACTION -->') || content.includes('class="next-action"')
    }
  }
]

function validateDashboard() {
  console.log('🔍 Dashboard HTML Validator')
  console.log('===========================\n')

  // Read dashboard.html
  if (!fs.existsSync(DASHBOARD_HTML)) {
    console.error('❌ dashboard.html not found at:', DASHBOARD_HTML)
    process.exit(1)
  }

  const content = fs.readFileSync(DASHBOARD_HTML, 'utf-8')
  const results = []
  let errorCount = 0

  REQUIRED_ELEMENTS.forEach(element => {
    const found = element.check(content)
    const icon = found ? '✅' : '❌'
    const status = found ? 'OK' : 'MISSING'
    
    console.log(`${icon} ${element.name} (${element.id})`)
    console.log(`   Status: ${status}`)
    
    if (!found) {
      errorCount++
      console.log(`   ⚠️  Required element not found`)
    }
    console.log()
    
    results.push({
      id: element.id,
      name: element.name,
      found,
      status
    })
  })

  console.log('===========================')
  console.log(`Results: ${results.length - errorCount}/${results.length} checks passed`)
  
  if (errorCount > 0) {
    console.log(`\n❌ ${errorCount} required element(s) missing`)
    
    // Output specific fixes needed
    console.log('\n📋 Fixes needed:')
    results.filter(r => !r.found).forEach(r => {
      switch(r.id) {
        case 'KICKOFF_BANNER':
          console.log('   - Add kickoff banner: <!-- KICKOFF STATUS BANNER -->')
          break
        case 'AGENTS_OBJECT':
          console.log('   - Add AGENTS JavaScript object with agent definitions')
          break
        case 'BLOCKED_BANNER':
          console.log('   - Add blocked agents banner')
          break
        case 'NEXT_ACTION':
          console.log('   - Add next action section')
          break
      }
    })
    
    process.exit(1)
  } else {
    console.log('\n✅ All required elements found!')
    process.exit(0)
  }
}

validateDashboard()
