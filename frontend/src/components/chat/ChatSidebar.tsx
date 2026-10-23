import React from 'react';
import { Plus, MessageSquare, Trash2, Mail, Sparkles, PanelLeftClose } from 'lucide-react';
import type { ChatSession } from '../../types';

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  onToggleSidebar?: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onToggleSidebar,
}) => {
  return (
    <aside
      style={{
        width: '280px',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0d131f',
        flexShrink: 0,
      }}
    >
      {/* Brand & Collapse Header */}
      <div
        style={{
          padding: '16px 18px 12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.4)',
            }}
          >
            <Sparkles size={16} color="#ffffff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            Opportune <span style={{ color: 'var(--primary)' }}>AI</span>
          </span>
        </div>

        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            title="Close sidebar"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; }}
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      {/* New Chat Button */}
      <div style={{ padding: '4px 14px 12px 14px' }}>
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
            padding: '10px 14px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: 'var(--radius-md)',
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
          padding: '4px 10px 12px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Recent Searches
        </div>

        {sessions.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
            <MessageSquare size={24} style={{ margin: '0 auto 8px auto', opacity: 0.3 }} />
            <p style={{ margin: 0 }}>No recent searches.</p>
          </div>
        ) : (
          sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            return (
              <div
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                style={{
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: isActive ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                  border: isActive ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', fontSize: '11px', color: 'var(--text-dim)', paddingLeft: '21px' }}>
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
                    opacity: 0.5,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.5';
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

      {/* Bottom Model & Status Footer */}
      <div
        style={{
          padding: '14px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--text-dim)',
          background: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Gemini 2.5 Flash</span>
        </div>
        <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>
          MCP Online
        </span>
      </div>
    </aside>
  );
};
