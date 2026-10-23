import React, { useState } from 'react';
import { Mail, BellRing, Loader2 } from 'lucide-react';
import type { ChatSession } from '../../types';

interface EmailSubscribeBarProps {
  session: ChatSession;
  onSubscribe: (email: string) => Promise<void>;
  onUnsubscribe: () => Promise<void>;
}

export const EmailSubscribeBar: React.FC<EmailSubscribeBarProps> = ({
  session,
  onSubscribe,
  onUnsubscribe,
}) => {
  const [email, setEmail] = useState(session.subscriber_email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubscribe(email.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnsub = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onUnsubscribe();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (session.is_email_subscribed) {
    return (
      <div
        style={{
          marginTop: '14px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399' }}>
          <BellRing size={15} />
          <span>
            <strong>Daily 9:00 AM Alert Active:</strong> Digest of new matching roles will be sent to{' '}
            <span style={{ color: 'var(--text-main)', textDecoration: 'underline' }}>{session.subscriber_email}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={handleUnsub}
          disabled={isSubmitting}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            fontSize: '11px',
            cursor: 'pointer',
            padding: '2px 8px',
            textDecoration: 'underline',
            fontFamily: 'inherit',
          }}
        >
          {isSubmitting ? 'Updating...' : 'Unsubscribe'}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: '14px',
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
        <Mail size={15} color="var(--primary)" />
        <span>
          <strong>Get daily alerts:</strong> Receive newly posted matches for this search every morning at 9:00 AM.
        </span>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px', justifyContent: 'flex-end' }}>
        <input
          type="email"
          placeholder="your.email@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: 'rgba(15, 23, 42, 0.8)',
            color: 'var(--text-main)',
            outline: 'none',
            flex: 1,
            maxWidth: '260px',
          }}
        />
        <button
          type="submit"
          disabled={isSubmitting || !email.trim()}
          className="btn btn-primary"
          style={{
            fontSize: '11px',
            padding: '6px 14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          {isSubmitting ? <Loader2 size={12} className="spin" /> : <BellRing size={12} />}
          <span>Subscribe to Daily Digest</span>
        </button>
      </form>
    </div>
  );
};
