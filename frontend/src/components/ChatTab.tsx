import React, { useState, useEffect, useCallback } from 'react';
import type { ChatSession, ScoredJob } from '../types';
import { api } from '../services/api';
import { ChatSidebar } from './chat/ChatSidebar';
import { ChatStream } from './chat/ChatStream';
import { ChatInput } from './chat/ChatInput';

interface ChatTabProps {
  onInspectJob: (job: ScoredJob) => void;
  showToast: (msg: string) => void;
}

export const ChatTab: React.FC<ChatTabProps> = ({ onInspectJob, showToast }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load all sessions
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
        // Create an initial empty session
        const newSession = await api.createChatSession({ title: 'New Job Search' });
        setSessions([newSession]);
        setActiveSession(newSession);
      }
    } catch (err: any) {
      console.error('Failed to load chat sessions:', err);
      showToast(`Error loading chat: ${err.message}`);
    }
  }, [activeSession, showToast]);

  useEffect(() => {
    loadSessions();
  }, []);

  // Handle switching sessions
  const handleSelectSession = async (sessionId: string) => {
    try {
      const detail = await api.getChatSessionDetail(sessionId);
      setActiveSession(detail);
    } catch (err: any) {
      showToast(`Error switching chat: ${err.message}`);
    }
  };

  // Handle "+ New Chat"
  const handleNewSession = async () => {
    try {
      const created = await api.createChatSession({ title: 'New Job Search' });
      setSessions((prev) => [created, ...prev]);
      setActiveSession(created);
    } catch (err: any) {
      showToast(`Failed to create chat: ${err.message}`);
    }
  };

  // Handle Delete Session
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

  // Send message
  const handleSendMessage = async (content: string) => {
    if (!activeSession) return;
    setIsLoading(true);

    // Optimistically append user message
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
      
      // Reload session detail to sync messages and title
      const updatedSession = await api.getChatSessionDetail(activeSession.id);
      setActiveSession(updatedSession);

      // Refresh sidebar sessions list
      const allSessions = await api.getChatSessions();
      setSessions(allSessions);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      showToast(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Email Subscription
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

  // Email Unsubscribe
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
    <div
      className="glass-panel"
      style={{
        maxWidth: '1240px',
        margin: '0 auto',
        height: 'calc(100vh - 160px)',
        minHeight: '620px',
        display: 'flex',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSession?.id || null}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(9, 13, 22, 0.4)' }}>
        <ChatStream
          session={activeSession}
          isLoading={isLoading}
          onInspectJob={onInspectJob}
          onSubscribe={handleSubscribe}
          onUnsubscribe={handleUnsubscribe}
          onSelectPrompt={handleSendMessage}
        />

        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
