import {
  ERPException,
  AssistantResponse,
  HistoricalResolution,
} from '../types/erp';

export const PRESET_ASSISTANT_QUESTIONS = [
  'Why is this invoice blocked?',
  'What policy caused the hold?',
  'Who should resolve this issue?',
  'What happens if we do nothing?',
  'Which similar exceptions were resolved before?',
  'What is the safest next action?',
  'Draft a message to the buyer.',
  'Explain this issue in simple language.',
] as const;

export interface AIAssistantProvider {
  askQuestion(
    question: string,
    exception: ERPException,
    historicalCases: HistoricalResolution[]
  ): Promise<AssistantResponse>;
}

/**
 * DeterministicMockAIProvider
 * Provides structured, context-aware responses grounded in the selected Oracle Fusion
 * exception, related PO/Receipt/Supplier records, Policy Library, and Historical Resolutions.
 * Zero external API keys required.
 */
export class DeterministicMockAIProvider implements AIAssistantProvider {
  async askQuestion(
    question: string,
    exception: ERPException,
    historicalCases: HistoricalResolution[]
  ): Promise<AssistantResponse> {
    const q = question.toLowerCase().trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const baseDataSources = [
      `Oracle Payables: ${exception.invoiceNumber} ($${exception.amount.toLocaleString()})`,
      `Oracle Purchasing: ${exception.poNumber} ($${exception.purchaseOrder.poAmount.toLocaleString()})`,
      `Oracle Receiving: ${exception.receiptNumber} (${exception.receipt.quantityAccepted} units)`,
      `Supplier Master: ${exception.supplierName} (${exception.supplier.supplierNumber})`,
    ];

    const matchedHistory = historicalCases.filter(
      (h) =>
        exception.diagnosis.similarHistoricalCaseIds.includes(h.id) ||
        h.exceptionType === exception.exceptionType
    );

    let answer = '';
    let dataSourcesUsed = [...baseDataSources];
    let policyReference = `${exception.diagnosis.policyReference} — ${exception.diagnosis.policySection}`;
    let confidenceScore = exception.diagnosis.confidenceScore;

    if (q.includes('why') && (q.includes('block') || q.includes('hold'))) {
      if (exception.invoiceNumber === 'INV-10482') {
        answer = `Invoice INV-10482 ($54,000.00) from Apex Industrial Supplies is blocked under system hold PRICE_VARIANCE_HOLD because the billed unit price ($540.00 across 100 units) is 8.0% ($4,000.00) higher than the contracted Purchase Order PO-78421 unit price ($500.00). Physical receipt RCV-55219 confirmed all 100 units were accepted, isolating the issue strictly to the 8% price uplift. In addition, buyer approval from Marcus Vance has been pending for 5 days.`;
      } else {
        answer = `Invoice ${exception.invoiceNumber} ($${exception.amount.toLocaleString()}) from ${exception.supplierName} is blocked by hold code ${exception.invoice.holdCode}. Root cause: ${exception.diagnosis.rootCause} Current blocker: ${exception.diagnosis.currentBlocker}`;
      }
      dataSourcesUsed.push(`Hold Log: ${exception.invoice.holdCode}`);
    } else if (q.includes('policy')) {
      if (exception.invoiceNumber === 'INV-10482') {
        answer = `Two enterprise policies triggered and govern this hold:\n1. Invoice Price Tolerance Policy (POL-AP-101, Section 4.2): Restricts 3-way match unit price variance to 2.0% or $500. INV-10482 has an 8.0% ($4,000) variance, automatically triggering PRICE_VARIANCE_HOLD.\n2. Approval Escalation Policy (POL-PROC-305, Section 5.1): Mandates buyer resolution within 3 business days and requires escalation to the Regional Procurement Manager once pending >= 5 days.`;
      } else {
        answer = `This exception is governed by ${exception.diagnosis.policyReference} (${exception.diagnosis.policySection}). Specifically, Oracle Payables flagged rule "${exception.policyChecks[0]?.ruleChecked || exception.invoice.holdCode}": ${exception.policyChecks[0]?.finding || exception.invoice.holdReason}.`;
      }
      dataSourcesUsed = [
        `Policy Document: ${exception.diagnosis.policyId} (${exception.diagnosis.policySection})`,
        `Oracle Fusion Hold Engine: ${exception.invoice.holdCode}`,
        `Invoice ${exception.invoiceNumber} vs PO ${exception.poNumber}`,
      ];
      confidenceScore = 97;
    } else if (q.includes('who') || q.includes('owner') || q.includes('resolve')) {
      if (exception.invoiceNumber === 'INV-10482') {
        answer = `Primary Operational Owner: Marcus Vance (Senior Buyer, Procurement) is responsible for either approving a PO Change Order for the +8% ($4,000) variance or instructing Apex Industrial Supplies to issue a credit note.\nEscalation Owner: Because buyer approval has been pending for 5 days (breaching the 3-day SLA under POL-PROC-305), Regional Procurement Manager Diana Sterling is the designated escalation approver.`;
      } else {
        answer = `The designated owner is ${exception.diagnosis.recommendedOwner} (${exception.diagnosis.recommendedOwnerRole}). Under ${exception.diagnosis.policyId}, they hold authority to review the variance/hold on ${exception.invoiceNumber} and approve the recommended resolution.`;
      }
      dataSourcesUsed = [
        `Oracle Approval Workflow: ${exception.invoiceNumber} Step #2`,
        `HCM & Procurement Hierarchy Directory`,
        `Policy POL-PROC-305 (Section 5.1)`,
      ];
      confidenceScore = 95;
    } else if (q.includes('nothing') || q.includes('impact') || q.includes('risk')) {
      if (exception.invoiceNumber === 'INV-10482') {
        answer = `If no action is taken on INV-10482:\n1. Month-End Close Blocker: Receipt RCV-55219 ($50,000) is already received in October, leaving a $54,000 unaccounted invoice on the Payables Period Close Exception Report (violating POL-FIN-401 Section 6.3).\n2. Supplier Credit Hold Risk: Payment to Apex Industrial Supplies will miss net terms, risking shipment holds on Plant Assembly Line B.\n3. Financial Exposure: $54,000 total invoice blocked with $4,000 unapproved price variance.`;
      } else {
        answer = `Doing nothing on ${exception.invoiceNumber} results in: ${exception.diagnosis.businessImpact} ${exception.monthEndCloseBlocker ? 'Critically, this transaction is flagged as an active Month-End Close Blocker under POL-FIN-401.' : 'SLA compliance will further degrade and supplier payment will be delayed.'}`;
      }
      dataSourcesUsed = [
        `Payables Unaccounted Transactions Sweep (Oct Close)`,
        `Invoice ${exception.invoiceNumber} Due Date (${exception.invoice.dueDate})`,
        `Month End Close Policy (POL-FIN-401, Section 6.3)`,
      ];
    } else if (q.includes('similar') || q.includes('historical') || q.includes('before')) {
      const caseList = matchedHistory
        .map(
          (c) =>
            `• ${c.id} (${c.invoiceNumber} — ${c.supplierName}): ${c.previousRootCause} Resolved in ${c.timeToResolve} via: ${c.resolutionUsed} Outcome: ${c.outcome}`
        )
        .join('\n');
      answer =
        matchedHistory.length > 0
          ? `Found ${matchedHistory.length} similar resolved case(s) in the Historical Resolution Library:\n${caseList}`
          : `Historical summary: ${exception.diagnosis.similarResolutionSummary}`;
      dataSourcesUsed = [
        ...matchedHistory.map((c) => `Historical Resolution Record: ${c.id} (${c.invoiceNumber})`),
        `Exception Pattern Matcher (${exception.exceptionType})`,
      ];
      confidenceScore = 94;
    } else if (q.includes('safest') || q.includes('next action') || q.includes('recommend')) {
      if (exception.invoiceNumber === 'INV-10482') {
        answer = `The safest next action (92% confidence) is a two-step controlled workflow:\n1. Click "Draft Message to Buyer" to log and send the structured +8% ($4,000) price variance breakdown to Senior Buyer Marcus Vance.\n2. Click "Escalate Approval" (or "Request Credit Note") with human confirmation to route the 5-day overdue hold to Procurement Manager Diana Sterling and transition the exception to Waiting for Approval.`;
      } else {
        answer = `Safest Next Action (${exception.recommendedAction.confidence}% confidence): ${exception.recommendedAction.primaryRecommendation} (${exception.recommendedAction.safestNextStep}). All state-changing actions require explicit human confirmation and are recorded in the Audit Log.`;
      }
      dataSourcesUsed = [
        `Agent Recommendation Engine (${exception.recommendedAction.id})`,
        ...matchedHistory.map((c) => `Historical Case ${c.id}`),
        `Policy ${exception.diagnosis.policyId}`,
      ];
    } else if (q.includes('draft') || q.includes('message') || q.includes('buyer')) {
      const msg = exception.diagnosis.generatedBuyerMessage;
      answer = `Subject: ${msg.subject}\nTo: ${msg.to}\nCC: ${msg.cc}\n\n${msg.body}`;
      dataSourcesUsed = [
        `Invoice ${exception.invoiceNumber} ($${exception.amount.toLocaleString()})`,
        `Purchase Order ${exception.poNumber} ($${exception.purchaseOrder.poAmount.toLocaleString()})`,
        `Approval History (${exception.ageDays} days pending)`,
      ];
      confidenceScore = 96;
    } else if (q.includes('simple') || q.includes('explain') || q.includes('plain')) {
      if (exception.invoiceNumber === 'INV-10482') {
        answer = `In simple terms: We ordered 100 parts from Apex Industrial Supplies at $500 each ($50,000 total on PO-78421), and all 100 parts arrived at our warehouse. However, the supplier billed us $540 each ($54,000 total on INV-10482) — an extra $4,000 (+8%). Company policy only allows a 2% price difference without special sign-off, and the buyer hasn't answered for 5 days. We need the buyer to either approve the extra $4,000 or ask the supplier for a $4,000 refund credit before we can pay the bill and close the month's books.`;
      } else {
        answer = `In simple language: Supplier ${exception.supplierName} sent invoice ${exception.invoiceNumber} for $${exception.amount.toLocaleString()}, which was paused automatically because: ${exception.diagnosis.rootCause} Right now, ${exception.diagnosis.currentBlocker.toLowerCase()} The safest step is to ${exception.recommendedAction.primaryRecommendation.toLowerCase()}`;
      }
      confidenceScore = 95;
    } else {
      answer = `Analysis for ${exception.id} (${exception.invoiceNumber} — ${exception.supplierName}):\n• Root Cause: ${exception.diagnosis.rootCause}\n• Variance / Exposure: ${exception.diagnosis.varianceDetails}\n• Current Blocker: ${exception.diagnosis.currentBlocker}\n• Recommended Action (${exception.diagnosis.confidenceScore}% confidence): ${exception.recommendedAction.primaryRecommendation}`;
    }

    return {
      id: `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      question,
      answer,
      dataSourcesUsed,
      policyReference,
      confidenceScore,
      timestamp: nowTime,
    };
  }
}

export const aiAssistant = new DeterministicMockAIProvider();
