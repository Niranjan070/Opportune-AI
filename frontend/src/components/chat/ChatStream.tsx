import React, { useEffect, useRef } from 'react';
import { Sparkles, User, Loader2, Bot } from 'lucide-react';
import type { ChatSession, ScoredJob } from '../../types';
import { ToolAuditAccordion } from './ToolAuditAccordion';
import { EmbeddedJobCard } from './EmbeddedJobCard';
import { EmailSubscribeBar } from './EmailSubscribeBar';

interface ChatStreamProps {
  session: ChatSession | null;
  isLoading: boolean;
  onInspectJob: (job: ScoredJob) => void;
  onSubscribe: (email: string) => Promise<void>;
  onUnsubscribe: () => Promise<void>;
  onSelectPrompt: (prompt: string) => void;
}

export const ChatStream: React.FC<ChatStreamProps> = ({
  session,
  isLoading,
  onInspectJob,
  onSubscribe,
  onUnsubscribe,
  onSelectPrompt,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, isLoading]);

  const messages = session?.messages || [];

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Empty State / Welcome Screen */}
      {messages.length === 0 && !isLoading && (
        <div
          style={{
            margin: 'auto',
            maxWidth: '640px',
            textAlign: 'center',
            padding: '40px 20px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 8px 24px rgba(79, 70, 229, 0.4)',
            }}
          >
            <Sparkles size={28} color="#ffffff" />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
            What job are you looking for today?
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px 0' }}>
            Text your career goals, target companies, or required tech stack. The AI assistant will invoke permitted MCP tools across official ATS boards and public boards, rank opportunities using our deterministic 6-component engine, and help you subscribe to daily 9:00 AM alerts.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', textAlign: 'left' }}>
            <div
              onClick={() => onSelectPrompt('Find remote senior Python roles at GitLab with FastAPI ($140k+)')}
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(22, 32, 50, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; }}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)', marginBottom: '4px' }}>
                🏢 Target ATS Roles
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                "Find remote senior Python roles at GitLab with FastAPI ($140k+)"
              </div>
            </div>

            <div
              onClick={() => onSelectPrompt('Frontend React / TypeScript Engineer in Europe or Remote')}
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(22, 32, 50, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; }}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)', marginBottom: '4px' }}>
                🌐 Modern Frontend
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                "Frontend React / TypeScript Engineer in Europe or Remote"
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Stream */}
      {messages.map((msg) => {
        const isUser = msg.sender === 'user';
        return (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              gap: '14px',
              alignSelf: isUser ? 'flex-end' : 'flex-start',
              maxWidth: isUser ? '75%' : '88%',
              width: isUser ? 'auto' : '100%',
              flexDirection: isUser ? 'row-reverse' : 'row',
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: isUser
                  ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              }}
            >
              {isUser ? <User size={16} color="#ffffff" /> : <Bot size={16} color="#ffffff" />}
            </div>

            {/* Bubble Container */}
            <div
              style={{
                borderRadius: 'var(--radius-lg)',
                padding: isUser ? '12px 18px' : '18px 20px',
                background: isUser
                  ? 'linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)'
                  : 'rgba(17, 24, 39, 0.85)',
                border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                color: 'var(--text-main)',
                fontSize: '13px',
                lineHeight: 1.6,
                flex: 1,
              }}
            >
              {/* Tool Execution Telemetry (if available on assistant response) */}
              {!isUser && msg.tool_calls && msg.tool_calls.length > 0 && (
                <ToolAuditAccordion toolCalls={msg.tool_calls} />
              )}

              {/* Text Content */}
              <div style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {msg.content}
              </div>

              {/* Embedded Job Cards List */}
              {!isUser && msg.scored_jobs && msg.scored_jobs.length > 0 && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {msg.scored_jobs.map((job) => (
                    <EmbeddedJobCard
                      key={job.job_id}
                      job={job}
                      onInspect={onInspectJob}
                    />
                  ))}
                </div>
              )}

              {/* In-Chat Email Subscription Bar on the last assistant response with jobs */}
              {!isUser && msg.scored_jobs && msg.scored_jobs.length > 0 && session && (
                <EmailSubscribeBar
                  session={session}
                  onSubscribe={onSubscribe}
                  onUnsubscribe={onUnsubscribe}
                />
              )}
            </div>
          </div>
        );
      })}

      {/* Loading / Searching Indicator Bubble */}
      {isLoading && (
        <div style={{ display: 'flex', gap: '14px', alignSelf: 'flex-start', maxWidth: '80%' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bot size={16} color="#ffffff" />
          </div>
          <div
            style={{
              borderRadius: 'var(--radius-lg)',
              padding: '14px 18px',
              background: 'rgba(17, 24, 39, 0.85)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--text-muted)',
              fontSize: '13px',
            }}
          >
            <Loader2 size={16} className="spin" color="var(--primary)" />
            <span>AI Agent is invoking MCP tools & computing match scores...</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
