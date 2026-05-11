/**
 * BILT AFRICA — AI Analyst Route
 * POST /api/ai-report
 *
 * Accepts a chat history, enriches it with the agent's live CRM data,
 * then calls Google Gemini (free) to return a real estate business insight.
 *
 * Required .env:
 *   GEMINI_API_KEY=AIza...   ← free at aistudio.google.com
 *   OPENAI_API_KEY=sk-...    ← optional fallback
 */

const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('../lib/supabase');
const auth     = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are an expert real estate analyst and business advisor for Bilt Africa, a real estate agency based in Accra, Ghana.

Your capabilities:
- Analyse the agent's live CRM data and generate custom reports on demand
- Answer any question about the Ghanaian real estate market
- Provide strategy for lead conversion, pricing, neighbourhood targeting, and AI automation
- Forecast trends, identify opportunities, and flag risks
- Generate any report the agent asks for — even if it goes beyond the standard dashboard metrics

Market context you always apply:
- Currency: Ghana Cedis (GHS)
- Key areas: East Legon, Airport Residential, Cantonments, Osu, Labone, Tema, Adenta, Spintex Road, Achimota
- Property types: residential sale, rental apartment, commercial, land
- Main lead channels: WhatsApp (highest volume), Instagram, Facebook, Website
- Typical deal timelines: land (1–3 months), residential (2–6 months), commercial (3–9 months)
- Peak seasons: Jan–March (new year moves) and Sept–Nov (end-of-year relocations)

Response style:
- Be concise but genuinely insightful
- Use bullet points for lists; bold key numbers using **number** markdown syntax
- Always tie analysis back to actionable next steps for the agent
- When data is unavailable, give market-based estimates with clear caveats
- Never fabricate specific data you weren't given — say what you know vs. what is estimated
`.trim();

// ── Build CRM context from live Supabase data ─────────────────────────────────
async function buildCRMContext(userId) {
  const [leadsRes, dealsRes, propsRes, msgsRes] = await Promise.all([
    supabase.from('leads').select('source, status, budget, interest, created_at').eq('user_id', userId),
    supabase.from('pipeline_deals').select('stage, amount, property, client').eq('user_id', userId),
    supabase.from('properties').select('type, status, price_numeric, location').eq('user_id', userId),
    supabase.from('messages').select('type, created_at')
      .in('conversation_id',
        (await supabase.from('conversations').select('id').eq('user_id', userId)).data?.map(c => c.id) || []
      )
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
  ]);

  const leads  = leadsRes.data  || [];
  const deals  = dealsRes.data  || [];
  const props  = propsRes.data  || [];
  const msgs   = msgsRes.data   || [];

  // ── Lead stats ───────────────────────────────────────────────────────────────
  const leadTotal  = leads.length;
  const byStatus   = groupCount(leads, 'status');
  const bySource   = groupCount(leads, 'source');
  const hotWarm    = (byStatus.Hot || 0) + (byStatus.Warm || 0);
  const closeRate  = leadTotal ? Math.round((byStatus.Qualified || 0) / leadTotal * 100) : 0;

  // ── Pipeline stats ───────────────────────────────────────────────────────────
  const pipeTotal  = deals.length;
  const pipeValue  = deals.reduce((s, d) => s + parseAmount(d.amount), 0);
  const byStage    = groupCount(deals, 'stage');
  const closed     = byStage.Closed || 0;

  // ── Property stats ───────────────────────────────────────────────────────────
  const propTotal  = props.length;
  const forSale    = props.filter(p => p.type === 'sale');
  const forRent    = props.filter(p => p.type === 'rent');
  const saleValue  = forSale.reduce((s, p) => s + (p.price_numeric || 0), 0);

  // ── Message / AI stats ───────────────────────────────────────────────────────
  const aiReplies  = msgs.filter(m => m.type === 'ai').length;
  const inbound    = msgs.filter(m => m.type === 'in').length;
  const aiRate     = inbound ? Math.round(aiReplies / inbound * 100) : 0;

  return `
=== LIVE CRM DATA (last updated: ${new Date().toISOString().slice(0, 10)}) ===

LEADS (${leadTotal} total):
- By status: ${JSON.stringify(byStatus)}
- By source: ${JSON.stringify(bySource)}
- Hot + Warm (active interest): ${hotWarm}
- Estimated lead-to-qualified rate: ${closeRate}%

PIPELINE (${pipeTotal} deals):
- By stage: ${JSON.stringify(byStage)}
- Deals closed: ${closed}
- Total pipeline value: GHS ${(pipeValue / 1000).toFixed(0)}k
- Active deals: ${pipeTotal - closed}

PROPERTIES (${propTotal} listed):
- For sale: ${forSale.length} (total value: GHS ${(saleValue / 1_000_000).toFixed(2)}m)
- For rent: ${forRent.length}
- Land: ${props.filter(p => p.type === 'land').length}

AI PERFORMANCE (last 30 days):
- Inbound messages: ${inbound}
- AI auto-replies sent: ${aiReplies}
- AI handle rate: ${aiRate}%
`.trim();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function groupCount(arr, key) {
  return arr.reduce((acc, item) => {
    const v = item[key] || 'Unknown';
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});
}

function parseAmount(str = '') {
  const num = parseFloat(String(str).replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
}

// ── POST /api/ai-report ───────────────────────────────────────────────────────
/**
 * Body: {
 *   messages: Array<{ role: 'user' | 'assistant', content: string }>
 * }
 * The client sends the full conversation history so the AI has context.
 */
router.post('/', async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not set. Get a free key at aistudio.google.com then add it to backend/.env',
    });
  }

  try {
    // Pull live CRM context for this user
    const crmContext = await buildCRMContext(req.user.id).catch(() => '(CRM data unavailable)');

    // ── Google Gemini (free) ───────────────────────────────────────────────────
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',            // free tier, very fast
      systemInstruction: `${SYSTEM_PROMPT}\n\n${crmContext}`,
    });

    // Convert message history to Gemini format
    // Gemini uses 'user' and 'model' (not 'assistant')
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    const lastUserMsg = messages[messages.length - 1].content;
    const result = await chat.sendMessage(lastUserMsg);
    const reply  = result.response.text();

    res.json({ reply });

  } catch (err) {
    console.error('[AI Report] Gemini error:', err.message);

    if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('API key not valid')) {
      return res.status(503).json({ error: 'Invalid Gemini API key. Check your GEMINI_API_KEY in backend/.env' });
    }
    if (err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('quota')) {
      return res.status(503).json({ error: 'Gemini free quota reached for today. Resets at midnight Pacific time.' });
    }

    res.status(500).json({ error: err.message || 'AI request failed' });
  }
});

module.exports = router;
