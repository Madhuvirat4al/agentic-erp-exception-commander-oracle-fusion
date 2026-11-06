import React from 'react';
import {
  Cpu,
  Play,
  CheckCircle2,
  Loader2,
  Circle,
  BookOpen,
  History,
  UserCheck,
  AlertOctagon,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { AgentStatus, ERPException } from '../types/erp';
import { InvestigationStageStep } from '../services/agentOrchestrator';

const ALL_STAGES: AgentStatus[] = [
  'Observing',
  'Detecting',
  'Classifying',
  'Investigating',
  'Reasoning',
  'Recommending',
  'Waiting for Approval',
  'Executing',
  'Completed',
];

interface AgentInvestigationPanelProps {
  exception: ERPException;
  currentStage: AgentStatus;
  isInvestigating: boolean;
  activeStepIndex: number;
  stageLogs: InvestigationStageStep[];
  onRunInvestigation: () => void;
  onOpenPolicyView: (policyId: string) => void;
  onOpenHistoryView: () => void;
}

export const AgentInvestigationPanel: React.FC<AgentInvestigationPanelProps> = ({
  exception,
  currentStage,
  isInvestigating,
  activeStepIndex,
  stageLogs,
  onRunInvestigation,
  onOpenPolicyView,
  onOpenHistoryView,
}) => {
  const { diagnosis } = exception;

  // Determine stage completion state for visual pipeline
  const getStageVisualState = (stage: AgentStatus, idx: number) => {
    if (isInvestigating) {
      if (idx < activeStepIndex) return 'done';
      if (idx === activeStepIndex) return 'active';
      return 'pending';
    }
    if (currentStage === 'Completed') {
      return 'done';
    }
    if (currentStage === stage) return 'active';
    const currentIdx = ALL_STAGES.indexOf(currentStage);
    if (currentIdx > idx) return 'done';
    return 'pending';
  };

  return (
    <section
      aria-label="Agent Investigation Panel"
      className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden"
    >
      {/* Header Bar */}
      <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-sky-600 text-white">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight">Agent Investigation</h3>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-sky-300 border border-slate-700">
                {exception.id} • {exception.invoiceNumber}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Multi-stage Oracle Fusion cross-object telemetry & policy verification engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs flex items-center gap-1.5">
            <span className="text-slate-400">Current Agent Status:</span>
            <span className="font-bold text-sky-300">{currentStage}</span>
          </div>

          <button
            type="button"
            onClick={onRunInvestigation}
            disabled={isInvestigating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            {isInvestigating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running Investigation...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Run Agent Investigation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 9-Stage Visual Pipeline */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200">
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5">
          {ALL_STAGES.map((stage, idx) => {
            const state = getStageVisualState(stage, idx);
            return (
              <div
                key={stage}
                className={`px-2 py-2 rounded border text-xs flex flex-col justify-between transition-all ${
                  state === 'active'
                    ? 'bg-sky-600 text-white border-sky-700 shadow-sm ring-2 ring-sky-300'
                    : state === 'done'
                    ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-mono opacity-75">0{idx + 1}</span>
                  {state === 'active' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : state === 'done' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Circle className="w-3 h-3 text-slate-300" />
                  )}
                </div>
                <div className="font-semibold text-[11px] leading-tight">{stage}</div>
              </div>
            );
          })}
        </div>

        {/* Live Stage Activity Feed */}
        <div className="mt-3 bg-slate-900 text-slate-100 rounded p-3 border border-slate-800 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1.5 mb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5 font-sans font-semibold text-sky-400">
              <Activity className="w-3.5 h-3.5" />
              Agent Investigation Activity Log ({stageLogs.length} steps executed)
            </span>
            <span>Deterministic State Machine • Demo Mode</span>
          </div>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {stageLogs.map((log, i) => {
              const isLatest = isInvestigating && i === stageLogs.length - 1;
              return (
                <div
                  key={`${log.stage}-${i}`}
                  className={`flex items-start gap-2 py-0.5 ${
                    isLatest ? 'text-sky-300 font-semibold' : 'text-slate-200'
                  }`}
                >
                  <span className="text-emerald-400 shrink-0">[{log.title}:]</span>
                  <span className="font-sans">{log.activityMessage}</span>
                  <span className="ml-auto text-[10px] text-slate-500 shrink-0 hidden sm:inline">
                    {log.functionCalled}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 8 Structured Investigation Findings */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* 1. Root Cause */}
        <div className="p-3 rounded bg-red-50/70 border border-red-200">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-red-800 mb-1">
            <span>Root Cause</span>
            <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
          </div>
          <p className="font-semibold text-slate-900 leading-snug">{diagnosis.rootCause}</p>
          <p className="text-[11px] text-slate-600 mt-1">{diagnosis.varianceDetails}</p>
        </div>

        {/* 2. Confidence Score & Current Status */}
        <div className="p-3 rounded bg-sky-50/70 border border-sky-200">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-sky-900 mb-1">
            <span>Confidence Score</span>
            <TrendingUp className="w-3.5 h-3.5 text-sky-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-sky-900">
              {diagnosis.confidenceScore}%
            </span>
            <span className="text-[11px] font-semibold text-emerald-700">
              High Deterministic Match
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-sky-200/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-600">Current Agent Status:</span>
            <span className="font-bold text-slate-900">{currentStage}</span>
          </div>
        </div>

        {/* 3. Business Impact */}
        <div className="p-3 rounded bg-amber-50/70 border border-amber-200">
          <div className="text-[11px] font-bold uppercase text-amber-900 mb-1">
            Business Impact
          </div>
          <p className="font-medium text-slate-900 leading-snug">{diagnosis.businessImpact}</p>
          <div className="mt-1.5 text-[11px] font-semibold text-amber-800">
            Blocker: {diagnosis.currentBlocker}
          </div>
        </div>

        {/* 4. Recommended Owner */}
        <div className="p-3 rounded bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-600 mb-1">
            <span>Recommended Owner</span>
            <UserCheck className="w-3.5 h-3.5 text-teal-700" />
          </div>
          <p className="font-bold text-slate-900">{diagnosis.recommendedOwner}</p>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Role: {diagnosis.recommendedOwnerRole}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Last Agent Action: {diagnosis.lastAgentAction}
          </p>
        </div>

        {/* 5. Policy Reference (spans 2 cols) */}
        <div className="p-3 rounded bg-slate-50 border border-slate-200 md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-600 mb-1">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-sky-700" />
                Policy Reference & Governance Rule
              </span>
              <button
                type="button"
                onClick={() => onOpenPolicyView(diagnosis.policyId)}
                className="text-sky-700 hover:text-sky-900 underline font-semibold"
              >
                View Policy {diagnosis.policyId}
              </button>
            </div>
            <p className="font-semibold text-slate-900">{diagnosis.policyReference}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">{diagnosis.policySection}</p>
          </div>
        </div>

        {/* 6. Similar Historical Resolution (spans 2 cols) */}
        <div className="p-3 rounded bg-slate-50 border border-slate-200 md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-600 mb-1">
              <span className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-teal-700" />
                Similar Historical Resolution ({diagnosis.similarHistoricalCaseIds.join(', ')})
              </span>
              <button
                type="button"
                onClick={onOpenHistoryView}
                className="text-teal-700 hover:text-teal-900 underline font-semibold"
              >
                View Historical Cases
              </button>
            </div>
            <p className="text-slate-800 leading-snug">{diagnosis.similarResolutionSummary}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
