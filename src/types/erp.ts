export type UserRole = 'Analyst' | 'Manager' | 'Controller';

export type ExceptionStatus =
  | 'New'
  | 'Investigating'
  | 'Waiting for Approval'
  | 'Action Required'
  | 'Resolved'
  | 'Rejected';

export type ExceptionPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export type ExceptionType =
  | 'Invoice Price Mismatch'
  | 'Invoice Quantity Mismatch'
  | 'Duplicate Invoice'
  | 'Missing Supplier Tax Information'
  | 'Approval Delay'
  | 'Incorrect GL Coding'
  | 'Month End Close Blocker'
  | 'Supplier Bank Account Mismatch'
  | 'Invoice Metadata Issue';

export type AgentStatus =
  | 'Idle'
  | 'Observing'
  | 'Detecting'
  | 'Classifying'
  | 'Investigating'
  | 'Reasoning'
  | 'Recommending'
  | 'Waiting for Approval'
  | 'Executing'
  | 'Completed';

export type AutonomyLevel =
  | 'Recommend only'
  | 'Recommend and draft'
  | 'Recommend and execute after approval';

export interface InvoiceLineItem {
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  poUnitPrice: number;
  lineTotal: number;
  variancePercent: number;
  glAccount: string;
}

export interface Invoice {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  invoiceAmount: number;
  currency: string;
  supplierId: string;
  supplierName: string;
  poNumber: string;
  receiptNumber: string;
  businessUnit: string;
  legalEntity: string;
  costCenter: string;
  glAccount: string;
  paymentTerms: string;
  holdCode: string;
  holdReason: string;
  taxAmount: number;
  lineItems: InvoiceLineItem[];
}

export interface PurchaseOrder {
  poNumber: string;
  poDate: string;
  poAmount: number;
  currency: string;
  buyerName: string;
  buyerEmail: string;
  supplierId: string;
  supplierName: string;
  status: 'Open' | 'Partially Received' | 'Closed for Receiving' | 'Pending Change Order';
  matchingBasis: '2-Way' | '3-Way' | '4-Way';
  configuredPriceTolerancePercent: number;
  configuredPriceToleranceAmount: number;
  agreedUnitPrice: number;
  orderedQuantity: number;
}

export interface Receipt {
  receiptNumber: string;
  receiptDate: string;
  poNumber: string;
  receivedBy: string;
  warehouseLocation: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityAccepted: number;
  inspectionStatus: 'Accepted' | 'Pending Inspection' | 'Partial Discrepancy' | 'Not Required';
  packingSlipNumber: string;
}

export interface Supplier {
  supplierId: string;
  supplierName: string;
  supplierNumber: string;
  taxRegistrationNumber: string;
  taxStatus: 'Verified' | 'Missing W-9 / Tax ID' | 'Expired Certificate' | 'Under Review';
  w9OnFile: boolean;
  bankAccountVerified: boolean;
  bankAccountLast4: string;
  paymentMethod: 'Electronic (ACH)' | 'Wire Transfer' | 'Check';
  riskScore: 'Low' | 'Medium' | 'High';
  primaryContactName: string;
  primaryContactEmail: string;
  ytdSpend: number;
  historicalDisputeRate: string;
}

export interface ApprovalStep {
  stepNumber: number;
  role: string;
  approverName: string;
  approverEmail: string;
  status: 'Approved' | 'Pending' | 'Escalated' | 'Rejected' | 'Not Started';
  assignedDate: string;
  completedDate?: string;
  daysPending: number;
  comments: string;
}

export interface PolicyDocument {
  id: string;
  title: string;
  code: string;
  owner: string;
  effectiveDate: string;
  shortDescription: string;
  rules: string[];
  example: string;
  referenceSection: string;
  category: 'Payables' | 'Procurement' | 'Tax & Compliance' | 'Financial Close' | 'Accounting';
}

export interface AgentDiagnosis {
  rootCause: string;
  confidenceScore: number;
  businessImpact: string;
  recommendedOwner: string;
  recommendedOwnerRole: string;
  policyReference: string;
  policyId: string;
  policySection: string;
  policyViolated: boolean;
  varianceDetails: string;
  currentBlocker: string;
  similarHistoricalCaseIds: string[];
  similarResolutionSummary: string;
  lastAgentAction: string;
  generatedBuyerMessage: {
    to: string;
    cc: string;
    subject: string;
    body: string;
  };
}

export type ActionType =
  | 'DRAFT_BUYER_MESSAGE'
  | 'ESCALATE_APPROVAL'
  | 'REQUEST_CREDIT_NOTE'
  | 'APPROVE_EXCEPTION'
  | 'REJECT_INVOICE'
  | 'MARK_RESOLVED';

export interface RecommendedAction {
  id: string;
  primaryRecommendation: string;
  confidence: number;
  estimatedImpact: string;
  safestNextStep: string;
  targetOwner: string;
  targetStatusAfterApproval: ExceptionStatus;
  availableActions: {
    type: ActionType;
    label: string;
    reason: string;
    recordsAffected: string[];
    expectedBusinessImpact: string;
    complianceWarning: string;
    resultingStatus: ExceptionStatus;
  }[];
}

export type AuditEventType =
  | 'Exception created'
  | 'Agent investigation started'
  | 'Diagnosis generated'
  | 'Recommendation generated'
  | 'Message drafted'
  | 'Approval requested'
  | 'User action confirmed'
  | 'Exception resolved'
  | 'Exception rejected';

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorType: 'Agent' | 'User' | 'System';
  userRole?: UserRole;
  eventType: AuditEventType;
  exceptionId: string;
  invoiceNumber: string;
  action: string;
  result: string;
  approvalStatus: 'Approved' | 'Pending Human Approval' | 'Auto-Logged (Read Only)' | 'Rejected';
  demoMode: boolean;
}

export interface HistoricalResolution {
  id: string;
  exceptionId: string;
  exceptionType: ExceptionType;
  supplierName: string;
  invoiceNumber: string;
  previousRootCause: string;
  resolutionUsed: string;
  timeToResolve: string;
  businessUnit: string;
  amount: number;
  outcome: string;
  resolvedBy: string;
  resolvedDate: string;
  policyApplied: string;
}

export interface RelatedTransaction {
  id: string;
  type: 'Invoice' | 'Credit Memo' | 'Purchase Order' | 'Receipt' | 'Journal Entry';
  referenceNumber: string;
  date: string;
  amount: number;
  status: string;
  relationshipNote: string;
}

export interface PolicyCheckResult {
  policyId: string;
  policyTitle: string;
  section: string;
  ruleChecked: string;
  status: 'Failed' | 'Passed' | 'Warning';
  finding: string;
}

export interface ERPException {
  id: string;
  exceptionType: ExceptionType;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  poNumber: string;
  receiptNumber: string;
  businessUnit: string;
  legalEntity: string;
  costCenter: string;
  glAccount: string;
  amount: number;
  varianceAmount: number;
  variancePercent: number;
  currency: string;
  createdDate: string;
  dueDate: string;
  ageDays: number;
  priority: ExceptionPriority;
  status: ExceptionStatus;
  slaStatus: 'Breached' | 'At Risk (< 4h)' | 'Within SLA' | 'Completed';
  assignedOwner: string;
  assignedOwnerRole: string;
  recommendedActionSummary: string;
  monthEndCloseBlocker: boolean;
  agentStatus: AgentStatus;
  invoice: Invoice;
  purchaseOrder: PurchaseOrder;
  receipt: Receipt;
  supplier: Supplier;
  approvalHistory: ApprovalStep[];
  relatedTransactions: RelatedTransaction[];
  policyChecks: PolicyCheckResult[];
  diagnosis: AgentDiagnosis;
  recommendedAction: RecommendedAction;
}

export interface AssistantResponse {
  id: string;
  question: string;
  answer: string;
  dataSourcesUsed: string[];
  policyReference: string;
  confidenceScore: number;
  timestamp: string;
}
