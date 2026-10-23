import React from 'react';
import { Plus, MessageSquare, Trash2, Mail } from 'lucide-react';
import type { ChatSession } from '../../types';

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}) => {
  return (
    <aside
      style={{
        width: '280px',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'rgba(11, 17, 30, 0.75)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Top Header: New Chat Button */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          type="button"
          onClick={onNewSession}
          className="btn btn-primary"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <Plus size={16} />
          <span>New Job Search</span>
        </button>
      </div>

      {/* Threads List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {sessions.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
            <MessageSquare size={28} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
            <p style={{ margin: 0 }}>No past searches yet.</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>Start a new search to discover opportunities.</p>
          </div>
        ) : (
          sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            return (
              <div
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(79, 70, 229, 0.15) 100%)'
                    : 'transparent',
                  border: isActive ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageSquare size={13} color={isActive ? 'var(--primary)' : 'var(--text-dim)'} />
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '11px', color: 'var(--text-dim)' }}>
                    <span>{s.message_count || 0} msgs</span>
                    {s.is_email_subscribed && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#34d399' }}>
                        <Mail size={10} /> Alert active
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete Thread Button */}
                <button
                  type="button"
                  title="Delete conversation"
                  onClick={(e) => onDeleteSession(s.id, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.6,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.6';
                    e.currentTarget.style.color = 'var(--text-dim)';
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
