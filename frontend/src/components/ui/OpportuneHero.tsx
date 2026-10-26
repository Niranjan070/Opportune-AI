import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Search, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  Cpu, 
  MapPin
} from 'lucide-react';

interface OpportuneHeroProps {
  onStartSearch: (prompt?: string) => void;
}

export const OpportuneHero: React.FC<OpportuneHeroProps> = ({ onStartSearch }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [typedKeyword, setTypedKeyword] = useState('');
  
  // Pipeline simulated steps
  const steps = [
    { title: "Multi-Source Scraping", desc: "Arbeitnow, Remotive, Greenhouse & Lever ATS", badge: "Live Sync", color: "#38bdf8" },
    { title: "Pydantic Normalization", desc: "UTC timestamps, provenance verification & deduplication", badge: "Engine", color: "#818cf8" },
    { title: "6-Signal Scoring", desc: "Deterministic mathematical matching (35% skills, 20% title)", badge: "Scoring", color: "#a855f7" },
    { title: "Daily Digest & Alerts", desc: "Automated 9:00 AM AST dispatch with idempotency", badge: "Email", color: "#10b981" }
  ];

  // Typing animation for search preview
  useEffect(() => {
    const text = "Senior Python & FastAPI Engineer (Remote)";
    let i = 0;
    const interval = setInterval(() => {
      setTypedKeyword(text.slice(0, i + 1));
      i = (i + 1) % (text.length + 15);
    }, 110);
    return () => clearInterval(interval);
  }, []);

  // Step ticker
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3200);
    return () => clearInterval(stepInterval);
  }, [steps.length]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 24px 80px',
      position: 'relative',
      background: 'radial-gradient(circle at 50% 15%, rgba(99, 102, 241, 0.15) 0%, rgba(9, 13, 22, 0.95) 75%)',
    }}>
      {/* Background Grid Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Floating Header Banner */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 14px',
        borderRadius: '999px',
        background: 'rgba(99, 102, 241, 0.12)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        fontSize: '12.5px',
        fontWeight: 600,
        color: '#818cf8',
        marginBottom: '20px',
        boxShadow: '0 4px 15px rgba(99, 102, 241, 0.15)'
      }}>
        <Sparkles size={14} className="pulse-glow" />
        <span>MCP-Powered Job Discovery & Opportunity Intelligence</span>
      </div>

      {/* Headline */}
      <h1 style={{
        position: 'relative',
        zIndex: 1,
        fontSize: 'clamp(28px, 4vw, 46px)',
        fontWeight: 900,
        textAlign: 'center',
        maxWidth: '850px',
        lineHeight: 1.15,
        margin: '0 0 16px 0',
        letterSpacing: '-0.03em',
        background: 'linear-gradient(180deg, #ffffff 0%, #94a3b8 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        The right opportunities, <br />
        <span style={{
          background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          scored, verified & delivered daily.
        </span>
      </h1>

      <p style={{
        position: 'relative',
        zIndex: 1,
        fontSize: '15.5px',
        color: 'var(--text-muted)',
        textAlign: 'center',
        maxWidth: '620px',
        lineHeight: 1.6,
        margin: '0 0 32px 0'
      }}>
        Bypass stale listings and spam. Opportune AI queries live Greenhouse, Lever, Arbeitnow and Remotive sources, deterministically scores each role with a 6-component rubric, and delivers actionable alerts.
      </p>

      {/* Interactive Quick Launch Search Box */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '680px',
        background: 'rgba(17, 24, 39, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '16px',
        padding: '8px 12px 8px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(99, 102, 241, 0.15)',
        marginBottom: '40px'
      }}>
        <Search size={20} color="#818cf8" />
        <div style={{ flex: 1, fontSize: '14.5px', color: '#e2e8f0', minHeight: '24px', display: 'flex', alignItems: 'center' }}>
          {typedKeyword}
          <span style={{ display: 'inline-block', width: '2px', height: '18px', background: '#818cf8', marginLeft: '2px', animation: 'pulseGlow 1s infinite' }} />
        </div>
        <button
          onClick={() => onStartSearch(typedKeyword || 'Find remote Python roles')}
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 18px',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(99, 102, 241, 0.5)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99, 102, 241, 0.4)'; }}
        >
          <span>Ask Assistant</span>
          <ArrowRight size={15} />
        </button>
      </div>

      {/* Main Interactive Stage: Live Demonstration Pipeline & Scoring Simulation */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '1050px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        marginBottom: '48px',
      }}>
        {/* Left Column: Live Verified Job Cards with Score Badges */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 4px'
          }}>
            <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em', color: '#94a3b8', textTransform: 'uppercase' }}>
              🎯 Live Deterministic Matches
            </span>
            <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Active Feed
            </span>
          </div>

          {/* Sample Job Card 1 - 92 Excellent */}
          <div style={{
            background: 'rgba(22, 32, 50, 0.7)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '14px',
            padding: '18px',
            position: 'relative',
            backdropFilter: 'blur(10px)',
            transition: 'transform 0.2s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>Senior Backend Engineer</span>
                  <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', fontSize: '11px', padding: '2px 6px', fontWeight: 700 }}>
                    92 • Excellent
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Building2 size={13} /> Stripe (Greenhouse ATS)</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={13} /> Remote (Global)</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px', marginBottom: '12px' }}>
              <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '4px', padding: '2px 7px', fontSize: '11px' }}>Python</span>
              <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '4px', padding: '2px 7px', fontSize: '11px' }}>FastAPI</span>
              <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '4px', padding: '2px 7px', fontSize: '11px' }}>PostgreSQL</span>
              <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '4px', padding: '2px 7px', fontSize: '11px' }}>Docker</span>
            </div>

            <div style={{ fontSize: '12px', color: '#cbd5e1', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '10px' }}>
              ✓ 100% skill match (Python, FastAPI, Postgres) • 5+ years experience verified • Direct ATS listing
            </div>
          </div>

          {/* Sample Job Card 2 - 84 Strong */}
          <div style={{
            background: 'rgba(22, 32, 50, 0.5)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '14px',
            padding: '18px',
            position: 'relative',
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>Distributed Systems Core Engineer</span>
                  <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', fontSize: '11px', padding: '2px 6px', fontWeight: 700 }}>
                    84 • Strong
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Building2 size={13} /> GitLab (Lever ATS)</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={13} /> Remote</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px', marginBottom: '12px' }}>
              <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '4px', padding: '2px 7px', fontSize: '11px' }}>Python</span>
              <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '4px', padding: '2px 7px', fontSize: '11px' }}>Microservices</span>
              <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '4px', padding: '2px 7px', fontSize: '11px' }}>Redis</span>
            </div>

            <div style={{ fontSize: '12px', color: '#cbd5e1', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '10px' }}>
              ✓ Title alignment 90% • Full remote tier matches candidate criteria
            </div>
          </div>
        </div>

        {/* Right Column: Intelligent Discovery Pipeline Visualization */}
        <div style={{
          background: 'rgba(17, 24, 39, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Cpu size={16} color="#fff" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                  Intelligence Execution Cycle
                </h3>
                <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                  Deterministic ranking replacing opaque algorithms
                </span>
              </div>
            </div>

            {/* Interactive Timeline Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              {steps.map((st, idx) => {
                const isActive = activeStep === idx;
                return (
                  <div
                    key={st.title}
                    onClick={() => setActiveStep(idx)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: isActive ? `1px solid ${st.color}` : '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: isActive ? st.color : 'rgba(255, 255, 255, 0.1)',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: isActive ? '#f8fafc' : '#cbd5e1' }}>
                          {st.title}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '10.5px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: isActive ? `${st.color}25` : 'transparent',
                        color: isActive ? st.color : '#64748b',
                        fontWeight: 600,
                      }}>
                        {st.badge}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8', paddingLeft: '26px', lineHeight: 1.4 }}>
                      {st.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Stats Banner */}
          <div style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>4+</div>
              <div style={{ fontSize: '10.5px', color: '#64748b' }}>ATS Integrations</div>
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8' }}>6-Signal</div>
              <div style={{ fontSize: '10.5px', color: '#64748b' }}>Scoring Engine</div>
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>9:00 AM</div>
              <div style={{ fontSize: '10.5px', color: '#64748b' }}>Daily Email Dispatch</div>
            </div>
          </div>
        </div>
      </div>

      {/* Source Connectors Logos / Badges */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Official Direct Connectors & Job Boards
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          {['Greenhouse Public ATS', 'Lever API', 'Arbeitnow Tech', 'Remotive Curated', 'Custom Boards'].map((src) => (
            <div key={src} style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '12px',
              fontWeight: 500,
              color: '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckCircle2 size={13} color="#10b981" />
              <span>{src}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OpportuneHero;
