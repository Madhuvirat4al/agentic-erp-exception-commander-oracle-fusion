import React, { useState } from 'react';
import {
  Server,
  Lock,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Radio,
  Unplug,
  Globe,
  User,
  KeyRound,
} from 'lucide-react';
import { OracleConnectionInfo } from '../services/oracleFusionAdapter';

interface OracleConnectionModalProps {
  isOpen: boolean;
  connectionInfo: OracleConnectionInfo;
  isRealtimeStreamActive: boolean;
  onClose: () => void;
  onConnect: (params: {
    instanceUrl: string;
    username: string;
    password: string;
    clearStaticAndStreamLive: boolean;
  }) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onStartZeroStaticRealtimeStream: () => void;
}

export const VISION_DEMO_USERS = [
  { username: 'FIN_IMPL', label: 'FIN_IMPL (Financials / AP Invoices & Holds)' },
  { username: 'lisa.jones', label: 'lisa.jones (Buyer / Procurement & AP)' },
  { username: 'SCM_IMPL', label: 'SCM_IMPL (Supply Chain / POs & Suppliers)' },
  { username: 'FAS01.Student', label: 'FAS01.Student (Financials Student)' },
  { username: 'PPM01.STUDENT', label: 'PPM01.STUDENT (Project Portfolio)' },
];

export const OracleConnectionModal: React.FC<OracleConnectionModalProps> = ({
  isOpen,
  connectionInfo,
  isRealtimeStreamActive,
  onClose,
  onConnect,
  onDisconnect,
  onStartZeroStaticRealtimeStream,
}) => {
  const [instanceUrl, setInstanceUrl] = useState(
    connectionInfo.instanceUrl ||
      'https://fa-esfe-dev19-saasfademo1.ds-fa.oraclepdemos.com/crmUI/faces/FuseWelcome?fndThemeName=Vision_Default'
  );
  const [username, setUsername] = useState(connectionInfo.username || 'FIN_IMPL');
  const [password, setPassword] = useState('');
  const [clearStaticAndStreamLive, setClearStaticAndStreamLive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!instanceUrl.trim() || !username.trim() || !password) {
      setErrorMsg('Please enter your Oracle Fusion Instance URL, User ID, and Password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConnect({
        instanceUrl: instanceUrl.trim(),
        username: username.trim(),
        password,
        clearStaticAndStreamLive,
      });
      setPassword('');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to connect to Oracle Fusion instance'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-indigo-950/45 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="oracle-conn-modal-title"
    >
      <div className="aurora-shell-card rounded-3xl max-w-xl w-full overflow-hidden border border-white/90 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-950 via-violet-900 to-fuchsia-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full aurora-orb-circle flex items-center justify-center shrink-0">
              <Server className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 id="oracle-conn-modal-title" className="text-sm font-extrabold">
                Oracle Fusion Cloud ERP — Vision Instance & Realtime Agent
              </h3>
              <p className="text-[11px] text-indigo-200">
                Connect your Oracle Fusion Vision instance via local server proxy & stream subledger exceptions live
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 bg-white/80 backdrop-blur-xl">
          {/* Active Connection Banner if connected */}
          {connectionInfo.connected && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-emerald-950">
                    Connected to {connectionInfo.instanceUrl}
                  </div>
                  <div className="text-emerald-800 mt-0.5">
                    Authenticated User ID: <span className="font-mono font-bold">{connectionInfo.username}</span> • Connected at {connectionInfo.connectedAt}
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    {connectionInfo.message}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onDisconnect}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300 shrink-0"
              >
                <Unplug className="w-3.5 h-3.5" />
                Disconnect
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2 text-xs text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Oracle Fusion Instance URL (UI URL or Base Host)
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={instanceUrl}
                  onChange={(e) => setInstanceUrl(e.target.value)}
                  placeholder="https://fa-esfe-dev19-saasfademo1.ds-fa.oraclepdemos.com/..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                  autoComplete="off"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Auto-extracts origin <code className="font-mono text-indigo-700">https://fa-esfe-dev19-saasfademo1.ds-fa.oraclepdemos.com</code> and queries <code className="font-mono text-indigo-700">/fscmRestApi/resources/11.13.18.05/invoices</code>, <code className="font-mono text-indigo-700">/invoiceHolds</code>, <code className="font-mono text-indigo-700">/purchaseOrders</code>, and <code className="font-mono text-indigo-700">/suppliers</code>.
              </p>
            </div>

            {/* Quick-select Vision User Accounts */}
            <div>
              <span className="block text-[11px] font-bold text-slate-600 mb-1.5">
                Quick-Select Vision Demo User ID (works with any role below):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {VISION_DEMO_USERS.map((u) => {
                  const active = username.trim().toLowerCase() === u.username.toLowerCase();
                  return (
                    <button
                      key={u.username}
                      type="button"
                      onClick={() => setUsername(u.username)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                          : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-indigo-50 hover:border-indigo-300'
                      }`}
                    >
                      {u.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Oracle User ID / Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. FIN_IMPL or lisa.jones"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Oracle Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Vision instance password"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            {/* Realtime Stream Option */}
            <label className="flex items-start gap-2.5 p-3 rounded-lg bg-indigo-50/70 border border-indigo-200 cursor-pointer">
              <input
                type="checkbox"
                checked={clearStaticAndStreamLive}
                onChange={(e) => setClearStaticAndStreamLive(e.target.checked)}
                className="mt-0.5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <span className="font-bold text-indigo-950">
                  Clear pre-loaded static data & run Realtime Agent Discovery Stream
                </span>
                <p className="text-[11px] text-indigo-800 mt-0.5">
                  Starts with an empty exception queue (0 static items) and streams incoming Oracle subledger transactions live as the agent observes, detects, and diagnoses each exception in real time.
                </p>
              </div>
            </label>

            {/* Security Notice */}
            <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Transient Session Security:</strong> Your User ID and Password are sent only to your local Vite server proxy in volatile RAM to authenticate REST calls. They are never logged, committed, or written to disk.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-indigo-100">
              <button
                type="button"
                onClick={() => {
                  onStartZeroStaticRealtimeStream();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-extrabold bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white shadow-sm transition-all"
              >
                <Radio className={`w-3.5 h-3.5 text-white ${isRealtimeStreamActive ? 'animate-ping' : ''}`} />
                Clear Static Data & Stream Live Now
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="aurora-pill-btn inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Connecting to Oracle REST...
                    </>
                  ) : (
                    <>
                      <Server className="w-3.5 h-3.5" />
                      Connect Instance & Start Live Agent
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
