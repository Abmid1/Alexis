/**
 * BILT AFRICA — Follow-up Message Generator
 * Generates personalised follow-up messages using Groq.
 * Injects the agency's approved AI templates so the AI follows
 * the same approved scripts it uses in live conversations.
 * Falls back to warm static templates if Groq is unavailable.
 */

const Groq = require('groq-sdk');
const supabase = require('./supabase');

const MODEL = 'llama-3.3-70b-versatile';

// ── Static fallbacks (used when Groq quota is hit or key missing) ────────────
const STATIC_TEMPLATES = {
  Hot: [
    (name) => `Hi ${name}! 👋 Just checking in — are you still interested in the property? I can arrange a viewing this week!`,
    (name) => `${name}, just wanted to let you know we had another inquiry on that listing. Still keen? Let me know and I'll hold it for you.`,
    (name) => `Hi ${name}! Final check-in from our side. We have a few new listings that might suit you perfectly. Want me to share them?`,
  ],
  Warm: [
    (name) => `Hi ${name}! Hope you're doing well 😊 We still have some great properties that match what you were looking for. Still in the market?`,
    (name) => `${name}, just following up! We have new listings this week that might be exactly what you need. Shall I send you the details?`,
    (name) => `Hi ${name}! The property market has been busy lately. We have some excellent options in your range — interested to know more?`,
  ],
  New: [
    (name) => `Hi ${name}! Welcome to BILT Africa 🏡 I'm here to help you find the perfect property in Accra. What are you looking for?`,
    (name) => `${name}, just following up on your inquiry. We have some great options available — are you still looking?`,
    (name) => `Hi ${name}! Wanted to make sure you got the information you needed. We're here to help anytime! 😊`,
  ],
  Cold: [
    (name) => `Hi ${name}! It's been a while — hope you're well! 😊 We have some exciting new listings and great deals right now. Still looking?`,
    (name) => `${name}, we thought of you! We just added some properties that match what you were originally looking for. Interested to take another look?`,
  ],
};

// ── Build template section for the follow-up prompt ──────────────────────────
function buildTemplateSection(templates) {
  if (!templates || templates.length === 0) return '';

  const scripts = templates
    .map((t, i) => [
      `SCRIPT ${i + 1} — Topic: ${t.trigger_desc}`,
      `  When a customer asks: "${t.question}"`,
      `  Use this approved response: "${t.answer}"`,
    ].join('\n'))
    .join('\n\n');

  return `

APPROVED SCRIPTS FROM THE AGENCY — FOLLOW THESE IF RELEVANT:
The agency has pre-approved specific answers for certain topics.
If any of the following topics are relevant to this follow-up message,
incorporate the approved wording into your message naturally.
Do not contradict or omit key information from any approved script.

${scripts}
`;
}

// ── Main generator ────────────────────────────────────────────────────────────
async function generateFollowUpMessage({ customerName, leadStatus, followUpNumber, userId, conversationId }) {

  if (process.env.GROQ_API_KEY) {
    try {
      const { data: properties } = await supabase
        .from('properties')
        .select('name, location, price, type')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: templates } = await supabase
        .from('ai_templates')
        .select('trigger_desc, question, answer')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      const { data: recentMsgs } = await supabase
        .from('messages')
        .select('type, text')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(6);

      const propList = properties?.length
        ? properties.map(p =>
            `• ${p.name} — ${p.location} — ${p.price} (${
              p.type === 'sale' ? 'For Sale' : p.type === 'rent' ? 'For Rent' : 'Land'
            })`
          ).join('\n')
        : 'Various properties available in Accra.';

      const convoContext = (recentMsgs || [])
        .reverse()
        .map(m => `${m.type === 'in' ? 'Customer' : 'Agent'}: ${m.text}`)
        .join('\n') || 'No prior messages.';

      const prompt = `
You are a friendly real estate assistant for BILT Africa in Accra, Ghana.

Write a SHORT WhatsApp follow-up message to a lead named ${customerName}.
Lead status: ${leadStatus}
This is follow-up number ${followUpNumber} of ${leadStatus === 'Hot' ? 3 : leadStatus === 'Cold' ? 2 : 3}.

Recent conversation:
${convoContext}

Our current listings:
${propList}
${buildTemplateSection(templates || [])}
Instructions:
- 2-3 sentences MAX — this is WhatsApp, keep it brief
- Sound like a real person, not a bot
- Reference what they were looking for if the conversation shows it
- End with one simple question or call-to-action
- Use at most 1 emoji
- Plain text only — no asterisks, no markdown formatting
- If this is follow-up 2 or 3, acknowledge the silence gently, don't be pushy
- If an approved script above is relevant, weave its key points into your message

Write only the message text, nothing else.
`.trim();

      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const result = await groq.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.8,
      });

      const reply = result.choices[0].message.content.trim();
      if (reply) return reply;

    } catch (err) {
      console.warn('[FollowUp] Groq unavailable, using static template:', err.message);
    }
  }

  // ── Static fallback ───────────────────────────────────────────────────────
  const bucket = STATIC_TEMPLATES[leadStatus] || STATIC_TEMPLATES.New;
  const idx    = Math.min(followUpNumber - 1, bucket.length - 1);
  return bucket[idx](customerName);
}

module.exports = { generateFollowUpMessage };
