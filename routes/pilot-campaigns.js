/**
 * Pilot Recruitment Campaign API Routes
 * 
 * Provides endpoints for managing the 30 pilots in 30 days campaign:
 * - GET /api/admin/pilot-campaigns - List all campaigns
 * - GET /api/admin/pilot-campaigns/:id - Get campaign details with stats
 * - GET /api/admin/pilot-campaigns/:id/targets - List targets for a campaign
 * - POST /api/admin/pilot-campaigns/:id/targets - Add a new target
 * - PATCH /api/admin/pilot-targets/:id - Update target status
 * - POST /api/admin/pilot-targets/:id/touchpoints - Log a touchpoint
 * - GET /api/admin/pilot-campaigns/:id/stats - Get campaign statistics
 */

const { createClient } = require('../lib/postgrest-client');
const db = createClient();

/**
 * GET /api/admin/pilot-campaigns
 * List all recruitment campaigns
 */
async function listCampaigns(req, res) {
  try {
    const { data, error } = await db
      .from('pilot_recruitment_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, campaigns: data });
  } catch (err) {
    console.error('Error listing campaigns:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/pilot-campaigns/:id
 * Get campaign details
 */
async function getCampaign(req, res) {
  try {
    const { id } = req.params;
    
    const { data: campaign, error } = await db
      .from('pilot_recruitment_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    res.json({ success: true, campaign });
  } catch (err) {
    console.error('Error getting campaign:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/pilot-campaigns/:id/targets
 * List all targets for a campaign
 */
async function listTargets(req, res) {
  try {
    const { id } = req.params;
    const { status, channel } = req.query;

    let query = db
      .from('pilot_recruitment_targets')
      .select('*')
      .eq('campaign_id', id)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (channel) {
      query = query.eq('source_channel', channel);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ success: true, targets: data });
  } catch (err) {
    console.error('Error listing targets:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/admin/pilot-campaigns/:id/targets
 * Add a new target to a campaign
 */
async function addTarget(req, res) {
  try {
    const { id } = req.params;
    const { name, email, phone, location, brokerage, social_profile_url, source_channel, notes, priority } = req.body;

    if (!name || !source_channel) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and source_channel are required' 
      });
    }

    const { data, error } = await db
      .from('pilot_recruitment_targets')
      .insert({
        campaign_id: id,
        name,
        email,
        phone,
        location,
        brokerage,
        social_profile_url,
        source_channel,
        status: 'identified',
        notes,
        priority: priority || 0
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, target: data });
  } catch (err) {
    console.error('Error adding target:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/admin/pilot-targets/:id
 * Update target status and details
 */
async function updateTarget(req, res) {
  try {
    const { id } = req.params;
    const { status, notes, priority } = req.body;

    const updates = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (priority !== undefined) updates.priority = priority;

    const { data, error } = await db
      .from('pilot_recruitment_targets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, error: 'Target not found' });
    }

    res.json({ success: true, target: data });
  } catch (err) {
    console.error('Error updating target:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/admin/pilot-targets/:id/touchpoints
 * Log a touchpoint (outreach interaction)
 */
async function addTouchpoint(req, res) {
  try {
    const { id } = req.params;
    const { channel, touch_type, message_template, utm_source, utm_medium, utm_content } = req.body;

    if (!channel || !touch_type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Channel and touch_type are required' 
      });
    }

    const { data, error } = await db
      .from('pilot_recruitment_touchpoints')
      .insert({
        target_id: id,
        channel,
        touch_type,
        message_template,
        sent_at: new Date().toISOString(),
        utm_source,
        utm_medium,
        utm_content
      })
      .select()
      .single();

    if (error) throw error;

    // Update target status if this is an initial contact
    if (touch_type === 'initial') {
      await db
        .from('pilot_recruitment_targets')
        .update({ status: 'contacted' })
        .eq('id', id);
    }

    res.status(201).json({ success: true, touchpoint: data });
  } catch (err) {
    console.error('Error adding touchpoint:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/pilot-campaigns/:id/stats
 * Get campaign statistics
 */
async function getCampaignStats(req, res) {
  try {
    const { id } = req.params;

    // Get campaign details
    const { data: campaign, error: campaignError } = await db
      .from('pilot_recruitment_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (campaignError) throw campaignError;
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    // Get target counts by status
    const { data: statusCounts, error: statusError } = await db
      .from('pilot_recruitment_targets')
      .select('status, count')
      .eq('campaign_id', id)
      .group('status');

    if (statusError) throw statusError;

    // Get target counts by channel
    const { data: channelCounts, error: channelError } = await db
      .from('pilot_recruitment_targets')
      .select('source_channel, count')
      .eq('campaign_id', id)
      .group('source_channel');

    if (channelError) throw channelError;

    // Get touchpoint counts
    const { data: touchpointCounts, error: tpError } = await db
      .from('pilot_recruitment_touchpoints')
      .select('channel, count')
      .in('target_id', db.from('pilot_recruitment_targets').select('id').eq('campaign_id', id))
      .group('channel');

    if (tpError) {
      // Touchpoints query may fail if no targets exist yet
      console.log('Touchpoint query error (non-critical):', tpError.message);
    }

    // Calculate progress
    const totalTargets = statusCounts?.reduce((sum, s) => sum + parseInt(s.count), 0) || 0;
    const signedUp = statusCounts?.find(s => s.status === 'signed_up')?.count || 0;
    const progress = campaign.goal_count > 0 ? (parseInt(signedUp) / campaign.goal_count) * 100 : 0;

    // Days remaining
    const endDate = new Date(campaign.end_date);
    const today = new Date();
    const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      stats: {
        campaign: {
          name: campaign.name,
          goal: campaign.goal_count,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          days_remaining: daysRemaining
        },
        progress: {
          signed_up: parseInt(signedUp),
          total_targets: totalTargets,
          percentage: Math.round(progress * 100) / 100
        },
        by_status: statusCounts || [],
        by_channel: channelCounts || [],
        touchpoints_by_channel: touchpointCounts || []
      }
    });
  } catch (err) {
    console.error('Error getting campaign stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/pilot-campaigns/:id/touchpoints
 * Get all touchpoints for a campaign
 */
async function listTouchpoints(req, res) {
  try {
    const { id } = req.params;
    const { target_id } = req.query;

    // First get all target IDs for this campaign
    const { data: targets, error: targetError } = await db
      .from('pilot_recruitment_targets')
      .select('id')
      .eq('campaign_id', id);

    if (targetError) throw targetError;

    const targetIds = targets?.map(t => t.id) || [];
    
    if (targetIds.length === 0) {
      return res.json({ success: true, touchpoints: [] });
    }

    let query = db
      .from('pilot_recruitment_touchpoints')
      .select('*')
      .in('target_id', targetIds)
      .order('created_at', { ascending: false });

    if (target_id) {
      query = query.eq('target_id', target_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ success: true, touchpoints: data });
  } catch (err) {
    console.error('Error listing touchpoints:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  listCampaigns,
  getCampaign,
  listTargets,
  addTarget,
  updateTarget,
  addTouchpoint,
  getCampaignStats,
  listTouchpoints
};
