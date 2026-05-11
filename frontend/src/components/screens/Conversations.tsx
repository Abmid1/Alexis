'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Tag } from '@/components/ui/Tag';
import { api } from '@/lib/api';
import { Conversation, Message } from '@/lib/types';

const PLATFORM: Record<string, { color: string; bg: string; label: string }> = {
  WhatsApp:  { color: '#25D366', bg: 'rgba(37,211,102,0.12)',  label: 'WhatsApp'  },
  Instagram: { color: '#E1306C', bg: 'rgba(225,48,108,0.12)', label: 'Instagram' },
  Facebook:  { color: '#1877F2', bg: 'rgba(24,119,242,0.12)', label: 'Facebook'  },
};

const POLL_INTERVAL = 20_000;

function PlatformBadge({ source }: { source: string }) {
  const p = PLATFORM[source];
  if (!p) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: p.bg, color: p.color,
    }}>
      {source}
    </span>
  );
}

export default function Conversations() {
  const [convList, setConvList]     = useState<Conversation[]>([]);
  const [active, setActive]         = useState<Conversation | null>(null);
  const [input, setInput]           = useState('');
  const [sending, setSending]       = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEnd                 = useRef<HTMLDivElement>(null);
  const activeIdRef                 = useRef<string | null>(null);

  const loadList = useCallback(async () => {
    try {
      const data = await api.conversations.list() as any[];
      setConvList(data);
      setTotalUnread(data.filter((c: any) => c.unread).length);
      if (activeIdRef.current) {
        const fresh = data.find((c: any) => c.id === activeIdRef.current);
        if (fresh) {
          const full = await api.conversations.get(activeIdRef.current);
          setActive(full as Conversation);
        }
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    api.conversations.list().then((data: any) => {
      setConvList(data);
      setTotalUnread(data.filter((c: any) => c.unread).length);
      if (data.length > 0) selectConv(data[0].id, data);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(loadList, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [loadList]);

  const selectConv = (id: string, list?: any[]) => {
    activeIdRef.current = id;
    api.conversations.get(id).then((full: any) => {
      setActive(full);
      setConvList(prev => (list || prev).map(c => c.id === id ? { ...c, unread: false } : c));
      setTotalUnread(n => Math.max(n - 1, 0));
    }).catch(() => {});
  };

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [(active as any)?.messages?.length]);

  const sendMessage = async () => {
    if (!input.trim() || !active || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    try {
      const msgs: Message[] = await api.conversations.sendMessage(active.id, text) as any;
      setActive(prev => prev ? { ...prev, messages: [...((prev as any).messages || []), ...msgs] } : prev);
      setConvList(prev => prev.map(c => c.id === active.id ? { ...c, lastMessage: text } : c));
    } finally { setSending(false); }
  };

  const aiCount   = convList.filter((c: any) => c.aiActive).length;
  const needsYou  = convList.filter((c: any) => c.status === 'Needs you').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Stats row ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Total chats',  val: convList.length,  change: 'All platforms',      icon: '💬' },
          { label: 'Unread',       val: totalUnread,       change: 'Need attention',     icon: '🔔' },
          { label: 'AI handling',  val: aiCount,           change: 'Auto-responding',    icon: '🤖' },
          { label: 'Needs you',    val: needsYou,          change: 'Human takeover',     icon: '🧑' },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
              <span style={{ fontSize: 16, opacity: 0.5 }}>{m.icon}</span>
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 10 }}>
              {m.val}
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>{m.change}</div>
          </div>
        ))}
      </div>

      {/* ── Main panel ────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        height: 'calc(100vh - 230px)',
        minHeight: 480,
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--bg-surface)',
      }}>

        {/* ── Conversation list ────────────────────────────────── */}
        <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* List header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
            background: 'var(--bg-elevated)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              All chats
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 6 }}>
                ({convList.length})
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
              WhatsApp · Instagram · Facebook
            </div>
          </div>

          {convList.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', gap: 8 }}>
              <div style={{ fontSize: 32 }}>💬</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>No conversations yet</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>Messages from your connected platforms will appear here</div>
            </div>
          )}

          {convList.map((c: any) => {
            const isActive = active?.id === c.id;
            const p = PLATFORM[c.source];
            return (
              <div
                key={c.id}
                onClick={() => selectConv(c.id)}
                style={{
                  display: 'flex', gap: 10, padding: '12px 14px',
                  borderBottom: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  background: isActive ? 'var(--bg-active)' : 'transparent',
                  transition: 'background 0.1s',
                  borderLeft: isActive ? '3px solid var(--accent-light)' : '3px solid transparent',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                {/* Avatar */}
                <div className={`av av-${c.avatarColor}`} style={{ width: 36, height: 36, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {c.initials}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name + time */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: c.unread ? 700 : 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                      {c.name}
                    </span>
                    {c.unread && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: p?.color || '#1D9E75', flexShrink: 0, boxShadow: `0 0 6px ${p?.color || '#1D9E75'}88` }} />
                    )}
                  </div>

                  {/* Last message */}
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 5, lineHeight: 1.4 }}>
                    {c.lastMessage || 'No messages yet'}
                  </div>

                  {/* Platform + status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <PlatformBadge source={c.source} />
                    <span style={{ fontSize: 10, color: c.status === 'Needs you' ? '#F87171' : c.status === 'AI live' ? '#34D399' : 'var(--text-muted)', fontWeight: 500 }}>
                      {c.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Chat window ──────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>
          {active ? (
            <>
              {/* Chat header */}
              <div style={{
                padding: '13px 18px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
                background: 'var(--bg-surface)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className={`av av-${(active as any).avatarColor}`} style={{ width: 36, height: 36, fontSize: 13, fontWeight: 700 }}>
                    {(active as any).initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {(active as any).name}
                      <PlatformBadge source={(active as any).source} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {(active as any).status}
                      {(active as any).leadStatus && (
                        <span style={{ marginLeft: 8 }}><Tag label={(active as any).leadStatus} /></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI toggle */}
                <button
                  onClick={async () => {
                    const res = await api.conversations.toggleAI(active.id);
                    setActive(prev => prev ? { ...prev, aiActive: res.aiActive, status: res.status } as any : prev);
                    setConvList(prev => prev.map(c => c.id === active.id ? { ...c, status: res.status } : c));
                  }}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 20,
                    border: 'none', cursor: 'pointer',
                    background: (active as any).aiActive ? 'rgba(52,211,153,0.15)' : 'rgba(239,159,39,0.15)',
                    color:      (active as any).aiActive ? '#34D399'                : '#EF9F27',
                    transition: 'all 0.15s',
                  }}
                >
                  {(active as any).aiActive ? '🤖 AI is replying — click to take over' : '🧑 You\'re replying — click for AI'}
                </button>
              </div>

              {/* Messages */}
              <div className="messages" style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', gap: 12 }}>
                {((active as any).messages || []).map((msg: any) => (
                  <div key={msg.id} className={`msg msg-${msg.type}`}>
                    {msg.label && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>{msg.label}</div>
                    )}
                    <div className={`bubble b-${msg.type}`} style={{ fontSize: 13, lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: msg.text }} />
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textAlign: msg.type === 'out' ? 'right' : 'left' }}>
                      {msg.time || msg.timeText}
                    </div>
                  </div>
                ))}
                <div ref={messagesEnd} />
              </div>

              {/* Input */}
              <div style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--border)',
                flexShrink: 0,
                background: 'var(--bg-surface)',
              }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    style={{
                      flex: 1,
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 24,
                      padding: '10px 16px',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      outline: 'none',
                      fontFamily: 'var(--font-sans)',
                      transition: 'border-color 0.15s',
                    }}
                    placeholder={`Reply via ${(active as any).source || 'chat'}…`}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = 'rgba(52,211,153,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !input.trim()}
                    title={`Send via ${(active as any).source}`}
                    style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: sending ? 'var(--bg-hover)' : (PLATFORM[(active as any).source]?.color || '#1D9E75'),
                      border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: sending ? 'not-allowed' : 'pointer',
                      flexShrink: 0, transition: 'background 0.2s',
                      boxShadow: sending ? 'none' : '0 2px 8px rgba(0,0,0,0.25)',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                      <path d="M1 6l10-5-4 5 4 5-10-5z" fill="#fff" />
                    </svg>
                  </button>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                  Enter to send · message goes directly via {(active as any).source}
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ fontSize: 48 }}>💬</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>Select a conversation</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
                Messages from WhatsApp, Instagram, and Facebook appear here in real time
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
