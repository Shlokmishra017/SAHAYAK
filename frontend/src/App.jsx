import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import ErrorBoundary from './components/common/ErrorBoundary';

// Layout
import { AppShell } from './components/layout/AppShell';

// Auth
import { LoginPortal } from './components/auth/LoginPortal';

// Welfare Domain
import { Overview } from './components/welfare/Overview';
import { CasesView } from './components/welfare/CasesView';
import { CaseDetailView } from './components/welfare/CaseDetailView';
import { InterventionsView } from './components/interventions/InterventionsView';

// Command Strategic Domain
import { TeamPulseView } from './components/command/TeamPulseView';

// Trust Audit Domain
import { AuditLedgerView } from './components/audit/AuditLedgerView';

// Personnel Wellness Enclave Domain
import { PersonnelView } from './components/personnel/PersonnelView';

// Governance & SOP Guidance
import { GuidanceView } from './components/governance/GuidanceView';

/**
 * Route protection wrapper.
 * Redirects unauthenticated users to /login while preserving history context.
 */
function RequireAuth({ children }) {
  const { isAuthenticated } = useAppState();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

/**
 * Redirects authenticated users from root or role fallbacks to their designated home workspace.
 */
function RoleHomeRedirect() {
  const { activeRole } = useAppState();

  if (activeRole === 'command') return <Navigate to="/command" replace />;
  if (activeRole === 'audit') return <Navigate to="/audit" replace />;
  if (activeRole === 'device') return <Navigate to="/wellness" replace />;
  return <Navigate to="/welfare" replace />;
}

/**
 * Login page handler: redirects if already authenticated.
 */
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
            {/* Public Authentication Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected App Shell Layout */}
            <Route
              path="/"
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              {/* Default Index Route */}
              <Route index element={<RoleHomeRedirect />} />

              {/* Welfare Officer Workspace Routes */}
              <Route path="welfare" element={<Overview />} />
              <Route path="welfare/cases" element={<CasesView />} />
              <Route path="welfare/cases/:caseId" element={<CaseDetailView />} />
              <Route path="welfare/interventions" element={<InterventionsView />} />

              {/* Commander Strategic Workspace */}
              <Route path="command" element={<TeamPulseView />} />

              {/* Audit & Compliance Workspace */}
              <Route path="audit" element={<AuditLedgerView />} />

              {/* Personnel Confidential Wellness Enclave */}
              <Route path="wellness" element={<PersonnelView />} />
              <Route path="wellness/support" element={<PersonnelView />} />
              <Route path="personnel" element={<Navigate to="/wellness" replace />} />

              {/* Governance & Guidance SOP */}
              <Route path="guidance" element={<GuidanceView />} />

              {/* Catch-all Fallback */}
              <Route path="*" element={<RoleHomeRedirect />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AppStateProvider>
  );
}
