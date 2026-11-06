import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  ShieldCheck,
  Calendar,
  UserCheck,
  FileText,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { PolicyDocument, ERPException } from '../types/erp';

interface PoliciesViewProps {
  policies: PolicyDocument[];
  highlightedPolicyId?: string | null;
  exceptions: ERPException[];
  onSelectException: (exc: ERPException) => void;
}

export const PoliciesView: React.FC<PoliciesViewProps> = ({
  policies,
  highlightedPolicyId,
  exceptions,
  onSelectException,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(
    highlightedPolicyId || policies[0]?.id || 'POL-001'
  );

  React.useEffect(() => {
    if (highlightedPolicyId) {
      setSelectedPolicyId(highlightedPolicyId);
    }
  }, [highlightedPolicyId]);

  const filteredPolicies = policies.filter((pol) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      pol.title.toLowerCase().includes(q) ||
      pol.id.toLowerCase().includes(q) ||
      pol.shortDescription.toLowerCase().includes(q) ||
      pol.referenceSection.toLowerCase().includes(q) ||
      pol.owner.toLowerCase().includes(q)
    );
  });

  const activePolicy =
    policies.find((p) => p.id === selectedPolicyId) || filteredPolicies[0] || policies[0];

  const linkedExceptions = exceptions.filter(
    (exc) => exc.diagnosis.policyId === activePolicy?.id
  );

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-5">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <BookOpen className="w-3.5 h-3.5" />
              Enterprise Governance Library
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {policies.length} Active Oracle ERP Policies
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Policies & Knowledge Base
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Authoritative financial controls and procurement tolerances referenced by the Agentic Exception Commander during automated investigations.
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search policy title, section, owner..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Main Split View: Policy Cards List + Detailed Policy Document */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left List of 6 Policies (5 cols) */}
        <div className="lg:col-span-5 space-y-2.5">
          {filteredPolicies.map((pol) => {
            const isSelected = activePolicy?.id === pol.id;
            const matchCount = exceptions.filter(
              (e) => e.diagnosis.policyId === pol.id
            ).length;

            return (
              <button
                key={pol.id}
                onClick={() => setSelectedPolicyId(pol.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-indigo-950 text-white border-indigo-900 shadow-md ring-2 ring-indigo-500/30'
                    : 'bg-white text-slate-800 border-slate-200/90 hover:border-indigo-300 hover:bg-slate-50/70 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                      isSelected
                        ? 'bg-indigo-800 text-indigo-200 border border-indigo-700'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {pol.id} ({pol.code})
                  </span>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-indigo-900 text-indigo-200'
                        : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    {matchCount} linked exception{matchCount === 1 ? '' : 's'}
                  </span>
                </div>

                <h3
                  className={`text-sm font-bold ${
                    isSelected ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {pol.title}
                </h3>
                <p
                  className={`text-xs mt-1 line-clamp-2 ${
                    isSelected ? 'text-indigo-200' : 'text-slate-500'
                  }`}
                >
                  {pol.shortDescription}
                </p>

                <div
                  className={`flex items-center justify-between gap-2 mt-3 pt-2.5 border-t text-[11px] ${
                    isSelected
                      ? 'border-indigo-800/80 text-indigo-300'
                      : 'border-slate-100 text-slate-400'
                  }`}
                >
                  <span className="truncate">{pol.referenceSection}</span>
                  <span className="shrink-0">Eff: {pol.effectiveDate}</span>
                </div>
              </button>
            );
          })}

          {filteredPolicies.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">
                No matching policies found
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Try clearing your search filter to see all 6 corporate policies.
              </p>
            </div>
          )}
        </div>

        {/* Right Policy Inspector (7 cols) */}
        {activePolicy && (
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Document Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                    {activePolicy.id} • {activePolicy.code}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Active Standard
                  </span>
                </div>
                <span className="text-xs text-slate-300 font-mono">
                  Ref: {activePolicy.referenceSection}
                </span>
              </div>

              <h2 className="text-xl font-bold text-white tracking-tight">
                {activePolicy.title}
              </h2>
              <p className="text-xs text-indigo-200 mt-1.5 leading-relaxed">
                {activePolicy.shortDescription}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                      Policy Owner
                    </div>
                    <div className="font-semibold text-white">
                      {activePolicy.owner}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                      Effective Date
                    </div>
                    <div className="font-semibold text-white">
                      {activePolicy.effectiveDate}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                      Relevant Reference Section
                    </div>
                    <div className="font-semibold text-indigo-300 font-mono">
                      {activePolicy.referenceSection}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Policy Rules */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  Enforced Policy Rules & Tolerances
                </h4>
                <div className="space-y-2.5">
                  {activePolicy.rules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80"
                    >
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {rule}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Practical ERP Example */}
              <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Practical Oracle Fusion Scenario Example
                </div>
                <p className="text-xs text-amber-950/90 leading-relaxed">
                  {activePolicy.example}
                </p>
              </div>

              {/* Exceptions Referencing This Policy */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-indigo-600" />
                    Exceptions Evaluated Against {activePolicy.id} ({linkedExceptions.length})
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Click an exception to inspect agent policy citation
                  </span>
                </div>

                {linkedExceptions.length > 0 ? (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                    {linkedExceptions.map((exc) => (
                      <div
                        key={exc.id}
                        onClick={() => onSelectException(exc)}
                        className="p-3 bg-white hover:bg-indigo-50/50 transition-colors cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-600">
                              {exc.id}
                            </span>
                            <span className="text-xs font-semibold text-slate-800">
                              {exc.exceptionType}
                            </span>
                            <span className="text-xs text-slate-500">
                              • {exc.supplierName} ({exc.invoiceNumber})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {exc.diagnosis.varianceDetails}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 shrink-0"
                        >
                          Inspect
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    No active exceptions currently violate this policy.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
