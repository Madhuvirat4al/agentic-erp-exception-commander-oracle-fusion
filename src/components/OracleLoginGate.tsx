import React, { useState } from 'react';
import {
  Cpu,
  Globe,
  User,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Server,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface OracleLoginGateProps {
  defaultInstanceUrl?: string;
  onLoginAndConnect: (params: {
    instanceUrl: string;
    username: string;
    password: string;
  }) => Promise<void>;
}

export const OracleLoginGate: React.FC<OracleLoginGateProps> = ({
  defaultInstanceUrl = 'https://fa-esfe-dev19-saasfademo1.ds-fa.oraclepdemos.com',
  onLoginAndConnect,
}) => {
  const [instanceUrl, setInstanceUrl] = useState(defaultInstanceUrl);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUrl = instanceUrl.trim();
    const trimmedUser = username.trim();

    if (!trimmedUrl || !trimmedUser || !password) {
      setErrorMessage('Please enter the Oracle Server URL, your User ID, and your Password.');
      return;
    }

    setIsConnecting(true);
    setStatusMessage(`Authenticating User ID "${trimmedUser}" with Oracle Fusion Server...`);

    try {
      await onLoginAndConnect({
        instanceUrl: trimmedUrl,
        username: trimmedUser,
        password,
      });
      setPassword('');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to authenticate with Oracle Fusion Server.';
      setErrorMessage(msg);
      setStatusMessage(null);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Minimal Brand Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full aurora-orb-circle flex items-center justify-center shadow-md">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 bg-white/80 px-2.5 py-0.5 rounded-full border border-indigo-200">
              <Sparkles className="w-3 h-3 text-violet-600" />
              Oracle Fusion Cloud ERP
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-indigo-950 tracking-tight">
              Agentic ERP Exception Commander
            </h1>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
          <Lock className="w-3.5 h-3.5 text-rose-600" />
          Restricted — Server Login Required
        </span>
      </div>

      {/* Main Centered Login Card */}
      <div className="max-w-xl w-full mx-auto my-8">
        <div className="aurora-shell-card rounded-3xl overflow-hidden shadow-2xl border border-indigo-200/90 bg-white/95 backdrop-blur-xl">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-900 px-7 py-6 text-white">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-300 mb-1.5">
              <Server className="w-4 h-4 text-emerald-400" />
              Oracle Fusion Server Authentication Gate
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Sign In to Connect Oracle Server
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1.5 leading-relaxed">
              Access is restricted. Enter your Oracle Fusion Server URL,{' '}
              <span className="text-white font-semibold">User ID (user_id)</span>, and{' '}
              <span className="text-white font-semibold">Password</span> to establish an isolated
              server session and load your user&apos;s live Payables data.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="p-7 space-y-5">
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-rose-950">
                    Oracle Server Authentication Failed
                  </div>
                  <p className="mt-1 leading-relaxed font-medium">{errorMessage}</p>
                </div>
              </div>
            )}

            {isConnecting && statusMessage && (
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
                <div>
                  <div className="font-extrabold">Connecting to Live Oracle Server...</div>
                  <p className="text-indigo-700 mt-0.5">{statusMessage}</p>
                </div>
              </div>
            )}

            {/* 1. Oracle Server URL */}
            <div>
              <label
                htmlFor="login-oracle-url"
                className="block text-xs font-extrabold uppercase tracking-wider text-indigo-950 mb-1.5"
              >
                Oracle Fusion Server URL
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-oracle-url"
                  type="text"
                  required
                  disabled={isConnecting}
                  value={instanceUrl}
                  onChange={(e) => setInstanceUrl(e.target.value)}
                  placeholder="https://fa-esfe-dev19-saasfademo1.ds-fa.oraclepdemos.com"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50/90 border border-indigo-200 rounded-2xl text-indigo-950 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Paste either the base host or full Oracle Fusion Welcome URL.
              </p>
            </div>

            {/* 2. User ID (user_id) */}
            <div>
              <label
                htmlFor="login-user-id"
                className="block text-xs font-extrabold uppercase tracking-wider text-indigo-950 mb-1.5"
              >
                Oracle User ID (<span className="font-mono text-violet-700">user_id</span>)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-user-id"
                  type="text"
                  required
                  autoFocus
                  disabled={isConnecting}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your Oracle User ID (e.g., FIN_IMPL, CASEY.BROWN)"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50/90 border border-indigo-200 rounded-2xl text-indigo-950 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* 3. Password */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-extrabold uppercase tracking-wider text-indigo-950 mb-1.5"
              >
                Oracle Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isConnecting}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your Oracle password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3 text-sm bg-slate-50/90 border border-indigo-200 rounded-2xl text-indigo-950 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-700 p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isConnecting || !instanceUrl.trim() || !username.trim() || !password}
              className="w-full py-3.5 px-6 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500 disabled:opacity-50 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting Server & Loading User Data...</span>
                </>
              ) : (
                <>
                  <span>Connect Server & Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Per-User Data Isolation & Security Guarantee */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1.5 text-[11px] text-slate-600">
              <div className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                Strict Per-User Session & Server Data Isolation
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>
                  <strong>No data before login:</strong> Invoices are only fetched after your{' '}
                  <code className="font-mono text-indigo-900">user_id</code> and password
                  authenticate against the Oracle server.
                </li>
                <li>
                  <strong>Per-user isolated data:</strong> Each login creates an isolated session
                  token and loads your <code className="font-mono text-indigo-900">user_id</code>
                  &apos;s Oracle records without mixing or collapsing with other users.
                </li>
                <li>
                  <strong>Zero credential storage:</strong> Your password is sent over transient
                  memory only and is never stored or logged.
                </li>
              </ul>
            </div>
          </form>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="max-w-5xl w-full mx-auto text-center text-xs text-slate-500">
        Agentic ERP Exception Commander • Live Oracle Fusion REST Subledger Gateway
      </div>
    </div>
  );
};
