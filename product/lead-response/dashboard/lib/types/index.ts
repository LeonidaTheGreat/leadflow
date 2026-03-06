// ============================================
// AI LEAD RESPONSE SYSTEM - TYPES
// ============================================

// ---------- LEAD TYPES ----------

export type LeadStatus = 
  | 'new' 
  | 'qualified' 
  | 'nurturing' 
  | 'appointment' 
  | 'responded' 
  | 'closed' 
  | 'dnc' 
  | 'spam';

export type Market = 'ca-ontario' | 'us-national';

export type LeadIntent = 'buy' | 'sell' | 'rent' | 'info' | 'unknown';

export type Timeline = 'immediate' | '1-3months' | '3-6months' | '6+months' | 'unknown';

export type PropertyType = 'house' | 'condo' | 'land' | 'commercial' | 'unknown';

export interface Lead {
  id: string;
  fub_id: string | null;
  agent_id: string | null;
  name: string | null;
  email: string | null;
  phone: string;
  source: string;
  source_metadata: Record<string, any>;
  status: LeadStatus;
  market: Market;
  consent_sms: boolean;
  consent_email: boolean;
  dnc: boolean;
  budget_min: number | null;
  budget_max: number | null;
  timeline: string | null;
  location: string | null;
  property_type: string | null;
  urgency_score: number | null;
  last_contact_at: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  agent?: Agent;
  latest_qualification?: Qualification | any;
  message_count?: number;
  last_message?: string;
  last_message_at?: string;
}

// ---------- AGENT TYPES ----------

export interface Agent {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  fub_id: string | null;
  calcom_username: string | null;
  timezone: string;
  market: Market;
  settings: AgentSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentSettings {
  auto_respond: boolean;
  response_delay_seconds: number;
  human_handoff_threshold: number;
  booking_enabled: boolean;
}

// ---------- QUALIFICATION TYPES ----------

export interface Qualification {
  id: string;
  lead_id: string;
  intent: LeadIntent | null;
  budget_min: number | null;
  budget_max: number | null;
  timeline: Timeline | null;
  location: string | null;
  property_type: PropertyType | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  notes: string | null;
  confidence_score: number | null;
  is_qualified: boolean;
  qualification_reason: string | null;
  model_used: string;
  raw_response: Record<string, any> | null;
  created_at: string;
}

export interface QualificationInput {
  name?: string;
  email?: string;
  phone: string;
  message?: string;
  source: string;
  metadata?: Record<string, any>;
}

// ---------- MESSAGE TYPES ----------

export type MessageDirection = 'inbound' | 'outbound';

export type MessageChannel = 'sms' | 'voice' | 'email' | 'web' | 'fub';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

export interface Message {
  id: string;
  lead_id: string;
  direction: MessageDirection;
  channel: MessageChannel;
  message_body: string;
  ai_generated: boolean;
  ai_confidence: number | null;
  ai_prompt_tokens: number | null;
  ai_completion_tokens: number | null;
  twilio_sid: string | null;
  twilio_status: string | null;
  twilio_error_code: string | null;
  twilio_error_message: string | null;
  twilio_price: number | null;
  twilio_price_unit: string | null;
  twilio_num_segments: number | null;
  status: MessageStatus;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  retry_count: number | null;
  retry_attempts: any[] | null;
  metadata: Record<string, any>;
  created_at: string;
}

// ---------- BOOKING TYPES ----------

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface Booking {
  id: string;
  lead_id: string;
  agent_id: string | null;
  calcom_booking_id: string | null;
  calcom_event_type_id: string | null;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  meeting_link: string | null;
  location: string | null;
  notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ---------- TEMPLATE TYPES ----------

export type TemplateCategory = 'initial' | 'followup' | 'nurture' | 'booking' | 'handoff' | 'reengagement';

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  market: Market;
  content: string;
  variables: string[];
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// ---------- EVENT TYPES ----------

export interface Event {
  id: string;
  lead_id: string | null;
  agent_id: string | null;
  event_type: string;
  event_data: Record<string, any>;
  source: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ---------- FUB WEBHOOK TYPES ----------

export type FubEventType =
  | 'lead.created'
  | 'lead.updated'
  | 'lead.status_changed'
  | 'lead.assigned'
  | 'peopleCreated'
  | 'peopleUpdated'
  | 'peopleStageUpdated'
  | 'peopleTagsCreated'
  | 'peopleDeleted';

export interface FubWebhookPayload {
  event: FubEventType;
  data: FubLeadData;
  eventId?: string;
  eventCreated?: string;
  resourceIds?: number[];
  uri?: string;
}

export interface FubLeadData {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  phoneNumber?: string;
  phones?: Array<{value: string; type: string; isPrimary?: number}>;
  email?: string;
  emails?: Array<{value: string; type: string; isPrimary?: number}>;
  source?: string;
  status?: string;
  stage?: string;
  agentId?: string;
  agentName?: string;
  consents?: {
    sms?: boolean;
    email?: boolean;
  };
  tags?: string[];
  customFields?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

// ---------- TWILIO TYPES ----------

export interface TwilioMessage {
  sid: string;
  from: string;
  to: string;
  body: string;
  status: string;
  dateCreated: string;
  dateSent: string | null;
  dateUpdated: string;
  errorCode: string | null;
  errorMessage: string | null;
  numSegments: string;
  price: string | null;
  direction: string;
}

export interface TwilioWebhookBody {
  MessageSid: string;
  From: string;
  To: string;
  Body: string;
  MessageStatus: string;
  ErrorCode?: string;
}

// ---------- AI RESPONSE TYPES ----------

export interface AiSmsResponse {
  message: string;
  trigger: string;
  confidence: number;
  suggested_action?: 'book' | 'nurture' | 'handoff' | 'discard';
  booking_link?: string;
  personalize?: boolean;
}

export interface AiQualificationResult {
  intent: LeadIntent;
  budget_min: number | null;
  budget_max: number | null;
  timeline: Timeline;
  location: string | null;
  property_type: PropertyType | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  notes: string | null;
  confidence_score: number;
  is_qualified: boolean;
  qualification_reason: string;
  raw_response?: Record<string, any>;
}

// ---------- CAL.COM TYPES ----------

export interface CalcomBooking {
  id: number;
  uid: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  attendees: Array<{
    email: string;
    name: string;
    timeZone: string;
  }>;
  status: string;
  metadata: Record<string, any>;
  bookingLink?: string;
}

export interface CalcomEventType {
  id: number;
  title: string;
  slug: string;
  length: number;
  description: string | null;
  bookingUrl: string;
}

// ---------- DASHBOARD STATS ----------

export interface DashboardStats {
  agent_id: string;
  new_leads: number;
  qualified_leads: number;
  responded_leads: number;
  leads_today: number;
  leads_this_week: number;
  avg_urgency: number | null;
  total_leads: number;
}

// ---------- API RESPONSE TYPES ----------

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface WebhookResponse {
  success: boolean;
  lead_id?: string;
  qualified?: boolean;
  confidence?: number;
  error?: string;
}
