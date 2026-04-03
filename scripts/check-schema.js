#!/usr/bin/env node
const path = require('path')
const fs = require('fs')

const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath })
}

let sb = null
try {
  const { createClient } = require(path.join(__dirname, '..', 'lib', 'db-client'))

  sb = createClient()
} catch (err) {
  console.error('Failed to load PostgREST client:', err.message)
  process.exit(1)
}

async function checkSchema() {
  try {
    // Check existing use_cases
    const { data, error } = await sb
      .from('use_cases')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Error:', error)
      process.exit(1)
    }
    
    if (data && data.length > 0) {
      console.log('Existing use case structure:')
      console.log(JSON.stringify(data[0], null, 2))
    } else {
      console.log('No use cases found. Checking PRDs...')
      const { data: prds, error: prdError } = await sb
        .from('prds')
        .select('*')
        .limit(1)
      
      if (prdError) {
        console.error('Error:', prdError)
      } else if (prds && prds.length > 0) {
        console.log('Existing PRD structure:')
        console.log(JSON.stringify(prds[0], null, 2))
      }
    }
  } catch (err) {
    console.error('Fatal error:', err)
  }
  process.exit(0)
}

checkSchema()
