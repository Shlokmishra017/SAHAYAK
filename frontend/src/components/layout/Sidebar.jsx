import React from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  HeartPulse,
  MessageCircle,
  Activity,
  FileClock,
  BookOpen,
  CircleHelp,
  ArrowUpRight,
  Heart,
  Users
} from 'lucide-react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAppState } from '../../context/AppStateContext';

export function Sidebar({ casesCount = 0 }) {
  const { activeRole } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();

  const isWelfare = activeRole === 'welfare';
  const isCommand = activeRole === 'command';
  const isAudit = activeRole === 'audit';
  const isDevice = activeRole === 'device';

  const pathname = location.pathname;

  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-[#dfe7e3] bg-[#fbfcfb] px-5 py-6 lg:flex">
      <Link
        to={isWelfare ? '/welfare' : isCommand ? '/command' : isAudit ? '/audit' : '/wellness'}
        className="mb-11 flex items-center gap-3 px-2 transition-opacity hover:opacity-90"
      >
        <div className="flex size-9 items-center justify-center rounded-xl bg-[#123e39] text-[#d5f1dc]">
          <ShieldCheck size={19} />
        </div>
        <div>
          <div className="font-serif text-[19px] font-semibold tracking-tight text-[#15221f]">SAHAYAK</div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.19em] text-[#78908a]">
            {isCommand
              ? 'Command HQ'
              : isAudit
              ? 'Trust Audit'
              : isDevice
              ? 'Personnel Enclave'
              : 'Welfare Command'}
          </div>
        </div>
      </Link>

      {isWelfare && (
        <NavGroup title="Workspace">
          <NavButton
            active={pathname === '/welfare' || pathname === '/welfare/'}
            onClick={() => navigate('/welfare')}
          >
            <LayoutDashboard size={17} strokeWidth={1.8} />
            <span>Overview</span>
          </NavButton>
          <NavButton
            active={pathname.startsWith('/welfare/cases')}
            onClick={() => navigate('/welfare/cases')}
          >
            <HeartPulse size={17} strokeWidth={1.8} />
            <span>Cases</span>
            {casesCount > 0 && (
              <span className="ml-auto rounded-md bg-[#d1e7da] px-1.5 py-0.5 text-[10px] font-bold text-[#27705c]">
                {String(casesCount).padStart(2, '0')}
              </span>
            )}
          </NavButton>
          <NavButton
            active={pathname.startsWith('/welfare/interventions')}
            onClick={() => navigate('/welfare/interventions')}
          >
            <MessageCircle size={17} strokeWidth={1.8} />
            <span>Interventions</span>
          </NavButton>
        </NavGroup>
      )}

      {isCommand && (
        <NavGroup title="Strategic Workspace">
          <NavButton
            active={pathname.startsWith('/command')}
            onClick={() => navigate('/command')}
          >
            <Activity size={17} strokeWidth={1.8} />
            <span>Team pulse</span>
          </NavButton>
        </NavGroup>
      )}

      {isAudit && (
        <NavGroup title="Audit Workspace">
          <NavButton
            active={pathname.startsWith('/audit')}
            onClick={() => navigate('/audit')}
          >
            <FileClock size={17} strokeWidth={1.8} />
            <span>Audit ledger</span>
          </NavButton>
        </NavGroup>
      )}

      {isDevice && (
        <NavGroup title="Confidential Wellness">
          <NavButton
            active={pathname === '/wellness' || pathname === '/personnel'}
            onClick={() => navigate('/wellness')}
          >
            <Heart size={17} strokeWidth={1.8} />
            <span>Daily check-in</span>
          </NavButton>
          <NavButton
            active={pathname.startsWith('/wellness/support')}
            onClick={() => navigate('/wellness/support')}
          >
            <Users size={17} strokeWidth={1.8} />
            <span>Request support</span>
          </NavButton>
        </NavGroup>
      )}

      <NavGroup title="Governance">
        <NavButton
          active={pathname.startsWith('/guidance')}
          onClick={() => navigate('/guidance')}
        >
          <BookOpen size={17} strokeWidth={1.8} />
          <span>Guidance</span>
        </NavButton>
      </NavGroup>

      <div className="mt-auto rounded-2xl border border-[#dfe9e3] bg-[#f1f7f3] p-4">
        <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-white text-[#28725e]">
          <CircleHelp size={16} />
        </div>
        <div className="text-[12px] font-semibold text-[#27544b]">Need a second view?</div>
        <p className="mt-1 text-[11px] leading-relaxed text-[#708780]">
          Review escalation guidance before your next conversation.
        </p>
        <button
          onClick={() => navigate('/guidance')}
          className="mt-3 text-[11px] font-bold text-[#27705c] hover:underline flex items-center"
        >
          <span>Open guidance</span>
          <ArrowUpRight className="ml-1 inline" size={12} />
        </button>
      </div>
    </aside>
  );
}

function NavGroup({ title, children }) {
  return (
    <div className="mb-8">
      <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8ba099]">
        {title}
      </div>
      <nav className="flex flex-col gap-1">{children}</nav>
    </div>
  );
}

function NavButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium transition-colors ${
        active
          ? 'bg-[#e6f1eb] font-semibold text-[#174d43]'
          : 'text-[#6c7d78] hover:bg-[#f0f5f2]'
      }`}
    >
      {children}
    </button>
  );
}
