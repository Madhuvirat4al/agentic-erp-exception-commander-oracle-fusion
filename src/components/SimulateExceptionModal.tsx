import React, { useState } from 'react';
import { PlusCircle, X, Cpu, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ExceptionType } from '../types/erp';
import { createSimulatedException } from '../services/agentOrchestrator';
import { PriorityBadge, formatCurrency } from './BadgeHelpers';

const SIMULATE_SCENARIO_OPTIONS: {
  type: ExceptionType;
  label: string;
  description: string;
}[] = [
  {
    type: 'Invoice Price Mismatch',
    label: 'Invoice price mismatch',
    description: '+8.0% ($4,800) unit price variance above PO tolerance',
  },
  {
    type: 'Invoice Quantity Mismatch',
    label: 'Invoice quantity mismatch',
    description: 'Billed 120 units vs 100 units accepted on Warehouse Receipt',
  },
  {
    type: 'Duplicate Invoice',
    label: 'Duplicate invoice',
    description: '99.1% composite key match with previously validated EDI invoice',
  },
  {
    type: 'Missing Supplier Tax Information',
    label: 'Missing supplier tax information',
    description: 'Missing verified Form W-9 / TIN in Oracle Supplier Master',
  },
  {
    type: 'Approval Delay',
    label: 'Approval delay',
    description: 'Department approver unresponsive > 5 days (SLA Breached)',
  },
  {
    type: 'Incorrect GL Coding',
    label: 'Incorrect GL coding',
    description: 'CapEx robotic unit ($52,000) coded to OpEx Maintenance (GL 64200)',
  },
  {
    type: 'Month end close blocker' as unknown as ExceptionType,
    label: 'Month end close blocker',
    description: 'Unaccounted $91,500 invoice with completed receipt blocking AP Close Sweep',
  },
];

interface SimulateExceptionModalProps {
  isOpen: boolean;
  nextSequenceNumber: number;
  onClose: () => void;
  onCreateSimulatedException: (scenarioType: ExceptionType, openImmediately: boolean) => void;
}

export const SimulateExceptionModal: React.FC<SimulateExceptionModalProps> = ({
  isOpen,
  nextSequenceNumber,
  onClose,
  onCreateSimulatedException,
}) => {
  const [selectedType, setSelectedType] = useState<ExceptionType>('Invoice Price Mismatch');
  const [openImmediately, setOpenImmediately] = useState(true);

  if (!isOpen) return null;

  const normalizedType: ExceptionType =
    (selectedType as string) === 'Month end close blocker'
      ? 'Month End Close Blocker'
      : selectedType;

  const previewExc = createSimulatedException(normalizedType, nextSequenceNumber);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="simulate-modal-title"
    >
      <div className="bg-white border border-slate-300 rounded shadow-xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-teal-400" />
            <div>
              <h3 id="simulate-modal-title" className="text-sm font-bold">
                Simulate New Oracle Fusion ERP Exception
              </h3>
              <p className="text-[11px] text-slate-300">
                Injects a realistic transaction hold, triggers Agent Diagnosis, assigns owner, and logs Audit Event
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
              Select ERP Exception Scenario to Simulate (7 Scenarios)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SIMULATE_SCENARIO_OPTIONS.map((opt) => {
                const actualType: ExceptionType =
                  (opt.type as string) === 'Month end close blocker'
                    ? 'Month End Close Blocker'
                    : opt.type;
                const isSelected = normalizedType === actualType;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setSelectedType(actualType)}
                    className={`p-2.5 rounded border text-left transition-all ${
                      isSelected
                        ? 'bg-sky-50 border-sky-600 ring-1 ring-sky-500'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>{opt.label}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-sky-700" />}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">{opt.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview of Generated Exception, Diagnosis & Recommendation */}
          <div className="bg-slate-50 border border-slate-200 rounded p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-700" />
                <span className="font-bold text-slate-900">
                  Auto-Generated Exception & Agent Diagnosis Preview ({previewExc.id})
                </span>
              </div>
              <PriorityBadge priority={previewExc.priority} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">Invoice / PO</span>
                <strong className="font-mono text-slate-900">
                  {previewExc.invoiceNumber} / {previewExc.poNumber}
                </strong>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">Supplier</span>
                <strong className="text-slate-900">{previewExc.supplierName}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">Amount</span>
                <strong className="font-mono text-slate-900">
                  {formatCurrency(previewExc.amount)}
                </strong>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">Assigned Owner</span>
                <strong className="text-slate-900">{previewExc.assignedOwner}</strong>
              </div>
            </div>

            <div className="p-2.5 rounded bg-white border border-slate-200 space-y-1">
              <div>
                <strong className="text-slate-700">Generated Diagnosis:</strong>{' '}
                <span className="text-slate-900">{previewExc.diagnosis.rootCause}</span>
              </div>
              <div>
                <strong className="text-teal-800">Recommended Action:</strong>{' '}
                <span className="text-slate-900">
                  {previewExc.recommendedAction.primaryRecommendation}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Policy Applied: {previewExc.diagnosis.policyReference}
              </div>
            </div>

            <label className="inline-flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={openImmediately}
                onChange={(e) => setOpenImmediately(e.target.checked)}
                className="rounded border-slate-300 text-sky-700 focus:ring-sky-500"
              />
              <span className="text-slate-700 font-medium">
                Open this exception in Exception Detail View immediately after creation
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-amber-800 bg-amber-50 px-3 py-2 rounded border border-amber-200">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              Simulated in Demo Mode: Creates local exception record and writes an &ldquo;Exception created&rdquo; event to the Audit Log.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onCreateSimulatedException(normalizedType, openImmediately)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Simulated Exception ({previewExc.id})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
