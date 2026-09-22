import React, { useState } from 'react';
import { ShieldCheck, Lock, User, KeyRound, AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loginWithCredentials } from '../../services/api';
import { useAppState, DEMO_PERSONAS } from '../../context/AppStateContext';

export function LoginPortal() {
  const { loginWithResolvedUser } = useAppState();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleQuickFill = (persona) => {
    setFullName(persona.name);
    setServiceId(persona.serviceNo);
    setPassword('');
    setErrorMessage(null);
  };

  const handleAuthenticate = async (e) => {
    e.preventDefault();
    if (!serviceId.trim()) {
      setErrorMessage('Please enter your Service / ID Number.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await loginWithCredentials(fullName, serviceId, password);
      if (response && response.authenticated) {
        loginWithResolvedUser(response.user);
        const role = response.user?.role;
        if (role === 'Z1_WELFARE_OFFICER' || role === 'welfare') {
          navigate('/welfare');
        } else if (role === 'Z1_COMMANDER' || role === 'command') {
          navigate('/command');
        } else if (role === 'AUDITOR' || role === 'audit') {
          navigate('/audit');
        } else {
          navigate('/wellness');
        }
      } else {
        setErrorMessage('Authentication failed. Invalid service credentials.');
      }
    } catch (err) {
      setErrorMessage('Authentication failed. Please verify service credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7f6] text-[#15221f] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto w-full space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#123e39] text-[#d5f1dc] shadow-md">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1 className="font-serif text-[32px] font-semibold tracking-tight text-[#18342e]">
              SAHAYAK
            </h1>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#78908a] mt-0.5">
              Welfare command · Central armed police forces
            </div>
          </div>
          <p className="text-xs text-[#75857f]">
            Privacy-preserving personnel stress & operational welfare platform
          </p>
        </div>

        <div className="rounded-2xl border border-[#dfe8e3] bg-white p-7 shadow-[0_8px_30px_rgba(30,72,58,0.035)] space-y-5">
          <div>
            <h2 className="font-serif text-[18px] font-semibold text-[#25443b]">
              Service Authentication
            </h2>
            <p className="text-[11px] text-[#899791] mt-0.5">
              Enter authorized credentials or select a verified demonstration persona
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-[#f7d6cd] bg-[#fae6e0] p-3 text-xs text-[#a55342] flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleAuthenticate} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-[#587068] mb-1">
                Full Name
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa6a1]" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Officer / Personnel Name"
                  required
                  className="w-full rounded-xl border border-[#dce6e0] bg-[#fbfdfb] pl-9 pr-3 py-2.5 text-xs text-[#18342e] outline-none focus:border-[#77a993] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#587068] mb-1">
                Service Number / ID
              </label>
              <div className="relative">
                <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa6a1]" />
                <input
                  type="text"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  placeholder="e.g. WO-7742, CMD-1082"
                  required
                  className="w-full rounded-xl border border-[#dce6e0] bg-[#fbfdfb] pl-9 pr-3 py-2.5 font-mono text-xs text-[#18342e] outline-none focus:border-[#77a993] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#587068] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa6a1]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full rounded-xl border border-[#dce6e0] bg-[#fbfdfb] pl-9 pr-3 py-2.5 text-xs text-[#18342e] outline-none focus:border-[#77a993] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#174c42] py-2.5 text-xs font-bold text-white hover:bg-[#123e39] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                'Authenticating with SAHAYAK...'
              ) : (
                <>
                  <span>Authenticate & Enter</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-[#edf1ef]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8ba099] mb-2.5">
              Quick Verified Personas
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_PERSONAS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleQuickFill(p)}
                  className={`rounded-xl border p-2.5 text-left transition-colors ${
                    serviceId === p.serviceNo
                      ? 'border-[#174c42] bg-[#eaf5ef]'
                      : 'border-[#dfe8e3] bg-[#fbfdfb] hover:bg-[#f8fbf9]'
                  }`}
                >
                  <div className="text-[11px] font-bold text-[#2d453e]">{p.name}</div>
                  <div className="text-[10px] text-[#788a84] truncate">{p.roleLabel}</div>
                  <div className="mt-1 font-mono text-[9px] text-[#27705c] font-bold">{p.serviceNo}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
