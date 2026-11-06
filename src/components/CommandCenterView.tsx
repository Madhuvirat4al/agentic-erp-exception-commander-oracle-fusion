import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertOctagon,
  Clock,
  DollarSign,
  Zap,
  CalendarClock,
  FolderOpen,
  Search,
  RefreshCw,
  PlusCircle,
  Play,
  ArrowUpDown,
  Filter,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  ERPException,
  ExceptionPriority,
  ExceptionStatus,
  ExceptionType,
} from '../types/erp';
import { PriorityBadge, StatusBadge, formatCurrency } from './BadgeHelpers';

interface CommandCenterViewProps {
  exceptions: ERPException[];
  selectedExceptionId: string;
  onSelectException: (id: string, openDetailsView?: boolean) => void;
  onRunInvestigation: (excId?: string) => void;
  onOpenSimulateModal: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
  isInvestigating: boolean;
  serviceError: string | null;
  onToggleSimulatedError: () => void;
  onSearchLiveOracle?: (query: string) => Promise<void> | void;
  isSearchingOracle?: boolean;
  isOracleConnected?: boolean;
  loggedInUsername?: string | null;
}

type SortField = 'priority' | 'amount' | 'ageDays' | 'id';
type SortOrder = 'asc' | 'desc';

const PRIORITY_WEIGHT: Record<ExceptionPriority, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  exceptions,
  selectedExceptionId,
  onSelectException,
  onRunInvestigation,
  onOpenSimulateModal,
  onRefreshData,
  isRefreshing,
  isInvestigating,
  serviceError,
  onToggleSimulatedError,
  onSearchLiveOracle,
  isSearchingOracle = false,
  isOracleConnected = false,
  loggedInUsername = null,
}) => {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [userDataScope, setUserDataScope] = useState<'MY_USER' | 'ALL_SERVER'>('MY_USER');
  const [kpiQuickFilter, setKpiQuickFilter] = useState<
    'ALL' | 'OPEN' | 'CRITICAL' | 'DUE_TODAY' | 'EXPOSURE' | 'CLOSE_BLOCKERS' | 'RESOLVED'
  >('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [buFilter, setBuFilter] = useState<string>('ALL');
  const [ownerFilter, setOwnerFilter] = useState<string>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Sorting States
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Automatically query live Oracle Fusion REST API when user types an invoice number or supplier query
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || !isOracleConnected || !onSearchLiveOracle) return;
    const timer = window.setTimeout(() => {
      onSearchLiveOracle(trimmed);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery, isOracleConnected, onSearchLiveOracle]);

  // Distinct Per-User Invoices (CreatedBy / LastUpdatedBy matching loggedInUsername)
  const myUserExceptions = useMemo(() => {
    if (!loggedInUsername) return exceptions;
    const normUser = loggedInUsername.trim().toUpperCase();
    const matched = exceptions.filter(
      (exc) =>
        exc.assignedOwner.trim().toUpperCase() === normUser ||
        exc.assignedOwnerRole.toUpperCase().includes(normUser)
    );
    return matched;
  }, [exceptions, loggedInUsername]);

  // Active scoped dataset for the logged-in user (prevents different users' login data from collapsing)
  const scopedExceptions = useMemo(() => {
    if (
      userDataScope === 'MY_USER' &&
      loggedInUsername &&
      myUserExceptions.length > 0
    ) {
      return myUserExceptions;
    }
    return exceptions;
  }, [userDataScope, loggedInUsername, myUserExceptions, exceptions]);

  // Unique dropdown values
  const uniqueBusinessUnits = useMemo(
    () => Array.from(new Set(scopedExceptions.map((e) => e.businessUnit))).sort(),
    [scopedExceptions]
  );
  const uniqueOwners = useMemo(
    () => Array.from(new Set(exceptions.map((e) => e.assignedOwner))).sort(),
    [exceptions]
  );

  // KPI Metrics Calculation (isolated to the logged-in user's workspace scope)
  const kpis = useMemo(() => {
    const openList = scopedExceptions.filter(
      (e) => e.status !== 'Resolved' && e.status !== 'Rejected'
    );
    const criticalList = openList.filter((e) => e.priority === 'Critical');
    const dueTodayList = openList.filter(
      (e) => e.slaStatus === 'Breached' || e.slaStatus === 'At Risk (< 4h)'
    );
    const totalExposure = openList.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const closeBlockersCount = openList.filter(
      (e) => e.monthEndCloseBlocker
    ).length;
    const resolvedCount = scopedExceptions.filter(
      (e) => e.status === 'Resolved'
    ).length;

    return {
      openExceptions: openList.length,
      criticalExceptions: criticalList.length,
      exceptionsDueToday: dueTodayList.length,
      avgResolutionTime: '4.2 hrs',
      touchlessRate: '84.6%',
      financialExposure: totalExposure,
      monthEndCloseRisk:
        closeBlockersCount >= 2
          ? `High (${closeBlockersCount} Blockers)`
          : closeBlockersCount === 1
          ? 'Elevated (1 Blocker)'
          : 'Low (0 Blockers)',
      closeBlockersCount,
      resolvedCount,
    };
  }, [scopedExceptions]);

  // Filtered and Sorted Exceptions
  const filteredExceptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    // When searching by invoice number or keyword, search across ALL loaded Oracle records so any invoice number is found immediately
    const basePool = q !== '' ? exceptions : scopedExceptions;

    return basePool
      .filter((exc) => {
        // When user explicitly searches by invoice number or ID, never let a status/priority filter hide a direct invoice match
        const isDirectInvoiceOrIdMatch =
          q !== '' &&
          (exc.invoiceNumber.toLowerCase().includes(q) ||
            exc.id.toLowerCase().includes(q) ||
            exc.poNumber.toLowerCase().includes(q));

        if (!isDirectInvoiceOrIdMatch) {
          const isOpen = exc.status !== 'Resolved' && exc.status !== 'Rejected';

          if (kpiQuickFilter === 'OPEN' && !isOpen) return false;
          if (
            kpiQuickFilter === 'CRITICAL' &&
            (!isOpen || exc.priority !== 'Critical')
          ) {
            return false;
          }
          if (
            kpiQuickFilter === 'DUE_TODAY' &&
            (!isOpen ||
              (exc.slaStatus !== 'Breached' &&
                exc.slaStatus !== 'At Risk (< 4h)'))
          ) {
            return false;
          }
          if (kpiQuickFilter === 'EXPOSURE' && !isOpen) return false;
          if (
            kpiQuickFilter === 'CLOSE_BLOCKERS' &&
            (!isOpen || !exc.monthEndCloseBlocker)
          ) {
            return false;
          }
          if (kpiQuickFilter === 'RESOLVED' && exc.status !== 'Resolved') {
            return false;
          }

          if (statusFilter !== 'ALL' && exc.status !== statusFilter) return false;
          if (priorityFilter !== 'ALL' && exc.priority !== priorityFilter)
            return false;
          if (typeFilter !== 'ALL' && exc.exceptionType !== typeFilter)
            return false;
          if (buFilter !== 'ALL' && exc.businessUnit !== buFilter) return false;
          if (ownerFilter !== 'ALL' && exc.assignedOwner !== ownerFilter)
            return false;
        }

        if (q !== '') {
          const matchId = exc.id.toLowerCase().includes(q);
          const matchInv = exc.invoiceNumber.toLowerCase().includes(q);
          const matchSupplier = exc.supplierName.toLowerCase().includes(q);
          const matchPo = exc.poNumber.toLowerCase().includes(q);
          const matchReceipt = exc.receiptNumber.toLowerCase().includes(q);
          const matchBu = exc.businessUnit.toLowerCase().includes(q);
          const matchLegal = exc.legalEntity.toLowerCase().includes(q);
          const matchDate = exc.invoice.invoiceDate.toLowerCase().includes(q);
          const matchType = exc.exceptionType.toLowerCase().includes(q);
          const matchOwner = exc.assignedOwner.toLowerCase().includes(q);
          const matchStatus = exc.status.toLowerCase().includes(q);
          const matchRootCause = exc.diagnosis.rootCause.toLowerCase().includes(q);
          const matchAction = exc.recommendedActionSummary
            .toLowerCase()
            .includes(q);
          if (
            !matchId &&
            !matchInv &&
            !matchSupplier &&
            !matchPo &&
            !matchReceipt &&
            !matchBu &&
            !matchLegal &&
            !matchDate &&
            !matchType &&
            !matchOwner &&
            !matchStatus &&
            !matchRootCause &&
            !matchAction
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        // If user is searching, rank exact invoiceNumber match #1, prefix match #2, contains match #3
        if (q !== '') {
          const aInv = a.invoiceNumber.toLowerCase();
          const bInv = b.invoiceNumber.toLowerCase();
          const aExact = aInv === q ? 1 : 0;
          const bExact = bInv === q ? 1 : 0;
          if (aExact !== bExact) return bExact - aExact;

          const aStarts = aInv.startsWith(q) ? 1 : 0;
          const bStarts = bInv.startsWith(q) ? 1 : 0;
          if (aStarts !== bStarts) return bStarts - aStarts;

          const aContains = aInv.includes(q) ? 1 : 0;
          const bContains = bInv.includes(q) ? 1 : 0;
          if (aContains !== bContains) return bContains - aContains;
        }

        let comparison = 0;
        if (sortField === 'priority') {
          comparison =
            PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
        } else if (sortField === 'amount') {
          comparison = a.amount - b.amount;
        } else if (sortField === 'ageDays') {
          comparison = a.ageDays - b.ageDays;
        } else if (sortField === 'id') {
          comparison = a.invoiceNumber.localeCompare(b.invoiceNumber);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [
    exceptions,
    scopedExceptions,
    kpiQuickFilter,
    statusFilter,
    priorityFilter,
    typeFilter,
    buFilter,
    ownerFilter,
    searchQuery,
    sortField,
    sortOrder,
  ]);

  const scrollToTable = () => {
    const el = document.getElementById('exceptions-queue-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Interactive click handler for the 4 KPI summary cards & secondary KPI pills
  const handleSelectKpiCard = (
    target: 'ALL' | 'OPEN' | 'CRITICAL' | 'DUE_TODAY' | 'EXPOSURE' | 'CLOSE_BLOCKERS' | 'RESOLVED'
  ) => {
    // Reset dropdown filters so the KPI card shows its exact matching count
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setTypeFilter('ALL');
    setBuFilter('ALL');
    setOwnerFilter('ALL');

    if (kpiQuickFilter === target && target !== 'ALL') {
      // Toggle back to ALL if user clicks the already-active card
      setKpiQuickFilter('ALL');
      setSortField('priority');
      setSortOrder('desc');
      return;
    }

    setKpiQuickFilter(target);
    if (target === 'EXPOSURE') {
      setSortField('amount');
      setSortOrder('desc');
    } else if (target === 'DUE_TODAY') {
      setSortField('ageDays');
      setSortOrder('desc');
    } else {
      setSortField('priority');
      setSortOrder('desc');
    }

    scrollToTable();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setKpiQuickFilter('ALL');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setTypeFilter('ALL');
    setBuFilter('ALL');
    setOwnerFilter('ALL');
    setSortField('priority');
    setSortOrder('desc');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    kpiQuickFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    buFilter !== 'ALL' ||
    ownerFilter !== 'ALL';

  // Primary Spotlight Scenario (currently selected invoice or top matching invoice from active KPI filter)
  const defaultScenario =
    filteredExceptions.find((e) => e.id === selectedExceptionId) ||
    filteredExceptions[0] ||
    scopedExceptions.find((e) => e.id === selectedExceptionId) ||
    scopedExceptions[0] ||
    exceptions[0];

  const activeKpiLabel: Record<typeof kpiQuickFilter, string> = {
    ALL: 'All Invoices',
    OPEN: `Open Exceptions (${kpis.openExceptions} Invoices Currently on Hold)`,
    CRITICAL: `Critical Exceptions (${kpis.criticalExceptions} High-Impact Payment Blockers)`,
    DUE_TODAY: `Exceptions Due Today (${kpis.exceptionsDueToday} Needing Action Within 24h)`,
    EXPOSURE: `Estimated Financial Exposure (${formatCurrency(kpis.financialExposure)} Sorted High → Low)`,
    CLOSE_BLOCKERS: `Month-End Close Blockers (${kpis.closeBlockersCount} Close Risk Invoices)`,
    RESOLVED: `Resolved Touchless & Approved Exceptions (${kpis.resolvedCount})`,
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-4 pb-8 space-y-5">
      {/* Service Error Alert if triggered */}
      {serviceError && (
        <div
          role="alert"
          className="aurora-shell-card p-4 border-rose-300 bg-rose-50/90 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-rose-900">
                Oracle Fusion Adapter Connection Warning
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">{serviceError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleSimulatedError}
            className="px-3.5 py-1.5 text-xs font-bold bg-white text-rose-800 border border-rose-300 rounded-full hover:bg-rose-100"
          >
            Restore Adapter Connection
          </button>
        </div>
      )}

      {/* SECTION 1: CLEAN HERO ROW — COSMIC ORB + SIMPLE 3-STEP PLAIN-ENGLISH CASE SPOTLIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Card (4 cols): Signature Aurora Cosmic Mountain-Wave Orb (Clickable) */}
        <div className="lg:col-span-4 aurora-shell-card p-6 flex flex-col items-center justify-between text-center">
          <div className="w-full flex items-center justify-between text-xs font-bold text-indigo-900/70">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              AI Financial Monitor
            </span>
            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              92% AI Confidence
            </span>
          </div>

          {/* Circular Mountain-Wave Cosmic Orb — Clickable to filter Open Exposure */}
          <div className="my-4">
            <button
              type="button"
              onClick={() => handleSelectKpiCard('EXPOSURE')}
              title="Click to view Open Invoices sorted by Financial Exposure"
              className="w-44 h-44 rounded-full aurora-orb-circle flex flex-col items-center justify-center text-white p-5 select-none cursor-pointer transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-400/50"
            >
              <svg
                className="orb-mountain-svg"
                viewBox="0 0 200 95"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 95L0 58C28 42 52 25 82 48C112 71 142 18 172 34C188 42 195 52 200 58L200 95Z"
                  fill="rgba(255,255,255,0.16)"
                />
                <path
                  d="M0 95L0 68C38 56 68 36 104 58C140 80 165 44 200 62L200 95Z"
                  fill="rgba(244,114,182,0.28)"
                />
              </svg>
              <div className="relative z-10 text-center">
                <span className="text-[11px] uppercase tracking-widest text-indigo-100 font-bold block">
                  Total Money on Hold
                </span>
                <div className="text-3xl font-light tracking-tight mt-1 drop-shadow">
                  ${(kpis.financialExposure / 1000).toFixed(1)}K
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/25 hover:bg-white/35 backdrop-blur-md text-[11px] font-bold transition-colors">
                  <span>{kpis.openExceptions} Open Invoices →</span>
                </div>
              </div>
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed max-w-xs">
            Click the orb or any summary card below to filter the live Oracle Payables queue immediately.
          </p>
        </div>

        {/* Right Card (8 cols): #1 Urgent Issue Explained in 3 Simple Plain-English Boxes */}
        {defaultScenario && (
          <div className="lg:col-span-8 aurora-shell-card p-6 flex flex-col justify-between">
            <div>
              {/* Top Header of Spotlight */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-indigo-100">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                      #1 Urgent Issue Needing Your Review
                    </span>
                    <PriorityBadge priority={defaultScenario.priority} />
                    <StatusBadge status={defaultScenario.status} />
                    {(defaultScenario.id.startsWith('ORA-') || defaultScenario.id.startsWith('EXC-LIVE')) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        LIVE ORACLE FUSION RECORD
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectException(defaultScenario.id, true)}
                    className="text-left group mt-1.5 block"
                  >
                    <h2 className="text-lg sm:text-xl font-extrabold text-indigo-950 group-hover:text-indigo-600 transition-colors">
                      Invoice {defaultScenario.invoiceNumber} — {defaultScenario.supplierName} ({formatCurrency(defaultScenario.amount, defaultScenario.currency)})
                    </h2>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRunInvestigation(defaultScenario.id)}
                    disabled={isInvestigating}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isInvestigating ? 'AI Investigating...' : 'Watch AI Investigate'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectException(defaultScenario.id, true)}
                    className="aurora-pill-btn inline-flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold cursor-pointer"
                  >
                    <span>Review & Fix This Invoice</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 3 Simple Step Cards: 1. Problem -> 2. Why Blocked -> 3. How to Fix (Clickable) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <button
                  type="button"
                  onClick={() => onSelectException(defaultScenario.id, true)}
                  className="text-left rounded-2xl p-4 bg-gradient-to-br from-rose-50/90 to-pink-50/70 border border-rose-200/80 hover:border-rose-400 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="text-xs font-extrabold uppercase tracking-wider text-rose-700 flex items-center justify-between gap-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-rose-600 text-white inline-flex items-center justify-center text-[11px]">
                        1
                      </span>
                      What is the Problem?
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 mt-2">
                    {defaultScenario.exceptionType}
                  </p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-3">
                    {defaultScenario.diagnosis.rootCause}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectException(defaultScenario.id, true)}
                  className="text-left rounded-2xl p-4 bg-gradient-to-br from-amber-50/90 to-orange-50/70 border border-amber-200/80 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="text-xs font-extrabold uppercase tracking-wider text-amber-800 flex items-center justify-between gap-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-600 text-white inline-flex items-center justify-center text-[11px]">
                        2
                      </span>
                      Why is it Blocked?
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 mt-2 line-clamp-2">
                    {defaultScenario.diagnosis.currentBlocker}
                  </p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Policy: <strong>{defaultScenario.diagnosis.policyReference}</strong> ({defaultScenario.diagnosis.policySection}) • PO: <strong>{defaultScenario.poNumber}</strong>
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectException(defaultScenario.id, true)}
                  className="text-left rounded-2xl p-4 bg-gradient-to-br from-emerald-50/90 to-teal-50/70 border border-emerald-200/80 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 flex items-center justify-between gap-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center text-[11px]">
                        3
                      </span>
                      AI Recommended Fix
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 mt-2 line-clamp-2">
                    {defaultScenario.recommendedAction.primaryRecommendation}
                  </p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                    {defaultScenario.recommendedActionSummary}
                  </p>
                </button>
              </div>
            </div>

            {/* Bottom Helper Line */}
            <div className="mt-4 pt-3 border-t border-indigo-100/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span>
                <strong>Assigned Owner:</strong> {defaultScenario.assignedOwner} • <strong>Business Unit:</strong> {defaultScenario.businessUnit} • <strong>Invoice Date:</strong> {defaultScenario.invoice.invoiceDate}
              </span>
              <span className="text-indigo-700 font-semibold">
                Tip: Click any KPI card or invoice row below for instant drill-down.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: 4 CLICKABLE KPI DRILL-DOWN CARDS + INTERACTIVE SECONDARY METRIC STRIP */}
      <section aria-label="Key Performance Indicators" className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Open Exceptions (Clickable) */}
          <button
            type="button"
            onClick={() => handleSelectKpiCard('OPEN')}
            aria-pressed={kpiQuickFilter === 'OPEN'}
            className={`aurora-shell-card p-5 flex items-center justify-between text-left cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group ${
              kpiQuickFilter === 'OPEN'
                ? 'ring-2 ring-indigo-600 bg-indigo-50/95 shadow-lg'
                : 'hover:border-indigo-300'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">
                  Open Exceptions
                </span>
                {kpiQuickFilter === 'OPEN' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-600 text-white">
                    Active ✓
                  </span>
                )}
              </div>
              <div className="text-3xl font-extrabold text-indigo-950 mt-1">
                {kpis.openExceptions}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Invoices currently on hold
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 group-hover:text-indigo-800">
                <span>
                  {kpiQuickFilter === 'OPEN'
                    ? 'Showing open invoices (Click to reset)'
                    : `Click to view ${kpis.openExceptions} open invoices`}
                </span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${
                kpiQuickFilter === 'OPEN'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
              }`}
            >
              <FolderOpen className="w-6 h-6" />
            </div>
          </button>

          {/* Card 2: Critical Exceptions (Clickable) */}
          <button
            type="button"
            onClick={() => handleSelectKpiCard('CRITICAL')}
            aria-pressed={kpiQuickFilter === 'CRITICAL'}
            className={`aurora-shell-card p-5 flex items-center justify-between text-left cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group ${
              kpiQuickFilter === 'CRITICAL'
                ? 'ring-2 ring-rose-600 bg-rose-50/95 shadow-lg'
                : 'hover:border-rose-300'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600">
                  Critical Exceptions
                </span>
                {kpiQuickFilter === 'CRITICAL' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white">
                    Active ✓
                  </span>
                )}
              </div>
              <div className="text-3xl font-extrabold text-rose-600 mt-1">
                {kpis.criticalExceptions}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                High-impact payment blockers
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 group-hover:text-rose-800">
                <span>
                  {kpiQuickFilter === 'CRITICAL'
                    ? 'Showing critical blockers (Click to reset)'
                    : `Click to view ${kpis.criticalExceptions} critical blockers`}
                </span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${
                kpiQuickFilter === 'CRITICAL'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white'
              }`}
            >
              <AlertOctagon className="w-6 h-6" />
            </div>
          </button>

          {/* Card 3: Exceptions Due Today (Clickable) */}
          <button
            type="button"
            onClick={() => handleSelectKpiCard('DUE_TODAY')}
            aria-pressed={kpiQuickFilter === 'DUE_TODAY'}
            className={`aurora-shell-card p-5 flex items-center justify-between text-left cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group ${
              kpiQuickFilter === 'DUE_TODAY'
                ? 'ring-2 ring-amber-600 bg-amber-50/95 shadow-lg'
                : 'hover:border-amber-300'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700">
                  Exceptions Due Today
                </span>
                {kpiQuickFilter === 'DUE_TODAY' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-600 text-white">
                    Active ✓
                  </span>
                )}
              </div>
              <div className="text-3xl font-extrabold text-amber-700 mt-1">
                {kpis.exceptionsDueToday}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Need action within 24 hours
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 group-hover:text-amber-900">
                <span>
                  {kpiQuickFilter === 'DUE_TODAY'
                    ? 'Showing due today (Click to reset)'
                    : `Click to view ${kpis.exceptionsDueToday} due today`}
                </span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${
                kpiQuickFilter === 'DUE_TODAY'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white'
              }`}
            >
              <CalendarClock className="w-6 h-6" />
            </div>
          </button>

          {/* Card 4: Estimated Financial Exposure (Clickable) */}
          <button
            type="button"
            onClick={() => handleSelectKpiCard('EXPOSURE')}
            aria-pressed={kpiQuickFilter === 'EXPOSURE'}
            className={`aurora-shell-card p-5 flex items-center justify-between text-left cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group ${
              kpiQuickFilter === 'EXPOSURE'
                ? 'ring-2 ring-violet-600 bg-violet-50/95 shadow-lg'
                : 'hover:border-violet-300'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-violet-700">
                  Estimated Financial Exposure
                </span>
                {kpiQuickFilter === 'EXPOSURE' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-violet-600 text-white">
                    Sorted High → Low ✓
                  </span>
                )}
              </div>
              <div className="text-3xl font-extrabold text-indigo-950 mt-1">
                {formatCurrency(kpis.financialExposure)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Total invoice value on hold
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-violet-700 group-hover:text-violet-900">
                <span>
                  {kpiQuickFilter === 'EXPOSURE'
                    ? 'Sorted by highest $ exposure (Click to reset)'
                    : 'Click to sort by highest $ amount'}
                </span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${
                kpiQuickFilter === 'EXPOSURE'
                  ? 'bg-violet-600 text-white'
                  : 'bg-violet-100 text-violet-700 group-hover:bg-violet-600 group-hover:text-white'
              }`}
            >
              <DollarSign className="w-6 h-6" />
            </div>
          </button>
        </div>

        {/* Clean Interactive Secondary Strip for Remaining 3 Required KPIs */}
        <div className="aurora-shell-card px-5 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setKpiQuickFilter('OPEN');
                setSortField('ageDays');
                setSortOrder('desc');
                scrollToTable();
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50/80 hover:bg-sky-100 border border-sky-200/80 transition-colors cursor-pointer"
              title="Click to sort open exceptions by age / resolution time"
            >
              <Clock className="w-4 h-4 text-sky-600" />
              <span className="text-slate-600 font-medium">Average Resolution Time:</span>
              <span className="font-extrabold text-indigo-950">{kpis.avgResolutionTime}</span>
              <span className="text-emerald-700 font-semibold">(Sort by Age →)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectKpiCard('RESOLVED')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                kpiQuickFilter === 'RESOLVED'
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : 'bg-emerald-50/80 hover:bg-emerald-100 border-emerald-200/80'
              }`}
              title="Click to view resolved exceptions"
            >
              <Zap className={`w-4 h-4 ${kpiQuickFilter === 'RESOLVED' ? 'text-white' : 'text-emerald-600'}`} />
              <span className={kpiQuickFilter === 'RESOLVED' ? 'text-white font-medium' : 'text-slate-600 font-medium'}>
                Touchless Processing Rate:
              </span>
              <span className={`font-extrabold ${kpiQuickFilter === 'RESOLVED' ? 'text-white' : 'text-emerald-700'}`}>
                {kpis.touchlessRate} ({kpis.resolvedCount} Resolved →)
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectKpiCard('CLOSE_BLOCKERS')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                kpiQuickFilter === 'CLOSE_BLOCKERS'
                  ? 'bg-rose-600 text-white border-rose-700'
                  : 'bg-rose-50/80 hover:bg-rose-100 border-rose-200/80'
              }`}
              title="Click to filter Month-End Close Blockers"
            >
              <AlertTriangle className={`w-4 h-4 ${kpiQuickFilter === 'CLOSE_BLOCKERS' ? 'text-white' : 'text-rose-600'}`} />
              <span className={kpiQuickFilter === 'CLOSE_BLOCKERS' ? 'text-white font-medium' : 'text-slate-600 font-medium'}>
                Month-End Close Risk:
              </span>
              <span className={`font-extrabold ${kpiQuickFilter === 'CLOSE_BLOCKERS' ? 'text-white' : 'text-rose-700'}`}>
                {kpis.monthEndCloseRisk} →
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-200 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh List</span>
            </button>
            <button
              type="button"
              onClick={onOpenSimulateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>+ Add Sample Exception</span>
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 3: FULL-WIDTH, UNCLUTTERED EXCEPTION QUEUE TABLE */}
      <section id="exceptions-queue-section" className="aurora-shell-card overflow-hidden">
        {/* Active KPI Card Filter Banner */}
        {kpiQuickFilter !== 'ALL' && (
          <div className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>
                Active KPI Card Filter: <strong>{activeKpiLabel[kpiQuickFilter]}</strong> ({filteredExceptions.length} matching records shown below)
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSelectKpiCard('ALL')}
              className="px-3 py-1 rounded-full bg-white text-indigo-950 font-extrabold hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              Show All Invoices ({scopedExceptions.length})
            </button>
          </div>
        )}

        {/* Clean Search & Quick Filter Bar */}
        <div className="p-5 border-b border-indigo-100 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-indigo-950">
                  ERP Invoice Exceptions ({filteredExceptions.length} shown)
                </h3>
                {loggedInUsername && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    Active User ID: {loggedInUsername}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {loggedInUsername && userDataScope === 'MY_USER' && myUserExceptions.length > 0
                  ? `Showing isolated login data for User ID "${loggedInUsername}" (${myUserExceptions.length} user-owned invoices). Typing in search queries all ${exceptions.length} server records.`
                  : `Search any Invoice Number directly or click any row to inspect its full Oracle Payables record.`}
              </p>
            </div>

            {/* User Scope Toggle + Quick 1-Click Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {loggedInUsername && myUserExceptions.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setUserDataScope('MY_USER')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                      userDataScope === 'MY_USER'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    My User Data: {loggedInUsername} ({myUserExceptions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserDataScope('ALL_SERVER')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      userDataScope === 'ALL_SERVER'
                        ? 'bg-indigo-700 text-white shadow-sm'
                        : 'bg-white text-indigo-900 border border-indigo-200 hover:bg-indigo-50'
                    }`}
                  >
                    All Authorized BU Invoices ({exceptions.length})
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setKpiQuickFilter('ALL');
                  setPriorityFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  kpiQuickFilter === 'ALL' && priorityFilter === 'ALL' && statusFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-indigo-100 hover:bg-indigo-50'
                }`}
              >
                All ({scopedExceptions.length})
              </button>
              <button
                type="button"
                onClick={() => handleSelectKpiCard('OPEN')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  kpiQuickFilter === 'OPEN'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
                }`}
              >
                Open ({kpis.openExceptions})
              </button>
              <button
                type="button"
                onClick={() => handleSelectKpiCard('CRITICAL')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  kpiQuickFilter === 'CRITICAL' || priorityFilter === 'Critical'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                }`}
              >
                Critical ({kpis.criticalExceptions})
              </button>
              <button
                type="button"
                onClick={() => handleSelectKpiCard('DUE_TODAY')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  kpiQuickFilter === 'DUE_TODAY'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                }`}
              >
                Due Today ({kpis.exceptionsDueToday})
              </button>
              <button
                type="button"
                onClick={() => {
                  setKpiQuickFilter('ALL');
                  setStatusFilter('Waiting for Approval');
                  setPriorityFilter('ALL');
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'Waiting for Approval'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                }`}
              >
                Waiting for Approval
              </button>
              <button
                type="button"
                onClick={() => handleSelectKpiCard('RESOLVED')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  kpiQuickFilter === 'RESOLVED' || statusFilter === 'Resolved'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                Resolved ({kpis.resolvedCount})
              </button>
            </div>
          </div>

          {/* Search Input + Live Oracle Query Button + Toggle for Detailed Dropdown Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim() && onSearchLiveOracle) {
                      onSearchLiveOracle(searchQuery.trim());
                    }
                  }}
                  placeholder="Search by Invoice Number (e.g., DEMOINV_23102026, MASS_TEST_1, INV-9326, 1, INV-10482), Supplier, or PO..."
                  className="w-full pl-10 pr-9 py-2.5 text-xs bg-white border border-indigo-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 font-semibold text-indigo-950 shadow-xs"
                  aria-label="Search exceptions"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    aria-label="Clear search query"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isOracleConnected && onSearchLiveOracle && (
                <button
                  type="button"
                  onClick={() => {
                    if (searchQuery.trim()) {
                      onSearchLiveOracle(searchQuery.trim());
                    } else {
                      onRefreshData();
                    }
                  }}
                  disabled={isSearchingOracle}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSearchingOracle ? 'animate-spin' : ''}`} />
                  <span>{isSearchingOracle ? 'Searching Oracle...' : 'Query Live Oracle'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white border border-indigo-200 text-indigo-900 hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                <span>{showAdvancedFilters ? 'Hide Extra Filters' : 'More Filters (5)'}</span>
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-3.5 py-2 rounded-full text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Collapsible 5 Working Filter Dropdowns (Status, Priority, Type, Business Unit, Owner) */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-indigo-100">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by Status"
                className="px-3 py-2 text-xs bg-white border border-indigo-200 rounded-xl text-indigo-950 font-semibold"
              >
                <option value="ALL">All Statuses</option>
                {(
                  [
                    'New',
                    'Investigating',
                    'Waiting for Approval',
                    'Action Required',
                    'Resolved',
                    'Rejected',
                  ] as ExceptionStatus[]
                ).map((st) => (
                  <option key={st} value={st}>
                    Status: {st}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                aria-label="Filter by Priority"
                className="px-3 py-2 text-xs bg-white border border-indigo-200 rounded-xl text-indigo-950 font-semibold"
              >
                <option value="ALL">All Priorities</option>
                {(['Critical', 'High', 'Medium', 'Low'] as ExceptionPriority[]).map(
                  (pr) => (
                    <option key={pr} value={pr}>
                      Priority: {pr}
                    </option>
                  )
                )}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter by Exception Type"
                className="px-3 py-2 text-xs bg-white border border-indigo-200 rounded-xl text-indigo-950 font-semibold"
              >
                <option value="ALL">All Issue Types</option>
                {(
                  [
                    'Invoice Price Mismatch',
                    'Invoice Quantity Mismatch',
                    'Duplicate Invoice',
                    'Missing Supplier Tax Details',
                    'Approval Delay',
                    'Incorrect GL Coding',
                    'Month-End Close Blocker',
                  ] as ExceptionType[]
                ).map((tp) => (
                  <option key={tp} value={tp}>
                    {tp}
                  </option>
                ))}
              </select>

              <select
                value={buFilter}
                onChange={(e) => setBuFilter(e.target.value)}
                aria-label="Filter by Business Unit"
                className="px-3 py-2 text-xs bg-white border border-indigo-200 rounded-xl text-indigo-950 font-semibold"
              >
                <option value="ALL">All Business Units</option>
                {uniqueBusinessUnits.map((bu) => (
                  <option key={bu} value={bu}>
                    BU: {bu}
                  </option>
                ))}
              </select>

              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                aria-label="Filter by Assigned Owner"
                className="px-3 py-2 text-xs bg-white border border-indigo-200 rounded-xl text-indigo-950 font-semibold"
              >
                <option value="ALL">All Assigned Owners</option>
                {uniqueOwners.map((ow) => (
                  <option key={ow} value={ow}>
                    Owner: {ow}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Clean, Spacious Full-Width Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-indigo-50/60 border-b border-indigo-100 text-[11px] font-extrabold text-indigo-900/75 uppercase tracking-wider">
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort('id')}
                    className="inline-flex items-center gap-1 hover:text-indigo-950"
                  >
                    <span>Invoice & ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4">Supplier & Business Unit</th>
                <th className="py-3.5 px-4">What&apos;s Wrong (Exception Type)</th>
                <th className="py-3.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('amount')}
                    className="inline-flex items-center gap-1 hover:text-indigo-950 ml-auto"
                  >
                    <span>Amount & Age</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort('priority')}
                    className="inline-flex items-center gap-1 hover:text-indigo-950"
                  >
                    <span>Priority & Status</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4">Assigned Owner</th>
                <th className="py-3.5 px-4">AI Recommended Fix</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-100/70 text-xs">
              {filteredExceptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Filter className="w-6 h-6 text-indigo-400" />
                      <p className="font-bold text-indigo-950">
                        {isSearchingOracle
                          ? `Searching live Oracle Fusion REST API for "${searchQuery}"...`
                          : `No invoices found matching "${searchQuery || 'your current filter'}".`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {isOracleConnected && searchQuery.trim() && onSearchLiveOracle && (
                          <button
                            type="button"
                            onClick={() => onSearchLiveOracle(searchQuery.trim())}
                            className="px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-600 text-white"
                          >
                            Search Live Oracle REST for &ldquo;{searchQuery.trim()}&rdquo;
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={resetAllFilters}
                          className="px-4 py-1.5 rounded-full text-xs font-bold bg-indigo-600 text-white"
                        >
                          Show All Invoices
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExceptions.map((exc) => {
                  const isSelected = exc.id === selectedExceptionId;
                  const isLiveOracle =
                    exc.id.startsWith('ORA-') || exc.id.startsWith('EXC-LIVE');
                  return (
                    <tr
                      key={exc.id}
                      onClick={() => onSelectException(exc.id, true)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/90 hover:bg-indigo-100/80'
                          : 'bg-white/60 hover:bg-indigo-50/50'
                      }`}
                    >
                      {/* 1. Invoice & ID */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-sm text-indigo-950 font-mono">
                          {exc.invoiceNumber}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-mono text-slate-500">
                            {exc.id}
                          </span>
                          {isLiveOracle ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              LIVE ORACLE
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                              Demo
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Supplier & Business Unit */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {exc.supplierName}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {exc.businessUnit} • PO: <span className="font-mono">{exc.poNumber}</span>
                        </div>
                      </td>

                      {/* 3. What's Wrong */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-indigo-950">
                          {exc.exceptionType}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {exc.diagnosis.rootCause}
                        </div>
                      </td>

                      {/* 4. Amount & Age */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-extrabold text-sm text-slate-900 font-mono">
                          {formatCurrency(exc.amount, exc.currency)}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Date: {exc.invoice.invoiceDate} ({exc.ageDays}d)
                        </div>
                      </td>

                      {/* 5. Priority & Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <PriorityBadge priority={exc.priority} />
                          <StatusBadge status={exc.status} />
                        </div>
                      </td>

                      {/* 6. Assigned Owner */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {exc.assignedOwner}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {exc.assignedOwnerRole}
                        </div>
                      </td>

                      {/* 7. AI Recommended Fix */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-700 font-medium line-clamp-2 leading-snug">
                          {exc.recommendedActionSummary}
                        </p>
                      </td>

                      {/* 8. Action Button */}
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectException(exc.id, true)}
                          className="aurora-pill-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold"
                        >
                          {exc.status === 'Resolved' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>View</span>
                            </>
                          ) : (
                            <>
                              <span>Review & Fix</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
