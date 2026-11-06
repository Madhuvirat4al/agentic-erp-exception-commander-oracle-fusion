import React, { useState } from 'react';
import {
  Radio,
  Server,
  Play,
  Pause,
  FastForward,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AgentStatus } from '../types/erp';
import { OracleConnectionInfo } from '../services/oracleFusionAdapter';

export interface TelemetryLogEntry {
  id: string;
  timestamp: string;
  stage: AgentStatus | 'REST Poll';
  message: string;
  invoiceNumber?: string;
}

interface RealtimeAgentStreamBannerProps {
  connectionInfo: OracleConnectionInfo;
  isStreaming: boolean;
  streamQueueRemaining: number;
  currentStreamStage: AgentStatus;
  telemetryLogs: TelemetryLogEntry[];
  onOpenConnectModal: () => void;
  onStartLiveStreamFromZero: () => void;
  onTogglePauseStream: () => void;
  onStepNextTransactionNow: () => void;
}

export const RealtimeAgentStreamBanner: React.FC<RealtimeAgentStreamBannerProps> = ({
  connectionInfo,
  isStreaming,
  streamQueueRemaining,
  telemetryLogs,
  onOpenConnectModal,
  onStartLiveStreamFromZero,
  onTogglePauseStream,
  onStepNextTransactionNow,
}) => {
  const [showLogs, setShowLogs] = useState(false);
  const latestLog = telemetryLogs[0];

  return (
    <div className="px-4 sm:px-6 pt-3">
      <div className="max-w-[1600px] mx-auto aurora-shell-card rounded-2xl px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Clear, Plain-English Data Source Status */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {connectionInfo.connected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Live Oracle Connected ({connectionInfo.username})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                Demo Data Mode (Safe Sandbox)
              </span>
            )}

            <span className="text-slate-600 font-medium hidden md:inline">
              {connectionInfo.connected
                ? `Pulling live data from ${connectionInfo.instanceUrl}`
                : 'Showing sample Oracle ERP invoices so you can explore right away.'}
            </span>

            {streamQueueRemaining > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-800">
                <Radio className={`w-3 h-3 text-violet-600 ${isStreaming ? 'animate-ping' : ''}`} />
                {isStreaming
                  ? `AI scanning ${streamQueueRemaining} more incoming invoices...`
                  : `${streamQueueRemaining} incoming invoices paused`}
              </span>
            )}
          </div>

          {/* Right: Simple, Uncluttered Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {streamQueueRemaining > 0 && (
              <>
                <button
                  type="button"
                  onClick={onTogglePauseStream}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-200 transition-colors"
                >
                  {isStreaming ? (
                    <>
                      <Pause className="w-3 h-3 text-amber-600" />
                      Pause Feed
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 text-emerald-600" />
                      Resume Feed
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onStepNextTransactionNow}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-200 transition-colors"
                >
                  <FastForward className="w-3 h-3 text-indigo-600" />
                  Load Next
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onStartLiveStreamFromZero}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white hover:bg-violet-50 text-violet-800 border border-violet-200 transition-colors"
              title="Clear table and watch the AI discover invoices one by one"
            >
              <Radio className="w-3 h-3 text-violet-600" />
              Replay Live Discovery
            </button>

            <button
              type="button"
              onClick={onOpenConnectModal}
              className="aurora-pill-btn inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold"
            >
              <Server className="w-3.5 h-3.5" />
              {connectionInfo.connected ? 'Oracle Settings' : 'Connect Live Oracle'}
            </button>

            <button
              type="button"
              onClick={() => setShowLogs((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-500 hover:text-indigo-900 hover:bg-white/70"
            >
              <span>{showLogs ? 'Hide Log' : 'Activity Log'}</span>
              {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Collapsible Activity Log (Hidden by default so the UI stays super clean!) */}
        {showLogs && latestLog && (
          <div className="mt-2.5 pt-2.5 border-t border-indigo-100 text-xs text-slate-600 flex items-center justify-between gap-2">
            <div className="truncate">
              <span className="font-bold text-indigo-900 mr-2">Latest AI Activity ({latestLog.timestamp}):</span>
              <span>{latestLog.message}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
