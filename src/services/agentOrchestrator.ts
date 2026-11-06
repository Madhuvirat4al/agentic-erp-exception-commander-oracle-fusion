import {
  ERPException,
  AgentStatus,
  PolicyDocument,
  HistoricalResolution,
  AgentDiagnosis,
  RecommendedAction,
  AuditEvent,
  ActionType,
  ExceptionType,
  ExceptionPriority,
  UserRole,
} from '../types/erp';
import { oracleAdapter } from './oracleFusionAdapter';

export interface InvestigationStageStep {
  stage: AgentStatus;
  title: string;
  activityMessage: string;
  functionCalled: string;
  durationMs: number;
}

/**
 * 1. observeTransaction
 * Reads invoice header, line items, and subledger validation status from Oracle Fusion adapter.
 */
export function observeTransaction(exception: ERPException): {
  stage: AgentStatus;
  message: string;
  observedRecords: string[];
} {
  return {
    stage: 'Observing',
    message:
      exception.invoiceNumber === 'INV-10482'
        ? 'Reading invoice and transaction data.'
        : `Reading invoice ${exception.invoiceNumber} (${exception.supplierName}) and subledger transaction data.`,
    observedRecords: [
      exception.invoiceNumber,
      exception.poNumber,
      exception.receiptNumber,
      exception.supplierId,
    ],
  };
}

/**
 * 2. detectException
 * Evaluates hold codes, price/quantity variances, duplicate hashes, tax holds, and SLA breaches.
 */
export function detectException(exception: ERPException): {
  stage: AgentStatus;
  message: string;
  detectedHoldCode: string;
} {
  const defaultMsg =
    exception.invoiceNumber === 'INV-10482'
      ? 'Found a price variance between invoice INV-10482 and purchase order PO-78421.'
      : `Detected ${exception.invoice.holdCode}: ${exception.invoice.holdReason} on ${exception.invoiceNumber}.`;

  return {
    stage: 'Detecting',
    message: defaultMsg,
    detectedHoldCode: exception.invoice.holdCode,
  };
}

/**
 * 3. classifyException
 * Assigns exception category, priority tier, and month-end close risk indicator.
 */
export function classifyException(exception: ERPException): {
  stage: AgentStatus;
  message: string;
  classification: string;
  priority: ExceptionPriority;
} {
  const classificationLabel = `${exception.priority} ${exception.exceptionType}`;
  const message =
    exception.invoiceNumber === 'INV-10482'
      ? 'Classified as Critical Invoice Price Mismatch.'
      : `Classified as ${classificationLabel} (${exception.slaStatus}).`;

  return {
    stage: 'Classifying',
    message,
    classification: classificationLabel,
    priority: exception.priority,
  };
}

/**
 * 4. investigateException
 * Cross-examines Purchase Order, Receipt, Supplier Master, and Approval Workflow history.
 */
export function investigateException(exception: ERPException): {
  stage: AgentStatus;
  message: string;
  checkedEntities: string[];
} {
  const message =
    exception.invoiceNumber === 'INV-10482'
      ? 'Checking purchase order, receipt, supplier, approval history, policy documents, and similar resolved cases.'
      : `Cross-checking ${exception.poNumber}, Receipt ${exception.receiptNumber}, Supplier ${exception.supplier.supplierNumber}, and workflow logs.`;

  return {
    stage: 'Investigating',
    message,
    checkedEntities: [
      `Invoice ${exception.invoiceNumber}`,
      `PO ${exception.poNumber}`,
      `Receipt ${exception.receiptNumber}`,
      `Supplier ${exception.supplierName}`,
      `Policy ${exception.diagnosis.policyId}`,
    ],
  };
}

/**
 * 5. checkPolicies
 * Evaluates transaction attributes against active enterprise financial and procurement policies.
 */
export function checkPolicies(
  exception: ERPException,
  policies: PolicyDocument[]
): {
  matchedPolicy: PolicyDocument | undefined;
  policySummary: string;
} {
  const matchedPolicy = policies.find((p) => p.id === exception.diagnosis.policyId) || policies[0];
  return {
    matchedPolicy,
    policySummary: `${matchedPolicy.title} (${matchedPolicy.id}, ${matchedPolicy.referenceSection})`,
  };
}

/**
 * 6. compareHistoricalResolutions
 * Finds previously resolved exceptions with matching root causes and suppliers.
 */
export function compareHistoricalResolutions(
  exception: ERPException,
  history: HistoricalResolution[]
): HistoricalResolution[] {
  const byIds = history.filter((h) => exception.diagnosis.similarHistoricalCaseIds.includes(h.id));
  if (byIds.length > 0) return byIds;
  return history.filter((h) => h.exceptionType === exception.exceptionType);
}

/**
 * 7. generateDiagnosis
 * Synthesizes root cause, confidence score, business impact, and policy violation reasoning.
 */
export function generateDiagnosis(exception: ERPException): {
  stage: AgentStatus;
  message: string;
  diagnosis: AgentDiagnosis;
} {
  const message =
    exception.invoiceNumber === 'INV-10482'
      ? 'The price variance is above the allowed tolerance and buyer approval has been pending for five days.'
      : exception.diagnosis.rootCause;

  return {
    stage: 'Reasoning',
    message,
    diagnosis: exception.diagnosis,
  };
}

/**
 * 8. recommendAction
 * Produces deterministic, policy-compliant next best action with confidence and impact metrics.
 */
export function recommendAction(exception: ERPException): {
  stage: AgentStatus;
  message: string;
  recommendation: RecommendedAction;
} {
  const message =
    exception.invoiceNumber === 'INV-10482'
      ? 'Request buyer approval or supplier credit note before releasing payment.'
      : exception.recommendedAction.primaryRecommendation;

  return {
    stage: 'Recommending',
    message,
    recommendation: exception.recommendedAction,
  };
}

/**
 * 9. requestHumanApproval
 * Places agent in Waiting for Approval gate before any state-changing operation can execute.
 */
export function requestHumanApproval(exception: ERPException): {
  stage: AgentStatus;
  message: string;
} {
  return {
    stage: 'Waiting for Approval',
    message:
      'Human approval is required before any action is executed.',
  };
}

/**
 * 10. executeApprovedAction
 * Executes a human-confirmed action in Demo Mode via MockOracleFusionAdapter.
 */
export async function executeApprovedAction(params: {
  exception: ERPException;
  actionType: ActionType;
  userRole: UserRole;
}): Promise<{
  updatedException: ERPException;
  auditEvent: AuditEvent;
  notificationMessage: string;
}> {
  const { exception, actionType, userRole } = params;
  const actionDef =
    exception.recommendedAction.availableActions.find((a) => a.type === actionType) ||
    exception.recommendedAction.availableActions[0];

  const resultingStatus = actionDef ? actionDef.resultingStatus : 'Waiting for Approval';

  await oracleAdapter.updateInvoiceStatus({
    exceptionId: exception.id,
    invoiceNumber: exception.invoiceNumber,
    newStatus: resultingStatus,
    holdReleaseReason: actionDef?.reason || 'Human confirmed action in Demo Mode',
  });

  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

  let updatedApprovalHistory = [...exception.approvalHistory];
  let updatedLastAgentAction = exception.diagnosis.lastAgentAction;
  let updatedRecommendedSummary = exception.recommendedActionSummary;
  let auditEventType: AuditEvent['eventType'] = 'User action confirmed';
  let actionDescription = '';
  let resultDescription = '';
  let notificationMessage = '';

  if (actionType === 'DRAFT_BUYER_MESSAGE') {
    auditEventType = 'Message drafted';
    updatedLastAgentAction = `Prepared & logged buyer communication for ${exception.invoiceNumber} (Demo Mode).`;
    actionDescription = `Drafted and queued buyer notification "${exception.diagnosis.generatedBuyerMessage.subject}" to ${exception.diagnosis.generatedBuyerMessage.to}.`;
    resultDescription = `Buyer message recorded in Demo Mode communication log for ${exception.invoiceNumber}. Ready for approval escalation.`;
    notificationMessage = `Demo Mode: Buyer message drafted for ${exception.invoiceNumber} and logged to audit trail (no external email sent).`;
  } else if (actionType === 'ESCALATE_APPROVAL') {
    auditEventType = 'Approval requested';
    updatedLastAgentAction = `Escalated approval workflow for ${exception.invoiceNumber} to Procurement Manager (Demo Mode).`;
    updatedRecommendedSummary = 'Approval escalated to Manager; awaiting final resolution or credit note.';
    updatedApprovalHistory = exception.approvalHistory.map((step, idx) =>
      idx === 1
        ? {
            ...step,
            status: 'Escalated',
            comments: `${step.comments} [Escalated by ${userRole} in Demo Mode at ${nowStr}]`,
          }
        : idx === 2
        ? {
            ...step,
            status: 'Pending',
            assignedDate: nowStr,
            comments: 'Escalated approval request active in queue (Demo Mode).',
          }
        : step
    );
    actionDescription = `Escalated pending approval on ${exception.invoiceNumber} (${exception.poNumber}) due to ${exception.ageDays}-day SLA breach.`;
    resultDescription = `Exception status changed to Waiting for Approval (Demo Mode simulation only — no live Oracle record altered).`;
    notificationMessage = `Demo Mode: Approval escalated for ${exception.invoiceNumber}. Status updated to Waiting for Approval.`;
  } else if (actionType === 'REQUEST_CREDIT_NOTE') {
    auditEventType = 'Approval requested';
    updatedLastAgentAction = `Logged supplier credit note request ($${exception.varianceAmount.toLocaleString()}) for ${exception.invoiceNumber} in Demo Mode.`;
    updatedRecommendedSummary = `Credit note ($${exception.varianceAmount.toLocaleString()}) requested from ${exception.supplierName}; awaiting credit memo match.`;
    actionDescription = `Requested $${exception.varianceAmount.toLocaleString()} credit note from ${exception.supplierName} for ${exception.invoiceNumber}.`;
    resultDescription = `Status updated to Waiting for Approval in Demo Mode.`;
    notificationMessage = `Demo Mode: Credit note request ($${exception.varianceAmount.toLocaleString()}) logged for ${exception.supplierName}.`;
  } else if (actionType === 'APPROVE_EXCEPTION') {
    auditEventType = 'User action confirmed';
    updatedLastAgentAction = `Exception variance approved by ${userRole} in Demo Mode; queued for final validation.`;
    updatedRecommendedSummary = `Variance approved by ${userRole}; ready to mark as Resolved.`;
    updatedApprovalHistory = exception.approvalHistory.map((step) =>
      step.status === 'Pending' || step.status === 'Escalated'
        ? {
            ...step,
            status: 'Approved',
            completedDate: nowStr,
            comments: `Approved by ${userRole} in Demo Mode.`,
          }
        : step
    );
    actionDescription = `${userRole} approved exception variance on ${exception.invoiceNumber} (${exception.poNumber}).`;
    resultDescription = `Approval recorded in Demo Mode; status updated to ${resultingStatus}.`;
    notificationMessage = `Demo Mode: Exception ${exception.id} approved by ${userRole}.`;
  } else if (actionType === 'REJECT_INVOICE') {
    auditEventType = 'Exception rejected';
    updatedLastAgentAction = `Invoice ${exception.invoiceNumber} marked Rejected in Demo Mode.`;
    updatedRecommendedSummary = `Invoice ${exception.invoiceNumber} rejected; supplier must issue corrected billing.`;
    actionDescription = `${userRole} confirmed rejection of invoice ${exception.invoiceNumber} (${exception.supplierName}).`;
    resultDescription = `Status changed to Rejected in Demo Mode (simulated locally).`;
    notificationMessage = `Demo Mode: Invoice ${exception.invoiceNumber} marked as Rejected.`;
  } else if (actionType === 'MARK_RESOLVED') {
    auditEventType = 'Exception resolved';
    updatedLastAgentAction = `Exception ${exception.id} resolved and audit trail finalized in Demo Mode.`;
    updatedRecommendedSummary = `Resolved in Demo Mode — hold cleared and audit trail completed.`;
    updatedApprovalHistory = exception.approvalHistory.map((step) => ({
      ...step,
      status: 'Approved',
      completedDate: step.completedDate || nowStr,
    }));
    actionDescription = `${userRole} marked exception ${exception.id} (${exception.invoiceNumber}) as Resolved.`;
    resultDescription = `Status updated to Resolved; month-end close risk cleared in Demo Mode (no live Oracle production change).`;
    notificationMessage = `Demo Mode: Exception ${exception.id} (${exception.invoiceNumber}) marked as Resolved!`;
  }

  const auditEvent = await writeAuditEvent({
    actor: `Human Operator (${userRole}) + Commander Agent`,
    actorType: 'User',
    userRole,
    eventType: auditEventType,
    exceptionId: exception.id,
    invoiceNumber: exception.invoiceNumber,
    action: actionDescription,
    result: resultDescription,
    approvalStatus: actionType === 'REJECT_INVOICE' ? 'Rejected' : 'Approved',
    demoMode: true,
  });

  const updatedException: ERPException = {
    ...exception,
    status: resultingStatus,
    slaStatus: resultingStatus === 'Resolved' ? 'Completed' : exception.slaStatus,
    monthEndCloseBlocker:
      resultingStatus === 'Resolved' || resultingStatus === 'Rejected'
        ? false
        : exception.monthEndCloseBlocker,
    agentStatus: 'Completed',
    recommendedActionSummary: updatedRecommendedSummary,
    approvalHistory: updatedApprovalHistory,
    invoice: {
      ...exception.invoice,
      holdCode:
        resultingStatus === 'Resolved'
          ? 'NONE (RELEASED IN DEMO MODE)'
          : resultingStatus === 'Rejected'
          ? 'REJECTED_IN_DEMO_MODE'
          : exception.invoice.holdCode,
    },
    diagnosis: {
      ...exception.diagnosis,
      currentBlocker:
        resultingStatus === 'Resolved'
          ? 'None — Resolved in Demo Mode'
          : resultingStatus === 'Waiting for Approval'
          ? 'Escalated — Awaiting final confirmation to mark Resolved'
          : exception.diagnosis.currentBlocker,
      lastAgentAction: updatedLastAgentAction,
    },
  };

  return {
    updatedException,
    auditEvent,
    notificationMessage,
  };
}

/**
 * 11. writeAuditEvent
 * Appends a structured, immutable audit event with Demo Mode indicator.
 */
export async function writeAuditEvent(
  event: Omit<AuditEvent, 'id' | 'timestamp'>
): Promise<AuditEvent> {
  return oracleAdapter.addAuditNote(event);
}

/**
 * 12. storeResolution
 * Creates a new HistoricalResolution entry when an exception is marked as Resolved.
 */
export function storeResolution(
  exception: ERPException,
  userRole: UserRole
): HistoricalResolution {
  return {
    id: `HIST-${Math.floor(500 + Math.random() * 499)}`,
    exceptionId: exception.id,
    exceptionType: exception.exceptionType,
    supplierName: exception.supplierName,
    invoiceNumber: exception.invoiceNumber,
    previousRootCause: exception.diagnosis.rootCause,
    resolutionUsed: exception.diagnosis.lastAgentAction,
    timeToResolve: '0.4 hours (Agent-Assisted Demo)',
    businessUnit: exception.businessUnit,
    amount: exception.amount,
    outcome: `Resolved by ${userRole} in Demo Mode with full policy verification.`,
    resolvedBy: `Active Operator (${userRole})`,
    resolvedDate: new Date().toISOString().slice(0, 10),
    policyApplied: exception.diagnosis.policyReference,
  };
}

/**
 * Build the animated sequence of steps for "Run Agent Investigation"
 */
export function buildInvestigationSequence(
  exception: ERPException,
  policies: PolicyDocument[],
  history: HistoricalResolution[]
): InvestigationStageStep[] {
  const obs = observeTransaction(exception);
  const det = detectException(exception);
  const cls = classifyException(exception);
  const inv = investigateException(exception);
  checkPolicies(exception, policies);
  compareHistoricalResolutions(exception, history);
  const diag = generateDiagnosis(exception);
  const rec = recommendAction(exception);
  const req = requestHumanApproval(exception);

  return [
    {
      stage: 'Observing',
      title: 'Observing',
      activityMessage: obs.message,
      functionCalled: 'observeTransaction()',
      durationMs: 380,
    },
    {
      stage: 'Detecting',
      title: 'Detecting',
      activityMessage: det.message,
      functionCalled: 'detectException()',
      durationMs: 420,
    },
    {
      stage: 'Classifying',
      title: 'Classifying',
      activityMessage: cls.message,
      functionCalled: 'classifyException()',
      durationMs: 380,
    },
    {
      stage: 'Investigating',
      title: 'Investigating',
      activityMessage: inv.message,
      functionCalled: 'investigateException() + checkPolicies() + compareHistoricalResolutions()',
      durationMs: 520,
    },
    {
      stage: 'Reasoning',
      title: 'Reasoning',
      activityMessage: diag.message,
      functionCalled: 'generateDiagnosis()',
      durationMs: 460,
    },
    {
      stage: 'Recommending',
      title: 'Recommending',
      activityMessage: rec.message,
      functionCalled: 'recommendAction()',
      durationMs: 420,
    },
    {
      stage: 'Waiting for Approval',
      title: 'Waiting for Approval',
      activityMessage: req.message,
      functionCalled: 'requestHumanApproval()',
      durationMs: 380,
    },
    {
      stage: 'Completed',
      title: 'Completed',
      activityMessage: 'Investigation completed and recommendation is ready.',
      functionCalled: 'writeAuditEvent()',
      durationMs: 200,
    },
  ];
}

/**
 * Create a realistic simulated exception for any of the 7 required scenario types
 */
export function createSimulatedException(
  scenarioType: ExceptionType,
  sequenceNum: number
): ERPException {
  const idNum = 9050 + sequenceNum;
  const invNum = 10800 + sequenceNum * 17;
  const poNum = 78900 + sequenceNum * 13;
  const rcvNum = 56200 + sequenceNum * 11;

  const templates: Record<
    string,
    {
      supplierName: string;
      businessUnit: string;
      priority: ExceptionPriority;
      amount: number;
      poAmount: number;
      varianceAmount: number;
      variancePercent: number;
      owner: string;
      ownerRole: string;
      holdCode: string;
      holdReason: string;
      rootCause: string;
      policyId: string;
      policyRef: string;
      policySection: string;
      recommendation: string;
      impact: string;
      closeBlocker: boolean;
    }
  > = {
    'Invoice Price Mismatch': {
      supplierName: 'Crown Precision Hydraulics',
      businessUnit: 'US Manufacturing Operations',
      priority: 'Critical',
      amount: 64800,
      poAmount: 60000,
      varianceAmount: 4800,
      variancePercent: 8.0,
      owner: 'Marcus Vance (Senior Buyer)',
      ownerRole: 'Procurement Buyer',
      holdCode: 'PRICE_VARIANCE_HOLD',
      holdReason: 'Invoice unit price is 8.0% ($4,800) higher than PO unit price (2.0% tolerance)',
      rootCause: 'Invoice price is 8 percent higher than the purchase order price due to unapproved alloy surcharge.',
      policyId: 'POL-AP-101',
      policyRef: 'Invoice Price Tolerance Policy (POL-AP-101, Section 4.2)',
      policySection: 'Section 4.2 — 3-Way Match Price Variance Thresholds',
      recommendation: 'Ask the buyer to approve the variance or request a $4,800 supplier credit note.',
      impact: 'Payment delay, supplier hold risk, and $64,800 month-end close exposure.',
      closeBlocker: true,
    },
    'Invoice Quantity Mismatch': {
      supplierName: 'Vanguard Flow Controls',
      businessUnit: 'US Manufacturing Operations',
      priority: 'High',
      amount: 36000,
      poAmount: 30000,
      varianceAmount: 6000,
      variancePercent: 20.0,
      owner: 'Marcus Vance (Senior Buyer)',
      ownerRole: 'Procurement Buyer',
      holdCode: 'QTY_REC_HOLD',
      holdReason: 'Billed 120 units vs 100 units accepted on dock receipt',
      rootCause: 'Supplier billed 120 units ($36,000) while Warehouse Receipt confirms only 100 units ($30,000) were delivered.',
      policyId: 'POL-AP-101',
      policyRef: 'Invoice Price Tolerance Policy (POL-AP-101, Section 4.2)',
      policySection: 'Section 4.2 — 3-Way Match Quantity Verification',
      recommendation: 'Request a $6,000 supplier credit note for the 20 unreceived units or verify partial shipment.',
      impact: 'Prevents $6,000 overpayment for undelivered inventory.',
      closeBlocker: false,
    },
    'Duplicate Invoice': {
      supplierName: 'Keller Global Freight & Logistics',
      businessUnit: 'North America Distribution',
      priority: 'High',
      amount: 28400,
      poAmount: 28400,
      varianceAmount: 28400,
      variancePercent: 100.0,
      owner: 'Elena Rostova (AP Senior Analyst)',
      ownerRole: 'Analyst',
      holdCode: 'DUPLICATE_INVOICE_HOLD',
      holdReason: 'Composite match (99.1%) with already validated EDI invoice',
      rootCause: 'Supplier submitted duplicate PDF copy of an invoice already ingested and validated via EDI.',
      policyId: 'POL-AP-102',
      policyRef: 'Duplicate Invoice Prevention Policy (POL-AP-102, Section 2.1)',
      policySection: 'Section 2.1 — Automated Composite Key Detection',
      recommendation: 'Reject duplicate invoice immediately and record original validated invoice reference.',
      impact: 'Prevents $28,400 double disbursement.',
      closeBlocker: false,
    },
    'Missing Supplier Tax Information': {
      supplierName: 'Aether Semiconductor Materials',
      businessUnit: 'EMEA & Global R&D',
      priority: 'High',
      amount: 24500,
      poAmount: 24500,
      varianceAmount: 0,
      variancePercent: 0,
      owner: 'Priya Nair (AP Compliance Specialist)',
      ownerRole: 'Analyst',
      holdCode: 'TAX_REGISTRATION_HOLD',
      holdReason: 'Missing verified Form W-9 / TIN in Oracle Supplier Master',
      rootCause: 'Supplier TIN validation expired in Oracle Supplier Model; W-9 certificate required prior to disbursement.',
      policyId: 'POL-TAX-204',
      policyRef: 'Supplier Tax Information Policy (POL-TAX-204, Section 3.4)',
      policySection: 'Section 3.4 — Withholding Tax Compliance',
      recommendation: 'Maintain tax hold and send automated W-9 portal compliance request to supplier.',
      impact: 'Avoids 24% statutory IRS backup withholding penalty ($5,880).',
      closeBlocker: false,
    },
    'Approval Delay': {
      supplierName: 'Stratos Cloud Infrastructure Ltd',
      businessUnit: 'Corporate IT & Shared Services',
      priority: 'High',
      amount: 39200,
      poAmount: 39200,
      varianceAmount: 0,
      variancePercent: 0,
      owner: 'Hannah Abbott (VP Infrastructure)',
      ownerRole: 'Manager',
      holdCode: 'WORKFLOW_APPROVAL_HOLD',
      holdReason: 'Department manager approval pending > 5 business days (SLA Breached)',
      rootCause: 'Primary cost center approver has not responded for 6 days, breaching the 3-day workflow SLA.',
      policyId: 'POL-PROC-305',
      policyRef: 'Approval Escalation Policy (POL-PROC-305, Section 5.1)',
      policySection: 'Section 5.1 — 5-Day Buyer Hold SLA Breach & Escalation Matrix',
      recommendation: 'Escalate approval workflow to Delegate Cost Center Manager under Section 5.1.',
      impact: 'Preserves 2% early payment discount ($784) and prevents close backlog.',
      closeBlocker: true,
    },
    'Incorrect GL Coding': {
      supplierName: 'Titan Robotics & Automation',
      businessUnit: 'US Manufacturing Operations',
      priority: 'Medium',
      amount: 52000,
      poAmount: 52000,
      varianceAmount: 0,
      variancePercent: 0,
      owner: 'David Kim (Assistant Controller)',
      ownerRole: 'Controller',
      holdCode: 'DIST_ACCT_INVALID_HOLD',
      holdReason: 'Capital equipment > $5,000 coded to OpEx Maintenance (GL 64200)',
      rootCause: 'CapEx robotic unit ($52,000) coded to OpEx Maintenance (GL 64200) instead of Fixed Asset Clearing (GL 16100).',
      policyId: 'POL-GL-502',
      policyRef: 'GL Coding Policy (POL-GL-502, Section 2.8)',
      policySection: 'Section 2.8 — Chart of Accounts Cross-Validation & CapEx Classification',
      recommendation: 'Reclassify GL distribution string to Fixed Asset Clearing (16100-4100-000) and approve.',
      impact: 'Prevents $52,000 OpEx misstatement and unblocks Create Accounting.',
      closeBlocker: true,
    },
    'Month End Close Blocker': {
      supplierName: 'Continental Energy & Industrial Gas',
      businessUnit: 'US Manufacturing Operations',
      priority: 'Critical',
      amount: 91500,
      poAmount: 88000,
      varianceAmount: 3500,
      variancePercent: 3.98,
      owner: 'David Kim (Assistant Controller)',
      ownerRole: 'Controller',
      holdCode: 'PERIOD_CLOSE_UNACCOUNTED_HOLD',
      holdReason: 'Unaccounted $91,500 invoice with completed receipt blocks AP Period Close Sweep',
      rootCause: 'High-value invoice ($91,500) with completed October receipt has unallocated $3,500 freight surcharge during Close Window.',
      policyId: 'POL-FIN-401',
      policyRef: 'Month End Close Policy (POL-FIN-401, Section 6.3)',
      policySection: 'Section 6.3 — Subledger Unaccounted Transaction Sweep',
      recommendation: 'Execute Controller priority allocation or book close accrual to unblock October AP Period Close.',
      impact: 'Directly unblocks October Payables subledger close.',
      closeBlocker: true,
    },
  };

  const t = templates[scenarioType] || templates['Invoice Price Mismatch'];

  return {
    id: `EXC-${idNum}`,
    exceptionType: scenarioType,
    supplierId: `SUP-${10900 + sequenceNum}`,
    supplierName: t.supplierName,
    invoiceNumber: `INV-${invNum}`,
    poNumber: `PO-${poNum}`,
    receiptNumber: `RCV-${rcvNum}`,
    businessUnit: t.businessUnit,
    legalEntity: 'Apex Global Manufacturing US Inc.',
    costCenter: 'CC-4100 (Plant Operations)',
    glAccount: '51200-4100-000 (Production & Operations)',
    amount: t.amount,
    varianceAmount: t.varianceAmount,
    variancePercent: t.variancePercent,
    currency: 'USD',
    createdDate: '2026-10-22',
    dueDate: '2026-10-24',
    ageDays: 5,
    priority: t.priority,
    status: 'New',
    slaStatus: t.priority === 'Critical' ? 'Breached' : 'At Risk (< 4h)',
    assignedOwner: t.owner,
    assignedOwnerRole: t.ownerRole,
    recommendedActionSummary: t.recommendation,
    monthEndCloseBlocker: t.closeBlocker,
    agentStatus: 'Completed',
    invoice: {
      invoiceNumber: `INV-${invNum}`,
      invoiceDate: '2026-10-22',
      dueDate: '2026-11-21',
      invoiceAmount: t.amount,
      currency: 'USD',
      supplierId: `SUP-${10900 + sequenceNum}`,
      supplierName: t.supplierName,
      poNumber: `PO-${poNum}`,
      receiptNumber: `RCV-${rcvNum}`,
      businessUnit: t.businessUnit,
      legalEntity: 'Apex Global Manufacturing US Inc.',
      costCenter: 'CC-4100 (Plant Operations)',
      glAccount: '51200-4100-000',
      paymentTerms: 'Net 30',
      holdCode: t.holdCode,
      holdReason: t.holdReason,
      taxAmount: 0,
      lineItems: [
        {
          lineNumber: 1,
          description: `${scenarioType} Simulated Transaction Line #1`,
          quantity: 100,
          unitPrice: t.amount / 100,
          poUnitPrice: t.poAmount / 100,
          lineTotal: t.amount,
          variancePercent: t.variancePercent,
          glAccount: '51200-4100-000',
        },
      ],
    },
    purchaseOrder: {
      poNumber: `PO-${poNum}`,
      poDate: '2026-10-05',
      poAmount: t.poAmount,
      currency: 'USD',
      buyerName: 'Marcus Vance',
      buyerEmail: 'marcus.vance@enterprise-erp.example',
      supplierId: `SUP-${10900 + sequenceNum}`,
      supplierName: t.supplierName,
      status: 'Closed for Receiving',
      matchingBasis: '3-Way',
      configuredPriceTolerancePercent: 2.0,
      configuredPriceToleranceAmount: 500,
      agreedUnitPrice: t.poAmount / 100,
      orderedQuantity: 100,
    },
    receipt: {
      receiptNumber: `RCV-${rcvNum}`,
      receiptDate: '2026-10-18',
      poNumber: `PO-${poNum}`,
      receivedBy: 'J. Delgado (Dock Supervisor)',
      warehouseLocation: 'WH-OHIO-02',
      quantityOrdered: 100,
      quantityReceived: 100,
      quantityAccepted: 100,
      inspectionStatus: 'Accepted',
      packingSlipNumber: `PS-${invNum}`,
    },
    supplier: {
      supplierId: `SUP-${10900 + sequenceNum}`,
      supplierName: t.supplierName,
      supplierNumber: `VND-009${sequenceNum}`,
      taxRegistrationNumber:
        scenarioType === 'Missing Supplier Tax Information'
          ? 'MISSING_W9_TIN'
          : 'XX-XXX8492 (Verified EIN)',
      taxStatus:
        scenarioType === 'Missing Supplier Tax Information'
          ? 'Missing W-9 / Tax ID'
          : 'Verified',
      w9OnFile: scenarioType !== 'Missing Supplier Tax Information',
      bankAccountVerified: true,
      bankAccountLast4: '4491',
      paymentMethod: 'Electronic (ACH)',
      riskScore: t.priority === 'Critical' ? 'Medium' : 'Low',
      primaryContactName: 'Supplier Billing Desk',
      primaryContactEmail: 'billing@supplier-portal.example',
      ytdSpend: 485000,
      historicalDisputeRate: '2.2%',
    },
    approvalHistory: [
      {
        stepNumber: 1,
        role: 'Oracle Fusion Automated Hold Engine',
        approverName: 'System Validation',
        approverEmail: 'fusion-engine@enterprise-erp.example',
        status: 'Rejected',
        assignedDate: '2026-10-22 09:00',
        completedDate: '2026-10-22 09:00',
        daysPending: 5,
        comments: `Triggered ${t.holdCode}: ${t.holdReason}`,
      },
      {
        stepNumber: 2,
        role: t.ownerRole,
        approverName: t.owner,
        approverEmail: 'owner@enterprise-erp.example',
        status: 'Pending',
        assignedDate: '2026-10-22 09:01',
        daysPending: 5,
        comments: 'Pending human review and approval.',
      },
    ],
    relatedTransactions: [
      {
        id: `REL-SIM-${sequenceNum}`,
        type: 'Purchase Order',
        referenceNumber: `PO-${poNum}`,
        date: '2026-10-05',
        amount: t.poAmount,
        status: 'Open / Matched',
        relationshipNote: 'Associated baseline Purchase Order.',
      },
    ],
    policyChecks: [
      {
        policyId: t.policyId,
        policyTitle: t.policyRef.split(' (')[0],
        section: t.policySection,
        ruleChecked: t.holdCode,
        status: 'Failed',
        finding: t.holdReason,
      },
    ],
    diagnosis: {
      rootCause: t.rootCause,
      confidenceScore: 93,
      businessImpact: t.impact,
      recommendedOwner: t.owner,
      recommendedOwnerRole: t.ownerRole,
      policyReference: t.policyRef,
      policyId: t.policyId,
      policySection: t.policySection,
      policyViolated: true,
      varianceDetails: `Invoice: $${t.amount.toLocaleString()} | PO: $${t.poAmount.toLocaleString()} | Variance: $${t.varianceAmount.toLocaleString()} (${t.variancePercent}%)`,
      currentBlocker: 'Pending human review and approval in Demo Mode.',
      similarHistoricalCaseIds: ['HIST-401', 'HIST-402'],
      similarResolutionSummary:
        'Matched against historical resolution library; policy-guided escalation resolves similar holds in < 4 hours.',
      lastAgentAction: `Simulated exception ${idNum} ingested and diagnosed by Commander Agent.`,
      generatedBuyerMessage: {
        to: 'marcus.vance@enterprise-erp.example',
        cc: 'ap.exceptions@enterprise-erp.example',
        subject: `Approval Required for Invoice INV-${invNum} (${scenarioType})`,
        body: `Invoice INV-${invNum} from ${t.supplierName} ($${t.amount.toLocaleString()}) is currently on hold (${t.holdCode}) because: ${t.rootCause} Policy Reference: ${t.policyRef}. Recommended Action: ${t.recommendation}`,
      },
    },
    recommendedAction: {
      id: `REC-${idNum}`,
      primaryRecommendation: t.recommendation,
      confidence: 93,
      estimatedImpact: t.impact,
      safestNextStep: t.recommendation,
      targetOwner: t.owner,
      targetStatusAfterApproval: 'Waiting for Approval',
      availableActions: [
        {
          type: 'DRAFT_BUYER_MESSAGE',
          label: 'Draft Message to Buyer',
          reason: `Send structured diagnosis for INV-${invNum} to ${t.owner}.`,
          recordsAffected: [`INV-${invNum} (Communication Log)`],
          expectedBusinessImpact: 'Accelerates stakeholder review.',
          complianceWarning: 'Demo Mode: Logged locally only.',
          resultingStatus: 'Action Required',
        },
        {
          type: 'ESCALATE_APPROVAL',
          label: 'Escalate Approval',
          reason: `Escalate ${scenarioType} on INV-${invNum} under ${t.policyRef}.`,
          recordsAffected: [`INV-${invNum} (Workflow Queue)`],
          expectedBusinessImpact: 'Prioritizes exception before month-end cutoff.',
          complianceWarning: 'Demo Mode: Updates local workflow state only.',
          resultingStatus: 'Waiting for Approval',
        },
        {
          type: 'REQUEST_CREDIT_NOTE',
          label: 'Request Credit Note',
          reason: `Request credit adjustment from ${t.supplierName}.`,
          recordsAffected: [`INV-${invNum} (Supplier Portal Queue)`],
          expectedBusinessImpact: 'Aligns invoice amount with contracted terms.',
          complianceWarning: 'Demo Mode simulation only.',
          resultingStatus: 'Waiting for Approval',
        },
        {
          type: 'APPROVE_EXCEPTION',
          label: 'Approve Exception',
          reason: `Approve exception resolution for INV-${invNum}.`,
          recordsAffected: [`INV-${invNum} (Hold Status)`],
          expectedBusinessImpact: 'Clears hold for validation.',
          complianceWarning: 'Demo Mode simulation only.',
          resultingStatus: 'Waiting for Approval',
        },
        {
          type: 'REJECT_INVOICE',
          label: 'Reject Invoice',
          reason: `Reject non-compliant invoice INV-${invNum}.`,
          recordsAffected: [`INV-${invNum} (Status: Rejected)`],
          expectedBusinessImpact: 'Prevents unauthorized disbursement.',
          complianceWarning: 'Demo Mode simulation only.',
          resultingStatus: 'Rejected',
        },
        {
          type: 'MARK_RESOLVED',
          label: 'Mark as Resolved',
          reason: `Complete resolution workflow for INV-${invNum}.`,
          recordsAffected: [`EXC-${idNum} (Status: Resolved)`],
          expectedBusinessImpact: 'Clears exception from open queue.',
          complianceWarning: 'Demo Mode confirmation required.',
          resultingStatus: 'Resolved',
        },
      ],
    },
  };
}
