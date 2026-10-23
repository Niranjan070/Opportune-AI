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

      {/* Input Box */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '10px',
          background: 'rgba(17, 24, 39, 0.9)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '8px 12px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
        }}
      >
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
            background: 'none',
            border: 'none',
            outline: 'none',
            color: 'var(--text-main)',
            fontSize: '13px',
            fontFamily: 'inherit',
            resize: 'none',
            lineHeight: 1.5,
            maxHeight: '140px',
            padding: '4px',
          }}
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="btn btn-primary"
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            opacity: !input.trim() || isLoading ? 0.5 : 1,
          }}
        >
          {isLoading ? (
            <>
              <Loader2 size={15} className="spin" />
              <span>Searching...</span>
            </>
          ) : (
            <>
              <span>Send</span>
              <Send size={14} />
            </>
          )}
        </button>
      </div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '8px', textAlign: 'center' }}>
          Press <kbd style={{ padding: '1px 4px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px' }}>Enter</kbd> to search &bull; <kbd style={{ padding: '1px 4px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px' }}>Shift + Enter</kbd> for newline
        </div>
      </div>
    </div>
  );
};
