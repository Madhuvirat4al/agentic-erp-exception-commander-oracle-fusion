import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Bot,
  User,
  Clock,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { AuditEvent, AuditEventType } from '../types/erp';

interface AuditLogViewProps {
  auditEvents: AuditEvent[];
  onSelectExceptionById: (exceptionId: string) => void;
}

const EVENT_TYPE_BADGES: Record<AuditEventType, string> = {
  'Exception created': 'bg-slate-100 text-slate-700 border-slate-300',
  'Agent investigation started': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Diagnosis generated': 'bg-purple-50 text-purple-700 border-purple-200',
  'Recommendation generated': 'bg-blue-50 text-blue-700 border-blue-200',
  'Message drafted': 'bg-amber-50 text-amber-800 border-amber-200',
  'Approval requested': 'bg-orange-50 text-orange-800 border-orange-200',
  'User action confirmed': 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Exception resolved': 'bg-emerald-100 text-emerald-900 border-emerald-300',
  'Exception rejected': 'bg-rose-50 text-rose-800 border-rose-200',
};

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  auditEvents,
  onSelectExceptionById,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');

  const eventTypes: AuditEventType[] = [
    'Exception created',
    'Agent investigation started',
    'Diagnosis generated',
    'Recommendation generated',
    'Message drafted',
    'Approval requested',
    'User action confirmed',
    'Exception resolved',
    'Exception rejected',
  ];

  const filteredEvents = auditEvents.filter((evt) => {
    const matchesType =
      selectedEventType === 'ALL' || evt.eventType === selectedEventType;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      evt.exceptionId.toLowerCase().includes(q) ||
      evt.invoiceNumber.toLowerCase().includes(q) ||
      evt.actor.toLowerCase().includes(q) ||
      evt.eventType.toLowerCase().includes(q) ||
      evt.action.toLowerCase().includes(q) ||
      evt.result.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-5">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-white">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              SOX-Compliant Immutable Audit Trail
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              Demo Mode Sandbox Active
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Enterprise Exception & Agent Audit Log
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete chronological history of every exception lifecycle event, AI investigation step, human approval decision, and Demo Mode execution.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Logged Events
            </div>
            <div className="text-lg font-bold text-slate-900 font-mono">
              {auditEvents.length}
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Production Mutations
            </div>
            <div className="text-sm font-bold text-emerald-700">
              0 (100% Demo Mode Isolated)
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by Exception ID (e.g. EXC-9041), actor, action, result..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs font-medium text-slate-600 shrink-0">
            Event Type:
          </span>
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Event Types ({auditEvents.length})</option>
            {eventTypes.map((et) => (
              <option key={et} value={et}>
                {et}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">User or Agent</th>
                <th className="py-3.5 px-4">Event Type</th>
                <th className="py-3.5 px-4">Exception ID</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Result</th>
                <th className="py-3.5 px-4">Approval Status</th>
                <th className="py-3.5 px-4">Demo Mode Indicator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs">
              {filteredEvents.map((evt) => {
                const isAgent =
                  evt.actorType === 'Agent' || evt.actorType === 'System';
                return (
                  <tr
                    key={evt.id}
                    className="hover:bg-slate-50/80 transition-colors align-top"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      <div className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatTimestamp(evt.timestamp)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {evt.id}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                        {isAgent ? (
                          <Bot className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                        <span>{evt.actor}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          EVENT_TYPE_BADGES[evt.eventType] ||
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {evt.eventType}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectExceptionById(evt.exceptionId)}
                        className="inline-flex items-center gap-1 font-mono font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200/70 transition-colors"
                      >
                        {evt.exceptionId}
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs">
                      {evt.action}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 max-w-sm leading-relaxed">
                      {evt.result}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          evt.approvalStatus.includes('Approved') ||
                          evt.approvalStatus.includes('Confirmed')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : evt.approvalStatus.includes('Pending')
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {evt.approvalStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {evt.demoMode ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <ShieldAlert className="w-3 h-3 text-amber-700" />
                          DEMO MODE (Mock State)
                        </span>
                      ) : (
                        <span className="text-slate-400">Standard</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
