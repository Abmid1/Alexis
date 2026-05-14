const express = require('express');
const supabase = require('../lib/supabase');
const auth = require('../middleware/auth');
const { sendPlatformMessage } = require('../lib/meta');
const { parsePlatformContext } = require('./webhook');
const { generateAIReply } = require('../lib/ai');

const router = express.Router();
router.use(auth);

// ── In-process conversation lock map ─────────────────────────────────────────
// { conversationId: { userId, lockedAt } }
// Locks auto-expire after LOCK_TTL_MS without activity.
const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes
const conversationLocks = new Map();

function acquireLock(convId, userId) {
  const existing = conversationLocks.get(convId);
  if (existing && existing.userId !== userId) {
    const age = Date.now() - existing.lockedAt;
    if (age < LOCK_TTL_MS) return { acquired: false, lockedBy: existing.userId, since: existing.lockedAt };
  }
  conversationLocks.set(convId, { userId, lockedAt: Date.now() });
  return { acquired: true };
}

function releaseLock(convId, userId) {
  const existing = conversationLocks.get(convId);
  if (existing && existing.userId === userId) conversationLocks.delete(convId);
}

/** Hours since a timestamp string */
function hoursSince(isoStr) {
  if (!isoStr) return 0;
  return (Date.now() - new Date(isoStr).getTime()) / 3_600_000;
}

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

  // Acquire soft lock so other agents see this is being viewed
  const lockResult = acquireLock(conv.id, req.user.id);

  res.json({
    ...conv,
    messages: (msgs || []).map(m => ({ ...m, time: m.time_text })),
    lock: lockResult,
  });
});

// POST /api/conversations/:id/messages
router.post('/:id/messages', async (req, res) => {
  const { text, force } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const { data: conv } = await supabase
    .from('conversations').select('*').eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle();
  if (!conv) return res.status(404).json({ error: 'Not found' });

  // ── Concurrency lock check ─────────────────────────────────────────────────
  if (!force) {
    const lockCheck = acquireLock(conv.id, req.user.id);
    if (!lockCheck.acquired) {
      return res.status(409).json({
        error: 'Another agent has this conversation open. Refresh or use force:true to override.',
        lockedBy: lockCheck.lockedBy,
        since: lockCheck.since,
      });
    }
  }

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

  // Release lock now that the reply is saved (another agent can take over)
  releaseLock(conv.id, req.user.id);

  // ── If this is a platform conversation, deliver the agent reply back ──────
  const platformCtx = parsePlatformContext(conv.context);
  let metaWindowWarning = null;

  if (platformCtx && !conv.ai_active) {
    // For Facebook / Instagram: warn if the 24-hour customer-response window may have expired.
    if (platformCtx.platform === 'Facebook' || platformCtx.platform === 'Instagram') {
      const { data: lastInbound } = await supabase
        .from('messages')
        .select('created_at')
        .eq('conversation_id', conv.id)
        .eq('type', 'in')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastInbound || hoursSince(lastInbound.created_at) > 24) {
        metaWindowWarning = `The 24-hour ${platformCtx.platform} messaging window may have expired. Meta may block this message if the customer has not messaged you in the last 24 hours.`;
        console.warn(`[Conversations] ⚠️ ${metaWindowWarning}`);
      }
    }

    sendPlatformMessage(platformCtx.platform, platformCtx.platformId, text)
      .then(() => console.log(`[Conversations] ✅ Agent reply sent via ${platformCtx.platform}`))
      .catch((err) => console.error(`[Conversations] ❌ Platform send failed:`, err.message));
  }

  res.status(201).json({ messages: result, metaWindowWarning });
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
