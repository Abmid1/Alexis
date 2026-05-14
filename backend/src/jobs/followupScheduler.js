/**
 * BILT AFRICA — Proactive Follow-up Scheduler
 *
 * Runs every hour. For every active conversation, checks if the AI should
 * send a follow-up based on lead status and silence duration.
 *
 * Rules:
 *   Hot       → follow up at 4h, 24h, 72h   (max 3 times)
 *   Warm      → follow up at 24h, 72h, 168h  (max 3 times)
 *   New       → follow up at 2h, 48h, 168h   (max 3 times)
 *   Cold      → follow up at 168h, 336h      (max 2 times)
 *   Qualified → never auto-message           (agent handles)
 */

const supabase               = require('../lib/supabase');
const { sendPlatformMessage } = require('../lib/meta');
const { generateFollowUpMessage } = require('../lib/followupMessages');

// ── Working hours guard ───────────────────────────────────────────────────────
// Ghana (Accra) is UTC+0 year-round, so server UTC hours == Accra local hours.
// Set WORK_HOURS_START / WORK_HOURS_END in .env to override (24-hr format, e.g. 8 and 18).
const WORK_START = parseInt(process.env.WORK_HOURS_START || '8',  10);
const WORK_END   = parseInt(process.env.WORK_HOURS_END   || '18', 10);

function isWithinWorkingHours() {
  const hour = new Date().getUTCHours(); // UTC == Accra local time
  return hour >= WORK_START && hour < WORK_END;
}

// ── Follow-up rules (all times in hours) ─────────────────────────────────────
const RULES = {
  Hot:       { intervals: [4,   24,  72],  maxCount: 3 },
  Warm:      { intervals: [24,  72,  168], maxCount: 3 },
  New:       { intervals: [2,   48,  168], maxCount: 3 },
  Cold:      { intervals: [168, 336],      maxCount: 2 },
  Qualified: { intervals: [],              maxCount: 0 }, // never
};

// ── Parse "Platform:Id" context string ───────────────────────────────────────
function parsePlatformContext(contextStr) {
  if (!contextStr || !contextStr.includes(':')) return null;
  const idx = contextStr.indexOf(':');
  return {
    platform:   contextStr.slice(0, idx),
    platformId: contextStr.slice(idx + 1),
  };
}

// ── Hours since a date string ─────────────────────────────────────────────────
function hoursSince(dateStr) {
  if (!dateStr) return Infinity;
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
}

// ── Process one conversation ──────────────────────────────────────────────────
async function processConversation(conv) {
  const leadStatus = conv.lead_status || 'New';
  const rules = RULES[leadStatus];

  // Skip if no rules or Qualified
  if (!rules || rules.maxCount === 0) return;

  // Skip conversations where agent has taken over
  if (!conv.ai_active) return;

  // Skip if no platform context (can't send messages)
  const platformCtx = parsePlatformContext(conv.context);
  if (!platformCtx) return;

  // ── How many auto follow-ups have we already sent? ─────────────────────────
  const { data: logs } = await supabase
    .from('auto_follow_up_logs')
    .select('id, sent_at')
    .eq('conversation_id', conv.id)
    .order('sent_at', { ascending: false });

  const followUpCount = logs?.length || 0;

  // Already maxed out
  if (followUpCount >= rules.maxCount) return;

  // ── When did the customer last message us? ────────────────────────────────
  const { data: lastInbound } = await supabase
    .from('messages')
    .select('created_at')
    .eq('conversation_id', conv.id)
    .eq('type', 'in')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // ── When did we last send anything (AI or agent)? ─────────────────────────
  const { data: lastOutbound } = await supabase
    .from('messages')
    .select('created_at, type')
    .eq('conversation_id', conv.id)
    .in('type', ['out', 'ai'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // If customer replied AFTER our last outbound → they're engaged, skip
  if (lastInbound && lastOutbound) {
    const customerRepliedLast = new Date(lastInbound.created_at) > new Date(lastOutbound.created_at);
    if (customerRepliedLast) return;
  }

  // Reference point: when did we last contact them (or when did they first message)?
  const lastContactedAt = lastOutbound?.created_at || conv.created_at;
  const hoursSinceContact = hoursSince(lastContactedAt);

  // Required interval for this follow-up number
  const requiredInterval = rules.intervals[followUpCount];
  if (!requiredInterval) return;

  // Not time yet
  if (hoursSinceContact < requiredInterval) return;

  // ── Safety: don't re-send if last log was too recent ─────────────────────
  if (logs?.length > 0) {
    const lastLogHours = hoursSince(logs[0].sent_at);
    const minGap = rules.intervals[followUpCount - 1] || 4;
    if (lastLogHours < minGap) return;
  }

  // ── All checks passed — generate and send ────────────────────────────────
  console.log(`[FollowUp] Sending follow-up #${followUpCount + 1} to ${conv.name} (${leadStatus}) via ${platformCtx.platform}`);

  const message = await generateFollowUpMessage({
    customerName:   conv.name,
    leadStatus,
    followUpNumber: followUpCount + 1,
    userId:         conv.user_id,
    conversationId: conv.id,
  });

  // Send via WhatsApp / Instagram / Facebook
  let delivered = false;
  try {
    await sendPlatformMessage(platformCtx.platform, platformCtx.platformId, message);
    delivered = true;
    console.log(`[FollowUp] ✅ Delivered to ${conv.name}`);
  } catch (err) {
    console.warn(`[FollowUp] ⚠️  Platform send failed (${err.message}) — saving to DB only`);
  }

  const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Save message to conversation
  await supabase.from('messages').insert({
    conversation_id: conv.id,
    type:            'ai',
    text:            message,
    time_text:       ts,
    label:           `🤖 AI Follow-up #${followUpCount + 1}`,
  });

  // Update conversation's last_message
  await supabase.from('conversations')
    .update({ last_message: message })
    .eq('id', conv.id);

  // Log it for the dashboard
  await supabase.from('auto_follow_up_logs').insert({
    conversation_id: conv.id,
    user_id:         conv.user_id,
    customer_name:   conv.name,
    platform:        platformCtx.platform,
    lead_status:     leadStatus,
    follow_up_number: followUpCount + 1,
    message,
    delivered,
    replied:         false,
  });
}

// ── Main job ──────────────────────────────────────────────────────────────────
let isRunning = false;

async function runFollowUpJob() {
  if (isRunning) {
    console.log('[FollowUp] Previous job still running — skipping this tick');
    return;
  }

  isRunning = true;

  if (!isWithinWorkingHours()) {
    console.log(`[FollowUp] ⏸  Outside working hours (${WORK_START}:00–${WORK_END}:00 Accra) — skipping this tick`);
    isRunning = false;
    return;
  }

  console.log(`[FollowUp] ⏰ Running at ${new Date().toISOString()}`);

  try {
    // Get all active conversations across all users
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('ai_active', true)
      .neq('status', 'Closed cold');

    if (error) { console.error('[FollowUp] DB error:', error.message); return; }
    if (!conversations?.length) { console.log('[FollowUp] No active conversations'); return; }

    console.log(`[FollowUp] Checking ${conversations.length} conversations…`);

    // Process each one — stagger by 500ms to avoid hammering the API
    for (const conv of conversations) {
      try {
        await processConversation(conv);
      } catch (err) {
        console.error(`[FollowUp] Error on conv ${conv.id}:`, err.message);
      }
      await new Promise(r => setTimeout(r, 500));
    }

    console.log('[FollowUp] ✅ Job complete');
  } finally {
    isRunning = false;
  }
}

// ── Start the scheduler ───────────────────────────────────────────────────────
function startFollowUpScheduler() {
  console.log('[FollowUp] Scheduler started — runs every hour');

  // Run once 2 minutes after server start (let everything initialise)
  setTimeout(runFollowUpJob, 2 * 60 * 1000);

  // Then every hour
  setInterval(runFollowUpJob, 60 * 60 * 1000);
}

module.exports = { startFollowUpScheduler, runFollowUpJob };
