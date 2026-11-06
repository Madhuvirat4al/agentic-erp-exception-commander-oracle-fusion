import React from 'react';
import {
  Settings,
  ShieldCheck,
  UserCheck,
  Bot,
  Database,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Server,
} from 'lucide-react';
import { UserRole, AutonomyLevel } from '../types/erp';

interface SettingsViewProps {
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  autonomyLevel: AutonomyLevel;
  onAutonomyChange: (level: AutonomyLevel) => void;
  lastSyncTime: string;
  totalExceptionsCount: number;
  simulateAdapterError: boolean;
  onToggleAdapterError: (enabled: boolean) => void;
  onResetDemoData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userRole,
  onRoleChange,
  autonomyLevel,
  onAutonomyChange,
  lastSyncTime,
  totalExceptionsCount,
  simulateAdapterError,
  onToggleAdapterError,
  onResetDemoData,
}) => {
  const autonomyOptions: {
    level: AutonomyLevel;
    title: string;
    description: string;
    recommended?: boolean;
  }[] = [
    {
      level: 'Recommend only',
      title: 'Recommend only',
      description:
        'Agent observes, investigates, and explains root cause with policy citations, but does not pre-draft communications or stage ERP resolution actions.',
    },
    {
      level: 'Recommend and draft',
      title: 'Recommend and draft (Default)',
      description:
        'Agent performs full root-cause diagnosis, cites policies and historical cases, and pre-drafts buyer notifications or credit note requests. Human confirmation is strictly required before execution.',
      recommended: true,
    },
    {
      level: 'Recommend and execute after approval',
      title: 'Recommend and execute after approval',
      description:
        'Agent stages the complete Oracle Fusion payload and executes the state transition immediately in Demo Mode once a human Analyst, Manager, or Controller confirms the action dialog.',
    },
  ];

  const roles: { role: UserRole; subtitle: string }[] = [
    {
      role: 'Analyst',
      subtitle: 'Accounts Payable Analyst / Finance Operations Analyst (Primary User)',
    },
    {
      role: 'Manager',
      subtitle: 'Procurement & AP Operations Manager (Escalation & Variance Approver)',
    },
    {
      role: 'Controller',
      subtitle: 'Corporate Financial Controller (Month-End Close & SOX Governance)',
    },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      {/* Top Security & Mode Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-6 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                <ShieldCheck className="w-3.5 h-3.5" />
                Current Mode: Demo Mode
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                <Lock className="w-3 h-3" />
                Zero-Credential Sandbox
              </span>
            </div>
            <h2 className="text-xl font-bold mt-2">
              System Configuration & Agent Governance Settings
            </h2>
            <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
              Configure agent autonomy levels, active operator role, and inspect the Oracle Fusion Cloud ERP adapter status. No Oracle passwords, client secrets, or API keys are requested or stored.
            </p>
          </div>

          <button
            type="button"
            onClick={onResetDemoData}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            Reset All Demo Data to Initial Seed
          </button>
        </div>
      </div>

      {/* System Status Cards Grid (Required 7 fields) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Current Mode
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-base font-bold text-slate-900">Demo Mode</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Isolated local state; never mutates live Oracle production records.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Human Approval Required
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-base font-bold text-emerald-700">Yes (Mandatory)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Every state-changing action requires explicit human confirmation.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Oracle Integration Status
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-bold text-slate-900">
              MockOracleFusionAdapter
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Last synchronization: <span className="font-mono">{lastSyncTime}</span>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Mock Data Status
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-slate-900">
              Healthy ({totalExceptionsCount} Exceptions)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            6 Policies, 7 Historical Cases, Deterministic AI Ready.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Autonomy Level Selector */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Agent Autonomy Level
                </h3>
                <p className="text-xs text-slate-500">
                  Controls how far the AI agent proceeds before pausing for human approval.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200">
              {autonomyLevel}
            </span>
          </div>

          <div className="space-y-3">
            {autonomyOptions.map((opt) => {
              const selected = autonomyLevel === opt.level;
              return (
                <button
                  key={opt.level}
                  type="button"
                  onClick={() => onAutonomyChange(opt.level)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selected
                      ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {opt.title}
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selected
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {opt.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active User Role & Adapter Resilience Testing */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Active Operator Role
                  </h3>
                  <p className="text-xs text-slate-500">
                    Switch operator persona to test role-tagged audit events and approvals.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                Active: {userRole}
              </span>
            </div>

            <div className="space-y-2.5">
              {roles.map((r) => {
                const selected = userRole === r.role;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => onRoleChange(r.role)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                      selected
                        ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {r.role}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {r.subtitle}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded ${
                        selected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {selected ? 'Active' : 'Select'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Adapter Architecture & Error Handling Simulation */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Oracle Fusion Adapter & Resilience Diagnostics
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              The application uses the <code className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">OracleFusionAdapter</code> interface. In Demo Mode, <code className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">MockOracleFusionAdapter</code> serves seeded data locally. Future OAuth2 client-credentials connectivity is isolated in a server-side proxy pattern (<code className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">.env.example</code>).
            </p>

            <div className="pt-2 flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Simulate Mock API Error State
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Test graceful UI error banner recovery when an adapter call fails.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleAdapterError(!simulateAdapterError)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  simulateAdapterError
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {simulateAdapterError ? 'Error Active (Click to Clear)' : 'Enable Test Error'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
