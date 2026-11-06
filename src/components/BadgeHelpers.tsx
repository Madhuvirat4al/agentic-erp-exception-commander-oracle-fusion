import React from 'react';
import { ExceptionPriority, ExceptionStatus } from '../types/erp';

export const PriorityBadge: React.FC<{ priority: ExceptionPriority }> = ({ priority }) => {
  const styles: Record<ExceptionPriority, string> = {
    Critical: 'bg-red-100 text-red-800 border-red-300',
    High: 'bg-amber-100 text-amber-800 border-amber-300',
    Medium: 'bg-sky-100 text-sky-800 border-sky-300',
    Low: 'bg-slate-100 text-slate-700 border-slate-300',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${styles[priority]}`}
    >
      {priority}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: ExceptionStatus }> = ({ status }) => {
  const styles: Record<ExceptionStatus, string> = {
    New: 'bg-sky-50 text-sky-800 border-sky-300',
    Investigating: 'bg-teal-50 text-teal-800 border-teal-300',
    'Waiting for Approval': 'bg-amber-100 text-amber-900 border-amber-300',
    'Action Required': 'bg-red-100 text-red-900 border-red-300',
    Resolved: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    Rejected: 'bg-slate-200 text-slate-800 border-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border whitespace-nowrap ${styles[status]}`}
    >
      {status}
    </span>
  );
};

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
