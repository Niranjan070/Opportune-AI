/**
 * API Service Client for Opportune AI FastAPI Backend
 */
import type {
  ExtractedCriteria,
  Job,
  MCPToolInfo,
  SearchProfile,
  SearchRun,
  SearchRunDetail,
} from '../types';

const API_BASE = '/api';

export const api = {
  // System Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  // Jobs
  async getJobs(params?: {
    keyword?: string;
    workplace_type?: string;
    source?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ jobs: Job[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.keyword) query.set('keyword', params.keyword);
    if (params?.workplace_type && params.workplace_type !== 'all') {
      query.set('workplace_type', params.workplace_type);
    }
    if (params?.source && params.source !== 'all') {
      query.set('source', params.source);
    }
    if (params?.skip !== undefined) query.set('skip', params.skip.toString());
    if (params?.limit !== undefined) query.set('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/jobs?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch jobs');
    return res.json();
  },

  // Search Runs
  async getSearchRuns(limit = 20): Promise<SearchRun[]> {
    const res = await fetch(`${API_BASE}/runs?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch search runs');
    return res.json();
  },

  async getSearchRunDetail(runId: string): Promise<SearchRunDetail> {
    const res = await fetch(`${API_BASE}/runs/${runId}`);
    if (!res.ok) throw new Error(`Failed to fetch search run ${runId}`);
    return res.json();
  },

  async triggerSearchRun(payload?: {
    search_profile_id?: string;
    send_email?: boolean;
    limit_per_source?: number;
  }): Promise<SearchRun> {
    const res = await fetch(`${API_BASE}/runs/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to trigger run' }));
      throw new Error(err.detail || 'Failed to trigger run');
    }
    return res.json();
  },

  async resendEmail(runId: string, force = false, recipientEmail?: string) {
    const query = new URLSearchParams({ force: force.toString() });
    if (recipientEmail) query.set('recipient_email', recipientEmail);

    const res = await fetch(`${API_BASE}/runs/${runId}/resend-email?${query.toString()}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to dispatch email');
    return res.json();
  },

  // Search Profiles
  async getProfiles(): Promise<SearchProfile[]> {
    const res = await fetch(`${API_BASE}/profiles`);
    if (!res.ok) throw new Error('Failed to fetch search profiles');
    return res.json();
  },

  async updateProfile(profileId: string, updates: Partial<SearchProfile>): Promise<SearchProfile> {
    const res = await fetch(`${API_BASE}/profiles/${profileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  // Job Description Intelligence Extraction
  async analyzeJobDescription(rawText: string, title?: string): Promise<{
    extracted_criteria: ExtractedCriteria;
  }> {
    const res = await fetch(`${API_BASE}/profiles/analyze-jd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_text: rawText, title }),
    });
    if (!res.ok) throw new Error('Failed to analyze job description');
    const data: ExtractedCriteria = await res.json();
    return { extracted_criteria: data };
  },

  // MCP Registry
  async getMCPTools(): Promise<MCPToolInfo[]> {
    const res = await fetch(`${API_BASE}/mcp/tools`);
    if (!res.ok) throw new Error('Failed to fetch MCP tools');
    return res.json();
  },
};
