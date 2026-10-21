import React, { useState, useEffect } from 'react';
import { Mail, Save, Plus, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { SearchProfile } from '../types';

interface ProfileTabProps {
  profile: SearchProfile | null;
  onSaveProfile: (updated: Partial<SearchProfile>) => Promise<void>;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ profile, onSaveProfile }) => {
  const [formData, setFormData] = useState<Partial<SearchProfile>>({});
  const [newTitle, setNewTitle] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newExcludedEmp, setNewExcludedEmp] = useState('');
  const [newExcludedKw, setNewExcludedKw] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveProfile(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = (field: keyof SearchProfile, val: string, setter: (v: string) => void) => {
    if (!val.trim()) return;
    const current = (formData[field] as string[]) || [];
    if (!current.includes(val.trim())) {
      setFormData({ ...formData, [field]: [...current, val.trim()] });
    }
    setter('');
  };

  const removeItem = (field: keyof SearchProfile, val: string) => {
    const current = (formData[field] as string[]) || [];
    setFormData({ ...formData, [field]: current.filter((item) => item !== val) });
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto' }}>
      <form onSubmit={handleSave} className="glass-panel" style={{ padding: '28px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '20px', margin: '0 0 4px 0' }}>Candidate Search Profile</h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Configure your criteria for daily automated discovery and deterministic match scoring.
            </p>
          </div>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            <Save size={15} />
            <span>{isSaving ? 'Saving Changes...' : 'Save Profile'}</span>
          </button>
        </div>

        {saveSuccess && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              color: '#10b981',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
            }}
          >
            <CheckCircle2 size={16} />
            <span>Profile criteria saved successfully! Next scheduled discovery run will use these rules.</span>
          </div>
        )}

        {/* Section 1: Target Titles */}
        <div style={{ marginBottom: '24px' }}>
          <label>Target Job Titles (20% match weight)</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="e.g. Senior Backend Engineer"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addItem('target_titles', newTitle, setNewTitle);
                }
              }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => addItem('target_titles', newTitle, setNewTitle)}
            >
              <Plus size={15} /> Add
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {(formData.target_titles || []).map((title) => (
              <span
                key={title}
                style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  color: '#c7d2fe',
                  borderRadius: '9999px',
                  padding: '4px 12px',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {title}
                <X size={13} style={{ cursor: 'pointer' }} onClick={() => removeItem('target_titles', title)} />
              </span>
            ))}
          </div>
        </div>

        {/* Section 2: Core Skills */}
        <div style={{ marginBottom: '24px' }}>
          <label>Core Skills & Technologies (35% match weight)</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="e.g. Python, React, PostgreSQL"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addItem('skills', newSkill, setNewSkill);
                }
              }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => addItem('skills', newSkill, setNewSkill)}
            >
              <Plus size={15} /> Add
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {(formData.skills || []).map((skill) => (
              <span
                key={skill}
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  color: '#a7f3d0',
                  borderRadius: '9999px',
                  padding: '4px 12px',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {skill}
                <X size={13} style={{ cursor: 'pointer' }} onClick={() => removeItem('skills', skill)} />
              </span>
            ))}
          </div>
        </div>

        {/* Section 3: Work Preferences */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label>Workplace Preference</label>
            <select
              value={formData.workplace_preference || 'remote'}
              onChange={(e) => setFormData({ ...formData, workplace_preference: e.target.value })}
            >
              <option value="remote">100% Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="on_site">On-Site</option>
              <option value="any">Any / Flexible</option>
            </select>
          </div>

          <div>
            <label>Seniority Level</label>
            <select
              value={formData.experience_level || 'Mid-Senior'}
              onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
            >
              <option value="Entry-level">Entry-Level / Junior</option>
              <option value="Mid-Level">Mid-Level</option>
              <option value="Senior">Senior</option>
              <option value="Staff/Lead">Staff / Principal / Lead</option>
              <option value="Any">Any Experience Level</option>
            </select>
          </div>
        </div>

        {/* Section 4: Target ATS Companies */}
        <div style={{ marginBottom: '24px' }}>
          <label>Target ATS Companies (Direct Greenhouse & Lever Postings)</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="e.g. gitlab, stripe, figma"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addItem('target_ats_companies', newCompany, setNewCompany);
                }
              }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => addItem('target_ats_companies', newCompany, setNewCompany)}
            >
              <Plus size={15} /> Add
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {(formData.target_ats_companies || []).map((company) => (
              <span
                key={company}
                style={{
                  background: 'rgba(6, 182, 212, 0.12)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  color: '#67e8f9',
                  borderRadius: '9999px',
                  padding: '4px 12px',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {company}
                <X size={13} style={{ cursor: 'pointer' }} onClick={() => removeItem('target_ats_companies', company)} />
              </span>
            ))}
          </div>
        </div>

        {/* Section 5: Hard Exclusions */}
        <div style={{ marginBottom: '28px', padding: '16px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#f87171' }}>
            <ShieldAlert size={18} />
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Hard Exclusion Filters (Score set to 0%)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label>Excluded Employers</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="e.g. CyberCoders, Revature"
                  value={newExcludedEmp}
                  onChange={(e) => setNewExcludedEmp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem('excluded_employers', newExcludedEmp, setNewExcludedEmp);
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => addItem('excluded_employers', newExcludedEmp, setNewExcludedEmp)}
                >
                  <Plus size={15} /> Add
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(formData.excluded_employers || []).map((emp) => (
                  <span key={emp} className="badge badge-low" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {emp} <X size={11} style={{ cursor: 'pointer' }} onClick={() => removeItem('excluded_employers', emp)} />
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label>Excluded Keywords</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="e.g. Unpaid, Clearance, C#"
                  value={newExcludedKw}
                  onChange={(e) => setNewExcludedKw(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem('excluded_keywords', newExcludedKw, setNewExcludedKw);
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => addItem('excluded_keywords', newExcludedKw, setNewExcludedKw)}
                >
                  <Plus size={15} /> Add
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(formData.excluded_keywords || []).map((kw) => (
                  <span key={kw} className="badge badge-low" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {kw} <X size={11} style={{ cursor: 'pointer' }} onClick={() => removeItem('excluded_keywords', kw)} />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Daily Email Digest Settings */}
        <div style={{ padding: '16px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Mail size={18} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Daily Intelligence Email Digest</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', alignItems: 'center' }}>
            <div>
              <label>Notification Email Address</label>
              <input
                type="email"
                placeholder="you@domain.com"
                value={formData.notification_email || ''}
                onChange={(e) => setFormData({ ...formData, notification_email: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '20px' }}>
              <input
                type="checkbox"
                id="emailToggle"
                checked={formData.email_digest_enabled ?? true}
                onChange={(e) => setFormData({ ...formData, email_digest_enabled: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
              />
              <label htmlFor="emailToggle" style={{ margin: 0, cursor: 'pointer', textTransform: 'none', fontSize: '13.5px', color: 'var(--text-main)' }}>
                Enable daily 9:00 AM email digest
              </label>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
};
