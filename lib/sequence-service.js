'use strict';
const{createClient}=require('./db-client');
const{SequenceService}=require('./services/SequenceService');
const _svc=new SequenceService({db:createClient()});
module.exports={createLeadSequence:(p)=>_svc.createLeadSequence(p),findLeadByFubId:(id)=>_svc.findLeadByFubId(id),findLeadByPhone:(ph)=>_svc.findLeadByPhone(ph),hasActiveSequence:(l,t)=>_svc.hasActiveSequence(l,t),getInitialSendTime:(t)=>_svc.getInitialSendTime(t)};
