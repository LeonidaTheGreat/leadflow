const { SystemComponentsSync } = require('./scripts/sync-system-components.js')

async function testMetadataSchema() {
  const syncer = new SystemComponentsSync()
  const components = await syncer.getRegisteredComponents()
  
  // Filter to smoke_tests (health_check category)
  const smokeTests = components.filter(c => c.category === 'health_check')
  
  console.log('\n✅ VERIFICATION: Metadata Schema Alignment\n')
  
  smokeTests.forEach(comp => {
    const url = comp.metadata?.url
    const test_id = comp.metadata?.test_id
    const check_type = comp.metadata?.check_type
    
    console.log(`✓ ${comp.component_name}`)
    console.log(`  URL in metadata: ${url ? '✅' : '❌'} ${url || 'MISSING'}`)
    console.log(`  test_id: ${test_id ? '✅' : '⚠️'} ${test_id || 'missing'}`)
    console.log(`  check_type: ${check_type ? '✅' : '⚠️'} ${check_type || 'missing'}`)
    console.log(`  status_emoji: ${comp.status_emoji} ${comp.status}`)
  })
  
  console.log(`\n📊 Summary:`)
  console.log(`   Total synced: ${smokeTests.length}`)
  console.log(`   All have URLs in metadata: ${smokeTests.every(c => c.metadata?.url) ? '✅' : '❌'}`)
  console.log(`   All have status_emoji: ${smokeTests.every(c => c.status_emoji) ? '✅' : '❌'}`)
}

testMetadataSchema().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
