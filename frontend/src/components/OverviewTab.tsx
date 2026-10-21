import React from 'react';
import { Shield, Zap, CheckCircle2, ArrowRight, Clock, Database, Globe } from 'lucide-react';
import type { SearchRun } from '../types';

interface OverviewTabProps {
  recentRun: SearchRun | null;
  totalJobsCount: number;
  onNavigateToJobs: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  recentRun,
  totalJobsCount,
  onNavigateToJobs,
}) => {
  const sources = [
    { name: 'Arbeitnow', type: 'Public Job Board API', status: 'Online', desc: 'Tech & engineering roles' },
    { name: 'Greenhouse', type: 'Direct ATS Integration', status: 'Online', desc: 'Top high-growth companies' },
    { name: 'Lever', type: 'Direct ATS Integration', status: 'Online', desc: 'Verified company postings' },
    { name: 'Remotive', type: 'Remote Curated Hub', status: 'Online', desc: 'Global & remote positions' },
  ];

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Metric Cards Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Discovered Opportunities
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Database size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {recentRun?.total_discovered || totalJobsCount}
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            <CheckCircle2 size={13} />
            <span>Canonical deduplication active</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Top Ranked Matches
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Zap size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-display)' }}>
            {recentRun?.total_ranked || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Evaluated via 6-component deterministic scoring
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Permitted Source Connectors
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
              <Globe size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#06b6d4', fontFamily: 'var(--font-display)' }}>
            4 / 4
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            <Shield size={13} />
            <span>Zero scraping / Zero CAPTCHA</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Daily Scheduler Status
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-display)' }}>
            Active (9:00 AM)
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Asia/Kolkata timezone scheduled
          </div>
        </div>

      </div>

      {/* Source Connectors Health Grid */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '18px', margin: '0 0 4px 0' }}>Permitted Source Connectors</h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Compliant, permitted ATS APIs and job board feeds running with timeout boundaries and SSRF defenses.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onNavigateToJobs}>
            <span>View All Jobs</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {sources.map((src) => (
            <div
              key={src.name}
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>{src.name}</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                  }}
                >
                  {src.status}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{src.type}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                {src.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Latest Execution Telemetry */}
      {recentRun && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', margin: '0 0 12px 0' }}>Latest Execution Run</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Run ID: </span>
              <code style={{ fontSize: '12px', color: '#a5b4fc', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                {recentRun.id}
              </code>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Trigger: </span>
              <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: '#818cf8' }}>{recentRun.trigger_type}</strong>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status: </span>
              <span className={`badge ${recentRun.status === 'completed' ? 'badge-excellent' : 'badge-possible'}`}>
                {recentRun.status.toUpperCase()}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Completed At: </span>
              <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>
                {recentRun.completed_at ? new Date(recentRun.completed_at).toLocaleString() : 'In Progress'}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
