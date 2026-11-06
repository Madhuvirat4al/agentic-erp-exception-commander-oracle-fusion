import React from 'react';
import {
  ShieldAlert,
  Cpu,
  RotateCcw,
  PlusCircle,
  UserCheck,
  LayoutDashboard,
  FileWarning,
  BookOpen,
  History,
  ClipboardList,
  Settings,
  CheckCircle2,
  Loader2,
  Sparkles,
  LogOut,
  Server,
} from 'lucide-react';
import { AgentStatus, UserRole } from '../types/erp';

export type NavTab =
  | 'command-center'
  | 'exceptions'
  | 'policies'
  | 'history'
  | 'audit-log'
  | 'settings';

interface TopHeaderProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  userRole: UserRole;
  onChangeUserRole: (role: UserRole) => void;
  globalAgentStatus: AgentStatus;
  isInvestigating: boolean;
  openExceptionsCount: number;
  criticalCount: number;
  auditCount: number;
  showJudgeGuide: boolean;
  onToggleJudgeGuide: () => void;
  onResetDemo: () => void;
  onOpenSimulateModal: () => void;
  oracleUsername?: string | null;
  oracleInstanceUrl?: string | null;
  onSignOut?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  onChangeUserRole,
  globalAgentStatus,
  isInvestigating,
  openExceptionsCount,
  criticalCount,
  auditCount,
  onResetDemo,
  onOpenSimulateModal,
  oracleUsername,
  oracleInstanceUrl,
  onSignOut,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    {
      id: 'command-center',
      label: 'Command Center',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'exceptions',
      label: 'Exceptions',
      icon: <FileWarning className="w-4 h-4" />,
      badge: openExceptionsCount,
    },
    {
      id: 'policies',
      label: 'Policies & Knowledge',
      icon: <BookOpen className="w-4 h-4" />,
      badge: 6,
    },
    {
      id: 'history',
      label: 'Historical Resolutions',
      icon: <History className="w-4 h-4" />,
    },
    {
      id: 'audit-log',
      label: 'Audit Log',
      icon: <ClipboardList className="w-4 h-4" />,
      badge: auditCount,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const cleanHost = oracleInstanceUrl
    ? oracleInstanceUrl.replace(/^https?:\/\//, '')
    : 'Oracle Fusion Server';

  return (
    <header className="sticky top-0 z-30 pt-3 px-4 sm:px-6">
      <div className="max-w-[1600px] mx-auto aurora-shell-card px-5 py-3.5 transition-all">
        {/* Top Row: Brand Orb, Title, and Floating Pill Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-indigo-100/80">
          {/* Brand & Glowing Orb Icon */}
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-full aurora-orb-circle flex items-center justify-center shrink-0"
              title="Oracle Fusion Cloud ERP Exception Commander"
            >
              <Cpu className="w-5 h-5 text-white drop-shadow" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50/90 px-2.5 py-0.5 rounded-full border border-indigo-200/70">
                  <Sparkles className="w-3 h-3 text-violet-500" />
                  Oracle Fusion Cloud ERP
                </span>
                {oracleUsername ? (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs"
                    title={`Authenticated session on ${oracleInstanceUrl} as ${oracleUsername}`}
                  >
                    <Server className="w-3.5 h-3.5 text-emerald-600" />
                    Live Server Connected • User ID: <strong className="font-mono text-emerald-950">{oracleUsername}</strong>
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-amber-50 to-rose-50 text-amber-800 border border-amber-200/80 shadow-2xs"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    Server Disconnected
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-950 via-indigo-800 to-violet-700 bg-clip-text text-transparent mt-0.5">
                Agentic ERP Exception Commander
              </h1>
            </div>
          </div>

          {/* Right Controls: Agent Status Pill, Role Selector, Sync Server, Sign Out */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Visible Agent Status Indicator Pill */}
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold shadow-2xs ${
                isInvestigating
                  ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300 text-indigo-900'
                  : globalAgentStatus === 'Waiting for Approval'
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 text-amber-900'
                  : 'bg-white/90 border-indigo-100 text-indigo-950'
              }`}
              title="Current Agent Orchestrator State"
            >
              {isInvestigating ? (
                <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              )}
              <span className="text-slate-500 font-medium">Agent:</span>
              <span className="font-bold text-indigo-950">{globalAgentStatus}</span>
            </div>

            {/* Active Role Switcher Pill */}
            <div className="flex items-center bg-white/90 border border-indigo-200/80 rounded-full px-3 py-1.5 text-xs shadow-2xs">
              <UserCheck className="w-3.5 h-3.5 text-violet-600 mr-1.5" />
              <label htmlFor="header-role-select" className="text-slate-500 mr-1.5 font-medium">
                Role:
              </label>
              <select
                id="header-role-select"
                value={userRole}
                onChange={(e) => onChangeUserRole(e.target.value as UserRole)}
                className="bg-transparent text-indigo-950 font-bold focus:outline-none cursor-pointer"
                aria-label="Select Active User Role"
              >
                <option value="Analyst" className="bg-white text-indigo-950">
                  Analyst (AP Ops)
                </option>
                <option value="Manager" className="bg-white text-indigo-950">
                  Manager (Procurement)
                </option>
                <option value="Controller" className="bg-white text-indigo-950">
                  Controller (Finance)
                </option>
              </select>
            </div>

            {/* Simulate New Exception Pill Button */}
            <button
              type="button"
              onClick={onOpenSimulateModal}
              className="aurora-pill-btn inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold"
              title="Create a simulated ERP exception across 7 scenario types"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Simulate Exception</span>
            </button>

            {/* Re-Sync Server Button */}
            <button
              type="button"
              onClick={onResetDemo}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/85 hover:bg-indigo-50 text-indigo-900 border border-indigo-200 transition-colors"
              title="Re-synchronize live invoices from the connected Oracle Server"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sync Server</span>
            </button>

            {/* Sign Out / Switch User Button */}
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
                title="Disconnect from Oracle Server, clear session data, and return to User Login Page"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out ({oracleUsername || 'User'})</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Navigation Bar: Soft Rounded Pill Tabs */}
        <nav
          aria-label="Main Enterprise Navigation"
          className="pt-2.5 flex items-center justify-between overflow-x-auto gap-3"
        >
          <div className="flex items-center gap-1.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap focus:outline-none ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white shadow-md shadow-indigo-500/25'
                      : 'text-indigo-950/75 hover:text-indigo-950 hover:bg-white/80'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`ml-0.5 px-2 py-0.2 rounded-full text-[11px] font-extrabold ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-indigo-100/90 text-indigo-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="hidden xl:flex items-center gap-2.5 text-xs font-semibold text-indigo-950/80 bg-gradient-to-r from-emerald-50/90 via-indigo-50/90 to-purple-50/90 px-3.5 py-1.5 rounded-full border border-emerald-200/80">
            <span>
              Server: <strong className="text-indigo-800 font-mono">{cleanHost}</strong>
            </span>
            <span className="text-indigo-300">•</span>
            <span>
              User ID: <strong className="text-emerald-700 font-mono">{oracleUsername || 'Not Signed In'}</strong>
            </span>
            <span className="text-indigo-300">•</span>
            <span className="text-rose-600 font-bold">
              {criticalCount} Critical
            </span>
          </div>
        </nav>
      </div>
    </header>
  );
};

