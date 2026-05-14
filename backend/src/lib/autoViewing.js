/**
 * BILT AFRICA — Auto Viewing Task Creator
 *
 * Runs after every AI reply. When the AI says something like "I'll arrange a
 * viewing" or "I can schedule that for you", it means the agent actually needs
 * to follow through — but nothing is booked yet.
 *
 * This module detects that promise in the AI reply and creates a follow-up
 * task so the agent is notified to act on it.
 *
 * Called fire-and-forget — errors are caught internally.
 */

const supabase = require('./supabase');

// Phrases that indicate the AI has committed to arranging a viewing
const VIEWING_PROMISE_TRIGGERS = [
  "arrange a viewing", "schedule a viewing", "book a viewing",
  "set up a viewing", "organize a viewing", "arrange the viewing",
  "arrange viewing", "schedule viewing", "book viewing",
  "i'll arrange", "i will arrange", "will arrange that",
  "arrange that for you", "arrange that", "set that up",
  "book you in", "schedule that for you", "get that scheduled",
  "get a viewing", "viewing arranged", "confirm the viewing",
  "arrange an inspection", "schedule an inspection",
];

/**
 * If the AI reply promises a viewing, create a follow-up task for the agent.
 *
 * @param {object} opts
 * @param {string} opts.userId
 * @param {string} opts.clientName
 * @param {string} opts.conversationId
 * @param {string} opts.aiReply  - The AI's outgoing text
 */
async function tryAutoCreateViewingTask({ userId, clientName, conversationId, aiReply }) {
  try {
    const lower = (aiReply || '').toLowerCase();
    if (!VIEWING_PROMISE_TRIGGERS.some(t => lower.includes(t))) return;

    // Deduplication: skip if a viewing task for this client was created in the last 7 days
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data: existing } = await supabase
      .from('follow_ups')
      .select('id')
      .eq('user_id', userId)
      .ilike('title', `%${clientName}%`)
      .gte('created_at', weekAgo)
      .maybeSingle();

    if (existing) return;

    await supabase.from('follow_ups').insert({
      user_id:   userId,
      title:     `Book viewing — ${clientName}`,
      subtitle:  `AI promised to arrange a viewing. Confirm the time, property, and send details to the client.`,
      time_text: 'Action required',
      status:    'Scheduled',
      completed: false,
    });

    console.log(`[AutoViewing] ✅ Viewing task created for "${clientName}"`);

  } catch (err) {
    console.error('[AutoViewing] Unexpected error:', err.message);
  }
}

module.exports = { tryAutoCreateViewingTask };
