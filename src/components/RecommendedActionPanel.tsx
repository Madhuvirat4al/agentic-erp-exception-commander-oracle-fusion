import React, { useState } from 'react';
import {
  ShieldCheck,
  Mail,
  ArrowUpRight,
  FileMinus,
  CheckCircle,
  XOctagon,
  CheckSquare,
  Copy,
  Check,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { ActionType, AutonomyLevel, ERPException, UserRole } from '../types/erp';
import { StatusBadge } from './BadgeHelpers';

interface RecommendedActionPanelProps {
  exception: ERPException;
  userRole: UserRole;
  autonomyLevel: AutonomyLevel;
  isProcessingAction: boolean;
  onRequestActionConfirmation: (actionType: ActionType) => void;
}

export const RecommendedActionPanel: React.FC<RecommendedActionPanelProps> = ({
  exception,
  userRole,
  autonomyLevel,
  isProcessingAction,
  onRequestActionConfirmation,
}) => {
  const [copiedBuyerMsg, setCopiedBuyerMsg] = useState(false);
  const [showBuyerDraft, setShowBuyerDraft] = useState(true);

  const isDefaultScenario = exception.invoiceNumber === 'INV-10482';

  const rootCauseText = isDefaultScenario
    ? 'Invoice price is 8 percent higher than the purchase order price.'
    : exception.diagnosis.rootCause;

  const policyResultText = isDefaultScenario
    ? 'Price variance exceeds the configured tolerance.'
    : exception.policyChecks[0]?.finding || 'Policy threshold exceeded.';

  const currentBlockerText =
    isDefaultScenario && exception.status === 'Action Required'
      ? 'Buyer approval has been pending for five days.'
      : exception.diagnosis.currentBlocker;

  const recommendedActionText = isDefaultScenario
    ? 'Ask the buyer to approve the variance or request a supplier credit note.'
    : exception.recommendedAction.primaryRecommendation;

  const confidencePercent = isDefaultScenario
    ? 92
    : exception.recommendedAction.confidence;

  const estimatedImpactText = isDefaultScenario
    ? 'Payment delay, supplier dissatisfaction, and month end close risk.'
    : exception.recommendedAction.estimatedImpact;

  const buyerMsg = exception.diagnosis.generatedBuyerMessage;

  const handleCopyDraft = () => {
    navigator.clipboard?.writeText(`Subject: ${buyerMsg.subject}\n\n${buyerMsg.body}`);
    setCopiedBuyerMsg(true);
    setTimeout(() => setCopiedBuyerMsg(false), 2000);
  };

  return (
    <section
      aria-label="Recommended Action Panel"
      className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden flex flex-col justify-between"
    >
      <div>
        {/* Panel Header */}
        <div className="bg-slate-800 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold">
              Recommended Action & Human Approval Gate
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-200 border border-slate-600">
              Autonomy: <strong>{autonomyLevel}</strong>
            </span>
            <StatusBadge status={exception.status} />
          </div>
        </div>

        {/* 6 Required Structured Summary Fields */}
        <div className="p-4 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Root Cause
              </div>
              <div className="font-semibold text-slate-900 mt-0.5">{rootCauseText}</div>
            </div>

            <div className="p-2.5 rounded bg-red-50/70 border border-red-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-red-800">
                Policy Result ({exception.diagnosis.policyId})
              </div>
              <div className="font-semibold text-red-950 mt-0.5">{policyResultText}</div>
            </div>

            <div className="p-2.5 rounded bg-amber-50/70 border border-amber-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Current Blocker
              </div>
              <div className="font-semibold text-amber-950 mt-0.5">{currentBlockerText}</div>
            </div>

            <div className="p-2.5 rounded bg-sky-50/80 border border-sky-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
                  Confidence
                </span>
                <span className="text-sm font-bold text-sky-900">
                  {confidencePercent} percent
                </span>
              </div>
              <div className="w-full bg-sky-200/70 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-sky-700 h-full rounded-full"
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded bg-teal-50/80 border border-teal-300">
            <div className="text-[10px] font-bold uppercase tracking-wider text-teal-900">
              Recommended Action
            </div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              {recommendedActionText}
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-teal-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-700">
              <span>
                <strong>Estimated Impact:</strong> {estimatedImpactText}
              </span>
            </div>
          </div>

          {/* Generated Buyer Message Preview */}
          <div className="border border-slate-200 rounded bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Mail className="w-3.5 h-3.5 text-sky-700" />
                <span>Generated Buyer Communication Draft</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyDraft}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-white border border-slate-300 hover:bg-slate-100 text-slate-700"
                >
                  {copiedBuyerMsg ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBuyerDraft((v) => !v)}
                  className="text-[11px] text-sky-700 hover:underline font-medium"
                >
                  {showBuyerDraft ? 'Collapse' : 'Expand'}
                </button>
              </div>
            </div>

            {showBuyerDraft && (
              <div className="bg-white border border-slate-200 rounded p-2.5 text-xs space-y-1 font-sans">
                <div className="text-[11px] text-slate-500">
                  <strong className="text-slate-700">To:</strong> {buyerMsg.to} |{' '}
                  <strong className="text-slate-700">CC:</strong> {buyerMsg.cc}
                </div>
                <div className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                  Subject: {buyerMsg.subject}
                </div>
                <p className="text-slate-800 leading-relaxed pt-1">{buyerMsg.body}</p>
              </div>
            )}
          </div>

          {/* Human Confirmation Governance Notice */}
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
            <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>
              <strong>Governance Gate Active:</strong> Every action below requires human confirmation by{' '}
              <strong>{userRole}</strong> and is executed strictly in <strong>Demo Mode</strong>.
            </span>
          </div>

          {/* 6 Required Working Action Buttons */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
              Execute Controlled Action (Requires Confirmation)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => onRequestActionConfirmation('DRAFT_BUYER_MESSAGE')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-semibold bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Draft Message to Buyer</span>
              </button>

              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => onRequestActionConfirmation('ESCALATE_APPROVAL')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-semibold bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Escalate Approval</span>
              </button>

              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => onRequestActionConfirmation('REQUEST_CREDIT_NOTE')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-semibold bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-800 border border-slate-300 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <FileMinus className="w-3.5 h-3.5 text-sky-700" />
                <span>Request Credit Note</span>
              </button>

              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => onRequestActionConfirmation('APPROVE_EXCEPTION')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-semibold bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-800 border border-slate-300 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <CheckCircle className="w-3.5 h-3.5 text-teal-700" />
                <span>Approve Exception</span>
              </button>

              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => onRequestActionConfirmation('REJECT_INVOICE')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-semibold bg-white hover:bg-red-50 disabled:opacity-50 text-red-700 border border-red-300 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <XOctagon className="w-3.5 h-3.5 text-red-600" />
                <span>Reject Invoice</span>
              </button>

              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => onRequestActionConfirmation('MARK_RESOLVED')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Mark as Resolved</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
