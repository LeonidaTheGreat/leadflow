'use strict'

/*
Task Spec (63ee38c8-fa65-48b9-b497-2484d382d4f6)
What:
- Remove task-spec header comment blocks from the three runtime dashboard routes still carrying them:
  product/lead-response/dashboard/app/api/health/route.ts
  product/lead-response/dashboard/app/api/metrics/roi/route.ts
  product/lead-response/dashboard/app/api/billing/create-checkout/route.ts
- Add a regression test that fails if those task-spec comment headers return.
Verify:
- npx jest tests/e2e/63ee38c8-pr85-taskspec-sweep.test.js --runInBand passes.
- grep -n "Task Spec|What:|Verify:|Boundaries:" on those three routes returns no matches.
- npm run build, npm run lint, npm test, npm audit --audit-level=high all exit 0.
Boundaries:
- Do not change runtime logic, signatures, or behavior of the three routes.
- Do not modify unrelated routes, services, schema, or migrations.
*/

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..')
const TARGET_FILES = [
  'product/lead-response/dashboard/app/api/health/route.ts',
  'product/lead-response/dashboard/app/api/metrics/roi/route.ts',
  'product/lead-response/dashboard/app/api/billing/create-checkout/route.ts',
]

describe('PR #85 task-spec sweep', () => {
  test('runtime dashboard routes do not contain task-spec header blocks', () => {
    for (const relativePath of TARGET_FILES) {
      const fullPath = path.join(ROOT, relativePath)
      const content = fs.readFileSync(fullPath, 'utf8')
      const header = content.split('\n').slice(0, 30).join('\n')

      expect(header).not.toMatch(/Task Spec|^\s*\*\s*What:|^\s*\*\s*Verify:|^\s*\*\s*Boundaries:/m)
    }
  })
})
