import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  ShoppingCart,
  PackageCheck,
  UserCheck,
  CheckCircle2,
  Building2,
  GitCommit,
  ShieldAlert,
  History,
  Cpu,
  ClipboardList,
  AlertTriangle,
  ExternalLink,
  Layers,
} from 'lucide-react';
import {
  ActionType,
  AgentStatus,
  AssistantResponse,
  AuditEvent,
  AutonomyLevel,
  ERPException,
  HistoricalResolution,
  UserRole,
} from '../types/erp';
import { InvestigationStageStep } from '../services/agentOrchestrator';
import { PriorityBadge, StatusBadge, formatCurrency } from './BadgeHelpers';
import { AgentInvestigationPanel } from './AgentInvestigationPanel';
import { RecommendedActionPanel } from './RecommendedActionPanel';
import { AIAssistantPanel } from './AIAssistantPanel';

interface ExceptionDetailViewProps {
  exceptions: ERPException[];
  selectedException: ERPException;
  onSelectExceptionId: (id: string) => void;
  onBackToCommandCenter: () => void;
  currentAgentStage: AgentStatus;
  isInvestigating: boolean;
  activeStepIndex: number;
  stageLogs: InvestigationStageStep[];
  onRunInvestigation: () => void;
  userRole: UserRole;
  autonomyLevel: AutonomyLevel;
  isProcessingAction: boolean;
  onRequestActionConfirmation: (action: ActionType) => void;
  assistantMessages: AssistantResponse[];
  isAskingAssistant: boolean;
  onAskAssistant: (question: string) => void;
  onClearAssistantMessages: () => void;
  historicalCases: HistoricalResolution[];
  auditEvents: AuditEvent[];
  onOpenPolicyView: (policyId: string) => void;
  onOpenHistoryView: () => void;
  onOpenAuditLogView: () => void;
}

type DetailSubTab =
  | 'ai-investigation'
  | 'erp-records'
  | 'policies-approvals'
  | 'history-audit'
  | 'all';

export const ExceptionDetailView: React.FC<ExceptionDetailViewProps> = ({
  exceptions,
  selectedException,
  onSelectExceptionId,
  onBackToCommandCenter,
  currentAgentStage,
  isInvestigating,
  activeStepIndex,
  stageLogs,
  onRunInvestigation,
  userRole,
  autonomyLevel,
  isProcessingAction,
  onRequestActionConfirmation,
  assistantMessages,
  isAskingAssistant,
  onAskAssistant,
  onClearAssistantMessages,
  historicalCases,
  auditEvents,
  onOpenPolicyView,
  onOpenHistoryView,
  onOpenAuditLogView,
}) => {
  const [detailTab, setDetailTab] = useState<DetailSubTab>('ai-investigation');

  const {
    invoice,
    purchaseOrder,
    receipt,
    supplier,
    approvalHistory,
    relatedTransactions,
    policyChecks,
    diagnosis,
    recommendedAction,
  } = selectedException;

  const similarCases = historicalCases.filter(
    (h) =>
      diagnosis.similarHistoricalCaseIds.includes(h.id) ||
      h.exceptionType === selectedException.exceptionType
  );

  const exceptionAuditEvents = auditEvents.filter(
    (e) => e.exceptionId === selectedException.id
  );

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-4 pb-8 space-y-5">
      {/* Top Bar: Back Button + Quick Invoice Switcher */}
      <div className="aurora-shell-card px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToCommandCenter}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Invoices</span>
          </button>
          <span className="text-xs font-bold text-slate-600 hidden sm:inline">
            Invoice Review & Resolution Workspace
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="exception-switcher"
            className="text-xs font-bold text-indigo-950"
          >
            Switch Invoice:
          </label>
          <select
            id="exception-switcher"
            value={selectedException.id}
            onChange={(e) => onSelectExceptionId(e.target.value)}
            className="px-3.5 py-1.5 text-xs font-bold bg-white border border-indigo-200 rounded-full text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {exceptions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.invoiceNumber} — {e.supplierName} ({formatCurrency(e.amount)}) [{e.priority}]
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. Clean Plain-English Summary Card */}
      <section
        aria-label="Exception Summary"
        className="aurora-shell-card p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-indigo-100">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900">
                {selectedException.id}
              </span>
              <PriorityBadge priority={selectedException.priority} />
              <StatusBadge status={selectedException.status} />
              {selectedException.monthEndCloseBlocker && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Blocks Month-End Close
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-indigo-950 mt-1.5">
              Invoice {selectedException.invoiceNumber} — {selectedException.supplierName} ({formatCurrency(selectedException.amount, selectedException.currency)})
            </h2>
          </div>

          <div className="text-right text-xs text-slate-600">
            <div>
              <strong>Assigned Owner:</strong> {selectedException.assignedOwner}
            </div>
            <div className="mt-0.5">
              <strong>Age:</strong> {selectedException.ageDays} days old • <strong>SLA:</strong> {selectedException.slaStatus}
            </div>
          </div>
        </div>

        {/* 3 Plain-English Summary Cards so anyone understands the case immediately */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80">
            <div className="text-xs font-extrabold uppercase tracking-wider text-rose-700">
              1. What Happened (Root Cause)
            </div>
            <p className="text-sm font-bold text-slate-900 mt-1.5">
              {diagnosis.rootCause}
            </p>
            <p className="text-xs text-slate-600 mt-1">{diagnosis.varianceDetails}</p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80">
            <div className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
              2. Why It Is Blocked
            </div>
            <p className="text-sm font-bold text-slate-900 mt-1.5">
              {diagnosis.currentBlocker}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Policy: {diagnosis.policyReference} ({diagnosis.policySection})
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
            <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
              3. AI Recommended Fix ({diagnosis.confidenceScore}% Confidence)
            </div>
            <p className="text-sm font-bold text-slate-900 mt-1.5">
              {recommendedAction.primaryRecommendation}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Safest Next Step: {recommendedAction.safestNextStep}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Visual Step-by-Step Relationship Flow: Invoice -> Purchase Order -> Receipt -> Approval -> Resolution */}
      <section
        aria-label="Transaction Relationship Chain"
        className="aurora-shell-card p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-900">
            Step-by-Step Comparison (Invoice → Purchase Order → Receipt → Approval → Resolution)
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            3-Way Match Verification
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-stretch">
          {/* Node 1: Invoice */}
          <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-rose-900">
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                1. Invoice
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                {invoice.holdCode}
              </span>
            </div>
            <div className="my-2">
              <div className="text-sm font-mono font-extrabold text-slate-900">
                {invoice.invoiceNumber}
              </div>
              <div className="text-xs font-bold text-rose-700 mt-0.5">
                {formatCurrency(invoice.invoiceAmount)} ({invoice.lineItems[0]?.quantity || 1} units @ $
                {invoice.lineItems[0]?.unitPrice.toLocaleString()})
              </div>
            </div>
            <div className="text-[11px] text-slate-600 flex items-center justify-between">
              <span>Date: {invoice.invoiceDate}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden md:inline" />
            </div>
          </div>

          {/* Node 2: Purchase Order */}
          <div className="p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-900">
                <ShoppingCart className="w-3.5 h-3.5 text-indigo-600" />
                2. Purchase Order
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {purchaseOrder.matchingBasis} Match
              </span>
            </div>
            <div className="my-2">
              <div className="text-sm font-mono font-extrabold text-slate-900">
                {purchaseOrder.poNumber}
              </div>
              <div className="text-xs font-bold text-indigo-900 mt-0.5">
                {formatCurrency(purchaseOrder.poAmount)} ({purchaseOrder.orderedQuantity} units @ $
                {purchaseOrder.agreedUnitPrice.toLocaleString()})
              </div>
            </div>
            <div className="text-[11px] text-slate-600 flex items-center justify-between">
              <span>Allowed Limit: ±{purchaseOrder.configuredPriceTolerancePercent}%</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden md:inline" />
            </div>
          </div>

          {/* Node 3: Receipt */}
          <div className="p-3.5 rounded-2xl border border-teal-200 bg-teal-50/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-teal-900">
                <PackageCheck className="w-3.5 h-3.5 text-teal-600" />
                3. Goods Receipt
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                {receipt.inspectionStatus}
              </span>
            </div>
            <div className="my-2">
              <div className="text-sm font-mono font-extrabold text-slate-900">
                {receipt.receiptNumber}
              </div>
              <div className="text-xs font-bold text-teal-900 mt-0.5">
                Accepted: {receipt.quantityAccepted} / {receipt.quantityOrdered} units
              </div>
            </div>
            <div className="text-[11px] text-slate-600 flex items-center justify-between">
              <span>Dock: {receipt.warehouseLocation}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden md:inline" />
            </div>
          </div>

          {/* Node 4: Approval */}
          <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
                <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                4. Approval
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                Waiting {selectedException.ageDays}d
              </span>
            </div>
            <div className="my-2">
              <div className="text-xs font-bold text-slate-900 truncate">
                {selectedException.assignedOwner}
              </div>
              <div className="text-[11px] text-amber-900 font-semibold mt-0.5">
                SLA: {selectedException.slaStatus}
              </div>
            </div>
            <div className="text-[11px] text-slate-600 flex items-center justify-between">
              <span>Policy: {diagnosis.policyId}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden md:inline" />
            </div>
          </div>

          {/* Node 5: Resolution */}
          <div
            className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
              selectedException.status === 'Resolved'
                ? 'border-emerald-300 bg-emerald-50/80'
                : 'border-violet-200 bg-violet-50/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-950">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    selectedException.status === 'Resolved'
                      ? 'text-emerald-600'
                      : 'text-violet-600'
                  }`}
                />
                5. Resolution
              </span>
              <StatusBadge status={selectedException.status} />
            </div>
            <div className="my-2">
              <div className="text-xs font-bold text-slate-900 line-clamp-2">
                {recommendedAction.primaryRecommendation}
              </div>
            </div>
            <div className="text-[11px] text-slate-600">
              Requires Human Confirmation
            </div>
          </div>
        </div>
      </section>

      {/* 3. Side-by-Side Action Buttons & Plain-English AI Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RecommendedActionPanel
          exception={selectedException}
          userRole={userRole}
          autonomyLevel={autonomyLevel}
          isProcessingAction={isProcessingAction}
          onRequestActionConfirmation={onRequestActionConfirmation}
        />

        <AIAssistantPanel
          exception={selectedException}
          messages={assistantMessages}
          isAsking={isAskingAssistant}
          onAskQuestion={onAskAssistant}
          onClearMessages={onClearAssistantMessages}
        />
      </div>

      {/* 4. Clean Sub-Tabs for Deep-Dive Details (So the page isn't a cluttered wall of tables!) */}
      <div className="aurora-shell-card p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDetailTab('ai-investigation')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              detailTab === 'ai-investigation'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-indigo-950 hover:bg-indigo-50 border border-indigo-100'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>AI Investigation Steps</span>
          </button>

          <button
            type="button"
            onClick={() => setDetailTab('erp-records')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              detailTab === 'erp-records'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-indigo-950 hover:bg-indigo-50 border border-indigo-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Invoice, PO, Receipt & Supplier Details</span>
          </button>

          <button
            type="button"
            onClick={() => setDetailTab('policies-approvals')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              detailTab === 'policies-approvals'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-indigo-950 hover:bg-indigo-50 border border-indigo-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Company Policy & Approvals</span>
          </button>

          <button
            type="button"
            onClick={() => setDetailTab('history-audit')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              detailTab === 'history-audit'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-indigo-950 hover:bg-indigo-50 border border-indigo-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Similar Past Cases & Audit Log ({exceptionAuditEvents.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setDetailTab('all')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            detailTab === 'all'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-indigo-800 hover:bg-indigo-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Show All Details</span>
        </button>
      </div>

      {/* TAB 1: Prominent Agent Investigation Panel */}
      {(detailTab === 'ai-investigation' || detailTab === 'all') && (
        <AgentInvestigationPanel
          exception={selectedException}
          currentStage={currentAgentStage}
          isInvestigating={isInvestigating}
          activeStepIndex={activeStepIndex}
          stageLogs={stageLogs}
          onRunInvestigation={onRunInvestigation}
          onOpenPolicyView={onOpenPolicyView}
          onOpenHistoryView={onOpenHistoryView}
        />
      )}

      {/* TAB 2: Invoice, Purchase Order, Receipt & Supplier Records */}
      {(detailTab === 'erp-records' || detailTab === 'all') && (
        <div className="space-y-4">
          {/* Transaction Details (All 12 Required Fields) */}
          <section
            aria-label="Transaction Details"
            className="bg-white border border-slate-200 rounded-xl shadow-sm p-5"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-2.5 mb-3 border-b border-slate-200">
              Transaction Details (All 12 Oracle ERP Header Fields)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Invoice Number</span>
                <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Invoice Date</span>
                <span className="font-mono text-slate-900">{invoice.invoiceDate}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Invoice Amount</span>
                <span className="font-mono font-bold text-red-700">
                  {formatCurrency(invoice.invoiceAmount, invoice.currency)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Currency</span>
                <span className="font-mono text-slate-900">{invoice.currency}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Supplier</span>
                <span className="font-semibold text-slate-900">{invoice.supplierName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Purchase Order Number</span>
                <span className="font-mono font-bold text-sky-800">{purchaseOrder.poNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Purchase Order Amount</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatCurrency(purchaseOrder.poAmount, purchaseOrder.currency)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Receipt Number</span>
                <span className="font-mono font-semibold text-teal-800">{receipt.receiptNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Business Unit</span>
                <span className="font-medium text-slate-900">{invoice.businessUnit}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Legal Entity</span>
                <span className="font-medium text-slate-900">{invoice.legalEntity}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Cost Center</span>
                <span className="font-mono text-slate-900">{invoice.costCenter}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">GL Account</span>
                <span className="font-mono text-slate-900">{invoice.glAccount}</span>
              </div>
            </div>
          </section>

          {/* Separate Detailed ERP Sections: Invoice, Purchase Order, Receipt, Supplier */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Invoice Details Section */}
            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 text-xs">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                <h3 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-red-600" />
                  <span>Invoice Details ({invoice.invoiceNumber})</span>
                </h3>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200">
                  {invoice.holdCode}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <span className="text-slate-500">Payment Terms:</span>{' '}
                  <strong className="text-slate-900">{invoice.paymentTerms}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Due Date:</span>{' '}
                  <strong className="font-mono text-slate-900">{invoice.dueDate}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Hold Reason:</span>{' '}
                  <strong className="text-red-800">{invoice.holdReason}</strong>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border border-slate-200 text-[11px]">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-1.5">Line</th>
                      <th className="p-1.5">Description</th>
                      <th className="p-1.5 text-right">Qty</th>
                      <th className="p-1.5 text-right">Inv Unit $</th>
                      <th className="p-1.5 text-right">PO Unit $</th>
                      <th className="p-1.5 text-right">Var %</th>
                      <th className="p-1.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems.map((line) => (
                      <tr key={line.lineNumber} className="border-t border-slate-200">
                        <td className="p-1.5 font-mono">{line.lineNumber}</td>
                        <td className="p-1.5 font-medium text-slate-900">{line.description}</td>
                        <td className="p-1.5 text-right font-mono">{line.quantity}</td>
                        <td className="p-1.5 text-right font-mono font-bold text-red-700">
                          ${line.unitPrice.toLocaleString()}
                        </td>
                        <td className="p-1.5 text-right font-mono">
                          ${line.poUnitPrice.toLocaleString()}
                        </td>
                        <td className="p-1.5 text-right font-mono font-bold text-red-700">
                          +{line.variancePercent}%
                        </td>
                        <td className="p-1.5 text-right font-mono font-bold">
                          {formatCurrency(line.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Purchase Order Details Section */}
            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 text-xs">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                <h3 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-sky-700" />
                  <span>Purchase Order Details ({purchaseOrder.poNumber})</span>
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                  {purchaseOrder.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <span className="text-slate-500 block text-[11px]">PO Number / Date</span>
                  <strong className="font-mono text-slate-900">
                    {purchaseOrder.poNumber} ({purchaseOrder.poDate})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Contracted PO Total</span>
                  <strong className="font-mono text-slate-900">
                    {formatCurrency(purchaseOrder.poAmount, purchaseOrder.currency)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Assigned Buyer</span>
                  <strong className="text-slate-900">{purchaseOrder.buyerName}</strong>
                  <span className="block text-[11px] text-slate-500">{purchaseOrder.buyerEmail}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Matching Basis</span>
                  <strong className="text-slate-900">{purchaseOrder.matchingBasis} Match</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Agreed Unit Price × Qty</span>
                  <strong className="font-mono text-slate-900">
                    ${purchaseOrder.agreedUnitPrice.toLocaleString()} × {purchaseOrder.orderedQuantity} units
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Configured Price Tolerance</span>
                  <strong className="text-red-700">
                    ±{purchaseOrder.configuredPriceTolerancePercent}% or $
                    {purchaseOrder.configuredPriceToleranceAmount}
                  </strong>
                </div>
              </div>
            </section>

            {/* Receipt Details Section */}
            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 text-xs">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                <h3 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <PackageCheck className="w-4 h-4 text-teal-700" />
                  <span>Receipt Details ({receipt.receiptNumber})</span>
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                  {receipt.inspectionStatus}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <span className="text-slate-500 block text-[11px]">Receipt Number / Date</span>
                  <strong className="font-mono text-slate-900">
                    {receipt.receiptNumber} ({receipt.receiptDate})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Warehouse Location</span>
                  <strong className="text-slate-900">{receipt.warehouseLocation}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Quantity Ordered vs Received</span>
                  <strong className="font-mono text-slate-900">
                    Ordered: {receipt.quantityOrdered} | Received: {receipt.quantityReceived} | Accepted:{' '}
                    {receipt.quantityAccepted}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Packing Slip / Receiver</span>
                  <strong className="text-slate-900">
                    {receipt.packingSlipNumber} ({receipt.receivedBy})
                  </strong>
                </div>
              </div>
            </section>

            {/* Supplier Details Section */}
            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 text-xs">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                <h3 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-700" />
                  <span>Supplier Details ({supplier.supplierName})</span>
                </h3>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                  {supplier.supplierNumber}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <span className="text-slate-500 block text-[11px]">Tax Registration / W-9</span>
                  <strong
                    className={
                      supplier.w9OnFile ? 'text-emerald-800 font-semibold' : 'text-red-700 font-bold'
                    }
                  >
                    {supplier.taxStatus} ({supplier.taxRegistrationNumber})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Remit-To Bank & Payment</span>
                  <strong className="text-slate-900">
                    {supplier.paymentMethod} (Acct *{supplier.bankAccountLast4})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Primary Billing Contact</span>
                  <strong className="text-slate-900">{supplier.primaryContactName}</strong>
                  <span className="block text-[11px] text-slate-500">
                    {supplier.primaryContactEmail}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">YTD Spend & Dispute Rate</span>
                  <strong className="text-slate-900">
                    {formatCurrency(supplier.ytdSpend)} • {supplier.historicalDisputeRate}
                  </strong>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB 3: Approval History, Policy Checks & Related Transactions */}
      {(detailTab === 'policies-approvals' || detailTab === 'all') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Approval History */}
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 text-xs">
            <h3 className="font-bold uppercase tracking-wider text-slate-700 pb-2 mb-3 border-b border-slate-200 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-600" />
              <span>Approval History (Oracle Workflow Routing)</span>
            </h3>
            <div className="space-y-2.5">
              {approvalHistory.map((step) => (
                <div
                  key={step.stepNumber}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      Step {step.stepNumber}: {step.role}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        step.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : step.status === 'Pending' || step.status === 'Escalated'
                          ? 'bg-amber-100 text-amber-900'
                          : step.status === 'Rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {step.status} {step.daysPending > 0 ? `(${step.daysPending}d)` : ''}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-700">
                    <strong>Approver:</strong> {step.approverName} ({step.approverEmail}) |{' '}
                    <strong>Assigned:</strong> {step.assignedDate}
                  </div>
                  <div className="text-[11px] text-slate-600">{step.comments}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Policy Checks & Related Transactions */}
          <div className="space-y-4">
            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 text-xs">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                <h3 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span>Company Policy Rules Checked</span>
                </h3>
                <button
                  type="button"
                  onClick={() => onOpenPolicyView(diagnosis.policyId)}
                  className="text-[11px] text-indigo-700 hover:underline font-bold inline-flex items-center gap-1"
                >
                  <span>Open Policy Library</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2">
                {policyChecks.map((chk, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {chk.policyTitle} ({chk.policyId} — {chk.section})
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          chk.status === 'Failed'
                            ? 'bg-red-100 text-red-800'
                            : chk.status === 'Warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {chk.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <strong>Rule:</strong> {chk.ruleChecked}
                    </div>
                    <div className="text-[11px] text-slate-800 font-medium">{chk.finding}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-slate-700 pb-2 mb-3 border-b border-slate-200 flex items-center gap-1.5">
                <GitCommit className="w-4 h-4 text-sky-700" />
                <span>Related Transactions</span>
              </h3>
              {relatedTransactions.length === 0 ? (
                <p className="text-slate-500">
                  Primary linked records are {purchaseOrder.poNumber} and {receipt.receiptNumber}.
                </p>
              ) : (
                <div className="space-y-2">
                  {relatedTransactions.map((rel) => (
                    <div
                      key={rel.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-slate-900">
                          {rel.type}: <span className="font-mono">{rel.referenceNumber}</span>
                        </span>{' '}
                        <span className="text-slate-500">({rel.date})</span>
                        <div className="text-[11px] text-slate-600">{rel.relationshipNote}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-slate-900">
                          {formatCurrency(rel.amount)}
                        </div>
                        <div className="text-[10px] text-sky-800 font-semibold">{rel.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* TAB 4: Similar Past Cases & Audit Timeline */}
      {(detailTab === 'history-audit' || detailTab === 'all') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Historical Similar Cases */}
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 text-xs">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
              <h3 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <History className="w-4 h-4 text-teal-700" />
                <span>Similar Past Cases Resolved Before</span>
              </h3>
              <button
                type="button"
                onClick={onOpenHistoryView}
                className="text-[11px] text-teal-700 hover:underline font-semibold"
              >
                Open Full Library
              </button>
            </div>
            <div className="space-y-2.5">
              {similarCases.map((c) => (
                <div key={c.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-teal-900">
                      {c.id} ({c.invoiceNumber})
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      Resolved in {c.timeToResolve}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-800">{c.supplierName}</div>
                  <div className="text-[11px] text-slate-600">
                    <strong>Root Cause:</strong> {c.previousRootCause}
                  </div>
                  <div className="text-[11px] text-slate-800">
                    <strong>How It Was Fixed:</strong> {c.resolutionUsed}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Audit Timeline for Selected Exception */}
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 text-xs">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
              <h3 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-sky-700" />
                <span>Audit Timeline ({exceptionAuditEvents.length})</span>
              </h3>
              <button
                type="button"
                onClick={onOpenAuditLogView}
                className="text-[11px] text-indigo-700 hover:underline font-bold"
              >
                View Full Audit Log
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {exceptionAuditEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-900">{ev.eventType}</span>
                    <span className="text-[10px] font-mono text-slate-500">{ev.timestamp}</span>
                  </div>
                  <div className="text-[11px] text-slate-700">{ev.action}</div>
                  <div className="text-[11px] text-emerald-800 font-medium">{ev.result}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/70">
                    <span>Actor: {ev.actor}</span>
                    <span className="font-semibold text-amber-800">Demo Mode</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
