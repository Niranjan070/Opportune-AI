import React, { useState, useMemo } from 'react';
import { Search, ExternalLink, MapPin, Building, Sparkles, Info } from 'lucide-react';
import type { ScoredJob } from '../types';

interface OpportunitiesTabProps {
  scoredJobs: ScoredJob[];
  onSelectJob: (job: ScoredJob) => void;
}

export const OpportunitiesTab: React.FC<OpportunitiesTabProps> = ({
  scoredJobs,
  onSelectJob,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [workplaceFilter, setWorkplaceFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [minScore, setMinScore] = useState(0);

  const filteredJobs = useMemo(() => {
    return scoredJobs.filter((item) => {
      const job = item.job;
      const matchesSearch =
        !searchTerm ||
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.matched_skills && item.matched_skills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchesWorkplace =
        workplaceFilter === 'all' ||
        (job.workplace_type && job.workplace_type.toLowerCase() === workplaceFilter.toLowerCase());

      const matchesTier = tierFilter === 'all' || item.score_tier === tierFilter;
      const matchesScore = item.match_score >= minScore;

      return matchesSearch && matchesWorkplace && matchesTier && matchesScore;
    });
  }, [scoredJobs, searchTerm, workplaceFilter, tierFilter, minScore]);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Filtering Bar */}
      <div className="glass-panel" style={{ padding: '18px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'center' }}>
          
          {/* Keyword Search */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by title, company, or skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>

          {/* Workplace Filter */}
          <div>
            <select value={workplaceFilter} onChange={(e) => setWorkplaceFilter(e.target.value)}>
              <option value="all">Workplace: All Types</option>
              <option value="remote">Remote Only</option>
              <option value="hybrid">Hybrid</option>
              <option value="on_site">On-Site</option>
            </select>
          </div>

          {/* Match Tier Filter */}
          <div>
            <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
              <option value="all">Match Tier: All Tiers</option>
              <option value="excellent">Excellent (85%+)</option>
              <option value="strong">Strong (70 - 84%)</option>
              <option value="possible">Possible (50 - 69%)</option>
              <option value="low">Low (&lt; 50%)</option>
            </select>
          </div>

          {/* Min Score Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Min: <strong>{minScore}%</strong>
            </span>
            <input
              type="range"
              min="0"
              max="90"
              step="5"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              style={{ accentColor: 'var(--primary)', cursor: 'pointer', height: '6px' }}
            />
          </div>

        </div>

        {/* Status count summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '12.5px', color: 'var(--text-muted)' }}>
          <span>Showing <strong>{filteredJobs.length}</strong> of {scoredJobs.length} ranked opportunities</span>
          <span style={{ color: 'var(--text-dim)' }}>Ranked deterministically across 6 weighted components</span>
        </div>
      </div>

      {/* Ranked Job Cards Feed */}
      {filteredJobs.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Sparkles size={36} color="var(--primary)" style={{ margin: '0 auto 12px auto', display: 'block', opacity: 0.6 }} />
          <h3 style={{ fontSize: '18px', color: 'var(--text-main)', marginBottom: '6px' }}>No Opportunities Match Criteria</h3>
          <p style={{ margin: 0, fontSize: '13px' }}>
            Try lowering the minimum score or clearing workplace filters to view more listings.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredJobs.map((item) => {
            const job = item.job;
            return (
              <div
                key={item.id}
                className="glass-card"
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px',
                  flexWrap: 'wrap',
                }}
              >
                {/* Left: Score Badge + Details */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', flex: '1 1 500px' }}>
                  
                  {/* Score circle */}
                  <div className={`score-circle ${item.score_tier}`}>
                    <span>{Math.round(item.match_score)}%</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className={`badge badge-${item.score_tier}`}>
                        {item.score_tier.toUpperCase()} MATCH
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                        {job.workplace_type.toUpperCase()}
                      </span>
                      {job.verification_status && (
                        <span style={{ fontSize: '11px', color: '#10b981' }}>
                          &bull; {job.verification_status.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '17px', margin: '2px 0 0 0', color: 'var(--text-main)' }}>
                      {job.title}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--text-main)' }}>
                        <Building size={14} color="var(--primary)" /> {job.company}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} /> {job.location || 'Remote'}
                      </span>
                    </div>

                    {/* Matched skills tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {(item.matched_skills || []).slice(0, 5).map((skill) => (
                        <span key={skill} className="badge badge-skill">
                          {skill}
                        </span>
                      ))}
                      {(item.missing_skills || []).slice(0, 2).map((skill) => (
                        <span key={skill} className="badge badge-missing">
                          Missing: {skill}
                        </span>
                      ))}
                    </div>

                    {/* Rationale snippet */}
                    <div style={{ fontSize: '12px', color: '#a5b4fc', marginTop: '4px' }}>
                      {item.explanation}
                    </div>

                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onSelectJob(item)}
                  >
                    <Info size={14} />
                    <span>Score Breakdown</span>
                  </button>

                  <a
                    href={job.primary_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                  >
                    <span>Apply on ATS</span>
                    <ExternalLink size={13} />
                  </a>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
