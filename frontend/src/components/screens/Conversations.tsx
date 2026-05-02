'use client';
import { useEffect, useRef, useState } from 'react';
import { Tag } from '@/components/ui/Tag';
import { api } from '@/lib/api';
import { Conversation, Message } from '@/lib/types';

const srcColor: Record<string, string> = { WhatsApp: '#1D9E75', Instagram: '#D85A30', Facebook: '#378ADD' };

export default function Conversations() {
  const [convList, setConvList] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.conversations.list().then(data => {
      setConvList(data);
      if (data.length > 0) selectConv(data[0].id, data);
    }).catch(() => {});
  }, []);

  const selectConv = (id: string, list?: Conversation[]) => {
    api.conversations.get(id).then(full => {
      setActive(full);
      setConvList(prev => (list || prev).map(c => c.id === id ? { ...c, unread: false } : c));
    }).catch(() => {});
  };

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.messages?.length]);

  const sendMessage = async () => {
    if (!input.trim() || !active || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    try {
      const msgs: Message[] = await api.conversations.sendMessage(active.id, text);
      setActive(prev => prev ? { ...prev, messages: [...(prev.messages || []), ...msgs] } : prev);
      setConvList(prev => prev.map(c => c.id === active.id ? { ...c, lastMessage: text, time: 'just now' } : c));
    } finally { setSending(false); }
  };

  return (
    <div>
      <div style={{ background: '#E1F5EE', borderRadius: 'var(--border-radius-md)', padding: '10px 13px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#0F6E56' }}>AI handled 14 conversations today</div>
          <div style={{ fontSize: 10, color: '#1D9E75', marginTop: 2 }}>3 escalated to you · 11 fully resolved by AI · avg 47 sec response</div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 500, color: '#1D9E75' }}>14</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', height: 500, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
        {/* Chat list */}
        <div style={{ borderRight: '0.5px solid var(--color-border-tertiary)', overflowY: 'auto' }}>
          <div style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            All chats ({convList.length})
          </div>
          {convList.map(c => (
            <div key={c.id} onClick={() => selectConv(c.id)}
              style={{ display: 'flex', gap: 8, padding: '9px 12px', borderBottom: '0.5px solid var(--color-border-tertiary)', cursor: 'pointer', background: active?.id === c.id ? 'var(--color-background-secondary)' : 'transparent' }}>
              <div className={`av av-${c.avatarColor}`}>{c.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)', display: 'flex', justifyContent: 'space-between' }}>
                  {c.name} <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)', fontWeight: 400 }}>{c.time}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.lastMessage}</div>
                <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: srcColor[c.source] || '#888' }} />
                  {c.source} · {c.status}
                </div>
              </div>
              {c.unread && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1D9E75', alignSelf: 'center', flexShrink: 0 }} />}
            </div>
          ))}
        </div>

        {/* Chat window */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {active ? (
            <>
              <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>{active.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{active.source} · {active.status} · {active.context}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {active.leadStatus && <Tag label={active.leadStatus} />}
                  {active.aiActive && <Tag label="AI active" />}
                </div>
              </div>

              <div className="messages">
                {(active.messages || []).map(msg => (
                  <div key={msg.id} className={`msg msg-${msg.type}`}>
                    {msg.label && <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginBottom: 3 }}>{msg.label}</div>}
                    <div className={`bubble b-${msg.type}`} dangerouslySetInnerHTML={{ __html: msg.text }} />
                    <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginTop: 2, textAlign: msg.type === 'out' ? 'right' : 'left' }}>{msg.time}</div>
                  </div>
                ))}
                <div ref={messagesEnd} />
              </div>

              <div style={{ padding: '10px 14px', borderTop: '0.5px solid var(--color-border-tertiary)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  style={{ flex: 1, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 20, padding: '7px 12px', fontSize: 11, color: 'var(--color-text-primary)', outline: 'none', fontFamily: 'var(--font-sans)' }}
                  placeholder="Take over from AI or add a note..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                />
                <button onClick={sendMessage} disabled={sending}
                  style={{ width: 30, height: 30, borderRadius: '50%', background: '#1D9E75', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6l10-5-4 5 4 5-10-5z" fill="#E1F5EE" /></svg>
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontSize: 12 }}>
              Select a conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
