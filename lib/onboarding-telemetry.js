'use strict'
/**
 * Onboarding Telemetry Library - project-root standalone version.
 * No Next.js path aliases. Dashboard version: product/lead-response/dashboard/lib/onboarding-telemetry.js
 */
const _log = (lv, ...a) => console[lv]('[onboarding-telemetry]', ...a)
const logger = { info: (...a) => _log('log',...a), warn: (...a) => _log('warn',...a), error: (...a) => _log('error',...a) }
const STEP_INDEX = { email_verified: 1, fub_connected: 2, phone_configured: 3, sms_verified: 4, aha_completed: 5 }
const STEP_NAMES = Object.keys(STEP_INDEX)
function isSmokTestAccount(e) { return !e ? false : /^smoke-test@/.test(e) || /@leadflow-test\.com$/.test(e) }
async function logOnboardingEvent(s, aid, sn, status, meta = {}) {
  try {
    if (!STEP_NAMES.includes(sn)) return { success: false, error: 'Invalid step name: ' + sn + '. Valid: ' + STEP_NAMES.join(', ') }
    const { data: ev, error: ee } = await s.from('onboarding_events').insert({ agent_id: aid, step_name: sn, status, timestamp: new Date().toISOString(), metadata: meta }).select().single()
    if (ee) { logger.error('insert:', ee); return { success: false, error: ee.message } }
    if (status === 'completed') {
      const si = STEP_INDEX[sn]; const { data: ag, error: ge } = await s.from('real_estate_agents').select('onboarding_step').eq('id', aid).single()
      if (ge) return { success: true, event: ev, updateError: ge.message }
      const cur = ag?.onboarding_step || 0
      if (si > cur) { await s.from('real_estate_agents').update({ onboarding_step: si, last_onboarding_step_update: new Date().toISOString() }).eq('id', aid); if (si === 5) await s.from('real_estate_agents').update({ onboarding_completed: true, onboarding_completed_at: new Date().toISOString() }).eq('id', aid) }
    }
    return { success: true, event: ev }
  } catch (e) { logger.error('error:', e); return { success: false, error: e.message } }
}
async function getFunnelStatus(s) {
  try { const { data: a, error } = await s.from('funnel_real_agents').select('*').order('onboarding_step',{ascending:false}).order('created_at',{ascending:false}); if (error) return {success:false,error:error.message}; return { success: true, agents: a.map(x => { const h=(Date.now()-new Date(x.last_onboarding_step_update).getTime())/3600000; return {...x,time_at_step_hours:Math.round(h*100)/100,is_stuck:h>24} }) } } catch(e) { return {success:false,error:e.message} }
}
async function getFunnelConversions(s) { try { const{data:c,error}=await s.from('funnel_conversion_rates').select('*'); return error?{success:false,error:error.message}:{success:true,conversions:c} } catch(e){return{success:false,error:e.message}} }
async function checkAndAlertStuckAgents(s) {
  try { const{data:all,error}=await s.from('funnel_real_agents').select('*').order('created_at',{ascending:true}); if(error) return{success:false,error:error.message}; return createStuckAlerts(s,all.filter(a=>Date.now()-new Date(a.last_onboarding_step_update).getTime()>24*60*60*1000)) } catch(e){return{success:false,error:e.message}}
}
async function createStuckAlerts(s, stuck) {
  const alerts = []
  for (const a of stuck) { try { const sn=Object.entries(STEP_INDEX).find(([,i])=>i===a.onboarding_step)?.[0]||'unknown'; const{data:ex}=await s.from('onboarding_stuck_alerts').select('*').eq('agent_id',a.id).eq('step_name',sn).single(); if(ex){const{data:u}=await s.from('onboarding_stuck_alerts').update({last_alert_at:new Date().toISOString(),alert_count:(ex.alert_count||1)+1}).eq('id',ex.id).select().single();if(u)alerts.push(u)}else{const h=Math.round((Date.now()-new Date(a.last_onboarding_step_update).getTime())/3600000);const{data:n}=await s.from('onboarding_stuck_alerts').insert({agent_id:a.id,step_name:sn,stuck_since:a.last_onboarding_step_update,metadata:{email:a.email,step_index:a.onboarding_step,hours_stuck:h}}).select().single();if(n)alerts.push(n)} } catch(e){logger.error('alert:',e)} }
  return { success: true, alerts_created: alerts.length, alerts }
}
async function getOnboardingEvents(s,aid=null,limit=50){try{let q=s.from('onboarding_events').select('*').order('timestamp',{ascending:false}).limit(limit);if(aid)q=q.eq('agent_id',aid);const{data:events,error}=await q;return error?{success:false,error:error.message}:{success:true,events}}catch(e){return{success:false,error:e.message}}}
module.exports = { logOnboardingEvent, getFunnelStatus, getFunnelConversions, checkAndAlertStuckAgents, createStuckAlerts, getOnboardingEvents, isSmokTestAccount, STEP_INDEX, STEP_NAMES }
