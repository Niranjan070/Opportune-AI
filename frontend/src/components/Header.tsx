import React from 'react';
import { Sparkles, Play, RefreshCw, Target, Compass, FileText, History, MessageSquare } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isRunning: boolean;
  onTriggerRun: () => void;
  isOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isRunning,
  onTriggerRun,
  isOnline,
}) => {
  const tabs = [
    { id: 'chat', label: 'AI Assistant Chat', icon: MessageSquare },
    { id: 'opportunities', label: 'Ranked Opportunities', icon: Sparkles },
    { id: 'overview', label: 'Dashboard', icon: Compass },
    { id: 'profile', label: 'Search Profile', icon: Target },
    { id: 'analyzer', label: 'JD Intelligence', icon: FileText },
    { id: 'audit', label: 'Execution Logs', icon: History },
  ];

  return (
    <header className="glass-panel" style={{ margin: '16px auto', maxWidth: '1240px', padding: '16px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Logo and Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
            }}
          >
            <Sparkles size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '20px', letterSpacing: '-0.02em', margin: 0 }}>
                OPPORTUNE <span style={{ color: 'var(--primary)' }}>AI</span>
              </h1>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  borderRadius: '9999px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: isOnline ? '#10b981' : '#ef4444',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: isOnline ? '#10b981' : '#ef4444',
                  }}
                  className={isOnline ? 'pulse-glow' : ''}
                />
                {isOnline ? 'Engine Online' : 'Connecting...'}
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
              MCP-Powered Job Discovery & Opportunity Intelligence
            </p>
          </div>
        </div>

        {/* Global Action Button */}
        <div>
          <button
            className="btn btn-primary"
            onClick={onTriggerRun}
            disabled={isRunning}
            style={{ minWidth: '175px' }}
          >
            {isRunning ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Searching Sources...</span>
              </>
            ) : (
              <>
                <Play size={16} fill="currentColor" />
                <span>Run Discovery Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav
        style={{
          display: 'flex',
          gap: '8px',
          marginTop: '18px',
          paddingTop: '14px',
          borderTop: '1px solid var(--border-subtle)',
          overflowX: 'auto',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: isActive ? '#a5b4fc' : 'var(--text-muted)',
                outline: isActive ? '1px solid rgba(99, 102, 241, 0.4)' : 'none',
              }}
            >
              <Icon size={16} color={isActive ? '#818cf8' : 'currentColor'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
