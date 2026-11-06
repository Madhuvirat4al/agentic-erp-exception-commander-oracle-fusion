import React from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  X,
  Database,
  AlertTriangle,
  Loader2,
  Mail,
} from 'lucide-react';
import { ActionType, ERPException, ExceptionStatus, UserRole } from '../types/erp';
import { StatusBadge } from './BadgeHelpers';

interface ActionConfirmationModalProps {
  isOpen: boolean;
  exception: ERPException;
  actionType: ActionType | null;
  userRole: UserRole;
  isProcessing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const DEFAULT_ACTION_METADATA: Record<
  ActionType,
  {
    label: string;
    defaultResultingStatus: ExceptionStatus;
  }
> = {
  DRAFT_BUYER_MESSAGE: {
    label: 'Draft Message to Buyer',
    defaultResultingStatus: 'Action Required',
  },
  ESCALATE_APPROVAL: {
    label: 'Escalate Approval',
    defaultResultingStatus: 'Waiting for Approval',
  },
  REQUEST_CREDIT_NOTE: {
    label: 'Request Credit Note',
    defaultResultingStatus: 'Waiting for Approval',
  },
  APPROVE_EXCEPTION: {
    label: 'Approve Exception',
    defaultResultingStatus: 'Waiting for Approval',
  },
  REJECT_INVOICE: {
    label: 'Reject Invoice',
    defaultResultingStatus: 'Rejected',
  },
  MARK_RESOLVED: {
    label: 'Mark as Resolved',
    defaultResultingStatus: 'Resolved',
  },
};

export const ActionConfirmationModal: React.FC<ActionConfirmationModalProps> = ({
  isOpen,
  exception,
  actionType,
  userRole,
  isProcessing,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !actionType) return null;

  const matchedAction = exception.recommendedAction.availableActions.find(
    (a) => a.type === actionType
  );

  const actionName = matchedAction?.label || DEFAULT_ACTION_METADATA[actionType].label;
  const reason =
    matchedAction?.reason ||
    `Execute ${actionName} on ${exception.invoiceNumber} (${exception.supplierName}) based on ${exception.diagnosis.policyReference}.`;
  const recordsAffected = matchedAction?.recordsAffected || [
    `${exception.invoiceNumber} (Invoice Hold State)`,
    `${exception.poNumber} (Workflow Audit Trail)`,
    `${exception.id} (Exception Lifecycle)`,
  ];
  const expectedBusinessImpact =
    matchedAction?.expectedBusinessImpact || exception.recommendedAction.estimatedImpact;
  const complianceWarning =
    matchedAction?.complianceWarning ||
    'Human confirmation required. Executed strictly in Demo Mode — no real Oracle Fusion production transaction is altered.';
  const resultingStatus =
    matchedAction?.resultingStatus || DEFAULT_ACTION_METADATA[actionType].defaultResultingStatus;

  const buyerMsg = exception.diagnosis.generatedBuyerMessage;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-action-title"
    >
      <div className="bg-white border border-slate-300 rounded shadow-xl max-w-xl w-full overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <div>
              <h3 id="confirm-action-title" className="text-sm font-bold">
                Human Approval Confirmation Required
              </h3>
              <p className="text-[11px] text-slate-300">
                Exception {exception.id} • Invoice {exception.invoiceNumber} • Active Role: {userRole}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close confirmation modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3 text-xs">
          {/* Action Name & Status Transition */}
          <div className="p-3 rounded bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Action Name
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">{actionName}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Target Status:</span>
              <StatusBadge status={resultingStatus} />
            </div>
          </div>

          {/* Reason */}
          <div className="p-3 rounded bg-white border border-slate-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Reason & Policy Basis
            </div>
            <p className="text-slate-800 leading-relaxed">{reason}</p>
            <p className="text-[11px] text-sky-800 font-medium mt-1">
              Policy Reference: {exception.diagnosis.policyReference}
            </p>
          </div>

          {/* Buyer Message Preview when drafting message */}
          {actionType === 'DRAFT_BUYER_MESSAGE' && (
            <div className="p-3 rounded bg-sky-50/70 border border-sky-200 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-sky-900">
                <Mail className="w-3.5 h-3.5" />
                <span>Generated Buyer Message to Queue</span>
              </div>
              <div className="text-[11px] text-slate-700">
                <strong>To:</strong> {buyerMsg.to}
              </div>
              <div className="font-bold text-slate-900">Subject: {buyerMsg.subject}</div>
              <p className="text-slate-800 bg-white p-2 rounded border border-sky-200 leading-relaxed">
                {buyerMsg.body}
              </p>
            </div>
          )}

          {/* Records Affected */}
          <div className="p-3 rounded bg-white border border-slate-200">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              <Database className="w-3.5 h-3.5 text-sky-700" />
              <span>Records Affected (Demo Mode State Only)</span>
            </div>
            <ul className="space-y-1">
              {recordsAffected.map((rec, i) => (
                <li
                  key={i}
                  className="font-mono text-[11px] text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200"
                >
                  • {rec}
                </li>
              ))}
            </ul>
          </div>

          {/* Expected Business Impact */}
          <div className="p-3 rounded bg-teal-50/70 border border-teal-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-teal-900 mb-0.5">
              Expected Business Impact
            </div>
            <p className="text-slate-800 font-medium">{expectedBusinessImpact}</p>
          </div>

          {/* Compliance Warning */}
          <div className="p-3 rounded bg-amber-50 border border-amber-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                Compliance Warning & Demo Mode Safeguard
              </div>
              <p className="text-amber-950 mt-0.5 leading-snug">{complianceWarning}</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-3.5 py-1.5 rounded text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Executing in Demo Mode...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm & Execute in Demo Mode</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
