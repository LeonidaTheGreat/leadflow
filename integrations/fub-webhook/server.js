require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const FUB_API_KEY = process.env.FUB_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const PORT = process.env.PORT || 3000;

if (!FUB_API_KEY) {
  console.error('ERROR: FUB_API_KEY environment variable required');
  process.exit(1);
}

// FUB API client
const fubApi = axios.create({
  baseURL: 'https://api.followupboss.com/v1',
  headers: {
    'Authorization': `Basic ${Buffer.from(FUB_API_KEY + ':').toString('base64')}`,
    'Content-Type': 'application/json'
  }
});

// Optional: Verify webhook secret
function verifyWebhook(req, res, next) {
  if (!WEBHOOK_SECRET) return next();
  
  const secret = req.headers['x-webhook-secret'];
  if (secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Main webhook endpoint
app.post('/webhook/fub-lead', verifyWebhook, async (req, res) => {
  let person = {};
  try {
    const lead = req.body;
    
    console.log('=== WEBHOOK RECEIVED ===');
    console.log('Lead data:', JSON.stringify(lead, null, 2));
    
    // Validate required fields
    if (!lead.name && !lead.phone && !lead.email) {
      return res.status(400).json({ 
        error: 'Missing required fields. Provide at least name, phone, or email.' 
      });
    }

    // Parse budget and timeframe from background
    let price = null;
    let timeframeText = null;
    let timeframeOption = null;
    let timeframeId = null;
    
    if (lead.background) {
      // Handle formats: $2,000,000 | $2000000 | 2 million | 2m | 2M
      const budgetMatch = lead.background.match(/Budget:\s*\$?([\d,]+(?:\.\d+)?)\s*(k|K|thousand|m|M|million)?/i);
      if (budgetMatch) {
        // Remove commas and parse
        let numStr = budgetMatch[1].replace(/,/g, '');
        price = parseFloat(numStr);
        const multiplier = budgetMatch[2]?.toLowerCase();
        if (multiplier === 'k' || multiplier === 'thousand') {
          price = price * 1000;
        } else if (multiplier === 'm' || multiplier === 'million') {
          price = price * 1000000;
        }
        console.log(`Parsed price: ${price} (from: ${budgetMatch[0]})`);
      }
      
      const timeframeMatch = lead.background.match(/Timeline:\s*([^\n]+)/i);
      if (timeframeMatch) {
        timeframeText = timeframeMatch[1].trim();
        
        // Map to FUB timeframe IDs: 1="0-3 Months", 2="3-6 Months", 3="6-12 Months", 4="12+ Months", 5="No Plans"
        const tf = timeframeText.toLowerCase();
        timeframeId = null;
        
        if (tf.includes('asap') || tf.includes('immediate') || tf.includes('right away') || tf.includes('now')) {
          timeframeId = 1;
        } else if (tf.match(/\b0[-\s]?3\b/) || tf.match(/\b1[-\s]?3\b/) || tf.match(/\bless than 3\b/) || tf.match(/\bin 3\b/)) {
          timeframeId = 1;
        } else if (tf.match(/\b3[-\s]?6\b/) || tf.match(/\b4[-\s]?6\b/) || tf.match(/\bwithin 6\b/)) {
          timeframeId = 2;
        } else if (tf.match(/\b6[-\s]?12\b/) || tf.match(/\b7[-\s]?12\b/) || tf.match(/\bwithin 12\b/) || tf.match(/\byear\b/)) {
          timeframeId = 3;
        } else if (tf.match(/\b12\+/) || tf.match(/\bmore than 12\b/) || tf.match(/\bover 12\b/) || tf.match(/\b1\+ year/)) {
          timeframeId = 4;
        } else if (tf.includes('no plan') || tf.includes('not sure') || tf.includes('undecided') || tf.includes('just browsing')) {
          timeframeId = 5;
        } else {
          // Try to extract number and map
          const numMatch = tf.match(/(\d+)/);
          if (numMatch) {
            const months = parseInt(numMatch[1]);
            if (months <= 3) timeframeId = 1;
            else if (months <= 6) timeframeId = 2;
            else if (months <= 12) timeframeId = 3;
            else timeframeId = 4;
          }
        }
        
        const timeframeNames = {1: '0-3 Months', 2: '3-6 Months', 3: '6-12 Months', 4: '12+ Months', 5: 'No Plans'};
        timeframeOption = timeframeId ? timeframeNames[timeframeId] : null;
        
        console.log(`Parsed timeframe: "${timeframeText}" -> ID ${timeframeId} (${timeframeOption})`);
      }
    }
    
    // Get classification from tags
    const classification = lead.tags?.find(t => ['hot', 'warm', 'cold'].includes(t))?.toUpperCase() || 'N/A';
    
    // Build custom fields (FUB expects them as direct properties with internal field names)
    const customFields = {};
    // Map source to valid dropdown choices: Chatbot, SMS, Voice
    if (lead.source) {
      const sourceLower = lead.source.toLowerCase();
      if (sourceLower.includes('chat') || sourceLower.includes('web')) {
        customFields.customAILeadSource = 'Chatbot';
      } else if (sourceLower.includes('sms') || sourceLower.includes('text')) {
        customFields.customAILeadSource = 'SMS';
      } else if (sourceLower.includes('voice') || sourceLower.includes('call')) {
        customFields.customAILeadSource = 'Voice';
      }
    }
    if (lead.background) customFields.customAIConversationSummary = lead.background.substring(0, 500);
    const propertyInterest = lead.background?.match(/Looking for:\s*([^\n]+)/i)?.[1]?.trim();
    if (propertyInterest) customFields.customPropertyInterest = propertyInterest;
    if (classification && classification !== 'N/A') customFields.customUrgencyLevel = classification;
    customFields.customAIHandoffTimestamp = new Date().toISOString();
    customFields.customAIQualified = 'Yes';
    
    console.log('Custom fields to send:', customFields);
    
    // Build FUB person payload (custom fields are direct properties)
    person = {
      firstName: lead.name?.split(' ')[0] || '',
      lastName: lead.name?.split(' ').slice(1).join(' ') || '',
      emails: lead.email ? [{ value: lead.email, type: 'work' }] : [],
      phones: lead.phone ? [{ value: lead.phone, type: 'mobile' }] : [],
      source: lead.source || 'AI Agent',
      stage: 'Lead',
      background: lead.background || '',
      tags: lead.tags || ['ai-qualified'],
      price: price,
      ...(timeframeId && { timeframeId: timeframeId }),
      ...customFields
    };

    // Check if person already exists
    let existingPerson = null;
    if (lead.phone) {
      try {
        const searchRes = await fubApi.get(`/people?phone=${encodeURIComponent(lead.phone)}`);
        if (searchRes.data.people?.length > 0) {
          existingPerson = searchRes.data.people[0];
        }
      } catch (e) {}
    }

    let result;
    let customFieldErrors = [];
    let usedCustomFields = false;
    
    if (existingPerson) {
      console.log(`Updating person: ${existingPerson.id}`);
      
      // Try update with custom fields first
      try {
        result = await fubApi.put(`/people/${existingPerson.id}`, person);
        console.log('✅ Updated with custom fields');
        usedCustomFields = Object.keys(customFields).length > 0;
      } catch (customErr) {
        // If custom fields fail, try without them
        console.log('⚠️ Update with custom fields failed:', customErr.response?.data?.message || customErr.message);
        customFieldErrors.push(customErr.response?.data?.message || customErr.message);
        
        const { customAILeadSource, customAIConversationSummary, customPropertyInterest, customUrgencyLevel, customAIHandoffTimestamp, customAIQualified, ...personWithoutCustom } = person;
        result = await fubApi.put(`/people/${existingPerson.id}`, personWithoutCustom);
        console.log('✅ Updated without custom fields');
      }
    } else {
      console.log('Creating new person');
      
      // Try create with custom fields first
      try {
        result = await fubApi.post('/people', person);
        console.log('✅ Created with custom fields');
        usedCustomFields = Object.keys(customFields).length > 0;
      } catch (customErr) {
        // If custom fields fail, try without them
        console.log('⚠️ Create with custom fields failed:', customErr.response?.data?.message || customErr.message);
        customFieldErrors.push(customErr.response?.data?.message || customErr.message);
        
        const { customAILeadSource, customAIConversationSummary, customPropertyInterest, customUrgencyLevel, customAIHandoffTimestamp, customAIQualified, ...personWithoutCustom } = person;
        result = await fubApi.post('/people', personWithoutCustom);
        console.log('✅ Created without custom fields');
      }
    }

    // Add note with all details
    try {
      const noteText = `AI Lead Details:
${lead.background || 'N/A'}

Handoff: ${new Date().toISOString()}
Classification: ${classification}
Timeframe: ${timeframeText || 'N/A'}${timeframeOption ? ` (mapped to: ${timeframeOption})` : ''}`;
      
      await fubApi.post('/notes', {
        personId: result.data.id,
        text: noteText,
        type: 'General'
      });
    } catch (noteError) {
      console.error('Note error:', noteError.message);
    }

    res.json({
      success: true,
      personId: result.data.id,
      action: existingPerson ? 'updated' : 'created',
      customFieldsAttempted: Object.keys(customFields),
      customFieldsApplied: usedCustomFields,
      customFieldErrors: customFieldErrors.length > 0 ? customFieldErrors : null
    });

  } catch (error) {
    console.error('Webhook error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});
