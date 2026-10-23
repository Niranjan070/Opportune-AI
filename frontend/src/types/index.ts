/**
 * TypeScript Data Models matching FastAPI schemas for Opportune AI
 */

export type ScoreTier = 'excellent' | 'strong' | 'possible' | 'low';
export type WorkplaceType = 'remote' | 'hybrid' | 'on_site' | 'unknown';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'temporary' | 'unknown';
export type VerificationStatus = 'recently_checked' | 'likely_active' | 'needs_review' | 'possibly_stale' | 'unavailable';
export type SearchRunStatus = 'pending' | 'running' | 'completed' | 'partial_success' | 'failed';
export type SearchRunTrigger = 'manual' | 'scheduled';

export interface JobSourceRef {
  id: string;
  source_name: string;
  source_job_id: string;
  source_url: string;
  requisition_id?: string;
  fetched_at: string;
}

export interface Job {
  id: string;
  canonical_hash: string;
  title: string;
  company: string;
  location?: string;
  workplace_type: WorkplaceType;
  employment_type: EmploymentType;
  description: string;
  primary_url: string;
  posted_at?: string;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  verification_status: VerificationStatus;
  last_verified_at?: string;
  sources: JobSourceRef[];
  created_at: string;
}

export interface ScoredJob {
  id: string;
  search_run_id: string;
  job_id: string;
  job: Job;
  match_score: number;
  score_tier: ScoreTier;
  score_skills: number;
  score_title: number;
  score_experience: number;
  score_location: number;
  score_domain: number;
  score_compensation: number;
  matched_skills: string[];
  missing_skills: string[];
  explanation: string;
  is_new_for_user: boolean;
  created_at: string;
}

export interface SourceExecutionLog {
  id: string;
  source_name: string;
  status: 'success' | 'failure' | 'timeout';
  items_retrieved: number;
  latency_ms: number;
  error_details?: string;
  executed_at: string;
}

export interface EmailDispatchLog {
  id: string;
  search_run_id: string;
  recipient_email: string;
  idempotency_key: string;
  status: string;
  provider: string;
  provider_message_id?: string;
  sent_at: string;
}

export interface SearchRun {
  id: string;
  search_profile_id?: string;
  trigger_type: SearchRunTrigger;
  status: SearchRunStatus;
  total_discovered: number;
  total_deduplicated: number;
  total_ranked: number;
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface SearchRunDetail extends SearchRun {
  source_logs: SourceExecutionLog[];
  top_jobs: ScoredJob[];
  email_logs: EmailDispatchLog[];
}

export interface SearchProfile {
  id: string;
  name: string;
  target_titles: string[];
  skills: string[];
  experience_level: string;
  min_years_experience: number;
  preferred_locations: string[];
  workplace_preference: string;
  excluded_employers: string[];
  excluded_keywords: string[];
  enabled_sources: string[];
  target_ats_companies: string[];
  email_digest_enabled: boolean;
  notification_email?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ExtractedCriteria {
  title: string;
  required_skills: string[];
  preferred_skills: string[];
  seniority?: string;
  locations: string[];
  workplace_type?: string;
  responsibilities: string[];
  exclusions: string[];
}

export interface MCPToolInfo {
  name: string;
  description: string;
  source: string;
  is_read_only: boolean;
}

export interface ToolCallRecord {
  tool: string;
  args: Record<string, any>;
  latency_ms: number;
  success: boolean;
  result_summary: string;
}

export interface EmbeddedScoredJob {
  job_id: string;
  title: string;
  company: string;
  location: string;
  workplace_type: string;
  match_score: number;
  score_tier: string;
  apply_url: string;
  matched_skills: string[];
  missing_skills: string[];
  score_explanation: string;
  posted_at?: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender: 'user' | 'assistant';
  content: string;
  tool_calls: ToolCallRecord[];
  scored_jobs: EmbeddedScoredJob[];
  created_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  search_criteria: Record<string, any>;
  is_email_subscribed: boolean;
  subscriber_email?: string;
  search_profile_id?: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  messages?: ChatMessage[];
}
