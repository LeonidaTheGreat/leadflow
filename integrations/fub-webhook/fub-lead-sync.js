/**
 * FUB Lead Sync
 * Periodically syncs leads from FUB to AI system
 * Provides lead context for SMS generation
 * 
 * Modes:
 * - Full sync: Fetch all leads (daily, 2 AM)
 * - Incremental sync: Fetch updated leads (every 30 min)
 * - Event-driven: Real-time webhook (recommended)
 */

const axios = require('axios');
const cron = require('node-cron');

class FubLeadSync {
  constructor() {
    this.fubApiKey = process.env.FUB_API_KEY;
    this.fubApiBase = process.env.FUB_API_BASE_URL;
    this.lastSyncTime = null;
    this.syncInProgress = false;
  }

  /**
   * Start scheduled sync jobs
   */
  startScheduledSync() {
    // Full sync: Daily at 2 AM (low volume time)
    cron.schedule('0 2 * * *', () => {
      console.log('⏰ Full sync scheduled (daily)');
      this.fullSync();
    });

    // Incremental sync: Every 30 minutes
    cron.schedule('*/30 * * * *', () => {
      console.log('⏰ Incremental sync scheduled');
      this.incrementalSync();
    });

    console.log('✅ Lead sync jobs started');
  }

  /**
   * Full sync: Fetch all leads from FUB
   * Use for initial setup or periodic full refresh
   */
  async fullSync() {
    if (this.syncInProgress) {
      console.warn('⚠️  Sync already in progress, skipping');
      return;
    }

    this.syncInProgress = true;
    const startTime = Date.now();

    try {
      console.log('🔄 Starting full lead sync...');

      const leads = await this.fetchAllLeads();
      console.log(`📥 Fetched ${leads.length} leads from FUB`);

      const processed = await this.processLeads(leads);
      console.log(`✅ Processed ${processed.length} leads`);

      const cacheUpdated = await this.updateLeadCache(processed);
      console.log(`💾 Updated cache for ${cacheUpdated} leads`);

      this.lastSyncTime = new Date();
      console.log(`⏱️  Full sync completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('❌ Full sync error:', error.message);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Incremental sync: Fetch only recently updated leads
   * More efficient than full sync
   */
  async incrementalSync() {
    if (this.syncInProgress) {
      console.warn('⚠️  Sync already in progress, skipping');
      return;
    }

    this.syncInProgress = true;
    const startTime = Date.now();

    try {
      console.log('🔄 Starting incremental lead sync...');

      // Fetch leads updated since last sync (or last 30 min if no prior sync)
      const since = this.lastSyncTime || new Date(Date.now() - 30 * 60 * 1000);
      const leads = await this.fetchLeadsUpdatedSince(since);
      console.log(`📥 Fetched ${leads.length} updated leads from FUB`);

      if (leads.length === 0) {
        console.log('  → No new leads since last sync');
        this.lastSyncTime = new Date();
        return;
      }

      const processed = await this.processLeads(leads);
      const cacheUpdated = await this.updateLeadCache(processed);
      console.log(`✅ Processed & cached ${cacheUpdated} leads`);

      this.lastSyncTime = new Date();
      console.log(`⏱️  Incremental sync completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('❌ Incremental sync error:', error.message);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Fetch all leads from FUB API
   * Handles pagination
   */
  async fetchAllLeads() {
    const leads = [];
    let page = 0;
    const pageSize = 100;

    try {
      while (true) {
        const response = await axios.get(
          `${this.fubApiBase}/leads?page=${page}&pageSize=${pageSize}`,
          {
            headers: {
              Authorization: `Bearer ${this.fubApiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const pageLeads = response.data.leads || [];
        if (pageLeads.length === 0) break;

        leads.push(...pageLeads);
        console.log(`  → Fetched page ${page + 1} (${pageLeads.length} leads)`);

        page++;
        if (pageLeads.length < pageSize) break;
      }

      console.log(`📊 Total leads fetched: ${leads.length}`);
      return leads;
    } catch (error) {
      console.error('❌ Error fetching leads:', error.message);
      throw error;
    }
  }

  /**
   * Fetch leads updated since a given timestamp
   * Efficient for incremental sync
   */
  async fetchLeadsUpdatedSince(since) {
    const sinceIso = since.toISOString();
    const leads = [];

    try {
      const response = await axios.get(
        `${this.fubApiBase}/leads?updatedSince=${sinceIso}&pageSize=100`,
        {
          headers: {
            Authorization: `Bearer ${this.fubApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.leads || [];
    } catch (error) {
      console.error('❌ Error fetching updated leads:', error.message);
      throw error;
    }
  }

  /**
   * Process leads: Enrich, validate, normalize
   */
  async processLeads(leads) {
    const processed = [];

    for (const lead of leads) {
      try {
        // 1. Normalize phone number (E.164 format)
        const phoneNormalized = this.normalizePhone(lead.phoneNumber);

        // 2. Validate phone is E.164 compliant
        if (!this.isValidPhoneNumber(phoneNormalized)) {
          console.warn(`⚠️  Lead ${lead.id}: Invalid phone format`);
          continue;
        }

        // 3. Check consent flag
        const hasSmsConsent = lead.consents?.sms === true;

        // 4. Detect market (based on phone country code)
        const market = this.detectMarket(phoneNormalized);

        // 5. Fetch associated agent (for personalization)
        const agentName = lead.agentName || 'Real Estate Agent';

        // 6. Extract lead source
        const source = lead.source || 'unknown';

        // 7. Enrich with property preferences
        const preferences = {
          minPrice: lead.minPrice,
          maxPrice: lead.maxPrice,
          propertyType: lead.propertyType,
          location: lead.location,
        };

        const enrichedLead = {
          id: lead.id,
          firstName: lead.firstName || '',
          lastName: lead.lastName || '',
          phoneNumber: phoneNormalized,
          email: lead.email || '',
          status: lead.status || 'New Lead',
          smsConsent: hasSmsConsent,
          market,
          agentName,
          source,
          preferences,
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
          lastContactedAt: lead.lastContactedAt,
        };

        processed.push(enrichedLead);
      } catch (error) {
        console.error(`⚠️  Error processing lead ${lead.id}:`, error.message);
        continue;
      }
    }

    return processed;
  }

  /**
   * Normalize phone to E.164 format
   * Input: (416) 555-1234, 4165551234, +1-416-555-1234, etc.
   * Output: +14165551234
   */
  normalizePhone(phone) {
    if (!phone) return null;

    // Remove all non-numeric except +
    let normalized = phone.replace(/[^\d+]/g, '');

    // Ensure + prefix
    if (!normalized.startsWith('+')) {
      // Assume North America if starts with 1
      if (normalized.startsWith('1')) {
        normalized = `+${normalized}`;
      } else if (normalized.length === 10) {
        // Assume US/CA area code + number
        normalized = `+1${normalized}`;
      } else {
        normalized = `+${normalized}`;
      }
    }

    return normalized;
  }

  /**
   * Validate phone is E.164 compliant
   * Format: +[1-9]{1}[0-9]{1,14}
   */
  isValidPhoneNumber(phone) {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  }

  /**
   * Detect market (US or CA) from phone country code
   */
  detectMarket(phoneNumber) {
    if (!phoneNumber) return 'us-national';

    const countryCode = phoneNumber.slice(0, 2); // e.g., "+1"
    const areaCode = phoneNumber.slice(2, 5);   // e.g., "416" or "212"

    if (countryCode === '+1') {
      // North America: +1
      // Canada area codes: 200-999 (simplified)
      // US area codes: overlapping
      // Use heuristic: 416, 647, 705, 613 = Ontario (Canada)
      const canadianAreaCodes = [
        '204', '226', '236', '249', '250', '289', '306', '403', '416', '418',
        '431', '437', '438', '450', '506', '514', '519', '548', '581', '587',
        '600', '613', '647', '705', '709', '778', '780', '807', '819', '825',
        '867', '902', '905', '920',
      ];

      if (canadianAreaCodes.includes(areaCode)) {
        return 'ca-ontario'; // Simplified: assume Ontario for Canadian #
      }
    }

    return 'us-national'; // Default
  }

  /**
   * Update lead cache with processed leads
   * Stores in Redis for quick access
   */
  async updateLeadCache(leads) {
    // TODO: Implement Redis caching
    let updated = 0;

    for (const lead of leads) {
      try {
        // Store lead context for SMS generation
        // Redis key: lead:{leadId}
        // TTL: 7 days (refresh on each sync)
        await this.cacheLeadData(lead);
        updated++;
      } catch (error) {
        console.error(`⚠️  Error caching lead ${lead.id}:`, error.message);
      }
    }

    return updated;
  }

  /**
   * Cache individual lead in Redis
   */
  async cacheLeadData(lead) {
    // TODO: Implement Redis set
    console.log(`  ✓ Cached lead ${lead.id} (${lead.market})`);
  }

  /**
   * Get cached lead by ID
   */
  async getCachedLead(leadId) {
    // TODO: Implement Redis get
    console.log(`  → Retrieved cached lead ${leadId}`);
    return null;
  }

  /**
   * Clear all lead cache
   */
  async clearLeadCache() {
    // TODO: Implement Redis clear
    console.log('🗑️  Lead cache cleared');
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      lastSyncTime: this.lastSyncTime,
      syncInProgress: this.syncInProgress,
      nextFullSync: '2 AM daily',
      nextIncrementalSync: '30 min intervals',
    };
  }
}

// ===== EXPORTS =====
module.exports = FubLeadSync;

// ===== INITIALIZATION =====
if (require.main === module) {
  const sync = new FubLeadSync();
  sync.startScheduledSync();

  // Manual trigger for testing
  console.log('💡 Manual full sync: sync.fullSync()');
  console.log('💡 Manual incremental sync: sync.incrementalSync()');
  console.log('💡 Check status: sync.getStatus()');
}
