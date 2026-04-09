require('dotenv').config()
const { createClient } = require('../../lib/db')
const sb = createClient(process.env.NEXT_PUBLIC_API_URL, process.env.API_SECRET_KEY)
async function check() {
  const { data, error } = await sb.from('real_estate_agents').select('*').limit(5)
  console.log('real_estate_agents table:', JSON.stringify(data, null, 2))
  if (error) console.error('error:', error)
  process.exit(0)
}
check()
