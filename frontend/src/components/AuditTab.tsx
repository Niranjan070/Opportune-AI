import React, { useState } from 'react';
import { Mail, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import type { SearchRun, SearchRunDetail } from '../types';

interface AuditTabProps {
  runs: SearchRun[];
  activeRunDetail: SearchRunDetail | null;
  onSelectRun: (runId: string) => void;
  onRefreshRuns: () => void;
}

export const AuditTab: React.FC<AuditTabProps> = ({
  runs,
  activeRunDetail,
  onSelectRun,
  onRefreshRuns,
}) => {
  const [forceResend, setForceResend] = useState(false);
  const [resendStatus, setResendStatus] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);

  const handleResend = async (runId: string) => {
    setIsSending(true);
    setResendStatus(null);
    try {
      const res = await api.resendEmail(runId, forceResend);
      setResendStatus(res);
      onRefreshRuns();
    } catch (err: any) {
      setResendStatus({ status: 'error', message: err.message });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Panel */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '20px', margin: '0 0 4px 0' }}>Execution Audit & Email Telemetry</h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Audit logs for discovery cycles, per-source execution latencies, and database-backed email idempotency verification.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onRefreshRuns}>
            <RefreshCw size={14} />
            <span>Refresh Logs</span>
          </button>
        </div>
      </div>

      {/* Runs Table */}
      <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Search Run History</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px 12px' }}>Run ID</th>
              <th style={{ padding: '10px 12px' }}>Trigger</th>
              <th style={{ padding: '10px 12px' }}>Status</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Discovered</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Ranked</th>
              <th style={{ padding: '10px 12px' }}>Started At</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const isSelected = activeRunDetail?.id === r.id;
              return (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '12px' }}>
                    <code style={{ fontSize: '11.5px', color: '#a5b4fc' }}>{r.id.substring(0, 8)}...</code>
                  </td>
                  <td style={{ padding: '12px', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600 }}>
                    {r.trigger_type}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className={`badge ${r.status === 'completed' ? 'badge-excellent' : r.status === 'partial_success' ? 'badge-possible' : 'badge-low'}`}>
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>{r.total_discovered}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#10b981' }}>{r.total_ranked}</td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                    {new Date(r.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onSelectRun(r.id)}
                    >
                      {isSelected ? 'Viewing' : 'Inspect Audit'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Run Details: Source Audit + Email Logs */}
      {activeRunDetail && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px' }}>
          
          {/* Source Execution Audit */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="var(--primary)" />
              <span>Source Execution Audit for Run {activeRunDetail.id.substring(0, 8)}...</span>
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Source</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Retrieved</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Latency</th>
                </tr>
              </thead>
              <tbody>
                {activeRunDetail.source_logs.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{s.source_name}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ color: s.status === 'success' ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                        {s.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{s.items_retrieved}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-muted)' }}>{s.latency_ms} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Email Dispatch & Idempotency Testing */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Mail size={16} color="var(--primary)" />
                <span>Idempotent Email Dispatch Logs</span>
              </h3>
            </div>

            {/* Test Email Dispatch Action */}
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, textTransform: 'none', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={forceResend}
                    onChange={(e) => setForceResend(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span>Bypass idempotency cache (force=true)</span>
                </label>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleResend(activeRunDetail.id)}
                  disabled={isSending}
                >
                  <Mail size={14} />
                  <span>{isSending ? 'Dispatching...' : 'Dispatch Digest Email'}</span>
                </button>
              </div>

              {resendStatus && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    backgroundColor: resendStatus.status === 'sent' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: resendStatus.status === 'sent' ? '#10b981' : '#f59e0b',
                  }}
                >
                  <strong>Result: {resendStatus.status.toUpperCase()}</strong> &bull; {resendStatus.message}
                </div>
              )}
            </div>

            {/* Logs List */}
            {activeRunDetail.email_logs.length === 0 ? (
              <div style={{ fontSize: '12.5px', color: 'var(--text-dim)', textAlign: 'center', padding: '16px' }}>
                No email dispatch attempts recorded yet for this search run.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeRunDetail.email_logs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '10px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>To: {log.recipient_email}</span>
                      <span className={`badge ${log.status === 'sent' ? 'badge-excellent' : 'badge-possible'}`}>
                        {log.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                      Provider: <strong>{log.provider}</strong> &bull; Sent:{' '}
                      {new Date(log.sent_at).toLocaleTimeString()}
                    </div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '10.5px', marginTop: '2px', wordBreak: 'break-all' }}>
                      Key: {log.idempotency_key}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};
