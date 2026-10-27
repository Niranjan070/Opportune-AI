import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
}

const SUGGESTED_PROMPTS = [
  'Remote Senior Python roles at GitLab with FastAPI ($140k+)',
  'Frontend Engineer with React and TypeScript in Europe',
  'AI / Machine Learning Engineer roles with PyTorch',
  'Full Stack Developer remote at Stripe or Figma',
];

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectSuggestion = (prompt: string) => {
    setInput(prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  return (
    <div
      style={{
        padding: '16px 20px 20px 20px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        background: '#090d16',
      }}
    >
      <div style={{ maxWidth: '820px', margin: '0 auto', width: '100%' }}>
        {/* Suggested Query Chips */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          scrollbarWidth: 'none',
        }}
      >
        <span style={{ fontSize: '11px', color: 'var(--text-dim)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={12} color="var(--primary)" /> Suggested:
        </span>
        {SUGGESTED_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSelectSuggestion(prompt)}
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'var(--text-muted)',
              fontSize: '11px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
              e.currentTarget.style.color = 'var(--text-main)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box Pill */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(17, 24, 39, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(129, 140, 248, 0.3)',
          borderRadius: '9999px',
          padding: '6px 10px 6px 18px',
          boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          transition: 'all 0.2s ease',
        }}
      >
        <Sparkles size={18} color="#818cf8" style={{ flexShrink: 0, opacity: 0.8 }} />

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything... e.g. 'Find remote senior Python roles at GitLab with FastAPI, $140k+'"
          rows={1}
          disabled={isLoading}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#f9fafb',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'none',
            lineHeight: 1.5,
            maxHeight: '120px',
            padding: '6px 0',
          }}
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '9999px',
            background: input.trim() && !isLoading ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'rgba(255, 255, 255, 0.08)',
            border: '1px solid',
            borderColor: input.trim() && !isLoading ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.12)',
            color: input.trim() && !isLoading ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
            boxShadow: input.trim() && !isLoading ? '0 0 16px rgba(99, 102, 241, 0.6)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: input.trim() && !isLoading ? 'pointer' : 'default',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            flexShrink: 0,
          }}
        >
          {isLoading ? (
            <Loader2 size={16} className="spin" color="#818cf8" />
          ) : (
            <Send size={15} style={{ marginLeft: '1px' }} />
          )}
        </button>
      </div>

      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '10px', textAlign: 'center' }}>
        Press <kbd style={{ padding: '2px 5px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', color: '#9ca3af' }}>Enter</kbd> to search &bull; <kbd style={{ padding: '2px 5px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', color: '#9ca3af' }}>Shift + Enter</kbd> for newline
      </div>
    </div>
  </div>
  );
};
