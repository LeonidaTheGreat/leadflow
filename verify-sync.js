const { SystemComponentsSync } = require('./scripts/sync-system-components.js')

async function verify() {
  const syncer = new SystemComponentsSync()
  const components = await syncer.getRegisteredComponents()
  
  console.log('\n📋 Registered Components in system_components:')
  components.forEach(comp => {
    console.log(`\n✓ ${comp.component_name}`)
    console.log(`  ID: ${comp.id}`)
    console.log(`  Category: ${comp.category}`)
    console.log(`  Status: ${comp.status} ${comp.status_emoji}`)
    console.log(`  URL: ${comp.metadata?.url || 'N/A'}`)
  })
  
  console.log(`\n📊 Total: ${components.length} components`)
}

verify().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
