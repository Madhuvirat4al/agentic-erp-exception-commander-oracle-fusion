import React, { useState } from 'react';
import {
  History,
  Search,
  Clock,
  CheckCircle2,
  Building2,
  UserCheck,
  Sparkles,
  Filter,
} from 'lucide-react';
import { HistoricalResolution, ExceptionType } from '../types/erp';

interface HistoricalResolutionsViewProps {
  resolutions: HistoricalResolution[];
}

export const HistoricalResolutionsView: React.FC<HistoricalResolutionsViewProps> = ({
  resolutions,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const uniqueTypes = Array.from(
    new Set(resolutions.map((r) => r.exceptionType))
  );

  const filteredResolutions = resolutions.filter((res) => {
    const matchesType =
      selectedType === 'ALL' || res.exceptionType === selectedType;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      res.id.toLowerCase().includes(q) ||
      res.exceptionType.toLowerCase().includes(q) ||
      res.previousRootCause.toLowerCase().includes(q) ||
      res.resolutionUsed.toLowerCase().includes(q) ||
      res.businessUnit.toLowerCase().includes(q) ||
      res.resolvedBy.toLowerCase().includes(q);

    return matchesType && matchesQuery;
  });

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-5">
      {/* Header & Agent Memory Explanation */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <History className="w-3.5 h-3.5" />
              Institutional Resolution Memory
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {resolutions.length} Verified Precedents
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Historical Resolutions Knowledge Graph
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Previously resolved Oracle Fusion exceptions used by the Agentic Exception Commander to benchmark resolution speed and recommend proven next-best actions.
          </p>
        </div>

        {/* Agent Pattern Matching Callout */}
        <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-xl px-4 py-3 flex items-start gap-3 max-w-md">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-950">
            <span className="font-bold">How the Agent Uses This Data:</span> When a new exception is detected, `compareHistoricalResolutions()` matches exception type, variance profile, and business unit to surface the safest resolution path.
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search root cause, resolution used, user, business unit..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs font-medium text-slate-600 shrink-0">
            Exception Type:
          </span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Exception Types ({resolutions.length})</option>
            {uniqueTypes.map((t: ExceptionType) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Historical Resolutions Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Case ID</th>
                <th className="py-3.5 px-4">Exception Type</th>
                <th className="py-3.5 px-4">Previous Root Cause</th>
                <th className="py-3.5 px-4">Resolution Used</th>
                <th className="py-3.5 px-4">Time to Resolve</th>
                <th className="py-3.5 px-4">Business Unit</th>
                <th className="py-3.5 px-4">Outcome</th>
                <th className="py-3.5 px-4">Resolved By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs">
              {filteredResolutions.map((res) => (
                <tr
                  key={res.id}
                  className="hover:bg-indigo-50/30 transition-colors align-top"
                >
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                      {res.id}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      {res.resolvedDate}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                    {res.exceptionType}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 max-w-xs leading-relaxed">
                    {res.previousRootCause}
                  </td>
                  <td className="py-3.5 px-4 text-slate-800 font-medium max-w-xs leading-relaxed">
                    {res.resolutionUsed}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      <Clock className="w-3 h-3 text-amber-600" />
                      {res.timeToResolve}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                    <div className="inline-flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {res.businessUnit}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 max-w-xs">
                    <div className="inline-flex items-start gap-1.5 text-emerald-800 bg-emerald-50/70 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-snug">{res.outcome}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                      {res.resolvedBy}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredResolutions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No historical resolution records match your current search filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
