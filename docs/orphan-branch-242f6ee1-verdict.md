# Orphan Branch Investigation: dev/242f6ee1-dev-re-merge-fix-subscription-attempts-t

**Task ID:** f813d9f6-bc7d-439b-86db-4670d060592c  
**Date:** 2026-07-19  
**Verdict:** `shippable-needs-task-pr`

```json
{
  "branch": "dev/242f6ee1-dev-re-merge-fix-subscription-attempts-t",
  "sha": "164dfcdb20a0fb41c48d48bd2c6f307fb1ddb55b",
  "verdict": "shippable-needs-task-pr",
  "evidence": {
    "commitsAheadOfMain": 1,
    "commitSubject": "fix: replace subscription_attempts with checkout_sessions in admin funnel route",
    "commitAuthor": "Stojan Madjunkov",
    "commitDate": "2026-05-19T10:56:48-04:00",
    "filesChanged": [
      "product/lead-response/dashboard/app/api/admin/funnel/checkout-attempts/route.ts",
      "product/lead-response/dashboard/jest.config.ts",
      "product/lead-response/dashboard/tests/subscription-funnel-tracking.test.ts"
    ],
    "changesSummary": "3 files changed, 42 insertions(+), 51 deletions(-)",
    "mainStillHasBug": true,
    "mainQuery": ".from('subscription_attempts') — non-existent table, causes PGRST205 on /api/admin/funnel/checkout-attempts",
    "branchFix": "Switches to .from('checkout_sessions') with correct column names (user_id) and valid statuses (expired/abandoned)",
    "testChange": "Removes subscription-funnel-tracking.test.ts from jest skip list; updates test to verify fixed behavior",
    "relatedPRs": [
      {"number": 1670, "state": "CLOSED", "title": "fix: checkout funnel uses checkout_sessions (subscription_attempts table doesn't exist)", "closedAt": "2026-05-25"},
      {"number": 1655, "state": "CLOSED", "title": "Dev (re-merge): fix-subscription-attempts-table-does-not-exist-in-supa", "closedAt": "2026-05-22"}
    ],
    "noOpenPR": true,
    "noMatchingTaskRow": true
  },
  "risk": "LOW — Fix is narrowly scoped to admin-only route and its test. The bug (PGRST205 on subscription_attempts) is confirmed present on main. No destructive changes. The subscription-funnel-tracking test currently skipped on main would re-enable. Related PRs #1655 and #1670 were closed (not merged), meaning the fix never landed.",
  "recommendation": "Create a task and PR to merge this branch. The admin funnel endpoint is currently broken on main (PGRST205). The fix is correct, tested, and safe. Prior PR closures (#1655, #1670) appear to be infrastructure failures (awaiting_merge / merge conflict), not intentional rejection of the change.",
  "commandsRun": [
    "git checkout dev/f813d9f6-investigate-orphan-branch-dev-242f6ee1-d",
    "git fetch origin dev/242f6ee1-dev-re-merge-fix-subscription-attempts-t",
    "git log --oneline main..origin/dev/242f6ee1-dev-re-merge-fix-subscription-attempts-t",
    "git diff --stat main...origin/dev/242f6ee1-dev-re-merge-fix-subscription-attempts-t",
    "git ls-remote --heads origin dev/242f6ee1-dev-re-merge-fix-subscription-attempts-t",
    "git show --no-patch --format='%H%n%an%n%ae%n%ad%n%s%n%b' 164dfcdb20a0fb41c48d48bd2c6f307fb1ddb55b",
    "gh pr list --state all --search 'subscription_attempts'",
    "gh pr view 1670 --json number,title,state,mergedAt,headRefName,closedAt,body",
    "gh pr view 1655 --json number,title,state,mergedAt,headRefName,closedAt,body",
    "git show main:product/lead-response/dashboard/app/api/admin/funnel/checkout-attempts/route.ts | grep 'subscription_attempts|checkout_sessions'",
    "git diff main...origin/dev/242f6ee1-dev-re-merge-fix-subscription-attempts-t -- product/lead-response/dashboard/jest.config.ts"
  ]
}
```
