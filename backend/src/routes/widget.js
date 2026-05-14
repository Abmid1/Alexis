/**
 * BILT AFRICA — Website Chat Widget API
 * Public endpoints (no JWT required) used by the embeddable chat widget.
 *
 * POST /api/widget/message  — send a visitor message, receive AI reply
 *
 * The widget passes a `sessionId` (UUID stored in the visitor's localStorage).
 * Each unique sessionId maps to one conversation in the CRM, tagged source='Website'.
 *
 * Embed on any site with:
 *   <script src="https://YOUR_BACKEND/api/widget/embed.js"
 *           data-agent="AGENT_ID"></script>
 * where AGENT_ID is the agent's user ID (find it in your Supabase users table).
 */

const express  = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase  = require('../lib/supabase');
const { generateAIReply } = require('../lib/ai');
const { tryAutoCreateDeal } = require('../lib/autoPipeline');
const { tryAutoCreateViewingTask } = require('../lib/autoViewing');

const router = express.Router();

// ── Minimal rate-limit: max 30 requests per 10 min per session ───────────────
const rateMap = new Map(); // sessionId → { count, resetAt }

function checkRateLimit(sessionId) {
  const now  = Date.now();
  const rec  = rateMap.get(sessionId) || { count: 0, resetAt: now + 10 * 60 * 1000 };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + 10 * 60 * 1000; }
  rec.count++;
  rateMap.set(sessionId, rec);
  return rec.count <= 30;
}

// ── POST /api/widget/message ─────────────────────────────────────────────────

router.post('/message', async (req, res) => {
  const { sessionId, text, agentId, visitorName } = req.body;

  if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

  const sid = sessionId || uuidv4();

  if (!checkRateLimit(sid)) {
    return res.status(429).json({ error: 'Too many messages. Please wait a moment.', sessionId: sid });
  }

  try {
    // ── 1. Resolve the agent (user) to route to ─────────────────────────────
    let userId = agentId;
    if (!userId) {
      const { data: users } = await supabase.from('users').select('id').limit(1);
      userId = users?.[0]?.id;
    }
    if (!userId) return res.status(503).json({ error: 'No agent configured', sessionId: sid });

    // ── 2. Find or create the conversation for this session ─────────────────
    const contextKey = `Website:${sid}`;
    const displayName = visitorName?.trim() || `Website Visitor`;

    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('context', contextKey)
      .maybeSingle();

    let conv;

    if (existing) {
      await supabase.from('conversations')
        .update({ last_message: text, unread: true })
        .eq('id', existing.id);
      conv = existing;
    } else {
      const initials = displayName.split(' ').map(n => n[0] || '').join('').slice(0, 2).toUpperCase() || 'WV';
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          user_id:      userId,
          name:         displayName,
          initials,
          avatar_color: 'p',
          last_message: text,
          source:       'Website',
          status:       'AI live',
          ai_active:    true,
          lead_status:  'New',
          unread:       true,
          context:      contextKey,
        })
        .select().single();

      if (error) return res.status(500).json({ error: 'Failed to start conversation', sessionId: sid });
      conv = newConv;

      // Auto-create lead
      await supabase.from('leads').insert({
        user_id:  userId,
        name:     displayName,
        source:   'Website',
        interest: '',
        budget:   '',
        status:   'New',
        ai_score: null,
      }).catch(() => {});
    }

    const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // ── 3. Save inbound message ─────────────────────────────────────────────
    await supabase.from('messages').insert({
      conversation_id: conv.id,
      type:            'in',
      text:            text.trim(),
      time_text:       ts,
      label:           null,
    });

    // ── 4. Generate AI reply ────────────────────────────────────────────────
    const { text: aiText } = await generateAIReply({
      messageText:    text.trim(),
      userId,
      conversationId: conv.id,
      agentName:      'BILT Africa',
    });

    // ── 5. Save AI reply ────────────────────────────────────────────────────
    await supabase.from('messages').insert({
      conversation_id: conv.id,
      type:            'ai',
      text:            aiText,
      time_text:       ts + ' · 3 sec',
      label:           '🤖 AI Reply',
    });

    await supabase.from('conversations').update({ last_message: aiText }).eq('id', conv.id);

    // ── 6. Side effects (fire-and-forget) ───────────────────────────────────
    tryAutoCreateDeal({ conversationId: conv.id, userId, clientName: conv.name, messageText: text }).catch(() => {});
    tryAutoCreateViewingTask({ userId, clientName: conv.name, conversationId: conv.id, aiReply: aiText }).catch(() => {});

    res.json({ reply: aiText, sessionId: sid });

  } catch (err) {
    console.error('[Widget] Error:', err.message);
    res.status(500).json({
      reply: "Thanks for reaching out! Our team will get back to you shortly. 🏡",
      sessionId: sid,
    });
  }
});

// ── GET /api/widget/embed.js — serve the embeddable widget script ─────────────

router.get('/embed.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  const agentId = req.query.agent || '';
  const apiBase = `${req.protocol}://${req.get('host')}`;

  // Inline the widget HTML/JS — no external dependencies
  res.send(`
(function() {
  var AGENT_ID  = "${agentId}";
  var API_BASE  = "${apiBase}";
  var SESSION_KEY = "bilt_widget_session";
  var sessionId   = localStorage.getItem(SESSION_KEY) || null;

  // ── Styles ────────────────────────────────────────────────────────────────
  var css = \`
    #bilt-widget-btn {
      position:fixed; bottom:24px; right:24px; z-index:9999;
      width:56px; height:56px; border-radius:50%;
      background:#1a56db; color:#fff; font-size:24px;
      border:none; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,.25);
      display:flex; align-items:center; justify-content:center;
      transition:transform .2s;
    }
    #bilt-widget-btn:hover { transform:scale(1.1); }
    #bilt-widget-panel {
      position:fixed; bottom:90px; right:24px; z-index:9999;
      width:340px; max-height:520px;
      background:#fff; border-radius:16px;
      box-shadow:0 8px 32px rgba(0,0,0,.18);
      display:none; flex-direction:column; overflow:hidden;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    }
    #bilt-widget-panel.open { display:flex; }
    .bilt-header {
      background:#1a56db; color:#fff; padding:16px;
      font-weight:600; font-size:15px;
    }
    .bilt-header span { display:block; font-size:12px; font-weight:400; opacity:.8; margin-top:2px; }
    .bilt-messages {
      flex:1; overflow-y:auto; padding:12px;
      display:flex; flex-direction:column; gap:8px;
      background:#f9fafb;
    }
    .bilt-msg { max-width:80%; padding:8px 12px; border-radius:12px; font-size:14px; line-height:1.4; }
    .bilt-msg.in  { background:#1a56db; color:#fff; align-self:flex-end; border-bottom-right-radius:4px; }
    .bilt-msg.out { background:#fff; color:#111; align-self:flex-start; border-bottom-left-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,.1); }
    .bilt-msg.typing { color:#888; font-style:italic; }
    .bilt-footer { padding:10px 12px; border-top:1px solid #e5e7eb; display:flex; gap:8px; background:#fff; }
    .bilt-footer input {
      flex:1; padding:8px 12px; border:1px solid #d1d5db; border-radius:20px;
      font-size:14px; outline:none;
    }
    .bilt-footer input:focus { border-color:#1a56db; }
    .bilt-footer button {
      background:#1a56db; color:#fff; border:none; border-radius:50%;
      width:36px; height:36px; cursor:pointer; font-size:16px;
      display:flex; align-items:center; justify-content:center;
    }
  \`;

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ── DOM ───────────────────────────────────────────────────────────────────
  var btn = document.createElement('button');
  btn.id = 'bilt-widget-btn';
  btn.innerHTML = '&#x1F4AC;';
  btn.title = 'Chat with us';

  var panel = document.createElement('div');
  panel.id = 'bilt-widget-panel';
  panel.innerHTML = \`
    <div class="bilt-header">
      BILT Africa
      <span>Property Assistant &bull; Usually replies instantly</span>
    </div>
    <div class="bilt-messages" id="bilt-messages"></div>
    <div class="bilt-footer">
      <input id="bilt-input" type="text" placeholder="Ask about properties…" />
      <button id="bilt-send">&#x27A4;</button>
    </div>
  \`;

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  // ── Toggle ────────────────────────────────────────────────────────────────
  var open = false;
  btn.addEventListener('click', function() {
    open = !open;
    panel.classList.toggle('open', open);
    if (open && document.getElementById('bilt-messages').children.length === 0) {
      addMsg('out', 'Hello! 🏡 Looking for property in Accra? I can help you find the perfect home or investment. What are you looking for?');
    }
    if (open) document.getElementById('bilt-input').focus();
  });

  // ── Messaging ─────────────────────────────────────────────────────────────
  function addMsg(type, text) {
    var msgs = document.getElementById('bilt-messages');
    var el = document.createElement('div');
    el.className = 'bilt-msg ' + type;
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }

  function sendMessage() {
    var input = document.getElementById('bilt-input');
    var text  = input.value.trim();
    if (!text) return;
    input.value = '';

    addMsg('in', text);
    var typingEl = addMsg('out typing', 'Typing…');

    fetch(API_BASE + '/api/widget/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId, text: text, agentId: AGENT_ID }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.sessionId) {
        sessionId = data.sessionId;
        localStorage.setItem(SESSION_KEY, sessionId);
      }
      typingEl.remove();
      addMsg('out', data.reply || 'Sorry, I could not process that. Please try again.');
    })
    .catch(function() {
      typingEl.remove();
      addMsg('out', 'Connection error. Please try again shortly.');
    });
  }

  document.getElementById('bilt-send').addEventListener('click', sendMessage);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && open) sendMessage();
  });

})();
`);
});

module.exports = router;
