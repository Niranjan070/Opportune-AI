import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, User, Loader2, Bot, Filter } from 'lucide-react';
import type { ChatSession, ScoredJob, EmbeddedScoredJob } from '../../types';
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
  const [activeFilter, setActiveFilter] = useState<'all' | 'remote' | 'intern' | 'india' | 'high_score' | 'salary'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'title'>('score');
  const [loadingStep, setLoadingStep] = useState<number>(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, isLoading]);

  // Loading animation step cycle
  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % 3);
    }, 2400);
    return () => clearInterval(timer);
  }, [isLoading]);

  const messages = session?.messages || [];

  const filterJobs = (jobs: EmbeddedScoredJob[]) => {
    let list = [...jobs];

    if (activeFilter === 'remote') {
      list = list.filter((j) =>
        (j.workplace_type || '').toLowerCase().includes('remote') ||
        (j.location || '').toLowerCase().includes('remote')
      );
    } else if (activeFilter === 'intern') {
      list = list.filter((j) =>
        (j.title || '').toLowerCase().includes('intern') ||
        (j.title || '').toLowerCase().includes('trainee')
      );
    } else if (activeFilter === 'india') {
      list = list.filter((j) => {
        const loc = (j.location || '').toLowerCase();
        return loc.includes('india') || loc.includes('coimbatore') || loc.includes('bengaluru') || loc.includes('bangalore') || loc.includes('chennai') || loc.includes('hyderabad');
      });
    } else if (activeFilter === 'high_score') {
      list = list.filter((j) => j.match_score >= 80);
    } else if (activeFilter === 'salary') {
      list = list.filter((j) => Boolean(j.salary_display || (j.salary_min && j.salary_min > 0)));
    }

    if (sortBy === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      list.sort((a, b) => b.match_score - a.match_score);
    }

    return list;
  };

  const loadingMessages = [
    "Analyzing query with Location Intelligence & Query Planner...",
    "Querying LinkedIn, Naukri, Indeed, & ATS boards concurrently...",
    "Cross-source deduplicating and running 6-component scoring...",
  ];

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
          maxWidth: '840px',
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
              padding: '40px 20px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
                boxShadow: '0 8px 28px rgba(79, 70, 229, 0.45)',
              }}
            >
              <Sparkles size={32} color="#ffffff" />
            </div>

            <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 12px 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
              Where would you like to work next?
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: 1.6, margin: '0 0 32px 0' }}>
              Ask me about any role, city, internship, or company. I intelligently dispatch targeted queries across LinkedIn, Naukri, Indeed, Greenhouse, and Remotive to find your best matches.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', textAlign: 'left' }}>
              <div
                onClick={() => onSelectPrompt('AI engineer intern in Coimbatore or Remote')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'rgba(22, 32, 50, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#ffffff', marginBottom: '4px' }}>
                  🇮🇳 Indian Regional & Internships
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                  "AI engineer intern in Coimbatore or Remote"
                </div>
              </div>

              <div
                onClick={() => onSelectPrompt('Remote Machine Learning Engineer at top tech companies')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'rgba(22, 32, 50, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#ffffff', marginBottom: '4px' }}>
                  🌐 Global Remote ML / AI
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                  "Remote Machine Learning Engineer at top tech companies"
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const scoredJobs = msg.scored_jobs || [];
          const filteredJobsList = filterJobs(scoredJobs);

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
                  width: '34px',
                  height: '34px',
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
                {isUser ? <User size={17} color="#ffffff" /> : <Bot size={17} color="#ffffff" />}
              </div>

              {/* Bubble Container */}
              <div
                style={{
                  borderRadius: '14px',
                  padding: isUser ? '12px 18px' : '20px',
                  background: isUser
                    ? 'linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)'
                    : 'rgba(15, 22, 38, 0.9)',
                  border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.28)',
                  color: '#ffffff',
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
                <div style={{ whiteSpace: 'pre-wrap', margin: 0, color: '#f1f5f9' }}>
                  {msg.content}
                </div>

                {/* Filter and Sort Toolbar (rendered if there are jobs) */}
                {!isUser && scoredJobs.length > 0 && (
                  <div
                    style={{
                      marginTop: '18px',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', marginRight: '4px' }}>
                        <Filter size={11} /> Filter:
                      </span>
                      {[
                        { id: 'all', label: `All (${scoredJobs.length})` },
                        { id: 'india', label: '🇮🇳 India/Local' },
                        { id: 'remote', label: '🌐 Remote' },
                        { id: 'intern', label: '🎓 Internships' },
                        { id: 'salary', label: '💰 Compensation' },
                        { id: 'high_score', label: '⭐ Score ≥ 80%' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setActiveFilter(f.id as any)}
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '5px',
                            border: activeFilter === f.id ? '1px solid #6366f1' : '1px solid transparent',
                            background: activeFilter === f.id ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                            color: activeFilter === f.id ? '#a5b4fc' : '#94a3b8',
                            cursor: 'pointer',
                            transition: 'all 0.1s ease',
                          }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Sort:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        style={{
                          fontSize: '11px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                          color: '#f1f5f9',
                          padding: '2px 6px',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="score">Best Match</option>
                        <option value="title">Role Title</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Embedded Job Cards List */}
                {!isUser && scoredJobs.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredJobsList.length > 0 ? (
                      filteredJobsList.map((job) => (
                        <EmbeddedJobCard
                          key={job.job_id}
                          job={job}
                          onInspect={onInspectJob}
                        />
                      ))
                    ) : (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        No roles match the selected filter. Try selecting 'All'.
                      </div>
                    )}
                  </div>
                )}

                {/* In-Chat Email Subscription Bar */}
                {!isUser && scoredJobs.length > 0 && session && (
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

        {/* Loading / Searching Multi-step Indicator */}
        {isLoading && (
          <div style={{ display: 'flex', gap: '14px', alignSelf: 'flex-start', maxWidth: '85%' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Bot size={17} color="#ffffff" />
            </div>
            <div
              style={{
                borderRadius: '14px',
                padding: '14px 20px',
                background: 'rgba(15, 22, 38, 0.95)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#e2e8f0',
                fontSize: '13.5px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              }}
            >
              <Loader2 size={18} className="spin" color="#818cf8" />
              <span>{loadingMessages[loadingStep]}</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
