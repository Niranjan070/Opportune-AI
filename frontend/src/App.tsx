import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { OverviewTab } from './components/OverviewTab';
import { OpportunitiesTab } from './components/OpportunitiesTab';
import { ProfileTab } from './components/ProfileTab';
import { JDAnalyzerTab } from './components/JDAnalyzerTab';
import { AuditTab } from './components/AuditTab';
import { JobDetailModal } from './components/JobDetailModal';
import { api } from './services/api';
import type { ScoredJob, SearchProfile, SearchRun, SearchRunDetail } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isOnline, setIsOnline] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runs, setRuns] = useState<SearchRun[]>([]);
  const [activeRunDetail, setActiveRunDetail] = useState<SearchRunDetail | null>(null);
  const [scoredJobs, setScoredJobs] = useState<ScoredJob[]>([]);
  const [totalJobsCount, setTotalJobsCount] = useState(0);
  const [profile, setProfile] = useState<SearchProfile | null>(null);
  const [selectedJob, setSelectedJob] = useState<ScoredJob | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Initial load
  const loadData = useCallback(async () => {
    try {
      // 1. Health check
      await api.getHealth();
      setIsOnline(true);

      // 2. Load Profiles
      const profiles = await api.getProfiles();
      if (profiles.length > 0) {
        setProfile(profiles[0]);
      }

      // 3. Load Jobs count
      const jobsData = await api.getJobs({ limit: 1 });
      setTotalJobsCount(jobsData.total);

      // 4. Load Runs
      const pastRuns = await api.getSearchRuns(10);
      setRuns(pastRuns);

      // 5. Load latest Run Detail if available
      if (pastRuns.length > 0) {
        const detail = await api.getSearchRunDetail(pastRuns[0].id);
        setActiveRunDetail(detail);
        setScoredJobs(detail.top_jobs || []);
      }
    } catch (err) {
      console.error('Error initializing app data:', err);
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(async () => {
      try {
        await api.getHealth();
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Trigger manual discovery run
  const handleTriggerRun = async () => {
    setIsRunning(true);
    showToast('Executing multi-source job discovery cycle...');
    try {
      const run = await api.triggerSearchRun({
        search_profile_id: profile?.id,
        send_email: profile?.email_digest_enabled ?? true,
        limit_per_source: 30,
      });

      // Fetch detail of completed run
      const detail = await api.getSearchRunDetail(run.id);
      setActiveRunDetail(detail);
      setScoredJobs(detail.top_jobs || []);

      // Reload runs list
      const pastRuns = await api.getSearchRuns(10);
      setRuns(pastRuns);

      showToast(`Discovery completed! Discovered ${detail.total_discovered} listings, ranked ${detail.total_ranked} opportunities.`);
      setActiveTab('opportunities');
    } catch (err: any) {
      console.error('Run failed:', err);
      showToast(`Discovery run failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Update profile
  const handleSaveProfile = async (updated: Partial<SearchProfile>) => {
    if (!profile) return;
    const res = await api.updateProfile(profile.id, updated);
    setProfile(res);
  };

  // Append extracted skills from JD Analyzer
  const handleAppendSkills = async (skillsToAdd: string[]) => {
    if (!profile) return;
    const existing = profile.skills || [];
    const merged = Array.from(new Set([...existing, ...skillsToAdd]));
    await handleSaveProfile({ skills: merged });
    showToast(`Added ${skillsToAdd.length} extracted skills to profile!`);
  };

  // Select a specific past run for inspection
  const handleSelectRun = async (runId: string) => {
    try {
      const detail = await api.getSearchRunDetail(runId);
      setActiveRunDetail(detail);
      setScoredJobs(detail.top_jobs || []);
    } catch (err: any) {
      showToast(`Error loading run detail: ${err.message}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--primary)',
            color: 'var(--text-main)',
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
            zIndex: 9999,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRunning={isRunning}
        onTriggerRun={handleTriggerRun}
        isOnline={isOnline}
      />

      {/* Main Content Area */}
      <main style={{ padding: '0 20px 48px 20px', flex: 1 }}>
        {activeTab === 'overview' && (
          <OverviewTab
            recentRun={runs[0] || null}
            totalJobsCount={totalJobsCount}
            onNavigateToJobs={() => setActiveTab('opportunities')}
          />
        )}

        {activeTab === 'opportunities' && (
          <OpportunitiesTab
            scoredJobs={scoredJobs}
            onSelectJob={(job) => setSelectedJob(job)}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            profile={profile}
            onSaveProfile={handleSaveProfile}
          />
        )}

        {activeTab === 'analyzer' && (
          <JDAnalyzerTab
            onAppendSkillsToProfile={handleAppendSkills}
          />
        )}

        {activeTab === 'audit' && (
          <AuditTab
            runs={runs}
            activeRunDetail={activeRunDetail}
            onSelectRun={handleSelectRun}
            onRefreshRuns={loadData}
          />
        )}
      </main>

      {/* Job Detail Modal */}
      <JobDetailModal
        scoredJob={selectedJob}
        onClose={() => setSelectedJob(null)}
      />

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '20px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--text-dim)',
          background: 'rgba(9, 13, 22, 0.8)',
        }}
      >
        <p style={{ margin: '0 0 4px 0' }}>
          <strong>Opportune AI</strong> &bull; Intelligent Job Discovery & Opportunity Intelligence
        </p>
        <p style={{ margin: 0 }}>
          Deterministic ranking across permitted sources. No automated applications are ever submitted on your behalf.
        </p>
      </footer>

    </div>
  );
};
export default App;
