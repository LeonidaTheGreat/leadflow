/**
 * Pilot Conversion Email Sequence API Routes
 * 
 * Routes:
 *   POST /api/pilot-conversion/trigger - Trigger conversion sequence manually
 *   GET /api/pilot-conversion/status - Get sequence status for all agents
 *   GET /api/pilot-conversion/status/:agentId - Get status for specific agent
 * 
 * Authentication: Requires service role key or admin token
 */

const { 
  runConversionSequence, 
  processMilestone,
  getEligibleAgents,
  getAgentStats 
} = require('../../lib/pilot-conversion-service');

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Verify admin/service authentication
 */
function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  
  // Check for service role key
  if (authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return { authorized: true, role: 'service' };
  }
  
  // Check for admin token (could be extended with JWT validation)
  if (authHeader === `Bearer ${process.env.ADMIN_API_TOKEN}`) {
    return { authorized: true, role: 'admin' };
  }
  
  return { authorized: false };
}

/**
 * Main route handler
 */
module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const path = pathname.replace('/api/pilot-conversion', '').replace(/^\//, '');

  try {
    // All routes require authentication
    const auth = verifyAuth(req);
    if (!auth.authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Route: POST /trigger
    if (path === 'trigger' && req.method === 'POST') {
      return handleTrigger(req, res);
    }

    // Route: GET /status
    if (path === 'status' && req.method === 'GET') {
      return handleGetStatus(req, res);
    }

    // Route: GET /status/:agentId
    if (path.startsWith('status/') && req.method === 'GET') {
      const agentId = path.replace('status/', '');
      return handleGetAgentStatus(req, res, agentId);
    }

    // Route: GET /eligible/:milestone
    if (path.startsWith('eligible/') && req.method === 'GET') {
      const milestone = path.replace('eligible/', '');
      return handleGetEligible(req, res, milestone);
    }

    return res.status(404).json({ error: 'Not found' });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

/**
 * POST /trigger - Trigger conversion sequence
 * Body: { milestone?: 'day_30' | 'day_45' | 'day_55' | 'all' }
 */
async function handleTrigger(req, res) {
  const { milestone = 'all' } = req.body || {};

  console.log(`[API] Triggering conversion sequence: ${milestone}`);

  try {
    let results;

    if (milestone === 'all') {
      results = await runConversionSequence();
    } else {
      const validMilestones = ['day_30', 'day_45', 'day_55'];
      if (!validMilestones.includes(milestone)) {
        return res.status(400).json({ 
          error: 'Invalid milestone', 
          validMilestones 
        });
      }
      results = await processMilestone(milestone);
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });

  } catch (error) {
    console.error('Error triggering sequence:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /status - Get sequence status for all agents
 */
async function handleGetStatus(req, res) {
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  try {
    // Get all pilot agents with their sequence status
    const { data: agents, error } = await supabase
      .from('pilot_conversion_sequence_status')
      .select('*')
      .order('days_since_pilot_start', { ascending: false });

    if (error) {
      throw error;
    }

    // Calculate summary stats
    const summary = {
      totalPilotAgents: agents?.length || 0,
      day30Sent: agents?.filter(a => a.day_30_status === 'sent').length || 0,
      day45Sent: agents?.filter(a => a.day_45_status === 'sent').length || 0,
      day55Sent: agents?.filter(a => a.day_55_status === 'sent').length || 0,
      upgraded: agents?.filter(a => a.plan_tier !== 'pilot').length || 0
    };

    return res.status(200).json({
      success: true,
      summary,
      agents: agents || []
    });

  } catch (error) {
    console.error('Error getting status:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /status/:agentId - Get status for specific agent
 */
async function handleGetAgentStatus(req, res, agentId) {
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  try {
    // Get agent info
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, email, name, plan_tier, pilot_started_at')
      .eq('id', agentId)
      .single();

    if (agentError) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get email logs
    const { data: logs, error: logsError } = await supabase
      .from('pilot_conversion_email_logs')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (logsError) {
      throw logsError;
    }

    // Get current stats
    const stats = await getAgentStats(agentId);

    // Calculate days since pilot start
    const daysSinceStart = agent.pilot_started_at 
      ? Math.floor((Date.now() - new Date(agent.pilot_started_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return res.status(200).json({
      success: true,
      agent: {
        ...agent,
        days_since_start: daysSinceStart
      },
      stats,
      email_logs: logs || []
    });

  } catch (error) {
    console.error('Error getting agent status:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /eligible/:milestone - Get eligible agents for a milestone
 */
async function handleGetEligible(req, res, milestone) {
  const validMilestones = ['day_30', 'day_45', 'day_55'];
  
  if (!validMilestones.includes(milestone)) {
    return res.status(400).json({ 
      error: 'Invalid milestone', 
      validMilestones 
    });
  }

  try {
    const agents = await getEligibleAgents(milestone);
    
    return res.status(200).json({
      success: true,
      milestone,
      count: agents.length,
      agents
    });

  } catch (error) {
    console.error('Error getting eligible agents:', error);
    return res.status(500).json({ error: error.message });
  }
}
