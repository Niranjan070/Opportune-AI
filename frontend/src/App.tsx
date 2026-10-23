import React, { useState, useEffect, useCallback } from 'react';
import { PanelLeftOpen, Sparkles } from 'lucide-react';
import { api } from './services/api';
import type { ChatSession, ScoredJob } from './types';
import { ChatSidebar } from './components/chat/ChatSidebar';
import { ChatStream } from './components/chat/ChatStream';
import { ChatInput } from './components/chat/ChatInput';
import { JobDetailModal } from './components/JobDetailModal';

export const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedJob, setSelectedJob] = useState<ScoredJob | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load chat sessions on startup
  const loadSessions = useCallback(async (selectSessionId?: string) => {
    try {
      const data = await api.getChatSessions();
      setSessions(data);

      if (data.length > 0) {
        const targetId = selectSessionId || (activeSession ? activeSession.id : data[0].id);
        const exists = data.find((s) => s.id === targetId);
        const idToLoad = exists ? targetId : data[0].id;
        const detail = await api.getChatSessionDetail(idToLoad);
        setActiveSession(detail);
      } else {
        // Create an initial empty session if none exists
        const newSession = await api.createChatSession({ title: 'New Job Search' });
        setSessions([newSession]);
        setActiveSession(newSession);
      }
    } catch (err: any) {
      console.error('Failed to load chat sessions:', err);
      showToast(`Error connecting to server: ${err.message}`);
    }
  }, [activeSession]);

  useEffect(() => {
    loadSessions();
  }, []);

  // Switch conversation thread
  const handleSelectSession = async (sessionId: string) => {
    try {
      const detail = await api.getChatSessionDetail(sessionId);
      setActiveSession(detail);
    } catch (err: any) {
      showToast(`Error switching chat: ${err.message}`);
    }
  };

  // "+ New Chat"
  const handleNewSession = async () => {
    try {
      const created = await api.createChatSession({ title: 'New Job Search' });
      setSessions((prev) => [created, ...prev]);
      setActiveSession(created);
    } catch (err: any) {
      showToast(`Failed to create chat: ${err.message}`);
    }
  };

  // Delete conversation
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          const detail = await api.getChatSessionDetail(remaining[0].id);
          setActiveSession(detail);
        } else {
          handleNewSession();
        }
      }
      showToast('Conversation deleted.');
    } catch (err: any) {
      showToast(`Failed to delete chat: ${err.message}`);
    }
  };

  // Send candidate prompt
  const handleSendMessage = async (content: string) => {
    if (!activeSession) return;
    setIsLoading(true);

    // Optimistically append user message to UI
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      session_id: activeSession.id,
      sender: 'user' as const,
      content,
      tool_calls: [],
      scored_jobs: [],
      created_at: new Date().toISOString(),
    };

    setActiveSession((prev) =>
      prev ? { ...prev, messages: [...(prev.messages || []), tempUserMsg] } : null
    );

    try {
      await api.sendChatMessage(activeSession.id, content);
      
      // Reload session detail with assistant response & updated title
      const updatedSession = await api.getChatSessionDetail(activeSession.id);
      setActiveSession(updatedSession);

      // Refresh sidebar list
      const allSessions = await api.getChatSessions();
      setSessions(allSessions);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      showToast(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Daily Email Digest Subscription
  const handleSubscribe = async (email: string) => {
    if (!activeSession) return;
    try {
      const updated = await api.subscribeChatToEmail(activeSession.id, email);
      setActiveSession((prev) => (prev ? { ...prev, is_email_subscribed: true, subscriber_email: email } : null));
      setSessions((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...s, is_email_subscribed: true, subscriber_email: email } : s))
      );
      showToast(`Subscribed! Daily 9:00 AM alerts will be sent to ${email}`);
    } catch (err: any) {
      showToast(`Failed to subscribe: ${err.message}`);
    }
  };

  // Unsubscribe
  const handleUnsubscribe = async () => {
    if (!activeSession) return;
    try {
      const updated = await api.unsubscribeChatFromEmail(activeSession.id);
      setActiveSession((prev) => (prev ? { ...prev, is_email_subscribed: false } : null));
      setSessions((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...s, is_email_subscribed: false } : s))
      );
      showToast('Unsubscribed from daily alerts.');
    } catch (err: any) {
      showToast(`Failed to unsubscribe: ${err.message}`);
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', overflow: 'hidden', background: '#090d16', color: 'var(--text-main)' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            backgroundColor: '#162032',
            border: '1px solid var(--primary)',
            color: 'var(--text-main)',
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
            zIndex: 9999,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Collapsible Left Sidebar */}
      {sidebarOpen && (
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSession?.id || null}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          onToggleSidebar={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Interface */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
        
        {/* Minimalist Top Bar */}
        <header
          style={{
            height: '54px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            background: 'rgba(11, 17, 30, 0.8)',
            backdropFilter: 'blur(10px)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                title="Open sidebar"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <PanelLeftOpen size={18} />
              </button>
            )}

            <h2
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-main)',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {activeSession?.title || 'New Job Search'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              <Sparkles size={12} color="var(--primary)" />
              <span>Gemini 2.5 Flash</span>
            </div>
          </div>
        </header>

        {/* Message Stream */}
        <ChatStream
          session={activeSession}
          isLoading={isLoading}
          onInspectJob={(job) => setSelectedJob(job)}
          onSubscribe={handleSubscribe}
          onUnsubscribe={handleUnsubscribe}
          onSelectPrompt={handleSendMessage}
        />

        {/* Bottom Centered Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>

      {/* Job Detail Modal (for deep inspection if user clicks Score Breakdown) */}
      <JobDetailModal
        scoredJob={selectedJob}
        onClose={() => setSelectedJob(null)}
      />

    </div>
  );
};

export default App;
