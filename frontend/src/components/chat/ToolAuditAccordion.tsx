import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Wrench, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import type { ToolCallRecord } from '../../types';

interface ToolAuditAccordionProps {
  toolCalls: ToolCallRecord[];
}

export const ToolAuditAccordion: React.FC<ToolAuditAccordionProps> = ({ toolCalls }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div
      style={{
        marginBottom: '14px',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        overflow: 'hidden',
        fontSize: '12px',
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '12px',
          fontWeight: 600,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wrench size={14} color="var(--primary)" />
          <span>
            MCP Tool Invocations ({toolCalls.length} executed)
          </span>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '999px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--text-primary)',
            }}
          >
            audit trail
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {isOpen && (
        <div style={{ padding: '8px 12px 12px 12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {toolCalls.map((tc, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {tc.success ? (
                    <CheckCircle2 size={13} color="var(--tier-excellent)" />
                  ) : (
                    <AlertCircle size={13} color="#ef4444" />
                  )}
                  <span style={{ fontWeight: 600, color: 'var(--text-main)', fontFamily: 'monospace' }}>
                    {tc.tool}
                  </span>
                  <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                    {tc.result_summary}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-dim)', fontSize: '11px' }}>
                  <Clock size={11} />
                  <span>{tc.latency_ms}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
