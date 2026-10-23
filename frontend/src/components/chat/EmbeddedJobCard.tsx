import React from 'react';
import { ExternalLink, Building2, MapPin, Check, Info } from 'lucide-react';
import type { EmbeddedScoredJob, ScoredJob } from '../../types';

interface EmbeddedJobCardProps {
  job: EmbeddedScoredJob;
  onInspect: (job: ScoredJob) => void;
}

export const EmbeddedJobCard: React.FC<EmbeddedJobCardProps> = ({ job, onInspect }) => {
  const getTierColor = (score: number) => {
    if (score >= 85) return 'var(--tier-excellent)';
    if (score >= 70) return 'var(--tier-strong)';
    if (score >= 50) return 'var(--tier-possible)';
    return 'var(--tier-low)';
  };

  const tierColor = getTierColor(job.match_score);

  // Convert embedded job to full ScoredJob structure for the detail modal
  const handleInspect = () => {
    const fullScoredJob: ScoredJob = {
      id: job.job_id,
      search_run_id: 'chat-discovery',
      job_id: job.job_id,
      job: {
        id: job.job_id,
        canonical_hash: job.job_id,
        title: job.title,
        company: job.company,
        location: job.location,
        workplace_type: (job.workplace_type as any) || 'remote',
        employment_type: 'full_time',
        description: job.score_explanation || '',
        primary_url: job.apply_url,
        posted_at: job.posted_at,
        verification_status: 'recently_checked',
        sources: [
          {
            id: 'ref-1',
            source_name: 'ATS / Board',
            source_job_id: job.job_id,
            source_url: job.apply_url,
            fetched_at: new Date().toISOString(),
          },
        ],
        created_at: new Date().toISOString(),
      },
      match_score: job.match_score,
      score_tier: (job.score_tier as any) || 'strong',
      score_skills: 85,
      score_title: 80,
      score_experience: 80,
      score_location: 100,
      score_domain: 75,
      score_compensation: 70,
      matched_skills: job.matched_skills || [],
      missing_skills: job.missing_skills || [],
      explanation: job.score_explanation || '',
      is_new_for_user: true,
      created_at: new Date().toISOString(),
    };
    onInspect(fullScoredJob);
  };

  return (
    <div
      style={{
        background: 'rgba(22, 32, 50, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'all 0.2s ease',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Top Header: Title, Company, Score Badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4
            style={{
              margin: '0 0 4px 0',
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--text-main)',
              lineHeight: 1.3,
            }}
          >
            {job.title}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--text-main)' }}>
              <Building2 size={13} color="var(--primary)" />
              {job.company}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={13} />
              {job.location}
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '1px 7px',
                borderRadius: '999px',
                background: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--text-primary)',
                textTransform: 'capitalize',
                fontWeight: 600,
              }}
            >
              {job.workplace_type}
            </span>
          </div>
        </div>

        {/* Match Score Badge */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            background: `rgba(${job.match_score >= 80 ? '16, 185, 129' : '59, 130, 246'}, 0.15)`,
            border: `1px solid ${tierColor}`,
            minWidth: '58px',
          }}
        >
          <span style={{ fontSize: '15px', fontWeight: 800, color: tierColor, lineHeight: 1 }}>
            {job.match_score}%
          </span>
          <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginTop: '2px' }}>
            Match
          </span>
        </div>
      </div>

      {/* Matched & Missing Skills Pills */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
        {job.matched_skills.map((skill, i) => (
          <span
            key={i}
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              fontWeight: 500,
            }}
          >
            <Check size={10} />
            {skill}
          </span>
        ))}
        {job.missing_skills.slice(0, 3).map((skill, i) => (
          <span
            key={i}
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'var(--text-dim)',
            }}
          >
            {skill}
          </span>
        ))}
      </div>

      {/* Explanation Rationale Snippet */}
      {job.score_explanation && (
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          {job.score_explanation}
        </p>
      )}

      {/* Bottom Actions: Apply on ATS & Inspect Score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
        <button
          type="button"
          onClick={handleInspect}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '4px',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <Info size={12} />
          <span>Score Breakdown</span>
        </button>

        <a
          href={job.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{
            fontSize: '12px',
            padding: '6px 14px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span>Apply on ATS</span>
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
};
