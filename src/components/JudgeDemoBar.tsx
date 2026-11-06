import React from 'react';
import {
  Award,
  CheckCircle2,
  Play,
  RotateCcw,
  X,
  ArrowRight,
} from 'lucide-react';
import { ActionType } from '../types/erp';
import { NavTab } from './TopHeader';

interface JudgeDemoBarProps {
  visible: boolean;
  onClose: () => void;
  onResetDemo: () => void;
  completedSteps: Record<string, boolean>;
  onNavigateTab: (tab: NavTab) => void;
  onSelectDefaultScenario: () => void;
  onRunInvestigation: () => void;
  onAskBlockedQuestion: () => void;
  onTriggerAction: (action: ActionType) => void;
}

export const JudgeDemoBar: React.FC<JudgeDemoBarProps> = ({
  visible,
  onClose,
  onResetDemo,
  completedSteps,
  onNavigateTab,
  onSelectDefaultScenario,
  onRunInvestigation,
  onAskBlockedQuestion,
  onTriggerAction,
}) => {
  if (!visible) return null;

  const steps = [
    {
      id: 'step-1',
      num: '1–2',
      label: 'Command Center & Critical Mismatch',
      detail: 'View KPIs & INV-10482 (+8% vs PO-78421)',
      done: !!completedSteps['viewed-command-center'],
      onClick: () => {
        onSelectDefaultScenario();
        onNavigateTab('command-center');
      },
    },
    {
      id: 'step-2',
      num: '3',
      label: 'Open Exception Details',
      detail: 'Inspect 3-Way Match, Policy & Hold',
      done: !!completedSteps['selected-exception'],
      onClick: () => {
        onSelectDefaultScenario();
        onNavigateTab('exceptions');
      },
    },
    {
      id: 'step-3',
      num: '4–6',
      label: 'Run Agent Investigation',
      detail: 'Watch 9-stage pipeline & root cause (92%)',
      done: !!completedSteps['ran-investigation'],
      onClick: () => {
        onSelectDefaultScenario();
        onNavigateTab('exceptions');
        onRunInvestigation();
      },
    },
    {
      id: 'step-4',
      num: '7',
      label: 'Ask Why Invoice is Blocked',
      detail: 'Query deterministic AI Assistant',
      done: !!completedSteps['asked-assistant'],
      onClick: () => {
        onSelectDefaultScenario();
        onNavigateTab('exceptions');
        onAskBlockedQuestion();
      },
    },
    {
      id: 'step-5',
      num: '8–10',
      label: 'Draft Message to Buyer',
      detail: 'Preview & confirm buyer outreach',
      done: !!completedSteps['confirmed-action'],
      onClick: () => {
        onSelectDefaultScenario();
        onNavigateTab('exceptions');
        onTriggerAction('DRAFT_BUYER_MESSAGE');
      },
    },
    {
      id: 'step-6',
      num: '11–14',
      label: 'Escalate Approval',
      detail: 'Confirm -> Status: Waiting for Approval',
      done: !!completedSteps['confirmed-action'],
      onClick: () => {
        onSelectDefaultScenario();
        onNavigateTab('exceptions');
        onTriggerAction('ESCALATE_APPROVAL');
      },
    },
    {
      id: 'step-7',
      num: '15–16',
      label: 'Mark as Resolved & Audit Trail',
      detail: 'Confirm -> Resolved + Audit Event',
      done: !!completedSteps['viewed-audit-log'],
      onClick: () => {
        onSelectDefaultScenario();
        onNavigateTab('exceptions');
        onTriggerAction('MARK_RESOLVED');
      },
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-3">
      <div className="aurora-shell-card px-5 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold shadow-xs">
              <Award className="w-3.5 h-3.5 text-amber-200" />
              Interactive Walkthrough
            </span>
            <span className="text-xs text-indigo-950/80 font-medium">
              Click any card below to jump directly to that stage of the{' '}
              <strong className="text-indigo-700 font-mono">INV-10482 / PO-78421</strong> flow (
              <strong className="text-violet-700">{completedCount}/{steps.length}</strong> completed)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetDemo}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Scenario
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-indigo-900 hover:bg-indigo-50"
              title="Hide Walkthrough Bar"
              aria-label="Hide Walkthrough Bar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
          {steps.map((step, idx) => (
            <button
              key={step.id}
              type="button"
              onClick={step.onClick}
              className={`text-left p-3 rounded-2xl border transition-all flex flex-col justify-between group ${
                step.done
                  ? 'bg-gradient-to-br from-emerald-50/90 via-white/90 to-teal-50/80 border-emerald-200 shadow-2xs'
                  : 'aurora-inner-card hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100/80 text-indigo-700 font-bold">
                  Step {step.num}
                </span>
                <div className="flex items-center gap-1">
                  {step.done ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Play className="w-3 h-3 text-violet-600 opacity-80 group-hover:opacity-100 shrink-0" />
                  )}
                  {idx < steps.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-indigo-300 hidden lg:inline" />
                  )}
                </div>
              </div>
              <div className="text-xs font-bold text-indigo-950 leading-snug">{step.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                {step.detail}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
