import React, { useState } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  Lock, 
  User, 
  CreditCard, 
  KeyRound, 
  ArrowRight, 
  AlertCircle 
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { loginWithCredentials } from '../../services/api';

export function LoginPortal() {
  const { loginWithResolvedUser } = useAppState();
  
  const [fullName, setFullName] = useState('Vikram Singh');
  const [serviceId, setServiceId] = useState('CAPF-849201');
  const [password, setPassword] = useState('ServicePass@2026');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Discreet demo helper presets for evaluators
  const demoProfiles = [
    { label: 'Personnel (Constable Vikram)', name: 'Vikram Singh', id: 'CAPF-849201' },
    { label: 'Welfare Officer (Capt. Meera)', name: 'Meera Nair', id: 'WO-7742' },
    { label: 'Commander (Col. Deshmukh)', name: 'R. V. Deshmukh', id: 'CMD-1082' },
    { label: 'Auditor (Inspector Verma)', name: 'Alok Verma', id: 'AUD-9901' },
  ];

  const handleQuickFill = (preset) => {
    setFullName(preset.name);
    setServiceId(preset.id);
    setPassword('ServicePass@2026');
    setErrorMessage(null);
  };

  const handleAuthenticate = async (e) => {
    e.preventDefault();
    if (!serviceId.trim()) {
      setErrorMessage("Please enter your Service / ID Number.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await loginWithCredentials(fullName, serviceId, password);
      if (response && response.authenticated) {
        loginWithResolvedUser(response.user);
      } else {
        setErrorMessage("Authentication failed. Invalid service credentials.");
      }
    } catch (err) {
      setErrorMessage("Service authorization server unreachable. Check network status.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gov-pattern text-slate-100 font-sans">
      
      <div className="max-w-md mx-auto w-full space-y-8">
        
        {/* Government & Platform Identity */}
        <div className="text-center space-y-3">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-semibold">
            Government of India / CAPF & Defense Welfare Architecture
          </div>

          <div className="flex items-center justify-center gap-3 pt-1">
            <div className="w-11 h-11 rounded-xl bg-[#f4e9e4] border border-[#d9b8ab] flex items-center justify-center text-[#95432d] shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold tracking-tight text-white">SAHAYAK</h1>
              <p className="text-xs text-slate-400">Personnel Stress & Welfare Intelligence</p>
            </div>
          </div>
        </div>

        {/* Unified Authentication Card */}
        <div className="p-7 sm:p-8 rounded-2xl bg-[#111A2B] border border-[#1E2D4A] shadow-card space-y-6">
          
          <div className="border-b border-[#1E2D4A] pb-4">
            <h2 className="text-base font-semibold text-white">Secure Personnel Authentication</h2>
            <p className="text-xs text-slate-400 mt-0.5">Enter your service identity to access your authorized workspace</p>
          </div>

          <form onSubmit={handleAuthenticate} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Vikram Singh"
                className="w-full bg-[#0B1220] border border-[#1E2D4A] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#b9573a] transition-colors"
                required
              />
            </div>

            {/* Service ID Number */}
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span>Service / ID Number</span>
              </label>
              <input
                type="text"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                placeholder="e.g., CAPF-849201"
                className="w-full bg-[#0B1220] border border-[#1E2D4A] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-[#b9573a] transition-colors uppercase"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Password / Service Token</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#0B1220] border border-[#1E2D4A] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#b9573a] transition-colors"
                required
              />
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-white bg-[#b9573a] hover:bg-[#95432d] active:bg-[#713722] transition-colors flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              {isLoading ? (
                <span>Validating Service Identity...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-white" />
                  <span>Authenticate Securely</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>

          </form>

          {/* Discreet Evaluation Helper */}
          <div className="pt-4 border-t border-[#1E2D4A] space-y-2">
            <div className="text-[10px] text-slate-400 font-medium text-center">
              Quick-Fill Test Accounts:
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {demoProfiles.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickFill(p)}
                  className="p-2 rounded-lg bg-[#0B1220] hover:bg-[#162238] border border-[#1E2D4A] text-left transition-colors"
                >
                  <div className="text-[11px] font-medium text-slate-200 truncate">{p.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">{p.id}</div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Security & Privacy Invariants Footer */}
        <div className="text-center text-xs text-slate-400 space-y-1">
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure authentication • Role-based access • Privacy protected</span>
          </div>
        </div>

      </div>

    </div>
  );
}
