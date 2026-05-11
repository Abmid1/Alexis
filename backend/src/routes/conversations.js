const express = require('express');
const supabase = require('../lib/supabase');
const auth = require('../middleware/auth');
const { sendPlatformMessage } = require('../lib/meta');
const { parsePlatformContext } = require('./webhook');
const { generateAIReply } = require('../lib/ai');

const router = express.Router();
router.use(auth);

// GET /api/conversations
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('conversations').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/conversations/:id
router.get('/:id', async (req, res) => {
  const { data: conv, error } = await supabase
    .from('conversations').select('*').eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle();
  if (error || !conv) return res.status(404).json({ error: 'Not found' });

  const { data: msgs } = await supabase
    .from('messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: true });

  // Mark as read
  await supabase.from('conversations').update({ unread: false }).eq('id', conv.id);

  res.json({ ...conv, messages: (msgs || []).map(m => ({ ...m, time: m.time_text })) });
});

// POST /api/conversations/:id/messages
router.post('/:id/messages', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const { data: conv } = await supabase
    .from('conversations').select('*').eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle();
  if (!conv) return res.status(404).json({ error: 'Not found' });

  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const { data: userMsg } = await supabase
    .from('messages').insert({ conversation_id: conv.id, type: 'out', text, time_text: timeStr }).select().single();

  const result = [{ ...userMsg, time: userMsg.time_text }];

  if (conv.ai_active) {
    const { text: aiText, escalate } = await generateAIReply({
      messageText:    text,
      userId:         req.user.id,
      conversationId: conv.id,
      agentName:      'BILT Africa',
    });
    const aiTimeStr = timeStr + ' · 3 sec';
    const { data: aiMsg } = await supabase
      .from('messages')
      .insert({ conversation_id: conv.id, type: 'ai', text: aiText, time_text: aiTimeStr, label: escalate ? '🤖 AI Reply — escalating to agent' : '🤖 AI Reply' })
      .select().single();
    if (aiMsg) result.push({ ...aiMsg, time: aiMsg.time_text });

    if (escalate) {
      await supabase.from('conversations')
        .update({ status: 'Needs you', ai_active: false })
        .eq('id', conv.id);
    }
  }

  await supabase.from('conversations').update({ last_message: text, unread: false }).eq('id', conv.id);

  // ── If this is a platform conversation, deliver the agent reply back ──────
  // Conversations created by the webhook store "Platform:SenderID" in context.
  // Agent messages typed in the dashboard are sent back to the real customer.
  const platformCtx = parsePlatformContext(conv.context);
  if (platformCtx && !conv.ai_active) {
    // Only send agent reply (not AI auto-reply) when AI is off / "Needs you"
    sendPlatformMessage(platformCtx.platform, platformCtx.platformId, text)
      .then(() => console.log(`[Conversations] ✅ Agent reply sent via ${platformCtx.platform}`))
      .catch((err) => console.error(`[Conversations] ❌ Platform send failed:`, err.message));
  }

  res.status(201).json(result);
});

// POST /api/conversations/:id/toggle-ai
// Lets an agent take over (disable AI) or hand back to AI (re-enable).
router.post('/:id/toggle-ai', async (req, res) => {
  const { data: conv } = await supabase
    .from('conversations').select('ai_active').eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle();
  if (!conv) return res.status(404).json({ error: 'Not found' });

  const newAiActive = !conv.ai_active;
  const newStatus   = newAiActive ? 'AI live' : 'Needs you';

  await supabase
    .from('conversations')
    .update({ ai_active: newAiActive, status: newStatus })
    .eq('id', req.params.id);

  res.json({ aiActive: newAiActive, status: newStatus });
});

module.exports = router;
