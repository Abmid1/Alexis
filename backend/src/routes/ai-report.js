/**
 * BILT AFRICA — AI Analyst Route
 * POST /api/ai-report
 *
 * Accepts a chat history, enriches it with the agent's live CRM data,
 * then calls Groq (llama-3.3-70b-versatile) to return a real estate business insight.
 *
 * Required .env:
 *   GROQ_API_KEY=gsk_...   ← free at console.groq.com
 */

const express = require('express');
const Groq    = require('groq-sdk');
const supabase = require('../lib/supabase');
const auth     = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const MODEL = 'llama-3.3-70b-versatile';

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

  const leadTotal  = leads.length;
  const byStatus   = groupCount(leads, 'status');
  const bySource   = groupCount(leads, 'source');
  const hotWarm    = (byStatus.Hot || 0) + (byStatus.Warm || 0);
  const closeRate  = leadTotal ? Math.round((byStatus.Qualified || 0) / leadTotal * 100) : 0;

  const pipeTotal  = deals.length;
  const pipeValue  = deals.reduce((s, d) => s + parseAmount(d.amount), 0);
  const byStage    = groupCount(deals, 'stage');
  const closed     = byStage.Closed || 0;

  const propTotal  = props.length;

  // Split by listing type
  const forSale    = props.filter(p => p.type === 'sale');
  const forRent    = props.filter(p => p.type === 'rent');
  const forLand    = props.filter(p => p.type === 'land');

  // Split by sold status (the toggle on the Properties page sets status = 'Sold')
  const soldProps   = props.filter(p => (p.status || '').toLowerCase() === 'sold');
  const activeProps = props.filter(p => (p.status || '').toLowerCase() !== 'sold');

  const soldSaleProps  = soldProps.filter(p => p.type === 'sale');
  const soldRentProps  = soldProps.filter(p => p.type === 'rent');
  const soldLandProps  = soldProps.filter(p => p.type === 'land');

  const soldValue   = soldProps.reduce((s, p) => s + (p.price_numeric || 0), 0);
  const activeValue = forSale.filter(p => (p.status || '').toLowerCase() !== 'sold')
                             .reduce((s, p) => s + (p.price_numeric || 0), 0);

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

PROPERTIES (${propTotal} total):
- SOLD: ${soldProps.length} properties (${soldSaleProps.length} sale, ${soldRentProps.length} rent, ${soldLandProps.length} land) — total value GHS ${(soldValue / 1_000_000).toFixed(2)}m
- ACTIVE listings: ${activeProps.length} (${forSale.filter(p => (p.status||'').toLowerCase() !== 'sold').length} for sale, ${forRent.filter(p => (p.status||'').toLowerCase() !== 'sold').length} for rent, ${forLand.filter(p => (p.status||'').toLowerCase() !== 'sold').length} land)
- Active for-sale value: GHS ${(activeValue / 1_000_000).toFixed(2)}m
- Listing breakdown by type: sale=${forSale.length}, rent=${forRent.length}, land=${forLand.length}

AI PERFORMANCE (last 30 days):
- Inbound messages: ${inbound}
- AI auto-replies sent: ${aiReplies}
- AI handle rate: ${aiRate}%
`.trim();
}

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
router.post('/', async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({
      error: 'GROQ_API_KEY is not set. Get a free key at console.groq.com then add it to backend/.env',
    });
  }

  try {
    const crmContext = await buildCRMContext(req.user.id).catch(() => '(CRM data unavailable)');

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // messages from the client are already { role: 'user'|'assistant', content: string }
    const result = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: `${SYSTEM_PROMPT}\n\n${crmContext}` },
        ...messages,
      ],
      max_tokens: 1024,
      temperature: 0.5,
    });

    const reply = result.choices[0].message.content;
    res.json({ reply });

  } catch (err) {
    console.error('[AI Report] Groq error:', err.message);

    if (err.status === 401 || err.message?.includes('invalid_api_key') || err.message?.includes('Unauthorized')) {
      return res.status(503).json({ error: 'Invalid Groq API key. Check your GROQ_API_KEY in backend/.env' });
    }
    if (err.message?.includes('rate_limit') || err.message?.includes('quota')) {
      return res.status(503).json({ error: 'Groq rate limit reached. Wait a moment and try again.' });
    }

    res.status(500).json({ error: err.message || 'AI request failed' });
  }
});

module.exports = router;
