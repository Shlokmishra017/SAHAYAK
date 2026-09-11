import React, { useState, useEffect } from 'react';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { LoginPortal } from './components/auth/LoginPortal';
import { AppShell } from './components/layout/AppShell';
import { PersonnelWellnessDashboard } from './components/device/PersonnelWellnessDashboard';
import { CaseList } from './components/welfare/CaseList';
import { CohortHeatmap } from './components/command/CohortHeatmap';
import { HashChainInspector } from './components/audit/HashChainInspector';
import { ModelComparisonDemo } from './components/audit/ModelComparisonDemo';
import { ZeroTrustInspector } from './components/audit/ZeroTrustInspector';

function AuthenticatedApp() {
  const { activeRole } = useAppState();
  const [activeSection, setActiveSection] = useState('overview');

  // Sync default section when active role changes
  useEffect(() => {
    if (activeRole === 'device') {
      setActiveSection('overview');
    } else if (activeRole === 'welfare') {
      setActiveSection('cases');
    } else if (activeRole === 'command') {
      setActiveSection('heatmap');
    } else if (activeRole === 'audit') {
      setActiveSection('chain');
    }
  }, [activeRole]);

  return (
    <AppShell 
      activeSection={activeSection} 
      onSectionChange={setActiveSection}
    >
      {/* Z0 Personnel Wellness Suite */}
      {activeRole === 'device' && (
        <PersonnelWellnessDashboard externalSection={activeSection} />
      )}

      {/* Z1 Welfare Officer Triage Core */}
      {activeRole === 'welfare' && (
        <div className="space-y-6">
          <CaseList />
        </div>
      )}

      {/* Commander Strategic Layer */}
      {activeRole === 'command' && (
        <div className="space-y-6">
          <CohortHeatmap externalSection={activeSection} />
        </div>
      )}

      {/* Auditor & Cryptographic Trust Portal */}
      {activeRole === 'audit' && (
        <div className="space-y-6">
          {activeSection === 'chain' && <HashChainInspector />}
          {activeSection === 'comparison' && <ModelComparisonDemo />}
          {activeSection === 'zerotrust' && <ZeroTrustInspector />}
        </div>
      )}
    </AppShell>
  );
}

function RootApp() {
  const { isAuthenticated } = useAppState();

  if (!isAuthenticated) {
    return <LoginPortal />;
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <AppStateProvider>
      <RootApp />
    </AppStateProvider>
  );
}
