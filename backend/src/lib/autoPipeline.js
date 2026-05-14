/**
 * BILT AFRICA — Auto-Pipeline Deal Creator
 *
 * Silently analyses every inbound customer message for buying intent.
 * When intent is detected, it auto-creates a pipeline deal at the
 * "Negotiating" stage — no manual input required from the agent.
 *
 * Trigger conditions (any one is enough):
 *   1. Price negotiation language
 *   2. Urgency / commitment signals
 *   3. Post-viewing price/payment follow-up (viewing in history + price signal now)
 *   4. Explicit deal/contract language
 */

const supabase = require('./supabase');

// ── Company / individual detection ───────────────────────────────────────────

const COMPANY_INDICATORS = [
  'ltd', 'limited', 'llc', 'inc', 'incorporated', 'corp', 'corporation',
  'ventures', 'venture', 'enterprises', 'enterprise', 'group', 'associates',
  'holdings', 'realty', 'development', 'developments', 'consult', 'consulting',
  'invest', 'investment', 'co.', 'company', 'properties', 'real estate',
];

/**
 * Returns 'company' if the name looks like a business, otherwise 'individual'.
 * @param {string} name
 * @returns {'company'|'individual'}
 */
function detectContactType(name) {
  const lower = (name || '').toLowerCase();
  return COMPANY_INDICATORS.some(i => lower.includes(i)) ? 'company' : 'individual';
}

// ── Signal word lists ─────────────────────────────────────────────────────────

const PRICE_NEGOTIATION = [
  'can you do', 'best price', 'lower the price', 'bring it down',
  'discount', 'negotiate', 'negotiable', 'make an offer', 'my offer',
  'willing to take', 'willing to accept', 'how much can you go',
  'reduce', 'final price', 'last price', 'best you can do',
  'any flexibility', 'flexible on price',
];

const COMMITMENT_SIGNALS = [
  'ready to buy', 'ready to purchase', 'ready to move', 'ready to proceed',
  'i want it', 'i want this', "i'll take it", "i'll take this",
  "let's do this", "let's go", "let's proceed",
  'when can i pay', 'how do i pay', 'how to pay', 'payment process',
  'deposit', 'down payment', 'initial payment', 'upfront payment',
  'mortgage', 'financing', 'home loan', 'bank loan',
  'my bank', 'transfer the money', 'send the money', 'bank transfer',
  'make payment', 'pay now', 'pay today',
];

const DEAL_LANGUAGE = [
  'close the deal', 'seal the deal', 'seal it', 'make it happen',
  'sign the', 'signing', 'contract', 'agreement', 'paperwork',
  'legal documents', 'documentation', 'notary', 'lawyer', 'solicitor',
  'title deed', 'indenture', 'land registry',
];

const VIEWING_MENTIONS = [
  'view', 'viewing', 'visited', 'came to see', 'i saw', 'we saw',
  'inspection', 'tour', 'show me', 'come see', 'come visit',
  'i was there', 'checked it out', 'liked it', 'loved it',
];

// Negative signals — suppress intent detection when present
// Catches "can't do GHS 440k, too expensive" style false positives
const NEGATIVE_SIGNALS = [
  "can't do", "cannot do", "won't do", "wouldn't do",
  "can't afford", "cannot afford", "can't go that", "can't go below",
  "too much", "too expensive", "too high", "too pricey",
  "out of my budget", "above my budget", "beyond my budget",
  "over my budget", "not in my budget", "exceeds my budget",
  "not interested", "no longer interested", "not ready",
  "changed my mind", "never mind", "nevermind", "forget it",
  "don't want", "do not want", "not looking", "just browsing",
  "only asking", "just wondering", "just curious",
  "can't proceed", "cannot proceed",
];

// Signals that — combined with a prior viewing — indicate post-viewing intent
const POST_VIEWING_INTENT = [
  'price', 'cost', 'how much', 'what is the price', 'the price',
  'deposit', 'down payment', 'payment', 'pay', 'afford',
  'negotiate', 'offer', 'discount', 'deal', 'proceed',
];

// ── Intent detection ──────────────────────────────────────────────────────────

/**
 * Analyses the current message + recent history for buying intent.
 * @param {string}   currentText    - The customer's latest message
 * @param {Array}    recentMessages - Last N messages from DB ({ type, text })
 * @returns {{ detected: boolean, reason: string|null }}
 */
function detectBuyingIntent(currentText, recentMessages) {
  const lower = (currentText || '').toLowerCase();

  // 0. Suppress if message is negative/rejection (e.g. "can't do GHS 440k, too expensive")
  if (NEGATIVE_SIGNALS.some(s => lower.includes(s))) {
    return { detected: false, reason: null };
  }

  // 1. Price negotiation language
  if (PRICE_NEGOTIATION.some(s => lower.includes(s))) {
    return { detected: true, reason: 'price negotiation' };
  }

  // 2. Commitment / urgency signals
  if (COMMITMENT_SIGNALS.some(s => lower.includes(s))) {
    return { detected: true, reason: 'purchase commitment' };
  }

  // 4. Explicit deal/contract language
  if (DEAL_LANGUAGE.some(s => lower.includes(s))) {
    return { detected: true, reason: 'deal/contract language' };
  }

  // 3. Viewing progression: history had a viewing + current message asks about price/payment
  const priorMessages = (recentMessages || []).filter(m => m.type === 'in');
  const hadViewing = priorMessages.some(
    m => VIEWING_MENTIONS.some(s => (m.text || '').toLowerCase().includes(s))
  );
  if (hadViewing && POST_VIEWING_INTENT.some(s => lower.includes(s))) {
    return { detected: true, reason: 'post-viewing price/payment follow-up' };
  }

  return { detected: false, reason: null };
}

// ── Price extraction ──────────────────────────────────────────────────────────

function extractAmount(text) {
  const t = text || '';

  // Match: "GHS 480,000", "GHS 480k", "₵480000", "480,000 cedis"
  const patterns = [
    /(?:GHS?|₵)\s*([\d,]+(?:\.\d+)?)\s*([km]?)/i,
    /([\d,]+(?:\.\d+)?)\s*([km]?)\s*(?:GHS?|cedis?|₵)/i,
  ];

  for (const re of patterns) {
    const m = t.match(re);
    if (!m) continue;

    let raw = parseFloat(m[1].replace(/,/g, '')) || 0;
    const suffix = (m[2] || '').toLowerCase();
    if (suffix === 'k') raw *= 1_000;
    if (suffix === 'm') raw *= 1_000_000;

    if (raw > 0) {
      const display = raw >= 1_000_000
        ? `GHS ${(raw / 1_000_000).toFixed(2)}m`
        : raw >= 1_000
          ? `GHS ${(raw / 1_000).toFixed(0)}k`
          : `GHS ${raw}`;
      return { display, numeric: raw };
    }
  }

  return { display: 'TBD', numeric: 0 };
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Silently check a customer message for buying intent.
 * Creates a pipeline deal if intent is detected and no open deal exists yet.
 *
 * Called fire-and-forget — errors are caught internally and logged.
 *
 * @param {object} opts
 * @param {string} opts.conversationId
 * @param {string} opts.userId
 * @param {string} opts.clientName
 * @param {string} opts.messageText
 */
async function tryAutoCreateDeal({ conversationId, userId, clientName, messageText }) {
  try {
    // ── 1. Fetch recent conversation history ────────────────────────────────
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('type, text')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(12);

    // oldest → newest for context checks
    const history = (recentMessages || []).reverse();

    // ── 2. Detect buying intent ─────────────────────────────────────────────
    const { detected, reason } = detectBuyingIntent(messageText, history);
    if (!detected) return;

    // ── 3. Deduplication: skip if an open deal already exists for this client
    const { data: existingDeal } = await supabase
      .from('pipeline_deals')
      .select('id')
      .eq('user_id', userId)
      .eq('client', clientName)
      .neq('stage', 'Closed')
      .maybeSingle();

    if (existingDeal) {
      console.log(`[AutoPipeline] Open deal already exists for "${clientName}" — skipping`);
      return;
    }

    // ── 4. Extract amount if mentioned in message ───────────────────────────
    const { display: amount, numeric: amountNumeric } = extractAmount(messageText);

    // ── 5. Create the pipeline deal ─────────────────────────────────────────
    const { data: deal, error } = await supabase
      .from('pipeline_deals')
      .insert({
        user_id:        userId,
        property_name:  'Property Inquiry',
        client:         clientName,
        amount,
        amount_numeric: amountNumeric,
        stage:          'Negotiating',
        progress:       50,
      })
      .select()
      .single();

    if (error) {
      console.error('[AutoPipeline] DB insert failed:', error.message);
      return;
    }

    console.log(`[AutoPipeline] ✅ Deal auto-created — client: "${clientName}" | reason: ${reason} | amount: ${amount} | deal: ${deal.id}`);

  } catch (err) {
    console.error('[AutoPipeline] Unexpected error:', err.message);
  }
}

module.exports = { tryAutoCreateDeal, detectBuyingIntent, detectContactType };
