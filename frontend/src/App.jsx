import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import ErrorBoundary from './components/common/ErrorBoundary';

import { AppShell } from './components/layout/AppShell';

import { LoginPortal } from './components/auth/LoginPortal';

import { Overview } from './components/welfare/Overview';
import { CasesView } from './components/welfare/CasesView';
import { CaseDetailView } from './components/welfare/CaseDetailView';
import { InterventionsView } from './components/interventions/InterventionsView';

import { TeamPulseView } from './components/command/TeamPulseView';

import { AuditLedgerView } from './components/audit/AuditLedgerView';

import { PersonnelView } from './components/personnel/PersonnelView';

import { HrmsImportView } from './components/hrms/HrmsImportView';

import { GuidanceView } from './components/governance/GuidanceView';
import { V0SahayakApp } from './components/v0/V0SahayakApp';

function RequireAuth({ children }) {
  const { isAuthenticated } = useAppState();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

function RoleHomeRedirect() {
  const { activeRole } = useAppState();

  if (activeRole === 'command') return <Navigate to="/command" replace />;
  if (activeRole === 'audit') return <Navigate to="/audit" replace />;
  if (activeRole === 'device') return <Navigate to="/wellness" replace />;
  return <Navigate to="/welfare" replace />;
}

function LoginPage() {
  const { isAuthenticated } = useAppState();
  if (isAuthenticated) {
    return <RoleHomeRedirect />;
  }
  return <LoginPortal />;
}

export default function App() {
  return (
    <AppStateProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/v0" element={<V0SahayakApp />} />
            <Route path="/preview" element={<V0SahayakApp />} />
            <Route path="/showcase" element={<V0SahayakApp />} />

            <Route
              path="/"
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route index element={<RoleHomeRedirect />} />

              <Route path="welfare" element={<Overview />} />
              <Route path="welfare/cases" element={<CasesView />} />
              <Route path="welfare/cases/:caseId" element={<CaseDetailView />} />
              <Route path="welfare/interventions" element={<InterventionsView />} />
              <Route path="welfare/hrms" element={<HrmsImportView />} />

              <Route path="command" element={<TeamPulseView />} />

              <Route path="audit" element={<AuditLedgerView />} />

              <Route path="wellness" element={<PersonnelView />} />
              <Route path="wellness/support" element={<PersonnelView />} />
              <Route path="personnel" element={<Navigate to="/wellness" replace />} />

              <Route path="guidance" element={<GuidanceView />} />

              <Route path="*" element={<RoleHomeRedirect />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AppStateProvider>
  );
}
