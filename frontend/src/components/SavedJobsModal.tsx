import React, { useState, useEffect } from 'react';
import {
  X,
  Bookmark,
  Download,
  Trash2,
  ExternalLink,
  Building2,
  MapPin,
  Search,
  Check,
  Globe,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import type { SavedJobItem, ScoredJob } from '../types';

interface SavedJobsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInspectJob?: (job: ScoredJob) => void;
}

export const SavedJobsModal: React.FC<SavedJobsModalProps> = ({
  isOpen,
  onClose,
  onInspectJob,
}) => {
  const [savedJobs, setSavedJobs] = useState<SavedJobItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'match_score' | 'created_at' | 'company'>('match_score');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const loadSavedJobs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSavedJobs();
      setSavedJobs(data);
    } catch (err) {
      console.error('Failed to load saved jobs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSavedJobs();
    }
  }, [isOpen]);

  const handleDelete = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteSavedJob(jobId);
      setSavedJobs((prev) => prev.filter((j) => j.job_id !== jobId && j.id !== jobId));

      // Also clean up local storage
      const local = JSON.parse(localStorage.getItem('opportune_saved_jobs') || '[]');
      const updated = local.filter((id: string) => id !== jobId);
      localStorage.setItem('opportune_saved_jobs', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to delete saved job:', err);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await api.exportSavedJobsCsv();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  // Filter and sort items
  const filteredJobs = savedJobs
    .filter((job) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q);

      const matchSource =
        selectedSource === 'all' ||
        (job.source_display || job.source || '').toLowerCase().includes(selectedSource.toLowerCase());

      return matchSearch && matchSource;
    })
    .sort((a, b) => {
      if (sortBy === 'created_at') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'company') {
        return a.company.localeCompare(b.company);
      }
      return b.match_score - a.match_score;
    });

  const handleInspect = (job: SavedJobItem) => {
    if (!onInspectJob) return;
    const fullScoredJob: ScoredJob = {
      id: job.id,
      search_run_id: 'saved-jobs',
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
            id: 'ref-saved',
            source_name: job.source_display || job.source || 'Saved Job',
            source_job_id: job.job_id,
            source_url: job.apply_url,
            fetched_at: job.created_at,
          },
        ],
        created_at: job.created_at,
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
      is_new_for_user: false,
      created_at: job.created_at,
    };
    onInspectJob(fullScoredJob);
  };

  const getTierColor = (score: number) => {
    if (score >= 85) return '#10b981';
    if (score >= 70) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          background: 'linear-gradient(135deg, #0d1527 0%, #080d19 100%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(79, 70, 229, 0.4)',
              }}
            >
              <Bookmark size={18} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                Saved Job Opportunities
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                {savedJobs.length} bookmarked {savedJobs.length === 1 ? 'role' : 'roles'} across your searches
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {savedJobs.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={isExporting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  color: '#a5b4fc',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isExporting ? 'wait' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Download size={14} />
                <span>{isExporting ? 'Exporting...' : 'Export to CSV'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Toolbar: Search, Source Filter & Sort */}
        {savedJobs.length > 0 && (
          <div
            style={{
              padding: '12px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              flexWrap: 'wrap',
              background: 'rgba(0, 0, 0, 0.2)',
            }}
          >
            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '6px 12px',
                flex: 1,
                minWidth: '220px',
              }}
            >
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search saved titles, companies, locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  outline: 'none',
                  width: '100%',
                }}
              />
            </div>

            {/* Source Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Sources' },
                { id: 'linkedin', label: 'LinkedIn' },
                { id: 'naukri', label: 'Naukri' },
                { id: 'indeed', label: 'Indeed' },
                { id: 'greenhouse', label: 'Greenhouse' },
                { id: 'lever', label: 'Lever' },
                { id: 'remotive', label: 'Remotive' },
              ].map((src) => (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => setSelectedSource(src.id)}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '5px',
                    border: selectedSource === src.id ? '1px solid #6366f1' : '1px solid transparent',
                    background: selectedSource === src.id ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    color: selectedSource === src.id ? '#a5b4fc' : '#94a3b8',
                    cursor: 'pointer',
                  }}
                >
                  {src.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  fontSize: '12px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  color: '#f1f5f9',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="match_score">Highest Match Score</option>
                <option value="created_at">Recently Saved</option>
                <option value="company">Company Name</option>
              </select>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {isLoading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <p>Loading your saved opportunities...</p>
            </div>
          ) : savedJobs.length === 0 ? (
            <div
              style={{
                padding: '60px 20px',
                textAlign: 'center',
                maxWidth: '440px',
                margin: 'auto',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  color: '#818cf8',
                }}
              >
                <Bookmark size={24} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '0 0 6px 0' }}>
                No Saved Jobs Yet
              </h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                Click the bookmark icon on any job card in your search results to save opportunities here for tracking and easy application.
              </p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              No saved jobs match your current search criteria.
            </div>
          ) : (
            filteredJobs.map((job) => {
              const tierColor = getTierColor(job.match_score);
              return (
                <div
                  key={job.id || job.job_id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }}
                >
                  {/* Top line: Source, Workplace, Salary, Score & Delete */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        {/* Source Badge */}
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.35)',
                            color: '#a5b4fc',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Globe size={10} />
                          {job.source_display || job.source || 'Verified Source'}
                        </span>

                        {/* Workplace Badge */}
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#94a3b8',
                            textTransform: 'capitalize',
                            fontWeight: 600,
                          }}
                        >
                          {job.workplace_type || 'On-site'}
                        </span>

                        {/* Salary Badge */}
                        {job.salary_display && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'rgba(16, 185, 129, 0.16)',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              color: '#10b981',
                              fontWeight: 700,
                            }}
                          >
                            💰 {job.salary_display}
                          </span>
                        )}
                      </div>

                      <h4
                        style={{
                          margin: '0 0 4px 0',
                          fontSize: '15.5px',
                          fontWeight: 700,
                          color: '#ffffff',
                          lineHeight: 1.3,
                        }}
                      >
                        {job.title}
                      </h4>

                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '14px', fontSize: '13px', color: '#94a3b8' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#f1f5f9' }}>
                          {job.company_logo ? (
                            <img
                              src={job.company_logo}
                              alt={job.company}
                              style={{ width: '16px', height: '16px', borderRadius: '3px', background: '#ffffff', padding: '1px' }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <Building2 size={13} color="#818cf8" />
                          )}
                          {job.company}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <MapPin size={13} color="#94a3b8" />
                          {job.location}
                        </span>
                      </div>
                    </div>

                    {/* Match Score & Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          padding: '5px 10px',
                          borderRadius: '8px',
                          background: `rgba(99, 102, 241, 0.12)`,
                          border: `1.5px solid ${tierColor}`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          minWidth: '54px',
                        }}
                      >
                        <span style={{ fontSize: '15px', fontWeight: 900, color: tierColor, lineHeight: 1 }}>
                          {job.match_score}%
                        </span>
                        <span style={{ fontSize: '8.5px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 800, marginTop: '2px' }}>
                          Match
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(job.job_id, e)}
                        title="Remove from saved jobs"
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: '8px',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ef4444',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Skills Pills */}
                  {job.matched_skills && job.matched_skills.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px' }}>
                      {job.matched_skills.slice(0, 5).map((skill, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '10.5px',
                            padding: '2px 7px',
                            borderRadius: '5px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            color: '#34d399',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontWeight: 600,
                          }}
                        >
                          <Check size={10} strokeWidth={2.5} />
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Apply & Inspect Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <button
                      type="button"
                      onClick={() => handleInspect(job)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 6px',
                        borderRadius: '6px',
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
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '6px 14px',
                        borderRadius: '7px',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                        color: '#ffffff',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                      }}
                    >
                      <span>Apply on {job.source_display || job.source || 'Source'}</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
