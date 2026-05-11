'use client';
import { useEffect, useRef, useState } from 'react';
import { MetricCard } from '@/components/ui/MetricCard';
import { api } from '@/lib/api';
import { ReportData } from '@/lib/types';

// ── Suggested prompts shown before the conversation starts ────────────────────
const SUGGESTED = [
  'Which lead source is converting best this month?',
  'What is my average deal size and how can I improve it?',
  'Which neighborhoods should I focus on for land deals?',
  'How is my AI handling rate compared to industry norms?',
  'Give me a 3-month revenue forecast based on my pipeline.',
  'Which leads are most likely to close and why?',
  'What is the best time to follow up with WhatsApp leads?',
  'Compare my property types — which earns more per listing?',
];

// ── Simple markdown renderer (bold + bullets) ─────────────────────────────────
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold: **text**
    const parts = line.split(/\*\*(.+?)\*\*/g).map((part, j) =>
      j % 2 === 1 ? <strong key={j} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{part}</strong> : part
    );

    if (line.startsWith('- ') || line.startsWith('• ')) {
      return (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
          <span style={{ color: 'var(--accent-light)', flexShrink: 0, marginTop: 1 }}>▸</span>
          <span>{parts.slice(1)}</span>
        </div>
      );
    }
    if (line.startsWith('# ')) {
      return <div key={i} style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 12, marginBottom: 4, marginTop: 8 }}>{parts.slice(1)}</div>;
    }
    if (line === '') return <div key={i} style={{ height: 6 }} />;
    return <div key={i} style={{ marginBottom: 2 }}>{parts}</div>;
  });
}

// ── Typing dots animation ─────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '8px 2px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--accent-light)',
          animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          opacity: 0.5,
        }} />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

// ── Message types ─────────────────────────────────────────────────────────────
type Role = 'user' | 'assistant';
interface ChatMsg { role: Role; content: string; }

// ── Main component ────────────────────────────────────────────────────────────
export default function Reports() {
  const [data, setData]       = useState<ReportData | null>(null);
  const [msgs, setMsgs]       = useState<ChatMsg[]>([]);
  const [input, setInput]     = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError]     = useState('');
  const [started, setStarted] = useState(false);
  const msgsEnd               = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.reports.get().then(setData).catch(() => {});
  }, []);

  // Auto-scroll
  useEffect(() => {
    msgsEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, thinking]);

  const sendMessage = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || thinking) return;

    setInput('');
    setError('');
    setStarted(true);

    const newMsgs: ChatMsg[] = [...msgs, { role: 'user', content: q }];
    setMsgs(newMsgs);
    setThinking(true);

    try {
      const { reply } = await api.aiReport.chat(
        newMsgs.map(m => ({ role: m.role, content: m.content }))
      );
      setMsgs(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setError(err.message || 'AI request failed');
      // Remove the user message on error
      setMsgs(prev => prev.slice(0, -1));
    } finally {
      setThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)', fontSize: 12 }}>
      Loading reports…
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14, height: 'calc(100vh - 84px)', minHeight: 0 }}>

      {/* ── LEFT: Standard reports ─────────────────────────────────────── */}
      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          <MetricCard label="Total revenue"      value={data.metrics.totalRevenue}           change="+22% vs last mo" small />
          <MetricCard label="Deals closed"       value={data.metrics.dealsClosedCount}       change="+35%" />
          <MetricCard label="Lead → close rate"  value={`${data.metrics.leadToCloseRate}%`}  change="+2pts" />
          <MetricCard label="AI save rate"       value={`${data.metrics.aiSaveRate}%`}       change="Leads caught by AI" />
        </div>

        {/* Revenue chart */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Revenue by month
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>GHS</span>
          </div>
          <div className="chart-bars">
            {data.revenueByMonth.map(({ month, value }) => (
              <div key={month} className="bar-wrap">
                <div className="bar" style={{ height: value, background: month === 'May' ? 'var(--accent)' : 'var(--bg-hover)' }} />
                <div className="bar-lbl">{month}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion by source */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 10 }}>Conversion by source</div>
          {data.conversionBySource.map(({ source, rate, color }) => (
            <div key={source} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', width: 85 }}>{source}</div>
              <div style={{ flex: 1, height: 5, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: color, width: `${rate}%`, transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500, width: 36, textAlign: 'right' }}>{rate}%</div>
            </div>
          ))}
        </div>

        {/* Top neighborhoods */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 10 }}>Top performing neighborhoods</div>
          {data.topNeighborhoods.map(({ name, deals, pct }) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', width: 85 }}>{name}</div>
              <div style={{ flex: 1, height: 5, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: 'var(--accent)', width: `${pct}%`, transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500, width: 50, textAlign: 'right' }}>{deals} deals</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: AI Analyst panel ────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        minHeight: 0,
      }}>

        {/* Panel header */}
        <div style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--bg-elevated)',
        }}>
          {/* AI icon */}
          <div style={{
            width: 26, height: 26,
            borderRadius: 8,
            background: 'var(--accent-dim)',
            border: '1px solid rgba(52,211,153,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5z" stroke="#34D399" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>AI Analyst</div>
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 0.5 }}>
              Powered by Gemini · knows your CRM data
            </div>
          </div>
          {msgs.length > 0 && (
            <button
              onClick={() => { setMsgs([]); setStarted(false); setError(''); }}
              style={{ marginLeft: 'auto', fontSize: 9.5, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Welcome state with suggested prompts */}
          {!started && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 14 }}>
                Ask me anything about your business — custom reports, market analysis, lead strategy, revenue forecasts, or anything real estate related.
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Suggested
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SUGGESTED.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    style={{
                      textAlign: 'left',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-md)',
                      padding: '7px 10px',
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'border-color 0.1s, color 0.1s',
                      lineHeight: 1.4,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(52,211,153,0.35)';
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                    }}
                  >
                    <span style={{ color: 'var(--accent-light)', marginRight: 6 }}>↗</span>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages */}
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Role label */}
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                {m.role === 'user' ? 'You' : '✦ AI Analyst'}
              </div>
              {/* Bubble */}
              <div style={{
                background: m.role === 'user' ? 'var(--bg-elevated)' : 'rgba(29,158,117,0.08)',
                border: `1px solid ${m.role === 'user' ? 'var(--border)' : 'rgba(52,211,153,0.15)'}`,
                borderRadius: 'var(--r-md)',
                padding: '9px 11px',
                fontSize: 11.5,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}>
                {m.role === 'assistant'
                  ? renderMarkdown(m.content)
                  : m.content
                }
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {thinking && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>✦ AI Analyst</div>
              <div style={{ background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 'var(--r-md)', padding: '6px 11px' }}>
                <TypingDots />
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div style={{
              background: 'rgba(216,90,48,0.1)',
              border: '1px solid rgba(216,90,48,0.25)',
              borderRadius: 'var(--r-md)',
              padding: '9px 12px',
              fontSize: 11,
              color: '#F87171',
            }}>
              ❌ {error}
            </div>
          )}

          <div ref={msgsEnd} />
        </div>

        {/* Input area */}
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
          background: 'var(--bg-elevated)',
        }}>
          <div style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: '8px 10px',
            transition: 'border-color 0.15s',
          }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(52,211,153,0.4)')}
            onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your business…"
              rows={1}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: 12,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                lineHeight: 1.5,
                maxHeight: 100,
                overflowY: 'auto',
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || thinking}
              style={{
                width: 28, height: 28,
                borderRadius: 6,
                background: (!input.trim() || thinking) ? 'var(--bg-hover)' : 'var(--accent)',
                border: 'none',
                cursor: (!input.trim() || thinking) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M2 5l4-4 4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 5, textAlign: 'center' }}>
            Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}
