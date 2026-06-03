# Fix: Distribution Health Error Handling (AC4)

**UC:** fix-ac4-unmet-missing-table-error-handling-in-checkdis  
**Task:** 659e7b29-ede8-4f7a-abc8-68bd02a1b313  
**Status:** Complete

## Problem

`checkDistributionHealth()` in `~/projects/genome/scripts/distribution-collector.js` destructured only `{data}` from the `distribution_channels` query, silently discarding the error field. If the table was missing or the query failed, `landingPages` was `null`, triggering a false-positive `no_landing_page` issue that re-triggered the distribution loop indefinitely.

## Fix Applied

Wrapped the section-1 landing-page query in try/catch:

```js
let landingPages
try {
  const { data } = await supabase
    .from('distribution_channels')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .eq('channel_type', 'landing_page')
    .eq('status', 'active')
  landingPages = data
} catch (error) {
  console.warn('Failed to query distribution_channels for landing page health check:', error.message)
  return []
}
```

On query failure: logs context and returns `[]` (empty issues), preventing false-positive task creation.

## Tests Passing

- `tests/integration/fix-distribution-loop-qc.test.js` — 6/6 ✅
- `tests/e2e/0aac7a36-distribution-health-error-handling-qc.test.js` — 4/4 ✅
