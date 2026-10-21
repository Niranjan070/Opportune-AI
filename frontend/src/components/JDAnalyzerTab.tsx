import React, { useState } from 'react';
import { Sparkles, Check, Layers, MapPin, Briefcase } from 'lucide-react';
import { api } from '../services/api';
import type { ExtractedCriteria } from '../types';

interface JDAnalyzerTabProps {
  onAppendSkillsToProfile: (skills: string[]) => void;
}

export const JDAnalyzerTab: React.FC<JDAnalyzerTabProps> = ({ onAppendSkillsToProfile }) => {
  const [jdText, setJdText] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [criteria, setCriteria] = useState<ExtractedCriteria | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedSkillsMsg, setAddedSkillsMsg] = useState(false);

  const sampleJD = `We are seeking a Senior Full-Stack Engineer to build reliable web applications.
Requirements:
- 5+ years building distributed applications using Python (FastAPI/Django) and TypeScript (React)
- Deep experience with Docker, PostgreSQL, Redis, and modern CI/CD pipelines
- Strong understanding of RESTful APIs and asynchronous programming
Preferred:
- Experience with Kubernetes and Tailwind CSS
- Familiarity with AI tools and LLM integration
Location: Remote (US / EMEA / India)`;

  const handleAnalyze = async () => {
    if (!jdText.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await api.analyzeJobDescription(jdText, roleTitle);
      setCriteria(res.extracted_criteria);
    } catch (err: any) {
      setError(err.message || 'Failed to extract criteria from job description');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddSkills = () => {
    if (!criteria) return;
    const allExtracted = Array.from(new Set([...criteria.required_skills, ...criteria.preferred_skills]));
    onAppendSkillsToProfile(allExtracted);
    setAddedSkillsMsg(true);
    setTimeout(() => setAddedSkillsMsg(false), 3000);
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Input Panel */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{ fontSize: '20px', margin: '0 0 4px 0' }}>Job Description Intelligence Extraction</h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Paste any raw job posting or requirement document to extract structured skill criteria, seniority, and preferences.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '14px' }}>
          <div>
            <label>Role Title (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Senior Full Stack Engineer"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setJdText(sampleJD);
                setRoleTitle('Senior Full-Stack Engineer');
              }}
              style={{ height: '42px' }}
            >
              Insert Sample Tech JD
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label>Raw Job Description Text</label>
          <textarea
            rows={8}
            placeholder="Paste raw requisition or job text here..."
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
          />
        </div>

        {error && (
          <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleAnalyze}
          disabled={isAnalyzing || !jdText.trim()}
        >
          <Sparkles size={16} className={isAnalyzing ? 'animate-spin' : ''} />
          <span>{isAnalyzing ? 'Extracting Requirements...' : 'Extract Intelligence'}</span>
        </button>
      </div>

      {/* Extracted Criteria Card */}
      {criteria && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="badge badge-strong" style={{ marginBottom: '6px' }}>STRUCTURED EXTRACTION</span>
              <h3 style={{ fontSize: '20px', margin: '4px 0 0 0' }}>{criteria.title || 'Role Requirements'}</h3>
            </div>
            
            <button className="btn btn-primary btn-sm" onClick={handleAddSkills}>
              <Check size={14} />
              <span>Add Extracted Skills to Search Profile</span>
            </button>
          </div>

          {addedSkillsMsg && (
            <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
              Extracted skills successfully added to your candidate profile!
            </div>
          )}

          {/* Quick info row */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Briefcase size={14} color="var(--primary)" /> Seniority: <strong style={{ color: 'var(--text-main)' }}>{criteria.seniority || 'Unspecified'}</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} color="var(--primary)" /> Locations: <strong style={{ color: 'var(--text-main)' }}>{criteria.locations.join(', ') || 'Remote'}</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} color="var(--primary)" /> Arrangement: <strong style={{ color: 'var(--text-main)' }}>{criteria.workplace_type || 'Flexible'}</strong>
            </span>
          </div>

          {/* Skills Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label>Mandatory / Required Skills</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {criteria.required_skills.length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>None detected</span>
                ) : (
                  criteria.required_skills.map((sk) => (
                    <span key={sk} className="badge badge-skill">
                      {sk}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div>
              <label>Preferred / Nice-to-Have Skills</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {criteria.preferred_skills.length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>None detected</span>
                ) : (
                  criteria.preferred_skills.map((sk) => (
                    <span key={sk} className="badge badge-missing" style={{ color: '#c7d2fe' }}>
                      {sk}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Key Responsibilities */}
          {criteria.responsibilities.length > 0 && (
            <div>
              <label>Extracted Responsibilities</label>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
                {criteria.responsibilities.map((resp, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>
                    {resp}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
