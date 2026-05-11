'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Tag } from '@/components/ui/Tag';
import { api } from '@/lib/api';
import { Conversation, Message } from '@/lib/types';

// Platform colours + icons
const PLATFORM: Record<string, { color: string; icon: string }> = {
  WhatsApp: { color: '#25D366', icon: '💬' },
  Instagram: { color: '#E1306C', icon: '📸' },
  Facebook: { color: '#1877F2', icon: '👍' },
};

const srcColor: Record<string, string> = {
  WhatsApp: '#25D366',
  Instagram: '#E1306C',
  Facebook: '#1877F2',
};

const POLL_INTERVAL = 20_000; // refresh conversation list every 20 s

export default function Conversations() {
  const [convList, setConvList] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);

  // ── Load conversation list ─────────────────────────────────────
  const loadList = useCallback(async () => {
    try {
      const data = await api.conversations.list() as any[];
      setConvList(data);
      setTotalUnread(data.filter((c: any) => c.unread).length);

      // If a conversation is active, check for new messages in it
      if (activeIdRef.current) {
        const fresh = data.find((c: any) => c.id === activeIdRef.current);
        if (fresh) {
          // Re-fetch full messages for the active conversation
          const full = await api.conversations.get(activeIdRef.current);
          setActive(full as Conversation);
        }
      }
    } catch {/* silently ignore poll errors */ }
  }, []);

  // Initial load
  useEffect(() => {
    api.conversations.list().then((data: any) => {
      setConvList(data);
      setTotalUnread(data.filter((c: any) => c.unread).length);
      if (data.length > 0) selectConv(data[0].id, data);
    }).catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for new messages every 20 s
  useEffect(() => {
    const id = setInterval(loadList, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [loadList]);

  const selectConv = (id: string, list?: any[]) => {
    activeIdRef.current = id;
    api.conversations.get(id).then((full: any) => {
      setActive(full);
      setConvList((prev) => (list || prev).map((c) => c.id === id ? { ...c, unread: false } : c));
      setTotalUnread((n) => Math.max(n - 1, 0));
    }).catch(() => { });
  };

  // Scroll to latest message
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [(active as any)?.messages?.length]);

  // ── Send message from dashboard ────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || !active || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    try {
      const msgs: Message[] = await api.conversations.sendMessage(active.id, text) as any;
      setActive((prev: any) =>
        prev ? { ...prev, messages: [...(prev.messages || []), ...msgs] } : prev
      );
      setConvList((prev) =>
        prev.map((c) => c.id === active.id ? { ...c, lastMessage: text } : c)
      );
    } finally {
      setSending(false);
    }
  };

  // ── Platform badge helper ──────────────────────────────────────
  const PlatformBadge = ({ source }: { source: string }) => {
    const p = PLATFORM[source];
    if (!p) return null;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        fontSize: 9, padding: '1px 5px', borderRadius: 10,
        background: p.color + '22', color: p.color, fontWeight: 600,
      }}>
        {p.icon} {source}
      </span>
    );
  };

  return (
    <div>
      {/* Stats bar */}
      <div style={{ background: '#E1F5EE', borderRadius: 'var(--border-radius-md)', padding: '10px 13px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#0F6E56' }}>
            {totalUnread > 0 ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}` : 'All caught up'} · AI handling conversations automatically
          </div>
          <div style={{ fontSize: 10, color: '#1D9E75', marginTop: 2, display: 'flex', gap: 10 }}>
            {Object.entries(PLATFORM).map(([name, p]) => (
              <span key={name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                {name}
              </span>
            ))}
            <span>· avg 3 sec AI response</span>
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 500, color: '#1D9E75' }}>{convList.length}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', height: 520, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>

        {/* ── Conversation list ──────────────────────────────── */}
        <div style={{ borderRight: '0.5px solid var(--color-border-tertiary)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)', flexShrink: 0 }}>
            All chats ({convList.length})
          </div>

          {convList.map((c: any) => (
            <div
              key={c.id}
              onClick={() => selectConv(c.id)}
              style={{
                display: 'flex', gap: 8, padding: '9px 12px',
                borderBottom: '0.5px solid var(--color-border-tertiary)',
                cursor: 'pointer',
                background: active?.id === c.id ? 'var(--color-background-secondary)' : 'transparent',
              }}
            >
              {/* Avatar */}
              <div className={`av av-${c.avatarColor}`} style={{ flexShrink: 0 }}>{c.initials}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Name row */}
                <div style={{ fontSize: 11, fontWeight: c.unread ? 600 : 500, color: 'var(--color-text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{c.name}</span>
                  {c.unread && (
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: srcColor[c.source] || '#1D9E75', flexShrink: 0 }} />
                  )}
                </div>

                {/* Last message */}
                <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                  {c.lastMessage}
                </div>

                {/* Platform + status row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                  <PlatformBadge source={c.source} />
                  <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>{c.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Chat window ───────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--color-background-primary)' }}>
          {active ? (
            <>
              {/* Header */}
              <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {(active as any).name}
                    <PlatformBadge source={(active as any).source} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                    {(active as any).status} · {(active as any).context?.includes(':') ? (active as any).context.split(':')[1] : (active as any).context}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {(active as any).leadStatus && <Tag label={(active as any).leadStatus} />}
                  <button
                    onClick={async () => {
                      const res = await api.conversations.toggleAI(active.id);
                      setActive((prev: any) => prev ? { ...prev, aiActive: res.aiActive, status: res.status } : prev);
                      setConvList((prev) => prev.map((c) => c.id === active.id ? { ...c, status: res.status } : c));
                    }}
                    style={{
                      fontSize: 9, padding: '2px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600,
                      background: (active as any).aiActive ? '#E1F5EE' : '#FAEEDA',
                      color: (active as any).aiActive ? '#0F6E56' : '#8B5E00',
                    }}
                  >
                    {(active as any).aiActive ? '🤖 AI active — click to take over' : '🧑 Youre replying — click to hand back to AI'}
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="messages" style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
                {((active as any).messages || []).map((msg: any) => (
                  <div key={msg.id} className={`msg msg-${msg.type}`}>
                    {msg.label && (
                      <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginBottom: 3 }}>{msg.label}</div>
                    )}
                    <div className={`bubble b-${msg.type}`} dangerouslySetInnerHTML={{ __html: msg.text }} />
                    <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginTop: 2, textAlign: msg.type === 'out' ? 'right' : 'left' }}>
                      {msg.time || msg.timeText}
                    </div>
                  </div>
                ))}
                <div ref={messagesEnd} />
              </div>

              {/* Input */}
              <div style={{ padding: '10px 14px', borderTop: '0.5px solid var(--color-border-tertiary)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <input
                  style={{ flex: 1, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 20, padding: '7px 12px', fontSize: 11, color: 'var(--color-text-primary)', outline: 'none', fontFamily: 'var(--font-sans)' }}
                  placeholder={`Reply via ${(active as any).source || 'chat'}…`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !input.trim()}
                  title={`Send via ${(active as any).source}`}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: sending ? '#aaa' : (srcColor[(active as any).source] || '#1D9E75'), border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: sending ? 'not-allowed' : 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 6l10-5-4 5 4 5-10-5z" fill="#fff" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontSize: 12, gap: 8 }}>
              <div style={{ fontSize: 28 }}>💬</div>
              <div>Select a conversation</div>
              <div style={{ fontSize: 10 }}>Messages from WhatsApp, Instagram & Facebook appear here</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
