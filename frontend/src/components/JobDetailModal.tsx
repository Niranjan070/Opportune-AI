import React from 'react';
import { X, ExternalLink, MapPin, Building, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import type { ScoredJob } from '../types';

interface JobDetailModalProps {
  scoredJob: ScoredJob | null;
  onClose: () => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({ scoredJob, onClose }) => {
  if (!scoredJob) return null;
  const job = scoredJob.job;

  const scoreBars = [
    { label: 'Skills Match', score: scoredJob.score_skills, weight: '35%' },
    { label: 'Title Alignment', score: scoredJob.score_title, weight: '20%' },
    { label: 'Experience Level', score: scoredJob.score_experience, weight: '15%' },
    { label: 'Location & Remote', score: scoredJob.score_location, weight: '15%' },
    { label: 'Domain Fit', score: scoredJob.score_domain, weight: '10%' },
    { label: 'Compensation', score: scoredJob.score_compensation, weight: '5%' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className={`badge badge-${scoredJob.score_tier}`}>
                {scoredJob.match_score}% · {scoredJob.score_tier.toUpperCase()} MATCH
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                {job.workplace_type.toUpperCase()}
              </span>
            </div>
            <h2 style={{ fontSize: '22px', margin: '0 0 6px 0' }}>{job.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Building size={14} /> {job.company}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} /> {job.location || 'Remote'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '20px 0',
            padding: '14px 18px',
            background: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10b981' }}>
            <ShieldCheck size={16} />
            <span>Verified Source Link: {job.sources?.length || 1} Permitted Source(s)</span>
          </div>
          <a
            href={job.primary_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ padding: '8px 20px' }}
          >
            <span>Apply Directly on ATS</span>
            <ExternalLink size={15} />
          </a>
        </div>

        {/* Deterministic Scoring Breakdown */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Deterministic Scoring Breakdown
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {scoreBars.map((bar) => (
              <div
                key={bar.label}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{bar.label} <small style={{ color: 'var(--text-dim)' }}>({bar.weight})</small></span>
                  <strong style={{ color: bar.score >= 80 ? '#10b981' : bar.score >= 50 ? '#3b82f6' : '#9ca3af' }}>
                    {bar.score}%
                  </strong>
                </div>
                <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${bar.score}%`,
                      backgroundColor: bar.score >= 80 ? '#10b981' : bar.score >= 50 ? '#3b82f6' : '#6b7280',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Rationale explanation */}
          <div
            style={{
              marginTop: '14px',
              padding: '12px 16px',
              background: 'rgba(99, 102, 241, 0.08)',
              borderLeft: '3px solid var(--primary)',
              borderRadius: '0 8px 8px 0',
              fontSize: '13px',
              color: '#c7d2fe',
            }}
          >
            <strong>Scoring Rationale:</strong> {scoredJob.explanation}
          </div>
        </div>

        {/* Skills Alignment */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Skills Alignment
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
            {scoredJob.matched_skills.map((skill) => (
              <span key={skill} className="badge badge-skill" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={12} color="#10b981" /> {skill}
              </span>
            ))}
            {scoredJob.missing_skills.map((skill) => (
              <span key={skill} className="badge badge-missing" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={12} color="#9ca3af" /> {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Full Job Description */}
        <div>
          <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Job Description & Requirements
          </h3>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '13px',
              lineHeight: '1.7',
              color: '#d1d5db',
              maxHeight: '260px',
              overflowY: 'auto',
              whiteSpace: 'pre-line',
            }}
          >
            {job.description}
          </div>
        </div>

      </div>
    </div>
  );
};
