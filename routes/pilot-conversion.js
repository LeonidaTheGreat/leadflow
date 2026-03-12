/**
 * Pilot Conversion Email API Routes
 * 
 * Routes for triggering and monitoring the pilot-to-paid conversion email sequence
 */

const express = require('express');
const router = express.Router();
const pilotConversionService = require('../lib/pilot-conversion-service');

/**
 * POST /api/pilot-conversion/trigger
 * Manual trigger for the full daily conversion sequence
 * Processes all three milestones for all eligible agents
 * 
 * Auth: Requires Bearer token with ORCHESTRATOR_BOT_TOKEN or admin access
 */
router.post('/trigger', async (req, res) => {
  try {
    // Optional auth: check for orchestrator bot token
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;
    
    if (token && token !== process.env.ORCHESTRATOR_BOT_TOKEN) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const results = await pilotConversionService.runDailyConversionSequence();

    res.json({
      success: true,
      message: 'Pilot conversion sequence triggered successfully',
      data: results
    });
  } catch (error) {
    console.error('Error in POST /trigger:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pilot-conversion/status
 * Get overall conversion sequence status
 * 
 * Returns:
 * - Total emails sent across all milestones
 * - Breakdown by milestone
 * - Configuration status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await pilotConversionService.getConversionSequenceStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error in GET /status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pilot-conversion/status/:agentId
 * Get conversion email status for a specific agent
 * 
 * Params:
 * - agentId: UUID of the agent
 * 
 * Returns:
 * - Email send history for the agent
 * - Stats from each sent email
 */
router.get('/status/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'agentId is required'
      });
    }

    const status = await pilotConversionService.getAgentConversionStatus(agentId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error in GET /status/:agentId:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pilot-conversion/eligible/:milestone
 * Get all agents eligible for a specific milestone
 * 
 * Params:
 * - milestone: 'day_30', 'day_45', or 'day_55'
 * 
 * Returns:
 * - Array of eligible agents
 */
router.get('/eligible/:milestone', async (req, res) => {
  try {
    const { milestone } = req.params;
    
    const validMilestones = ['day_30', 'day_45', 'day_55'];
    if (!validMilestones.includes(milestone)) {
      return res.status(400).json({
        success: false,
        error: `Invalid milestone. Must be one of: ${validMilestones.join(', ')}`
      });
    }

    const agents = await pilotConversionService.getEligibleAgents(milestone);
    
    res.json({
      success: true,
      data: {
        milestone,
        total: agents.length,
        agents: agents
      }
    });
  } catch (error) {
    console.error('Error in GET /eligible/:milestone:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
