import React, { useState } from 'react';
import { ExternalLink, Building2, MapPin, Check, Info, Bookmark, BookmarkCheck, Globe } from 'lucide-react';
import { api } from '../../services/api';
import type { EmbeddedScoredJob, ScoredJob } from '../../types';

interface EmbeddedJobCardProps {
  job: EmbeddedScoredJob;
  onInspect: (job: ScoredJob) => void;
}

export const EmbeddedJobCard: React.FC<EmbeddedJobCardProps> = ({ job, onInspect }) => {
  const [isSaved, setIsSaved] = useState<boolean>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('opportune_saved_jobs') || '[]');
      return saved.includes(job.job_id);
    } catch {
      return false;
    }
  });
  const [logoFailed, setLogoFailed] = useState<boolean>(false);

  const toggleSave = () => {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    try {
      const saved = JSON.parse(localStorage.getItem('opportune_saved_jobs') || '[]');
      let updated;
      if (!nextSaved) {
        updated = saved.filter((id: string) => id !== job.job_id);
        api.deleteSavedJob(job.job_id).catch(() => {});
      } else {
        updated = [...saved, job.job_id];
        api.saveJob({
          job_id: job.job_id,
          title: job.title,
          company: job.company,
          location: job.location,
          workplace_type: job.workplace_type,
          apply_url: job.apply_url,
          source: job.source,
          source_display: sourceBadge.label,
          match_score: job.match_score,
          score_tier: job.score_tier,
          salary_display: job.salary_display,
          company_logo: job.company_logo,
          matched_skills: job.matched_skills,
          missing_skills: job.missing_skills,
          score_explanation: job.score_explanation,
        }).catch(() => {});
      }
      localStorage.setItem('opportune_saved_jobs', JSON.stringify(updated));
    } catch {
      // Local fallback handled
    }
  };

  const getTierColor = (score: number) => {
    if (score >= 85) return 'var(--tier-excellent, #10b981)';
    if (score >= 70) return 'var(--tier-strong, #3b82f6)';
    if (score >= 50) return 'var(--tier-possible, #f59e0b)';
    return 'var(--tier-low, #ef4444)';
  };

  const tierColor = getTierColor(job.match_score);

  const getSourceBadgeStyle = (sourceName?: string) => {
    const s = (sourceName || job.source || '').toLowerCase();
    if (s.includes('linkedin')) {
      return { bg: 'rgba(10, 102, 194, 0.18)', border: 'rgba(10, 102, 194, 0.45)', text: '#38bdf8', label: 'LinkedIn' };
    }
    if (s.includes('naukri')) {
      return { bg: 'rgba(255, 117, 85, 0.18)', border: 'rgba(255, 117, 85, 0.45)', text: '#ff8a65', label: 'Naukri' };
    }
    if (s.includes('indeed')) {
      return { bg: 'rgba(33, 100, 243, 0.18)', border: 'rgba(33, 100, 243, 0.45)', text: '#60a5fa', label: 'Indeed' };
    }
    if (s.includes('glassdoor')) {
      return { bg: 'rgba(12, 170, 65, 0.18)', border: 'rgba(12, 170, 65, 0.45)', text: '#4ade80', label: 'Glassdoor' };
    }
    if (s.includes('greenhouse')) {
      return { bg: 'rgba(0, 178, 116, 0.18)', border: 'rgba(0, 178, 116, 0.45)', text: '#34d399', label: 'Greenhouse ATS' };
    }
    if (s.includes('lever')) {
      return { bg: 'rgba(168, 85, 247, 0.18)', border: 'rgba(168, 85, 247, 0.45)', text: '#c084fc', label: 'Lever ATS' };
    }
    if (s.includes('remotive')) {
      return { bg: 'rgba(236, 72, 153, 0.18)', border: 'rgba(236, 72, 153, 0.45)', text: '#f472b6', label: 'Remotive' };
    }
    if (s.includes('arbeitnow')) {
      return { bg: 'rgba(244, 63, 94, 0.18)', border: 'rgba(244, 63, 94, 0.45)', text: '#fb7185', label: 'Arbeitnow' };
    }
    return { bg: 'rgba(99, 102, 241, 0.18)', border: 'rgba(99, 102, 241, 0.45)', text: '#a5b4fc', label: job.source_display || 'Verified Board' };
  };

  const sourceBadge = getSourceBadgeStyle(job.source_display);

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
            source_name: sourceBadge.label,
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
        background: 'linear-gradient(135deg, rgba(20, 27, 45, 0.9) 0%, rgba(13, 18, 30, 0.95) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.09)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.28)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 28px rgba(0, 0, 0, 0.4), 0 0 20px rgba(99, 102, 241, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.09)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.28)';
      }}
    >
      {/* Top Header: Title, Company, Badges, and Match Score */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            {/* Source Badge */}
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.02em',
                padding: '2px 8px',
                borderRadius: '6px',
                background: sourceBadge.bg,
                border: `1px solid ${sourceBadge.border}`,
                color: sourceBadge.text,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Globe size={10} />
              {sourceBadge.label}
            </span>

            {/* Workplace Badge */}
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'var(--text-muted, #94a3b8)',
                textTransform: 'capitalize',
                fontWeight: 600,
              }}
            >
              {job.workplace_type || 'On-site'}
            </span>

            {/* Geo Match Indicator */}
            {job.geo_match_reason && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  color: '#34d399',
                  fontWeight: 600,
                }}
              >
                📍 {job.geo_match_reason}
              </span>
            )}

            {/* Compensation / Salary Intelligence Badge */}
            {job.salary_display && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.18)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#10b981',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  letterSpacing: '0.01em',
                }}
              >
                💰 {job.salary_display}
              </span>
            )}
          </div>

          <h4
            style={{
              margin: '0 0 4px 0',
              fontSize: '16px',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.35,
              letterSpacing: '-0.01em',
            }}
          >
            {job.title}
          </h4>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '14px', fontSize: '13px', color: '#94a3b8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#f1f5f9' }}>
              {job.company_logo && !logoFailed ? (
                <img
                  src={job.company_logo}
                  alt={job.company}
                  onError={() => setLogoFailed(true)}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    objectFit: 'contain',
                    background: '#ffffff',
                    padding: '1px',
                  }}
                />
              ) : (
                <Building2 size={14} color="#818cf8" />
              )}
              {job.company}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <MapPin size={14} color="#94a3b8" />
              {job.location}
            </span>
          </div>
        </div>

        {/* Match Score Ring Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={toggleSave}
            title={isSaved ? "Saved job" : "Save this job"}
            style={{
              background: isSaved ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${isSaved ? '#6366f1' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isSaved ? '#818cf8' : '#94a3b8',
              transition: 'all 0.15s ease',
            }}
          >
            {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 12px',
              borderRadius: '10px',
              background: `rgba(${job.match_score >= 80 ? '16, 185, 129' : '59, 130, 246'}, 0.14)`,
              border: `1.5px solid ${tierColor}`,
              minWidth: '64px',
            }}
          >
            <span style={{ fontSize: '17px', fontWeight: 900, color: tierColor, lineHeight: 1 }}>
              {job.match_score}%
            </span>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 800, marginTop: '2px', letterSpacing: '0.05em' }}>
              Match
            </span>
          </div>
        </div>
      </div>

      {/* Matched & Discovered Skills Pills */}
      {((job.matched_skills && job.matched_skills.length > 0) || (job.missing_skills && job.missing_skills.length > 0)) && (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
          {job.matched_skills.map((skill, i) => (
            <span
              key={i}
              style={{
                fontSize: '11px',
                padding: '3px 9px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.14)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600,
              }}
            >
              <Check size={11} strokeWidth={2.5} />
              {skill}
            </span>
          ))}
          {job.missing_skills.slice(0, 3).map((skill, i) => (
            <span
              key={i}
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                fontWeight: 500,
              }}
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Explanation Rationale Snippet */}
      {job.score_explanation && (
        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.5, background: 'rgba(0, 0, 0, 0.2)', padding: '6px 10px', borderRadius: '6px' }}>
          {job.score_explanation}
        </p>
      )}

      {/* Bottom Actions: Apply on Source & Inspect Score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <button
          type="button"
          onClick={handleInspect}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 8px',
            borderRadius: '6px',
            fontFamily: 'inherit',
            fontWeight: 500,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
        >
          <Info size={14} color="#818cf8" />
          <span>Score Breakdown</span>
        </button>

        <a
          href={job.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '12.5px',
            fontWeight: 600,
            padding: '7px 16px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            color: '#ffffff',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 10px rgba(79, 70, 229, 0.3)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(79, 70, 229, 0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(79, 70, 229, 0.3)';
          }}
        >
          <span>Apply on {sourceBadge.label}</span>
          <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
};
