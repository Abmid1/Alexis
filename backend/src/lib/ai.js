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

// ── Property pre-filter (narrows list before it reaches the AI) ───────────────

/**
 * Filters the full property list down to those that match what the customer
 * is asking for, based on cheap keyword/regex parsing of the message.
 * Falls back to the full list (capped at 20) if nothing can be inferred.
 */
function preFilterProperties(properties, messageText) {
  if (!properties || properties.length === 0) return [];
  const lower = (messageText || '').toLowerCase();

  // Detect rent vs sale intent
  const wantsRent = /\b(rent|rental|per month|monthly|lease)\b/.test(lower);
  const wantsSale = /\b(buy|purchase|for sale|buying|own|ownership)\b/.test(lower);

  // Detect bedroom count (e.g. "2 bed", "3 bedroom", "4br")
  const bedMatch = lower.match(/(\d+)\s*(?:bed(?:room)?s?|br)\b/);
  const bedCount = bedMatch ? parseInt(bedMatch[1], 10) : null;

  // Detect max price (e.g. "under GHS 3000", "budget of 500k", "max ₵ 2m")
  const priceMatch = lower.match(
    /(?:under|below|max(?:imum)?|budget(?:\s+of)?|up\s+to|around|at\s+most)\s*(?:ghs?|₵)?\s*([\d,]+)\s*([km]?)/i
  );
  let maxPrice = null;
  if (priceMatch) {
    maxPrice = parseFloat(priceMatch[1].replace(/,/g, '')) || 0;
    const suf = (priceMatch[2] || '').toLowerCase();
    if (suf === 'k') maxPrice *= 1_000;
    if (suf === 'm') maxPrice *= 1_000_000;
  }

  let filtered = [...properties];

  // Filter by type
  if (wantsRent && !wantsSale)  filtered = filtered.filter(p => p.type === 'rent');
  if (wantsSale && !wantsRent)  filtered = filtered.filter(p => p.type === 'sale');

  // Filter by bedroom count (only if the property name/description carries bed info)
  if (bedCount) {
    const byBed = filtered.filter(p => {
      const m = (p.name || '').match(/(\d+)\s*(?:bed(?:room)?s?|br)\b/i);
      return !m || parseInt(m[1], 10) === bedCount;
    });
    if (byBed.length > 0) filtered = byBed;
  }

  // Filter by max price
  if (maxPrice && maxPrice > 0) {
    const byPrice = filtered.filter(p => (p.price_numeric || 0) <= maxPrice && (p.price_numeric || 0) > 0);
    if (byPrice.length > 0) filtered = byPrice;
  }

  return filtered.slice(0, 20);
}

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
function buildSystemPrompt(properties, templates, agentName, contactName, contactType) {
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

  // Decide whether we need to ask for their name
  const nameIsUnknown = !contactName || /^\+?\d[\d\s\-()]{6,}$/.test(contactName)
    || contactName.startsWith('Facebook User')
    || contactName.startsWith('Instagram User');

  const nameInstruction = nameIsUnknown
    ? '- You do NOT know the customer\'s name yet. If this is early in the conversation, introduce yourself warmly and ask for their name naturally.'
    : `- The customer's name is ${contactName}. Use it occasionally to personalise the conversation.`;

  const companyInstruction = contactType === 'company'
    ? '- This appears to be a COMPANY / business contact. They may be looking for commercial property, multiple units, or investment opportunities. Ask about their business needs.'
    : '';

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
${nameInstruction}
${companyInstruction}

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
    const { data: allProperties } = await supabase
      .from('properties')
      .select('name, location, price, price_numeric, type, status')
      .eq('user_id', userId)
      .neq('status', 'Sold')
      .order('created_at', { ascending: false })
      .limit(50);

    // Pre-filter to properties relevant to this message
    const properties = preFilterProperties(allProperties || [], messageText);

    // ── 2. Fetch the agency's approved AI templates ───────────────────────────
    const { data: templates } = await supabase
      .from('ai_templates')
      .select('id, trigger_desc, question, answer')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    // ── 3. Fetch conversation context (name, recent history) ─────────────────
    const [{ data: conv }, { data: recentMsgs }] = await Promise.all([
      supabase.from('conversations').select('name, contact_type').eq('id', conversationId).maybeSingle(),
      supabase.from('messages').select('type, text').eq('conversation_id', conversationId)
        .order('created_at', { ascending: false }).limit(10),
    ]);

    const contactName = conv?.name || null;
    const contactType = conv?.contact_type || 'individual';

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
        { role: 'system', content: buildSystemPrompt(properties, templates || [], agentName, contactName, contactType) },
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
