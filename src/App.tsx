import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldAlert,
} from 'lucide-react';
import {
  ActionType,
  AgentStatus,
  AssistantResponse,
  AuditEvent,
  AutonomyLevel,
  ERPException,
  ExceptionType,
  HistoricalResolution,
  PolicyDocument,
  UserRole,
} from './types/erp';
import {
  SEEDED_AUDIT_EVENTS,
  SEEDED_EXCEPTIONS,
  SEEDED_HISTORICAL_RESOLUTIONS,
  SEEDED_POLICIES,
} from './data/mockErpData';
import { oracleAdapter, OracleConnectionInfo } from './services/oracleFusionAdapter';
import {
  InvestigationStageStep,
  buildInvestigationSequence,
  createSimulatedException,
  executeApprovedAction,
  storeResolution,
  writeAuditEvent,
} from './services/agentOrchestrator';
import { DeterministicMockAIProvider } from './services/aiAssistantProvider';
import { TopHeader, NavTab } from './components/TopHeader';
import { JudgeDemoBar } from './components/JudgeDemoBar';
import { CommandCenterView } from './components/CommandCenterView';
import { ExceptionDetailView } from './components/ExceptionDetailView';
import { PoliciesView } from './components/PoliciesView';
import { HistoricalResolutionsView } from './components/HistoricalResolutionsView';
import { AuditLogView } from './components/AuditLogView';
import { SettingsView } from './components/SettingsView';
import { ActionConfirmationModal } from './components/ActionConfirmationModal';
import { SimulateExceptionModal } from './components/SimulateExceptionModal';
import { OracleConnectionModal } from './components/OracleConnectionModal';
import { OracleLoginGate } from './components/OracleLoginGate';
import {
  RealtimeAgentStreamBanner,
  TelemetryLogEntry,
} from './components/RealtimeAgentStreamBanner';

const aiProvider = new DeterministicMockAIProvider();

interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

export const App: React.FC = () => {
  // Navigation & Persona State
  const [activeTab, setActiveTab] = useState<NavTab>('command-center');
  const [userRole, setUserRole] = useState<UserRole>('Analyst');
  const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>('Recommend and draft');

  // Strict Zero-Data State Before Login: Data is ONLY loaded after user_id + password server login
  const [exceptions, setExceptions] = useState<ERPException[]>([]);
  const [policies] = useState<PolicyDocument[]>(() =>
    structuredClone(SEEDED_POLICIES)
  );
  const [historicalResolutions, setHistoricalResolutions] = useState<HistoricalResolution[]>(() =>
    structuredClone(SEEDED_HISTORICAL_RESOLUTIONS)
  );
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() =>
    structuredClone(SEEDED_AUDIT_EVENTS)
  );

  // Oracle Instance Connection & Realtime Agent Stream State (Restricted until explicit login)
  const [isOracleModalOpen, setIsOracleModalOpen] = useState<boolean>(false);
  const [oracleConnection, setOracleConnection] = useState<OracleConnectionInfo>({
    connected: false,
    instanceUrl: 'https://fa-esfe-dev19-saasfademo1.ds-fa.oraclepdemos.com',
    username: null,
    connectedAt: null,
    probeReachable: false,
    liveInvoicesCount: 0,
    message: 'Authentication required. Please log in with your Oracle User ID and Password to connect to the server.',
  });
  const [isRealtimeStreaming, setIsRealtimeStreaming] = useState<boolean>(false);
  const [streamBuffer, setStreamBuffer] = useState<ERPException[]>([]);
  const [isSearchingOracle, setIsSearchingOracle] = useState<boolean>(false);
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLogEntry[]>([
    {
      id: 'tel-init-1',
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
      stage: 'Observing',
      message:
        'Awaiting User ID & Password login to connect to Oracle Fusion server.',
    },
  ]);
  const streamTimerRef = useRef<number | null>(null);

  // Selected Exception (set dynamically once user logs in and server returns their data)
  const [selectedExceptionId, setSelectedExceptionId] = useState<string>('');
  const [highlightedPolicyId, setHighlightedPolicyId] = useState<string | null>('POL-AP-101');

  // Agent Investigation Animation State
  const [currentAgentStage, setCurrentAgentStage] = useState<AgentStatus>('Waiting for Approval');
  const [isInvestigating, setIsInvestigating] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(6);
  const [stageLogs, setStageLogs] = useState<InvestigationStageStep[]>(() =>
    buildInvestigationSequence(
      SEEDED_EXCEPTIONS[0],
      SEEDED_POLICIES,
      SEEDED_HISTORICAL_RESOLUTIONS
    )
  );
  const investigationTimerRef = useRef<number | null>(null);

  // AI Assistant State (per exception ID)
  const [assistantHistoryByExc, setAssistantHistoryByExc] = useState<
    Record<string, AssistantResponse[]>
  >({});
  const [isAskingAssistant, setIsAskingAssistant] = useState<boolean>(false);

  // Confirmation Modal & Simulate Modal State
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState<boolean>(false);
  const [simulationSequence, setSimulationSequence] = useState<number>(1);

  // Adapter Sync & Resilience Testing State
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Not connected');
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [simulateAdapterError, setSimulateAdapterError] = useState<boolean>(false);

  // Judge Demo Guide Bar & Toast Notifications (Hidden by default to keep UI clean)
  const [showJudgeGuide, setShowJudgeGuide] = useState<boolean>(false);
  const [completedDemoSteps, setCompletedDemoSteps] = useState<Record<string, boolean>>({
    'viewed-command-center': true,
  });
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const selectedException =
    exceptions.find((e) => e.id === selectedExceptionId) ||
    exceptions[0];

  const appendTelemetry = useCallback(
    (stage: AgentStatus | 'REST Poll', message: string, invoiceNumber?: string) => {
      const nowTime = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setTelemetryLogs((prev) => [
        {
          id: `tel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: nowTime,
          stage,
          message,
          invoiceNumber,
        },
        ...prev.slice(0, 29),
      ]);
    },
    []
  );

  const addToast = useCallback(
    (title: string, message: string, type: 'success' | 'info' | 'warning' = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [{ id, title, message, type }, ...prev.slice(0, 3)]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 6000);
    },
    []
  );

  // Live search against Oracle Fusion REST API (/fscmRestApi/resources/11.13.18.05/invoices)
  const handleSearchLiveOracle = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || !oracleConnection.connected) return;
      setIsSearchingOracle(true);
      try {
        const matched = await oracleAdapter.searchLiveOracleInvoices(trimmed);
        appendTelemetry(
          'REST Poll',
          `Live Oracle REST search for "${trimmed}" returned ${matched.length} matching invoice(s).`
        );
        if (matched.length > 0) {
          setExceptions((prev) => {
            const byId = new Map<string, ERPException>();
            // Put newly matched Oracle records first so they appear at the top of search results
            for (const item of matched) {
              byId.set(item.id, item);
            }
            for (const existing of prev) {
              if (!byId.has(existing.id)) {
                byId.set(existing.id, existing);
              }
            }
            return Array.from(byId.values());
          });
        }
      } finally {
        setIsSearchingOracle(false);
      }
    },
    [oracleConnection.connected, appendTelemetry]
  );

  // Ingest one item from streamBuffer into active exceptions queue
  const ingestNextFromStreamBuffer = useCallback(() => {
    setStreamBuffer((prevBuffer) => {
      if (prevBuffer.length === 0) {
        setIsRealtimeStreaming(false);
        setCurrentAgentStage('Waiting for Approval');
        return prevBuffer;
      }

      const [nextExc, ...remaining] = prevBuffer;
      setCurrentAgentStage('Detecting');
      appendTelemetry(
        'Detecting',
        `Detected ${nextExc.priority} ${nextExc.exceptionType} on ${nextExc.invoiceNumber} (${nextExc.supplierName}) — Policy ${nextExc.diagnosis.policyId} checked (${nextExc.diagnosis.confidenceScore}% confidence).`,
        nextExc.invoiceNumber
      );

      setExceptions((prevExcs) => {
        const exists = prevExcs.some((e) => e.id === nextExc.id);
        if (exists) return prevExcs;
        return [nextExc, ...prevExcs];
      });
      setSelectedExceptionId((prevSelected) => prevSelected || nextExc.id);

      writeAuditEvent({
        actor: oracleConnection.connected
          ? `Realtime Agent (${oracleConnection.instanceUrl})`
          : 'Realtime Subledger Agent',
        actorType: 'Agent',
        userRole,
        eventType: 'Exception created',
        exceptionId: nextExc.id,
        invoiceNumber: nextExc.invoiceNumber,
        action: `Live agent ingested & diagnosed ${nextExc.invoiceNumber} (${nextExc.exceptionType}).`,
        result: `${nextExc.diagnosis.rootCause} (Confidence: ${nextExc.diagnosis.confidenceScore}%)`,
        approvalStatus: 'Pending Human Approval',
        demoMode: true,
      })
        .then((evt) => {
          setAuditEvents((prev) => [evt, ...prev]);
        })
        .catch(() => {
          // ignore if error simulation enabled
        });

      if (remaining.length === 0) {
        setIsRealtimeStreaming(false);
        setCurrentAgentStage('Waiting for Approval');
        appendTelemetry(
          'Completed',
          'Realtime subledger scan complete. All discovered exceptions are queued for human approval.'
        );
      }

      return remaining;
    });
  }, [appendTelemetry, oracleConnection.connected, oracleConnection.instanceUrl, userRole]);

  // Realtime stream interval loop
  useEffect(() => {
    if (!isRealtimeStreaming) {
      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
      return;
    }

    streamTimerRef.current = window.setInterval(() => {
      ingestNextFromStreamBuffer();
    }, 2200);

    return () => {
      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    };
  }, [isRealtimeStreaming, ingestNextFromStreamBuffer]);

  // Refresh/Reload full live dataset immediately so no invoices are hidden in streamBuffer
  const handleStartLiveStreamFromZero = useCallback(
    async (customQueue?: ERPException[]) => {
      if (customQueue && customQueue.length > 0) {
        setStreamBuffer([]);
        setIsRealtimeStreaming(false);
        setExceptions(customQueue);
        setSelectedExceptionId(customQueue[0].id);
        setCurrentAgentStage('Waiting for Approval');
        addToast(
          'Live Oracle Invoices Loaded',
          `Loaded all ${customQueue.length} ERP invoices immediately for instant search and diagnosis.`,
          'info'
        );
        return;
      }

      if (oracleConnection.connected) {
        appendTelemetry(
          'REST Poll',
          `Polling ${oracleConnection.instanceUrl}/fscmRestApi/resources/11.13.18.05/invoices as ${oracleConnection.username}...`
        );
        const livePull = await oracleAdapter.pullLiveOracleTransactions();
        for (const line of livePull.telemetry) {
          appendTelemetry('REST Poll', line);
        }
        setStreamBuffer([]);
        setIsRealtimeStreaming(false);
        setExceptions(livePull.mappedExceptions);
        setSelectedExceptionId(livePull.mappedExceptions[0]?.id || '');
        addToast(
          'Live Oracle Invoices Loaded',
          `Synchronized ${livePull.mappedExceptions.length} live Oracle Fusion invoices for ${oracleConnection.username}.`,
          'success'
        );
      }
    },
    [appendTelemetry, addToast, oracleConnection.connected, oracleConnection.instanceUrl, oracleConnection.username]
  );

  // Connect to Oracle Fusion Instance via Login Gate or Modal
  const handleConnectOracleInstance = async (params: {
    instanceUrl: string;
    username: string;
    password: string;
    clearStaticAndStreamLive: boolean;
  }) => {
    const connInfo = await oracleAdapter.connectInstance({
      instanceUrl: params.instanceUrl,
      username: params.username,
      password: params.password,
    });
    setOracleConnection(connInfo);
    setLastSyncTime(connInfo.connectedAt || new Date().toISOString());

    appendTelemetry(
      'REST Poll',
      `Connected to Oracle Fusion instance ${connInfo.instanceUrl} as User ID ${connInfo.username}. Pulling /fscmRestApi/resources/11.13.18.05/invoices...`
    );

    const livePull = await oracleAdapter.pullLiveOracleTransactions();
    for (const line of livePull.telemetry) {
      appendTelemetry('REST Poll', line);
    }

    const queueToUse = livePull.mappedExceptions;
    const normUser = (connInfo.username || '').trim().toUpperCase();
    const firstUserOwned = queueToUse.find(
      (e) =>
        e.assignedOwner.trim().toUpperCase() === normUser ||
        e.assignedOwnerRole.toUpperCase().includes(normUser)
    );

    // Load ALL live Oracle records for this authenticated user session immediately
    setStreamBuffer([]);
    setIsRealtimeStreaming(false);
    setExceptions(queueToUse);
    setSelectedExceptionId(firstUserOwned?.id || queueToUse[0]?.id || '');
    setOracleConnection((prev) => ({
      ...prev,
      liveInvoicesCount: queueToUse.length,
      message: `Live Connected to ${connInfo.instanceUrl} as ${connInfo.username} (${queueToUse.length} real Oracle invoices loaded).`,
    }));

    setIsOracleModalOpen(false);
    addToast(
      `Authenticated as ${connInfo.username}`,
      `Loaded ${queueToUse.length} live Oracle Payables invoices from ${connInfo.instanceUrl}.`,
      'success'
    );
  };

  const handleDisconnectOracleInstance = async () => {
    await oracleAdapter.disconnectInstance();
    setExceptions([]);
    setStreamBuffer([]);
    setIsRealtimeStreaming(false);
    setSelectedExceptionId('');
    setAssistantHistoryByExc({});
    setOracleConnection({
      connected: false,
      instanceUrl: 'https://fa-esfe-dev19-saasfademo1.ds-fa.oraclepdemos.com',
      username: null,
      connectedAt: null,
      probeReachable: false,
      liveInvoicesCount: 0,
      message: 'Signed out. Please log in with your Oracle User ID and Password to connect to the server.',
    });
    appendTelemetry('REST Poll', 'Signed out and disconnected from Oracle Fusion instance.');
    addToast('Signed Out', 'Oracle Fusion user session disconnected and workspace cleared.', 'info');
  };

  // Keep stageLogs synced when user switches selectedExceptionId while not actively animating
  useEffect(() => {
    if (!isInvestigating && selectedException) {
      const seq = buildInvestigationSequence(
        selectedException,
        policies,
        historicalResolutions
      );
      setStageLogs(seq);
      setCurrentAgentStage(selectedException.agentStatus);
      setActiveStepIndex(
        selectedException.status === 'Resolved' ? seq.length - 1 : 6
      );
    }
  }, [selectedExceptionId, isInvestigating, selectedException, policies, historicalResolutions]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (investigationTimerRef.current) {
        window.clearInterval(investigationTimerRef.current);
      }
      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
      }
    };
  }, []);

  // Select an exception and optionally open Detail View
  const handleSelectException = (id: string, openDetailsView = true) => {
    setSelectedExceptionId(id);
    if (openDetailsView) {
      setActiveTab('exceptions');
      setCompletedDemoSteps((prev) => ({
        ...prev,
        'selected-exception': true,
      }));
    }
  };

  // Run animated 9-stage Agent Investigation
  const handleRunInvestigation = async (targetExceptionId?: string) => {
    const excId = targetExceptionId || selectedExceptionId;
    const targetExc = exceptions.find((e) => e.id === excId) || selectedException;
    if (!targetExc) return;

    if (excId !== selectedExceptionId) {
      setSelectedExceptionId(excId);
    }
    setActiveTab('exceptions');

    if (investigationTimerRef.current) {
      window.clearInterval(investigationTimerRef.current);
    }

    const sequence = buildInvestigationSequence(
      targetExc,
      policies,
      historicalResolutions
    );
    setStageLogs(sequence);
    setIsInvestigating(true);
    setActiveStepIndex(0);
    setCurrentAgentStage(sequence[0].stage);

    appendTelemetry(
      'Observing',
      `Running 9-stage deep investigation on ${targetExc.id} (${targetExc.invoiceNumber})...`,
      targetExc.invoiceNumber
    );

    // Log start of investigation in Audit Trail
    try {
      const startEvt = await writeAuditEvent({
        actor: 'Agentic ERP Exception Commander',
        actorType: 'Agent',
        userRole,
        eventType: 'Agent investigation started',
        exceptionId: targetExc.id,
        invoiceNumber: targetExc.invoiceNumber,
        action: `Initiated 9-stage autonomous investigation for ${targetExc.invoiceNumber} (${targetExc.supplierName}).`,
        result: `Observing subledger transaction, PO ${targetExc.poNumber}, Receipt ${targetExc.receiptNumber}, and policy rules.`,
        approvalStatus: 'Auto-Logged (Read Only)',
        demoMode: true,
      });
      setAuditEvents((prev) => [startEvt, ...prev]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Adapter error';
      setServiceError(msg);
    }

    let stepIdx = 0;
    investigationTimerRef.current = window.setInterval(async () => {
      stepIdx += 1;
      if (stepIdx < sequence.length) {
        const currentStep = sequence[stepIdx];
        setActiveStepIndex(stepIdx);
        setCurrentAgentStage(currentStep.stage);
        appendTelemetry(
          currentStep.stage,
          `${currentStep.functionCalled} -> ${currentStep.activityMessage}`,
          targetExc.invoiceNumber
        );
      } else {
        if (investigationTimerRef.current) {
          window.clearInterval(investigationTimerRef.current);
          investigationTimerRef.current = null;
        }
        setIsInvestigating(false);
        setCurrentAgentStage('Completed');
        setActiveStepIndex(sequence.length - 1);

        // Update exception agentStatus and status
        setExceptions((prev) =>
          prev.map((item) =>
            item.id === targetExc.id
              ? {
                  ...item,
                  agentStatus: 'Completed',
                  status:
                    item.status === 'New' || item.status === 'Investigating'
                      ? 'Action Required'
                      : item.status,
                }
              : item
          )
        );

        // Log Diagnosis & Recommendation events
        try {
          const diagEvt = await writeAuditEvent({
            actor: 'Agentic ERP Exception Commander',
            actorType: 'Agent',
            userRole,
            eventType: 'Diagnosis generated',
            exceptionId: targetExc.id,
            invoiceNumber: targetExc.invoiceNumber,
            action: `Root cause verified (${targetExc.diagnosis.confidenceScore}% confidence): ${targetExc.diagnosis.rootCause}`,
            result: `Referenced ${targetExc.diagnosis.policyReference} (${targetExc.diagnosis.policySection}).`,
            approvalStatus: 'Auto-Logged (Read Only)',
            demoMode: true,
          });
          const recEvt = await writeAuditEvent({
            actor: 'Agentic ERP Exception Commander',
            actorType: 'Agent',
            userRole,
            eventType: 'Recommendation generated',
            exceptionId: targetExc.id,
            invoiceNumber: targetExc.invoiceNumber,
            action: `Recommended Action: ${targetExc.recommendedAction.primaryRecommendation}`,
            result: `Agent paused at human approval gate (Demo Mode).`,
            approvalStatus: 'Pending Human Approval',
            demoMode: true,
          });
          setAuditEvents((prev) => [recEvt, diagEvt, ...prev]);
        } catch {
          // Ignore if simulated error is active
        }

        setCompletedDemoSteps((prev) => ({
          ...prev,
          'selected-exception': true,
          'ran-investigation': true,
        }));

        addToast(
          'Agent Investigation Completed',
          `Root cause & policy verification complete for ${targetExc.invoiceNumber} (${targetExc.diagnosis.confidenceScore}% confidence). Waiting for human confirmation.`,
          'info'
        );
      }
    }, 520);
  };

  // Ask AI Assistant a question
  const handleAskAssistant = async (question: string) => {
    if (!selectedException) return;
    setIsAskingAssistant(true);
    try {
      const response = await aiProvider.askQuestion(
        question,
        selectedException,
        historicalResolutions
      );
      setAssistantHistoryByExc((prev) => ({
        ...prev,
        [selectedException.id]: [...(prev[selectedException.id] || []), response],
      }));
      setCompletedDemoSteps((prev) => ({
        ...prev,
        'asked-assistant': true,
      }));
    } finally {
      setIsAskingAssistant(false);
    }
  };

  const handleClearAssistantMessages = () => {
    if (!selectedException) return;
    setAssistantHistoryByExc((prev) => ({
      ...prev,
      [selectedException.id]: [],
    }));
  };

  // Request confirmation dialog for an action
  const handleRequestActionConfirmation = (actionType: ActionType) => {
    setPendingAction(actionType);
  };

  // Confirm & Execute Approved Action in Demo Mode
  const handleConfirmAction = async () => {
    if (!pendingAction || !selectedException) return;
    setIsProcessingAction(true);
    setCurrentAgentStage('Executing');

    try {
      const { updatedException, auditEvent, notificationMessage } =
        await executeApprovedAction({
          exception: selectedException,
          actionType: pendingAction,
          userRole,
        });

      setExceptions((prev) =>
        prev.map((exc) => (exc.id === updatedException.id ? updatedException : exc))
      );
      setAuditEvents((prev) => [auditEvent, ...prev]);

      if (pendingAction === 'MARK_RESOLVED') {
        const newHist = storeResolution(updatedException, userRole);
        setHistoricalResolutions((prev) => [newHist, ...prev]);
      }

      setCurrentAgentStage('Completed');
      setCompletedDemoSteps((prev) => ({
        ...prev,
        'confirmed-action': true,
      }));

      appendTelemetry(
        'Executing',
        `Human operator (${userRole}) confirmed ${pendingAction} for ${selectedException.invoiceNumber}. Status -> ${updatedException.status}`,
        selectedException.invoiceNumber
      );

      addToast(
        'Action Confirmed in Demo Mode',
        notificationMessage,
        'success'
      );
      setPendingAction(null);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to execute action in MockOracleFusionAdapter';
      setServiceError(msg);
      addToast('Mock Adapter Error', msg, 'warning');
      setPendingAction(null);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Simulate New Exception
  const handleCreateSimulatedException = async (
    scenarioType: ExceptionType,
    openImmediately: boolean
  ) => {
    const newExc = createSimulatedException(scenarioType, simulationSequence);
    setSimulationSequence((prev) => prev + 1);
    setExceptions((prev) => [newExc, ...prev]);

    appendTelemetry(
      'Detecting',
      `New incoming exception ${newExc.id} (${newExc.exceptionType}) detected on ${newExc.invoiceNumber} (${newExc.supplierName}).`,
      newExc.invoiceNumber
    );

    try {
      const createdEvt = await writeAuditEvent({
        actor: `Simulation Engine + Operator (${userRole})`,
        actorType: 'System',
        userRole,
        eventType: 'Exception created',
        exceptionId: newExc.id,
        invoiceNumber: newExc.invoiceNumber,
        action: `Simulated new ${newExc.priority} ${newExc.exceptionType} on ${newExc.invoiceNumber} (${newExc.supplierName}).`,
        result: `Assigned to ${newExc.assignedOwner}; initial diagnosis & recommended action generated in Demo Mode.`,
        approvalStatus: 'Pending Human Approval',
        demoMode: true,
      });
      setAuditEvents((prev) => [createdEvt, ...prev]);
    } catch {
      // Ignore if simulated error active
    }

    setIsSimulateModalOpen(false);
    setCompletedDemoSteps((prev) => ({
      ...prev,
      'simulated-exception': true,
    }));

    if (openImmediately) {
      setSelectedExceptionId(newExc.id);
      setActiveTab('exceptions');
    }

    addToast(
      `New Exception Simulated (${newExc.id})`,
      `Created ${newExc.priority} ${newExc.exceptionType} for ${newExc.supplierName} (${newExc.invoiceNumber}) in Demo Mode.`,
      'info'
    );
  };

  // Refresh Adapter Data (Live if connected, or Mock)
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    setServiceError(null);
    try {
      if (oracleConnection.connected) {
        const livePull = await oracleAdapter.pullLiveOracleTransactions();
        for (const line of livePull.telemetry) {
          appendTelemetry('REST Poll', line);
        }
        if (livePull.mappedExceptions.length > 0) {
          setExceptions(livePull.mappedExceptions);
          setSelectedExceptionId(livePull.mappedExceptions[0].id);
        }
      } else {
        await oracleAdapter.getInvoices();
      }
      const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
      setLastSyncTime(nowIso);
      addToast(
        oracleConnection.connected
          ? 'Oracle Fusion Live REST Sync Complete'
          : 'Oracle Fusion Sync Complete',
        `Synchronized ${exceptions.length} exception records (${nowIso}).`,
        'info'
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to synchronize Oracle adapter';
      setServiceError(msg);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Toggle Simulated Adapter Error
  const handleToggleSimulatedError = (forceValue?: boolean) => {
    const nextVal =
      typeof forceValue === 'boolean' ? forceValue : !simulateAdapterError;
    oracleAdapter.setSimulateError(nextVal);
    setSimulateAdapterError(nextVal);
    if (nextVal) {
      setServiceError(
        'Simulated Oracle Fusion Adapter Error (503 Service Unavailable): Mock service fault injection enabled for resilience testing.'
      );
    } else {
      setServiceError(null);
    }
  };

  // Full Demo Reset to Initial Seeded State
  const handleResetDemo = () => {
    if (investigationTimerRef.current) {
      window.clearInterval(investigationTimerRef.current);
      investigationTimerRef.current = null;
    }
    if (streamTimerRef.current) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    oracleAdapter.setSimulateError(false);
    setSimulateAdapterError(false);
    setServiceError(null);
    setIsInvestigating(false);
    setIsRealtimeStreaming(false);
    setStreamBuffer([]);
    setExceptions(structuredClone(SEEDED_EXCEPTIONS));
    setHistoricalResolutions(structuredClone(SEEDED_HISTORICAL_RESOLUTIONS));
    setAuditEvents(structuredClone(SEEDED_AUDIT_EVENTS));
    setSelectedExceptionId('EXC-9041');
    setCurrentAgentStage('Waiting for Approval');
    setActiveStepIndex(6);
    setAssistantHistoryByExc({});
    setPendingAction(null);
    setUserRole('Analyst');
    setAutonomyLevel('Recommend and draft');
    setActiveTab('command-center');
    setCompletedDemoSteps({ 'viewed-command-center': true });

    addToast(
      'Demo Reset Complete',
      'Restored all 12 seeded Oracle Fusion exceptions, default scenario EXC-9041 (INV-10482), policies, and audit trail.',
      'info'
    );
  };

  // Tab navigation with demo step tracking
  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'command-center') {
      setCompletedDemoSteps((prev) => ({ ...prev, 'viewed-command-center': true }));
    } else if (tab === 'exceptions') {
      setCompletedDemoSteps((prev) => ({ ...prev, 'selected-exception': true }));
    } else if (tab === 'audit-log') {
      setCompletedDemoSteps((prev) => ({ ...prev, 'viewed-audit-log': true }));
    }
  };

  const openExceptionsCount = exceptions.filter(
    (e) => e.status !== 'Resolved' && e.status !== 'Rejected'
  ).length;
  const criticalCount = exceptions.filter(
    (e) => e.priority === 'Critical' && e.status !== 'Resolved' && e.status !== 'Rejected'
  ).length;

  // Strict Homepage Restriction: User MUST log in with User ID + Password and connect to the Oracle server before any dashboard data is shown
  if (!oracleConnection.connected) {
    return (
      <OracleLoginGate
        defaultInstanceUrl={
          oracleConnection.instanceUrl ||
          'https://fa-esfe-dev19-saasfademo1.ds-fa.oraclepdemos.com'
        }
        onLoginAndConnect={async ({ instanceUrl, username, password }) => {
          await handleConnectOracleInstance({
            instanceUrl,
            username,
            password,
            clearStaticAndStreamLive: true,
          });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-slate-900 pb-6">
      {/* Top Enterprise Header & Navigation */}
      <TopHeader
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        userRole={userRole}
        onChangeUserRole={setUserRole}
        globalAgentStatus={currentAgentStage}
        isInvestigating={isInvestigating || isRealtimeStreaming}
        openExceptionsCount={openExceptionsCount}
        criticalCount={criticalCount}
        auditCount={auditEvents.length}
        showJudgeGuide={showJudgeGuide}
        onToggleJudgeGuide={() => setShowJudgeGuide((prev) => !prev)}
        onResetDemo={handleResetDemo}
        onOpenSimulateModal={() => setIsSimulateModalOpen(true)}
        oracleUsername={oracleConnection.username}
        oracleInstanceUrl={oracleConnection.instanceUrl}
        onSignOut={handleDisconnectOracleInstance}
      />

      {/* Interactive Judge Walkthrough & Demo Flow Bar */}
      <JudgeDemoBar
        visible={showJudgeGuide}
        onClose={() => setShowJudgeGuide(false)}
        onResetDemo={handleResetDemo}
        completedSteps={completedDemoSteps}
        onNavigateTab={handleSelectTab}
        onSelectDefaultScenario={() => {
          if (exceptions[0]) {
            setSelectedExceptionId(exceptions[0].id);
          }
          setActiveTab('exceptions');
          setCompletedDemoSteps((prev) => ({
            ...prev,
            'selected-exception': true,
          }));
        }}
        onRunInvestigation={() => handleRunInvestigation(selectedException?.id)}
        onAskBlockedQuestion={() => {
          setActiveTab('exceptions');
          handleAskAssistant('Why is this invoice blocked?');
        }}
        onTriggerAction={(action) => {
          setActiveTab('exceptions');
          handleRequestActionConfirmation(action);
        }}
      />

      {/* Live Oracle Instance Connection & Realtime Agent Subledger Stream Bar */}
      <RealtimeAgentStreamBanner
        connectionInfo={oracleConnection}
        isStreaming={isRealtimeStreaming}
        streamQueueRemaining={streamBuffer.length}
        currentStreamStage={currentAgentStage}
        telemetryLogs={telemetryLogs}
        onOpenConnectModal={() => setIsOracleModalOpen(true)}
        onStartLiveStreamFromZero={() => handleStartLiveStreamFromZero()}
        onTogglePauseStream={() => setIsRealtimeStreaming((prev) => !prev)}
        onStepNextTransactionNow={ingestNextFromStreamBuffer}
      />

      {/* Floating Toast Notifications */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg shadow-lg border text-xs transition-all ${
                t.type === 'warning'
                  ? 'bg-rose-950 text-white border-rose-700'
                  : t.type === 'info'
                  ? 'bg-slate-900 text-white border-indigo-500/60'
                  : 'bg-emerald-950 text-white border-emerald-600'
              }`}
            >
              {t.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold flex items-center gap-1.5">
                  <span>{t.title}</span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded border border-amber-400/30">
                    {oracleConnection.connected ? `User: ${oracleConnection.username}` : 'Demo Mode'}
                  </span>
                </div>
                <p className="text-slate-200 mt-0.5 leading-relaxed">{t.message}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setToasts((prev) => prev.filter((item) => item.id !== t.id))
                }
                className="text-slate-400 hover:text-white p-0.5"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'command-center' && (
          <CommandCenterView
            exceptions={exceptions}
            selectedExceptionId={selectedExceptionId}
            onSelectException={handleSelectException}
            onRunInvestigation={handleRunInvestigation}
            onOpenSimulateModal={() => setIsSimulateModalOpen(true)}
            onRefreshData={handleRefreshData}
            isRefreshing={isRefreshing}
            isInvestigating={isInvestigating}
            serviceError={serviceError}
            onToggleSimulatedError={() => handleToggleSimulatedError()}
            onSearchLiveOracle={handleSearchLiveOracle}
            isSearchingOracle={isSearchingOracle}
            isOracleConnected={oracleConnection.connected}
            loggedInUsername={oracleConnection.username}
          />
        )}

        {activeTab === 'exceptions' && selectedException && (
          <ExceptionDetailView
            exceptions={exceptions}
            selectedException={selectedException}
            onSelectExceptionId={(id) => setSelectedExceptionId(id)}
            onBackToCommandCenter={() => setActiveTab('command-center')}
            currentAgentStage={currentAgentStage}
            isInvestigating={isInvestigating}
            activeStepIndex={activeStepIndex}
            stageLogs={stageLogs}
            onRunInvestigation={() => handleRunInvestigation(selectedException.id)}
            userRole={userRole}
            autonomyLevel={autonomyLevel}
            isProcessingAction={isProcessingAction}
            onRequestActionConfirmation={handleRequestActionConfirmation}
            assistantMessages={assistantHistoryByExc[selectedException.id] || []}
            isAskingAssistant={isAskingAssistant}
            onAskAssistant={handleAskAssistant}
            onClearAssistantMessages={handleClearAssistantMessages}
            historicalCases={historicalResolutions}
            auditEvents={auditEvents}
            onOpenPolicyView={(policyId) => {
              setHighlightedPolicyId(policyId);
              setActiveTab('policies');
            }}
            onOpenHistoryView={() => setActiveTab('history')}
            onOpenAuditLogView={() => {
              setActiveTab('audit-log');
              setCompletedDemoSteps((prev) => ({
                ...prev,
                'viewed-audit-log': true,
              }));
            }}
          />
        )}

        {activeTab === 'policies' && (
          <PoliciesView
            policies={policies}
            highlightedPolicyId={highlightedPolicyId}
            exceptions={exceptions}
            onSelectException={(exc) => {
              setSelectedExceptionId(exc.id);
              setActiveTab('exceptions');
            }}
          />
        )}

        {activeTab === 'history' && (
          <HistoricalResolutionsView resolutions={historicalResolutions} />
        )}

        {activeTab === 'audit-log' && (
          <AuditLogView
            auditEvents={auditEvents}
            onSelectExceptionById={(excId) => {
              setSelectedExceptionId(excId);
              setActiveTab('exceptions');
            }}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            userRole={userRole}
            onRoleChange={setUserRole}
            autonomyLevel={autonomyLevel}
            onAutonomyChange={setAutonomyLevel}
            lastSyncTime={lastSyncTime}
            totalExceptionsCount={exceptions.length}
            simulateAdapterError={simulateAdapterError}
            onToggleAdapterError={(enabled) => handleToggleSimulatedError(enabled)}
            onResetDemoData={handleResetDemo}
          />
        )}
      </main>

      {/* Enterprise Footer with Demo Mode Disclosure */}
      <footer className="px-4 sm:px-6 mt-6">
        <div className="max-w-[1600px] mx-auto aurora-shell-card rounded-3xl px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-600">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-extrabold text-violet-900 bg-gradient-to-r from-violet-100 to-fuchsia-100 border border-violet-200 px-3 py-1 rounded-full shadow-xs">
              <ShieldAlert className="w-3.5 h-3.5 text-violet-600" />
              {oracleConnection.connected
                ? `CONNECTED: ${oracleConnection.instanceUrl}`
                : 'DEMO MODE ACTIVE'}
            </span>
            <span className="font-semibold text-indigo-950/80">
              Agentic ERP Exception Commander for Oracle Fusion Cloud ERP • Human-in-the-Loop Governance
            </span>
          </div>
          <div className="font-mono text-slate-500">
            Active Role: <strong className="text-indigo-900">{userRole}</strong> | Autonomy:{' '}
            <strong className="text-indigo-900">{autonomyLevel}</strong> | Human Approval: Mandatory
          </div>
        </div>
      </footer>

      {/* Human-in-the-Loop Action Confirmation Modal */}
      {selectedException && (
        <ActionConfirmationModal
          isOpen={pendingAction !== null}
          exception={selectedException}
          actionType={pendingAction}
          userRole={userRole}
          isProcessing={isProcessingAction}
          onConfirm={handleConfirmAction}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {/* Simulate New Exception Modal */}
      <SimulateExceptionModal
        isOpen={isSimulateModalOpen}
        nextSequenceNumber={simulationSequence}
        onClose={() => setIsSimulateModalOpen(false)}
        onCreateSimulatedException={handleCreateSimulatedException}
      />

      {/* Oracle Fusion Instance Connection & Realtime Stream Modal */}
      <OracleConnectionModal
        isOpen={isOracleModalOpen}
        connectionInfo={oracleConnection}
        isRealtimeStreamActive={isRealtimeStreaming}
        onClose={() => setIsOracleModalOpen(false)}
        onConnect={handleConnectOracleInstance}
        onDisconnect={handleDisconnectOracleInstance}
        onStartZeroStaticRealtimeStream={() => handleStartLiveStreamFromZero()}
      />
    </div>
  );
};

export default App;
