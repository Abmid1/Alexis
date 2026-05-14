/**
 * BILT AFRICA — AI Conversation Engine
 * Uses Groq (llama-3.3-70b-versatile) with real property listings,
 * conversation history, and the agency's own approved AI templates.
 *
 * Template priority: when a customer message matches a saved template topic,
 * the AI uses the agency's approved wording instead of making up its own answer.
 */

const Groq = require('groq-sdk');
const supabase = require('./supabase');

const MODEL = 'llama-3.3-70b-versatile';

// ── Escalation check (always runs, even without Groq) ────────────────────────
const ESCALATION_KEYWORDS = [
  'speak to agent', 'real person', 'human', 'call me', 'phone number',
  'speak to someone', 'representative', 'manager', 'speak to a person',
  'talk to someone', 'contact agent',
];

const ESCALATION_REPLY =
  "I'll connect you with one of our expert agents right away! 🤝 They will be with you shortly.";

const DEFAULT_REPLY =
  "Thanks for reaching out to BILT Africa! 🏡 I'm your property assistant. I can help you browse listings, get pricing, or schedule a viewing. What are you looking for?";

// ── Build the template section of the system prompt ──────────────────────────
function buildTemplateSection(templates) {
  if (!templates || templates.length === 0) return '';

  const scripts = templates
    .map((t, i) => {
      const lines = [
        `SCRIPT ${i + 1} — Topic: ${t.trigger_desc}`,
        `  Example question: "${t.question}"`,
        `  Your approved response:`,
        `  "${t.answer}"`,
      ];
      return lines.join('\n');
    })
    .join('\n\n');

  return `

APPROVED SCRIPTS — YOUR HIGHEST PRIORITY INSTRUCTIONS:
The agency has written specific approved answers for certain topics.
When a customer's question matches any of the topics below, you MUST base
your reply on the approved response provided. You may adjust the exact
wording slightly to sound natural in the flow of conversation, but you
must preserve all key information, pricing details, policies, and promises
exactly as written. Never contradict or omit anything from an approved script.

${scripts}

For any topic NOT listed above, use your own judgment together with the
property listings and Ghana real estate knowledge provided.`;
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(properties, templates, agentName) {
  const propList = properties.length
    ? properties
        .map(
          p =>
            `• ${p.name} — ${p.location} — ${p.price} (${
              p.type === 'sale' ? 'For Sale' : p.type === 'rent' ? 'For Rent' : 'Land'
            })`
        )
        .join('\n')
    : 'No active listings at this time.';

  return `
You are a friendly, professional AI property assistant for ${agentName || 'BILT Africa'}, a real estate agency in Accra, Ghana.

YOUR ROLE:
- Help potential buyers and renters find the right property
- Answer questions about listings, pricing, neighborhoods, and the buying/renting process
- Qualify leads by understanding their budget, preferred area, and timeline
- Book viewings and connect serious buyers with the agent

CURRENT LIVE LISTINGS:
${propList}
${buildTemplateSection(templates)}

RULES:
- Only mention properties from the live listings above — never invent listings
- If no listing matches what they want, say so honestly and ask for more details so the agent can source it
- Keep replies SHORT and conversational — this is WhatsApp/Instagram, not an email
- Use 1–2 emojis per message maximum, only where natural
- Always reply in the same language the customer uses
- If the customer asks to speak to a human or agent, say you'll connect them immediately
- Never discuss politics, religion, or anything unrelated to real estate
- Ghana context: prices in GHS, areas include East Legon, Cantonments, Airport Res, Osu, Tema, Adenta, Spintex

TONE: Warm, professional, and helpful — like a knowledgeable friend in real estate.
`.trim();
}

// ── Detect if a template was used in the AI reply ────────────────────────────
function detectUsedTemplate(reply, templates) {
  const replyLower = reply.toLowerCase();
  for (const t of templates) {
    const words = (t.answer || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length < 4) continue;
    for (let i = 0; i <= words.length - 4; i++) {
      const phrase = words.slice(i, i + 4).join(' ');
      if (replyLower.includes(phrase)) return t.id;
    }
  }
  return null;
}

// ── Increment used_count on the detected template ────────────────────────────
async function incrementTemplateCount(templateId) {
  const { data } = await supabase
    .from('ai_templates')
    .select('used_count')
    .eq('id', templateId)
    .single();

  if (data) {
    await supabase
      .from('ai_templates')
      .update({ used_count: (data.used_count || 0) + 1 })
      .eq('id', templateId);
  }
}

// ── Main function ─────────────────────────────────────────────────────────────
async function generateAIReply({ messageText, userId, conversationId, agentName }) {
  const lower = (messageText || '').toLowerCase().trim();

  if (ESCALATION_KEYWORDS.some(kw => lower.includes(kw))) {
    return { text: ESCALATION_REPLY, escalate: true };
  }

  if (!process.env.GROQ_API_KEY) {
    console.warn('[AI] GROQ_API_KEY not set — using default reply');
    return { text: DEFAULT_REPLY, escalate: false };
  }

  try {
    // ── 1. Fetch agent's real property listings ───────────────────────────────
    const { data: properties } = await supabase
      .from('properties')
      .select('name, location, price, type, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    // ── 2. Fetch the agency's approved AI templates ───────────────────────────
    const { data: templates } = await supabase
      .from('ai_templates')
      .select('id, trigger_desc, question, answer')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    // ── 3. Fetch recent conversation history (last 10 messages) ──────────────
    const { data: recentMsgs } = await supabase
      .from('messages')
      .select('type, text')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Convert to OpenAI-style history (oldest first, exclude the current message)
    const history = (recentMsgs || [])
      .reverse()
      .slice(0, -1)
      .filter(m => m.text?.trim())
      .map(m => ({
        role: m.type === 'in' ? 'user' : 'assistant',
        content: m.text,
      }));

    // ── 4. Call Groq ──────────────────────────────────────────────────────────
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const result = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt(properties || [], templates || [], agentName) },
        ...history,
        { role: 'user', content: messageText },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply = result.choices[0].message.content.trim();
    console.log(`[AI] ✅ Groq reply generated (${reply.length} chars)`);

    // ── 5. Track which template was used (fire-and-forget) ───────────────────
    if (templates && templates.length > 0) {
      const usedId = detectUsedTemplate(reply, templates);
      if (usedId) {
        incrementTemplateCount(usedId).catch(() => {});
        console.log(`[AI] 📋 Template used: ${usedId}`);
      }
    }

    return { text: reply, escalate: false };

  } catch (err) {
    console.error('[AI] Groq error:', err.message);

    if (err.message?.includes('rate_limit') || err.message?.includes('quota')) {
      return {
        text: "Thanks for your message! Our team will get back to you shortly. 🏡",
        escalate: false,
      };
    }

    return { text: DEFAULT_REPLY, escalate: false };
  }
}

module.exports = { generateAIReply };
