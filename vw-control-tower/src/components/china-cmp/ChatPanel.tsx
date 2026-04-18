"use client";

import React, { useState, useRef, useEffect } from 'react';
import { T } from '@/lib/translations';
import { useChinaCmpStore } from '@/lib/china-cmp/store';
import type { ChinaCmpProgramSnapshot } from '@/lib/china-cmp/types';

interface Props {
  program: ChinaCmpProgramSnapshot;
  lang: 'en' | 'zh';
}

export function ChatPanel({ program, lang }: Props) {
  const t = T[lang];
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useChinaCmpStore((s) => s.chatMessages);
  const chatLoading = useChinaCmpStore((s) => s.chatLoading);
  const chatContext = useChinaCmpStore((s) => s.chatContext);
  const addMessage = useChinaCmpStore((s) => s.addChatMessage);
  const setChatLoading = useChinaCmpStore((s) => s.setChatLoading);
  const setChatContext = useChinaCmpStore((s) => s.setChatContext);
  const clearChat = useChinaCmpStore((s) => s.clearChat);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || chatLoading) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content: text,
      timestamp: new Date().toISOString(),
      context: chatContext ?? undefined,
    };
    addMessage(userMsg);
    setInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/china-cmp/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: chatContext,
          snapshot: program,
          lang,
          history: messages.slice(-6),
        }),
      });

      if (!res.ok) throw new Error('Chat failed');
      const data = await res.json() as { reply: string };

      addMessage({
        id: `msg-${Date.now()}-reply`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
      });
    } catch {
      addMessage({
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: lang === 'zh' ? '抱歉，暂时无法回答。请稍后再试。' : 'Sorry, I couldn\'t process that. Please try again.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col" style={{ height: 400 }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold t-primary flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#135bec' }}>chat</span>
          {t.china_cmp_chat_title}
        </h3>
        {messages.length > 0 && (
          <button onClick={clearChat} className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            {t.china_cmp_chat_clear}
          </button>
        )}
      </div>

      {/* Context badge */}
      {chatContext && (
        <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(19,91,236,0.08)', color: '#135bec' }}>
          <span>{t.china_cmp_chat_context} {chatContext}</span>
          <button onClick={() => setChatContext(null)} className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2.5 mb-3 pr-1">
        {messages.length === 0 && (
          <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>
            {lang === 'zh' ? '询问有关CMP项目、成本驱动因素或行动方案的问题' : 'Ask about CMP programs, cost drivers, or recommended actions'}
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed"
              style={{
                background: msg.role === 'user' ? '#135bec' : 'var(--bg-surface)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                border: msg.role === 'assistant' ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {chatLoading && (
          <div className="flex justify-start">
            <div className="rounded-xl px-3.5 py-2.5 text-xs" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#135bec', animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#135bec', animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#135bec', animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={t.china_cmp_chat_placeholder}
          className="flex-1 px-3 py-2.5 rounded-xl text-xs"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={chatLoading || !input.trim()}
          className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
          style={{ background: '#135bec', color: 'white' }}
        >
          {t.china_cmp_chat_send}
        </button>
      </div>
    </div>
  );
}
