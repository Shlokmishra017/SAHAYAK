import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  fetchWelfareCases,
  fetchCommanderHeatmap,
  fetchAuditLedger,
  fetchRiskBand,
  submitEscalation
} from '../services/api';
import {
  computeLocalWellnessScore,
  performLocalFusion,
  analyzeJournalTextLocally
} from '../services/localModel';

const AppStateContext = createContext();

export const DEMO_PERSONAS = [
  {
    id: 'personnel_vikram',
    role: 'device',
    roleLabel: 'Force Personnel (Jawan)',
    level: 'Z0 Zone: On-Device Wellness',
    name: 'Vikram Singh',
    rank: 'Constable (GD)',
    serviceNo: 'CAPF-849201',
    unit: 'CRPF 144 Bn (CI Ops)',
    avatar: 'VS',
    clearance: 'Confidential (Local Enclave)'
  },
  {
    id: 'welfare_meera',
    role: 'welfare',
    roleLabel: 'Unit Welfare Officer',
    level: 'Z1 Zone: Welfare Triage Core',
    name: 'Capt. Meera Nair',
    rank: 'Captain / Unit Welfare Officer',
    serviceNo: 'WO-7742',
    unit: 'Sector Welfare Board',
    avatar: 'MN',
    clearance: 'Welfare Officer (Case Level)'
  },
  {
    id: 'commander_deshmukh',
    role: 'command',
    roleLabel: 'Battalion / Sector Commander',
    level: 'Z1 Zone: Commander Strategic Layer',
    name: 'Col. R. V. Deshmukh',
    rank: 'Colonel / Sector Commander',
    serviceNo: 'CMD-1082',
    unit: 'Sector HQ, Srinagar',
    avatar: 'RD',
    clearance: 'Command Level (k-Anonymity Guarded)'
  },
  {
    id: 'auditor_verma',
    role: 'audit',
    roleLabel: 'Data Protection Officer & Auditor',
    level: 'Auditor & Trust Compliance Proof',
    name: 'Inspector Alok Verma',
    rank: 'DPO / Systems Auditor',
    serviceNo: 'AUD-9901',
    unit: 'Central Compliance Bureau',
    avatar: 'AV',
    clearance: 'Cryptographic Ledger Inspector'
  }
];

export function AppStateProvider({ children }) {
  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState(DEMO_PERSONAS[0]);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Initial landing on Unified Login Page
  const [activeRole, setActiveRole] = useState('device'); // 'device' | 'welfare' | 'command' | 'audit'

  const loginWithResolvedUser = (userObj) => {
    let internalRole = 'device';
    if (userObj.role === 'Z1_WELFARE_OFFICER' || userObj.role === 'welfare') {
      internalRole = 'welfare';
    } else if (userObj.role === 'Z1_COMMANDER' || userObj.role === 'command') {
      internalRole = 'command';
    } else if (userObj.role === 'AUDITOR' || userObj.role === 'audit') {
      internalRole = 'audit';
    } else {
      internalRole = 'device';
    }

    const resolved = {
      id: userObj.id || userObj.service_id || 'ID-001',
      name: userObj.full_name || userObj.name || 'Personnel',
      rank: userObj.rank || 'Officer',
      serviceNo: userObj.service_id || userObj.serviceNo || 'SVC-001',
      unit: userObj.unit || 'CAPF Unit',
      role: internalRole,
      roleKey: userObj.role || 'Z0_PERSONNEL',
      level: userObj.level_label || userObj.level || 'Authorized Level',
      clearance: userObj.clearance || 'RBAC Enforced',
      avatar: userObj.avatar || 'SO'
    };

    setCurrentUser(resolved);
    setActiveRole(internalRole);
    setIsAuthenticated(true);
    showToast(`Access Granted: ${resolved.rank} ${resolved.name} (${resolved.level.split('—')[0].trim()})`, 'success');
  };

  const loginAsPersona = (persona) => {
    setCurrentUser(persona);
    setActiveRole(persona.role);
    setIsAuthenticated(true);
    showToast(`Welcome, ${persona.rank} ${persona.name}! (${persona.level.split('—')[0].trim()})`, 'success');
  };

  const logout = () => {
    setIsAuthenticated(false);
    showToast("Session terminated. Returned to authentication portal.", "info");
  };
  
  // Z0 Device Zone Simulation State
  const [pseudonymId] = useState('f83a1290-7d1a-4c22-98ab-3011982bca81');
  const [isAirplaneMode, setIsAirplaneMode] = useState(false);
  const [hBandInfo, setHBandInfo] = useState({
    h_band: 3,
    reason_codes: ["RC_SUSTAINED_DEPLOYMENT", "RC_DENIED_LEAVE_CLUSTER"],
    unit_baseline_median: 0.52
  });

  // Local Check-ins & Journal State (100% On-Device)
  const [checkIns, setCheckIns] = useState([
    { date: '2026-09-06', mood: 4, sleepHours: 6.5, fatigue: 2, journalSentiment: 0.2 },
    { date: '2026-09-07', mood: 3, sleepHours: 5.5, fatigue: 3, journalSentiment: -0.1 },
    { date: '2026-09-08', mood: 3, sleepHours: 4.5, fatigue: 4, journalSentiment: -0.3 },
    { date: '2026-09-09', mood: 2, sleepHours: 4.0, fatigue: 4, journalSentiment: -0.5 },
    { date: '2026-09-10', mood: 2, sleepHours: 3.5, fatigue: 5, journalSentiment: -0.7 }
  ]);

  const [localJournalEntries, setLocalJournalEntries] = useState([
    {
      id: 'j-1',
      date: '2026-09-10',
      language: 'Hindi',
      text: 'लगातार 65 दिनों से ड्यूटी पर हूँ, छुट्टी फिर से नामंजूर हो गई। बहुत थकान है और रात को नींद नहीं आती।',
      analysis: {
        sentiment: -0.68,
        distressMarkers: ['Emotional Distress', 'Somatic Fatigue'],
        hasAcuteDistress: false
      }
    }
  ]);

  // Derived On-Device ML outputs
  const [localWScore, setLocalWScore] = useState(0.68);
  const [localFusionResult, setLocalFusionResult] = useState({
    compositeScore: 0.72,
    tier: 'elevated',
    isEscalationRequired: true
  });
  const [escalationOutbox, setEscalationOutbox] = useState([]);

  // Z1 Welfare & Command Data
  const [welfareCases, setWelfareCases] = useState([]);
  const [commanderHeatmap, setCommanderHeatmap] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [lastEgressPayload, setLastEgressPayload] = useState(null);
  const [notification, setNotification] = useState(null);

  // Sync / Calculate On-Device Metrics whenever check-ins or journal change
  useEffect(() => {
    const wResult = computeLocalWellnessScore(checkIns);
    setLocalWScore(wResult.wScore);

    const hasAcute = localJournalEntries.some(j => j.analysis?.hasAcuteDistress);
    const fusion = performLocalFusion(
      wResult.wScore,
      hBandInfo.h_band,
      { tau1: 0.45, tau2: 0.65, tau3: 0.85 },
      hasAcute
    );
    setLocalFusionResult(fusion);
  }, [checkIns, localJournalEntries, hBandInfo]);

  // Load backend data periodically or on role switch
  const refreshGlobalData = async () => {
    try {
      const cases = await fetchWelfareCases();
      setWelfareCases(cases);
      const heatmap = await fetchCommanderHeatmap();
      setCommanderHeatmap(heatmap);
      const audit = await fetchAuditLedger();
      setAuditLogs(audit.blocks || []);
    } catch (err) {
      console.error('Failed to sync global state:', err);
    }
  };

  useEffect(() => {
    refreshGlobalData();
  }, [activeRole]);

  // Add new local check-in
  const addCheckIn = (mood, sleepHours, fatigue) => {
    const today = new Date().toISOString().split('T')[0];
    const newEntry = { date: today, mood, sleepHours, fatigue, journalSentiment: 0 };
    setCheckIns(prev => [...prev.filter(c => c.date !== today), newEntry]);
    showToast("Check-in saved on device!", "success");
  };

  // Add local journal entry
  const addJournalEntry = (text, language = 'Hindi') => {
    const analysis = analyzeJournalTextLocally(text);
    const newEntry = {
      id: `j-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      language,
      text,
      analysis
    };
    setLocalJournalEntries(prev => [newEntry, ...prev]);

    // Update today's checkin sentiment
    const today = new Date().toISOString().split('T')[0];
    setCheckIns(prev => prev.map(c => c.date === today ? { ...c, journalSentiment: analysis.sentiment } : c));

    if (analysis.hasAcuteDistress) {
      showToast("⚠️ Safety Fast-Track Activated: Tele-MANAS (14416) Support Available", "error");
    } else {
      showToast("Journal analyzed 100% on-device (Zero data uploaded)", "success");
    }

    return analysis;
  };

  // Submit Escalation from device to Z1
  const triggerDeviceEscalation = async () => {
    if (isAirplaneMode) {
      showToast("✈️ Airplane Mode Active: Transmission queued in on-device outbox.", "info");
      setEscalationOutbox(prev => [...prev, {
        pseudonym_id: pseudonymId,
        tier: localFusionResult.tier,
        reason_codes: ["RC_SUSTAINED_DEPLOYMENT", "RC_SLEEP_DEGRADATION_TREND"],
        detected_at: new Date().toISOString()
      }]);
      return;
    }

    const payload = {
      pseudonym_id: pseudonymId,
      tier: localFusionResult.tier,
      origin: "device_fusion",
      reason_codes: [
        "RC_SUSTAINED_DEPLOYMENT",
        "RC_SLEEP_DEGRADATION_TREND",
        ...(localJournalEntries.some(j => j.analysis?.hasAcuteDistress) ? ["RC_ACUTE_DISTRESS_MARKER"] : [])
      ],
      detected_at: new Date().toISOString()
    };

    setLastEgressPayload(payload);
    const res = await submitEscalation(payload);
    showToast(`Escalation transmitted: Whitelist Reason Codes Only (Tier: ${payload.tier.toUpperCase()})`, "success");
    refreshGlobalData();
  };

  const showToast = (message, type = 'info') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => setNotification(null), 4500);
  };

  return (
    <AppStateContext.Provider value={{
      currentUser,
      isAuthenticated,
      loginWithResolvedUser,
      loginAsPersona,
      logout,
      activeRole,
      setActiveRole,
      pseudonymId,
      isAirplaneMode,
      setIsAirplaneMode,
      hBandInfo,
      checkIns,
      localJournalEntries,
      localWScore,
      localFusionResult,
      addCheckIn,
      addJournalEntry,
      triggerDeviceEscalation,
      welfareCases,
      commanderHeatmap,
      auditLogs,
      lastEgressPayload,
      notification,
      showToast,
      refreshGlobalData
    }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within AppStateProvider');
  return context;
}
