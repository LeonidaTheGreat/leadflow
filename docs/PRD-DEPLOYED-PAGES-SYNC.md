# PRD: Auto-Sync Deployed Pages to System Components

**Document ID:** PRD-DEPLOYED-PAGES-SYNC  
**Version:** 1.1  
**Status:** Ready for Dev  
**Last Updated:** 2026-03-06  
**Owner:** Product Manager  
**Related UC:** fix-deployed-pages-not-registered-in-system-

---

## 1. Overview

### 1.1 Problem Statement
Deployed Vercel pages are not properly registered in the `system_components` table with their URLs. The dashboard and orchestration system rely on `system_components` to track the status and URLs of all product components, but many deployed pages have missing or incorrect URL information. This causes:
- Dashboard showing components without URLs
- Health checks failing for components that are actually live
- Inability to navigate to deployed pages from the dashboard
- Confusion about which URLs are active

### 1.2 Product Goal
Automatically detect all deployed Vercel pages and sync their URLs to the `system_components` table. Ensure the dashboard always shows accurate, up-to-date component status and URLs.

### 1.3 Target Users
- Operations team monitoring system health
- Developers checking deployment status
- Product managers reviewing component status

### 1.4 Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| URL Coverage | 100% | All LIVE components have URLs |
| Sync Accuracy | 100% | URLs match actual Vercel deployments |
| Sync Latency | <5 min | Time from deployment to URL update |

---

## 2. User Stories

### US-1: Operations Team Sees Live URLs
**As an** operations team member  
**I want to** see the actual URLs for all deployed components  
**So that** I can verify services are accessible

**Acceptance Criteria:**
- All LIVE components show their actual Vercel URLs
- URLs are clickable and open the correct page
- No components show "no URL" when they have a live deployment

### US-2: Auto-Detection on Deployment
**As a** developer  
**I want** newly deployed pages to automatically appear in system_components  
**So that** I don't have to manually register them

**Acceptance Criteria:**
- New Vercel deployments are detected automatically
- system_components table updated with URL within 5 minutes
- Component status set to LIVE when deployment succeeds

### US-3: Manual Sync Trigger
**As an** admin  
**I want to** manually trigger a sync of deployed pages  
**So that** I can force an update when needed

**Acceptance Criteria:**
- API endpoint or script to trigger manual sync
- Sync completes within 30 seconds
- Results logged for verification

---

## 3. Requirements

### 3.1 Functional Requirements

#### FR-1: Vercel API Integration
**Priority:** P1  
**Description:** Query Vercel API for deployed projects

**Specifications:**
- Use Vercel REST API to list deployments
- Authenticate with `VERCEL_TOKEN` environment variable
- Query projects: `leadflow-ai` and `fub-inbound-webhook`
- Extract production URLs from deployment data

**API Endpoint:**
```
GET https://api.vercel.com/v6/deployments
  ?projectId={project_id}
  &limit=1
  &target=production
```

**Response Processing:**
```javascript
{
  deployments: [{
    url: "leadflow-ai-five.vercel.app",
    alias: ["leadflow-ai-five.vercel.app"],
    state: "READY",
    target: "production"
  }]
}
```

#### FR-2: System Components Update
**Priority:** P1  
**Description:** Update system_components table with discovered URLs

**Mapping Logic:**
| Vercel Project | Component Name | Category |
|----------------|----------------|----------|
| leadflow-ai | Customer Dashboard | product |
| leadflow-ai | Landing Page | product |
| leadflow-ai | Billing Flow | product |
| fub-inbound-webhook | FUB Webhook API | integration |

**Update Rules:**
- If component exists: update URL and status to LIVE
- If component doesn't exist: create new entry
- Set `verified_date` to current timestamp
- Set `status_emoji` based on state (🟢 for LIVE)

#### FR-3: Heartbeat Integration
**Priority:** P1  
**Description:** Run sync on every orchestrator heartbeat

**Specifications:**
- Add sync function to heartbeat executor
- Run after smoke tests
- Only update if URL has changed (avoid unnecessary writes)
- Log sync results

**Heartbeat Flow:**
```
1. Run smoke tests
2. Sync deployed pages to system_components
3. Generate dashboard
4. Report status
```

#### FR-4: Manual Sync API
**Priority:** P2  
**Description:** Provide endpoint for manual sync

**Endpoint:**
```
POST /api/admin/sync-deployed-pages
Headers: Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "synced": 4,
  "components": [
    {"name": "Customer Dashboard", "url": "https://leadflow-ai-five.vercel.app"},
    {"name": "FUB Webhook API", "url": "https://fub-inbound-webhook.vercel.app"}
  ]
}
```

### 3.2 Data Requirements

**system_components Table Updates:**
```sql
-- Ensure all components have proper metadata structure
UPDATE system_components 
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{url}',
  to_jsonb('https://...'::text)
)
WHERE component_name = '...';
```

**New Components to Create:**
- Customer Dashboard → https://leadflow-ai-five.vercel.app/dashboard
- Landing Page → https://leadflow-ai-five.vercel.app/
- Billing Flow → https://leadflow-ai-five.vercel.app/settings
- FUB Webhook API → https://fub-inbound-webhook.vercel.app

### 3.3 Technical Requirements

#### TR-1: Vercel API Client
```javascript
async function getVercelDeployments(projectId) {
  const response = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${projectId}&target=production&limit=1`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`
      }
    }
  );
  return response.json();
}
```

#### TR-2: Sync Function
```javascript
async function syncDeployedPages() {
  const projects = [
    { id: 'leadflow-ai', components: ['Customer Dashboard', 'Landing Page', 'Billing Flow'] },
    { id: 'fub-inbound-webhook', components: ['FUB Webhook API'] }
  ];
  
  for (const project of projects) {
    const deployment = await getVercelDeployments(project.id);
    const url = deployment.deployments[0]?.alias?.[0] || deployment.deployments[0]?.url;
    
    if (url) {
      for (const componentName of project.components) {
        await updateSystemComponent(componentName, url);
      }
    }
  }
}
```

#### TR-3: Database Update Function
```javascript
async function updateSystemComponent(name, url) {
  const { data: existing } = await supabase
    .from('system_components')
    .select('id, metadata')
    .eq('component_name', name)
    .eq('project_id', 'leadflow')
    .single();
    
  if (existing) {
    // Update existing
    await supabase
      .from('system_components')
      .update({
        status: 'LIVE',
        status_emoji: '🟢',
        verified_date: new Date().toISOString(),
        metadata: {
          ...existing.metadata,
          url: `https://${url}`
        }
      })
      .eq('id', existing.id);
  } else {
    // Create new
    await supabase
      .from('system_components')
      .insert({
        project_id: 'leadflow',
        component_name: name,
        category: 'product',
        status: 'LIVE',
        status_emoji: '🟢',
        verified_date: new Date().toISOString(),
        metadata: { url: `https://${url}` }
      });
  }
}
```

---

## 4. Acceptance Criteria

### AC-1: Vercel API Connection
- [ ] Vercel API returns deployment data with valid token
- [ ] Both projects (leadflow-ai, fub-inbound-webhook) queried
- [ ] Production URLs extracted correctly

### AC-2: System Components Updated
- [ ] Customer Dashboard has URL: https://leadflow-ai-five.vercel.app/dashboard
- [ ] Landing Page has URL: https://leadflow-ai-five.vercel.app/
- [ ] Billing Flow has URL: https://leadflow-ai-five.vercel.app/settings
- [ ] FUB Webhook API has URL: https://fub-inbound-webhook.vercel.app
- [ ] All components show status: LIVE
- [ ] All components have status_emoji: 🟢

### AC-3: Heartbeat Integration
- [ ] Sync runs on every heartbeat
- [ ] Sync completes within 30 seconds
- [ ] Only changed URLs trigger updates
- [ ] Results logged

### AC-4: Manual Sync
- [ ] API endpoint accessible with admin token
- [ ] Manual sync updates all components
- [ ] Response shows synced components

### AC-5: Dashboard Display
- [ ] Dashboard shows URLs for all LIVE components
- [ ] URLs are clickable links
- [ ] No components show "no URL"

---

## 5. E2E Test Specifications

### E2E-1: Auto-Sync on Heartbeat
**Steps:**
1. Trigger orchestrator heartbeat
2. Wait for sync to complete
3. Query system_components table
4. Verify all components have URLs

**Expected:** All deployed pages have correct URLs

### E2E-2: Manual Sync API
**Steps:**
1. Call POST /api/admin/sync-deployed-pages
2. Verify 200 response
3. Check response body shows synced components
4. Query database to verify updates

**Expected:** Manual sync succeeds, components updated

### E2E-3: URL Accuracy
**Steps:**
1. Get URLs from system_components
2. Visit each URL
3. Verify page loads correctly

**Expected:** All URLs are accessible and load correct pages

---

## 6. Implementation Notes

### Existing Components to Update
Based on current system_components table:

1. **Vercel Deployment** → Update with actual URL or merge into specific components
2. **Dashboard** → Update with https://leadflow-ai-five.vercel.app/dashboard
3. **Customer Dashboard** → Verify URL is correct
4. **FUB Webhook API** → Verify URL is correct
5. **Landing Page** → Verify URL is correct
6. **Billing Flow** → Verify URL is correct

### Environment Variables Required
```
VERCEL_TOKEN=your_vercel_api_token
```

### Files to Create/Modify
- `scripts/sync-deployed-pages.js` - Sync script
- `heartbeat-executor.js` - Add sync call (already exists, just add integration)

---

## 7. Release Criteria

- [ ] All LIVE components have URLs in system_components
- [ ] Heartbeat sync working
- [ ] Manual sync API working
- [ ] Dashboard displays all URLs correctly
- [ ] E2E tests passing
