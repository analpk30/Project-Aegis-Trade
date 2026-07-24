import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, X, Send, Cpu, Sparkles, AlertTriangle, RotateCcw, FileText } from 'lucide-react';
import { BaFinAnnouncement, PersonaRole } from '../types';

interface BafinChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePersona?: PersonaRole;
  announcements?: BaFinAnnouncement[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  retrievedIds?: string[];
  retrievalMode?: string;
  isError?: boolean;
}

const newSessionId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const BafinChatModal: React.FC<BafinChatModalProps> = ({
  isOpen,
  onClose,
  activePersona = 'Central Compliance',
  announcements = [],
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatSessionId = useRef<string>(newSessionId());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mint a fresh conversation each time the modal is opened.
  useEffect(() => {
    if (isOpen) {
      chatSessionId.current = newSessionId();
      setMessages([]);
      setInput('');
    }
  }, [isOpen]);

  // Keep the transcript pinned to the latest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  if (!isOpen) return null;

  const titleForId = (id: string) => announcements.find((a) => a.id === id)?.title ?? id;

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || isSending) return;

    setMessages((prev) => [...prev, { role: 'user', text: query }]);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch('/api/bafin/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, chatSessionId: chatSessionId.current }),
      });

      if (!response.ok) throw new Error(`Backend returned ${response.status}`);

      const data = await response.json();
      if (!data.interpretation) throw new Error('Empty interpretation');

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.interpretation,
          retrievedIds: data.retrievedAnnouncementIds ?? [],
          retrievalMode: data.retrievalMode,
        },
      ]);
    } catch (err) {
      // 2A: honest inline error bubble — the conversation stays intact and the
      // user can retry the follow-up once the backend is reachable again.
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          isError: true,
          text: 'Compliance assistant unavailable — the backend could not be reached. Your question was not lost; please retry in a moment.',
        },
      ]);
      console.warn('[BafinChat] interpret request failed:', err);
    } finally {
      setIsSending(false);
    }
  };

  const clearChat = async () => {
    const sid = chatSessionId.current;
    setMessages([]);
    setInput('');
    // Best-effort server-side session reset; a new id starts a clean context.
    try {
      await fetch('/api/bafin/chat/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatSessionId: sid }),
      });
    } catch (err) {
      console.warn('[BafinChat] session reset failed (non-fatal):', err);
    }
    chatSessionId.current = newSessionId();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A0C]/80 backdrop-blur-sm p-4">
      <div className="relative flex h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-[#1F2937] bg-[#0F1115] text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2937] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">BaFin Compliance Assistant</h3>
              <p className="text-xs text-slate-400">
                Multi-turn RAG over BaFin circulars · Role:{' '}
                <span className="font-mono text-blue-400">{activePersona}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearChat}
              title="Clear conversation"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-[#1F2937] hover:text-slate-100"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-[#1F2937] hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Transcript */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
              <Sparkles className="mb-3 h-8 w-8 text-blue-400/60" />
              <p className="text-sm font-medium text-slate-400">Ask a regulatory question</p>
              <p className="mt-1 max-w-sm text-xs">
                e.g. "What are the pre-trade requirements for a €50M rate swap near the EURIBOR
                fixing window?" — then ask follow-ups.
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-blue-500 text-slate-950'
                    : m.isError
                    ? 'border border-rose-500/30 bg-rose-500/10 text-rose-200'
                    : 'border border-[#1F2937] bg-[#090A0C] text-slate-100'
                }`}
              >
                {m.isError && (
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-rose-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> Assistant Unavailable
                  </div>
                )}
                <div className="whitespace-pre-wrap font-sans">{m.text}</div>

                {m.role === 'assistant' && !m.isError && m.retrievedIds && m.retrievedIds.length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-[#1F2937] pt-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <FileText className="h-3 w-3" />
                      Grounded in {m.retrievalMode === 'embedding' ? 'semantic' : 'keyword'} retrieval
                    </div>
                    {m.retrievedIds.map((id) => (
                      <div key={id} className="text-[11px] text-slate-400">
                        <span className="font-mono text-blue-400">{id}</span> · {titleForId(id)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-[#1F2937] bg-[#090A0C] px-4 py-3 text-sm text-slate-400">
                <Cpu className="h-4 w-4 animate-spin text-blue-400" />
                Interpreting regulatory context…
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <form onSubmit={sendMessage} className="border-t border-[#1F2937] p-4">
          <div className="flex items-center gap-3 rounded-xl border border-[#1F2937] bg-[#090A0C] px-3 py-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a follow-up question…"
              disabled={isSending}
              className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-blue-400 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
