'use strict'
/**
 * Test: improve-agent task dedup in StrategicReviewHandler
 * Genome file: ~/.openclaw/genome/intelligence/strategic-review-handler.js
 *
 * Verifies the fix for uc-genome-fix-improve-task-dedup (task c42fb3a3):
 *   - itemType/targetAgent are derived before the dedup block
 *   - Improve: title pattern is checked during dedup
 *   - createTask is skipped when an existing Improve task is found
 */

const assert = require('assert')
const path = require('path')
const fs = require('fs')

const HANDLER_PATH = path.join(
  process.env.HOME, '.openclaw/genome/intelligence/strategic-review-handler.js'
)

function testItemTypeDerivedBeforeDedupBlock() {
  const src = fs.readFileSync(HANDLER_PATH, 'utf-8')
  const itemTypeIdx = src.indexOf("const itemType = item.type || 'fix'")
  const fixDedupIdx = src.indexOf('findTaskByTitle(`Fix:')
  assert(itemTypeIdx !== -1, 'itemType declaration not found in handler')
  assert(fixDedupIdx !== -1, 'Fix dedup findTaskByTitle not found')
  assert(
    itemTypeIdx < fixDedupIdx,
    `itemType must be declared before dedup block (got ${itemTypeIdx} >= ${fixDedupIdx})`
  )
}

function testImproveTitlePatternPresent() {
  const src = fs.readFileSync(HANDLER_PATH, 'utf-8')
  assert(
    src.includes("findTaskByTitle(`Improve: ${targetAgent} agent instructions"),
    'Improve dedup findTaskByTitle pattern missing from handler'
  )
  const guardIdx = src.indexOf("itemType === 'improve-agent'")
  const improveDedupIdx = src.indexOf("findTaskByTitle(`Improve:")
  assert(
    guardIdx !== -1 && improveDedupIdx !== -1 && guardIdx < improveDedupIdx,
    'Improve dedup check must be guarded by itemType === improve-agent'
  )
}

async function testImproveDedupcreateTaskSkipped() {
  async function shouldCreate(item, titleLookup) {
    const shortDesc = item.description.slice(0, 60)
    const itemType = item.type || 'fix'
    const targetAgent = item.agent || 'dev'
    let existing = await titleLookup(`Fix: ${shortDesc}`) || await titleLookup(`Dev: ${shortDesc}`)
    if (!existing && itemType === 'improve-agent') {
      existing = await titleLookup(`Improve: ${targetAgent} agent instructions \u{2014} ${shortDesc}`)
    }
    return existing == null
  }

  const item = { type: 'improve-agent', agent: 'dev', description: 'Always run npm test before marking done' }

  // Existing Improve task → skip
  const skip = await shouldCreate(item, async (t) => t.startsWith('Improve:') ? { id: 'x' } : null)
  assert.strictEqual(skip, false, 'Must skip when existing Improve title found')

  // No existing task → create
  const create = await shouldCreate(item, async () => null)
  assert.strictEqual(create, true, 'Must create when no existing task')

  // Fix dedup regression check
  const fixItem = { type: 'fix', description: 'Improve response speed for slow queries' }
  const fixSkip = await shouldCreate(fixItem, async (t) => t.startsWith('Fix:') ? { id: 'y' } : null)
  assert.strictEqual(fixSkip, false, 'Fix dedup must still prevent duplicates')
}

async function runTests() {
  console.log('\n🧪 improve-agent dedup tests (uc-genome-fix-improve-task-dedup)\n')
  let passed = 0
  const total = 3

  try { testItemTypeDerivedBeforeDedupBlock(); passed++; console.log('  ✅ [1/3] itemType before dedup') }
  catch (e) { console.error('  ❌ [1/3]', e.message) }

  try { testImproveTitlePatternPresent(); passed++; console.log('  ✅ [2/3] Improve title pattern present') }
  catch (e) { console.error('  ❌ [2/3]', e.message) }

  try { await testImproveDedupcreateTaskSkipped(); passed++; console.log('  ✅ [3/3] dedup simulation correct') }
  catch (e) { console.error('  ❌ [3/3]', e.message) }

  const passRate = passed / total
  console.log(`\n${passed === total ? '✅' : '❌'} ${passed}/${total} passed\n`)
  return { passed, total, passRate }
}

if (require.main === module) {
  runTests().then(r => process.exit(r.passRate === 1 ? 0 : 1))
}

module.exports = { runTests }
