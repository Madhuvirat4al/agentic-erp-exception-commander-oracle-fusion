import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Database,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import {
  AssistantResponse,
  ERPException,
} from '../types/erp';
import { PRESET_ASSISTANT_QUESTIONS } from '../services/aiAssistantProvider';

interface AIAssistantPanelProps {
  exception: ERPException;
  messages: AssistantResponse[];
  isAsking: boolean;
  onAskQuestion: (question: string) => void;
  onClearMessages: () => void;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  exception,
  messages,
  isAsking,
  onAskQuestion,
  onClearMessages,
}) => {
  const [customInput, setCustomInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim() || isAsking) return;
    onAskQuestion(customInput.trim());
    setCustomInput('');
  };

  return (
    <section
      aria-label="AI Assistant Panel"
      className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden flex flex-col justify-between"
    >
      <div>
        {/* Header */}
        <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-sky-400" />
            <div>
              <h3 className="text-sm font-bold">
                Exception AI Co-Pilot ({exception.invoiceNumber})
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2 py-0.5 rounded bg-sky-900/80 text-sky-200 border border-sky-700 font-medium">
              Deterministic • Zero API Key Required
            </span>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={onClearMessages}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700"
                title="Clear conversation history"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 8 Required Prompt Buttons */}
        <div className="p-3 bg-slate-50 border-b border-slate-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-sky-600" />
            <span>Ask Connected Exception Prompts (Click any prompt)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_ASSISTANT_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={isAsking}
                onClick={() => onAskQuestion(q)}
                className="px-2.5 py-1 rounded text-xs font-medium bg-white hover:bg-sky-50 text-slate-800 hover:text-sky-900 border border-slate-300 hover:border-sky-400 transition-colors text-left shadow-sm"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Transcript Area */}
        <div className="p-3.5 space-y-3 max-h-[390px] overflow-y-auto bg-white">
          {messages.length === 0 ? (
            <div className="p-4 rounded bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="font-bold text-slate-800">
                Connected to Exception {exception.id} ({exception.invoiceNumber} — {exception.supplierName})
              </div>
              <p>
                Click any of the 8 guided questions above or type a question below to inspect root cause, policy references, data sources, and confidence scores.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className="border border-slate-200 rounded overflow-hidden shadow-sm text-xs"
              >
                {/* User Question Header */}
                <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">Q: {msg.question}</span>
                  <span className="text-[10px] font-mono text-slate-500">{msg.timestamp}</span>
                </div>

                {/* Assistant Structured Answer */}
                <div className="p-3 bg-white space-y-2.5">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800 mb-0.5">
                      Answer
                    </div>
                    <div className="text-slate-900 whitespace-pre-line leading-relaxed">
                      {msg.answer}
                    </div>
                  </div>

                  {/* Metadata Footer: Data Sources, Policy Reference, Confidence Score */}
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50/80 p-2 rounded">
                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-500">
                        <Database className="w-3 h-3 text-sky-700" />
                        <span>Data Sources Used</span>
                      </div>
                      <ul className="mt-1 space-y-0.5 text-[11px] text-slate-700">
                        {msg.dataSourcesUsed.map((src, idx) => (
                          <li key={idx} className="truncate" title={src}>
                            • {src}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-500">
                        <BookOpen className="w-3 h-3 text-teal-700" />
                        <span>Policy Reference</span>
                      </div>
                      <p className="mt-1 text-[11px] font-medium text-slate-800">
                        {msg.policyReference}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-500">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Confidence Score</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-sm font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                          {msg.confidenceScore}%
                        </span>
                        <span className="text-[11px] text-slate-600">Verified</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Custom Question Input */}
      <form
        onSubmit={handleSubmit}
        className="p-3 bg-slate-50 border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder={`Ask about ${exception.invoiceNumber}, ${exception.poNumber}, policy, or resolution...`}
          aria-label="Ask AI Assistant about selected exception"
          className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <button
          type="submit"
          disabled={!customInput.trim() || isAsking}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </form>
    </section>
  );
};
