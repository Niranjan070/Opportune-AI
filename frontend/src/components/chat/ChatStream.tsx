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
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          maxWidth: '820px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          flex: 1,
        }}
      >
        {/* Empty State / Welcome Screen */}
        {messages.length === 0 && !isLoading && (
          <div
            style={{
              margin: 'auto',
              maxWidth: '680px',
              textAlign: 'center',
              padding: '60px 20px',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
                boxShadow: '0 8px 24px rgba(79, 70, 229, 0.4)',
              }}
            >
              <Sparkles size={30} color="#ffffff" />
            </div>

            <h2 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 10px 0', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
              Where would you like to work next?
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6, margin: '0 0 32px 0' }}>
              Ask me about any role, company ATS board, or required tech stack. I'll search live job boards, score matches against your preferences, and bring you verified opportunities.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', textAlign: 'left' }}>
              <div
                onClick={() => onSelectPrompt('Find remote senior Python roles at GitLab with FastAPI')}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(22, 32, 50, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', marginBottom: '4px' }}>
                  🏢 Specific ATS Boards
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  "Find remote senior Python roles at GitLab with FastAPI"
                </div>
              </div>

              <div
                onClick={() => onSelectPrompt('Frontend React / TypeScript Engineer in Europe or Remote')}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(22, 32, 50, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', marginBottom: '4px' }}>
                  🌐 Public Job Feeds
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
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
                maxWidth: isUser ? '75%' : '100%',
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
                  fontSize: '14px',
                  lineHeight: 1.6,
                  flex: 1,
                }}
              >
                {/* Tool Execution Telemetry */}
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

                {/* In-Chat Email Subscription Bar */}
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
              <span>Opportune AI is searching job boards and calculating match scores...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
