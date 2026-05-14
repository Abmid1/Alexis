/**
 * BILT AFRICA — Unified Meta Webhook
 *
 * Handles incoming messages from:
 *   • WhatsApp Business API
 *   • Facebook Messenger
 *   • Instagram Messaging
 *
 * All three platforms share the same webhook endpoint via Meta's Graph API.
 *
 * ── How to set this up ──────────────────────────────────────────────────────
 * 1. Go to developers.facebook.com and create / open your Meta App.
 * 2. Add these products to the app: WhatsApp, Messenger, Instagram.
 * 3. Under each product → Webhooks, subscribe to field "messages".
 * 4. Set the webhook URL to: https://YOUR_DOMAIN/api/webhook
 * 5. Set the Verify Token to the value of WEBHOOK_VERIFY_TOKEN in your .env
 * 6. Fill in the access tokens and IDs in your .env file.
 *
 * For local development use: npx localtunnel --port 5000
 * Or: ngrok http 5000
 * ────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const supabase = require('../lib/supabase');
const { sendPlatformMessage } = require('../lib/meta');
const { generateAIReply } = require('../lib/ai');
const { tryAutoCreateDeal } = require('../lib/autoPipeline');

const router = express.Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

const avatarColorFor = { WhatsApp: 'g', Facebook: 'b', Instagram: 'r' };

function timeStr() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function initials(name = '') {
  return name
    .split(' ')
    .map((n) => n[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'UN';
}

// ── Webhook Verification (GET) ───────────────────────────────────────────────
// Meta calls this once when you configure the webhook URL in the dashboard.
router.get('/', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('[Webhook] ✅ Meta webhook verified successfully');
    return res.status(200).send(challenge);
  }

  console.warn('[Webhook] ❌ Verification failed — wrong token or mode');
  return res.sendStatus(403);
});

// ── Incoming Messages (POST) ─────────────────────────────────────────────────
// Meta expects a 200 response within 5 seconds. We respond immediately,
// then process the message asynchronously.
router.post('/', (req, res) => {
  res.sendStatus(200); // Always ack first

  const body = req.body;
  if (!body || !body.object) return;

  processWebhookEvent(body).catch((err) => {
    console.error('[Webhook] Processing error:', err.message);
  });
});

// ── Event Router ─────────────────────────────────────────────────────────────

async function processWebhookEvent(body) {
  const entry = body.entry?.[0];
  if (!entry) return;

  switch (body.object) {
    case 'whatsapp_business_account':
      return handleWhatsApp(entry);

    case 'instagram':
      return handleInstagramMessaging(entry);

    case 'page':
      // A "page" object can carry both Messenger and Instagram (legacy) events.
      // Check for Instagram-specific fields first.
      if (entry.messaging?.[0]?.recipient?.id === process.env.INSTAGRAM_BUSINESS_ID) {
        return handleInstagramMessaging(entry);
      }
      return handleMessenger(entry);

    default:
      console.log('[Webhook] Unknown object type:', body.object);
  }
}

// ── WhatsApp Handler ─────────────────────────────────────────────────────────

async function handleWhatsApp(entry) {
  const changes = entry.changes || [];

  for (const change of changes) {
    if (change.field !== 'messages') continue;

    const value    = change.value || {};
    const messages = value.messages || [];
    const contacts = value.contacts || [];

    for (const msg of messages) {
      // Only handle inbound text messages (ignore status updates, media, etc.)
      if (msg.type !== 'text') {
        console.log(`[WhatsApp] Skipping non-text message type: ${msg.type}`);
        continue;
      }

      const senderPhone = msg.from;                              // e.g. "233501234567"
      const text        = msg.text?.body || '';
      const contact     = contacts.find((c) => c.wa_id === senderPhone);
      const senderName  = contact?.profile?.name || senderPhone;

      console.log(`[WhatsApp] 📩 ${senderName} (${senderPhone}): ${text}`);

      await processIncomingMessage({
        platform:    'WhatsApp',
        platformId:  senderPhone,
        senderName,
        text,
      });
    }
  }
}

// ── Facebook Messenger Handler ───────────────────────────────────────────────

async function handleMessenger(entry) {
  const messaging = entry.messaging || [];

  for (const event of messaging) {
    // Skip echo messages (messages sent by the page itself)
    if (event.message?.is_echo) continue;
    if (!event.message?.text) continue;

    const senderId = event.sender?.id;
    const text     = event.message.text;

    console.log(`[Facebook] 📩 User ${senderId}: ${text}`);

    await processIncomingMessage({
      platform:    'Facebook',
      platformId:  senderId,
      senderName:  `Facebook User`,
      text,
    });
  }
}

// ── Instagram Handler ────────────────────────────────────────────────────────

async function handleInstagramMessaging(entry) {
  const messaging = entry.messaging || [];

  for (const event of messaging) {
    if (event.message?.is_echo) continue;
    if (!event.message?.text) continue;

    const senderId = event.sender?.id;
    const text     = event.message.text;

    console.log(`[Instagram] 📩 User ${senderId}: ${text}`);

    await processIncomingMessage({
      platform:    'Instagram',
      platformId:  senderId,
      senderName:  `Instagram User`,
      text,
    });
  }
}

// ── Core: Process any incoming message ───────────────────────────────────────

async function processIncomingMessage({ platform, platformId, senderName, text }) {
  if (!text?.trim()) return;

  // ── 1. Find the agent/user to route the message to ─────────────────────
  // In a multi-agent setup, add routing logic here.
  // For now, route to the first registered user.
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('id')
    .limit(1);

  if (userErr || !users?.length) {
    console.error('[Webhook] No users found to route message to');
    return;
  }

  const userId = users[0].id;

  // ── 2. Find or create the conversation ─────────────────────────────────
  // We store the platform + sender ID in the `context` field so we can
  // identify the conversation on subsequent messages.
  const contextKey = `${platform}:${platformId}`;

  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('context', contextKey)
    .maybeSingle();

  let conv;

  if (existing) {
    // Update last message and mark as unread
    await supabase
      .from('conversations')
      .update({ last_message: text, unread: true })
      .eq('id', existing.id);

    conv = existing;
  } else {
    // Create a brand-new conversation
    const { data: newConv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        user_id:     userId,
        name:        senderName,
        initials:    initials(senderName),
        avatar_color: avatarColorFor[platform] || 'g',
        last_message: text,
        source:      platform,
        status:      'AI live',
        ai_active:   true,
        lead_status: 'New',
        unread:      true,
        context:     contextKey,   // "WhatsApp:233501234567"
      })
      .select()
      .single();

    if (convErr) {
      console.error('[Webhook] Failed to create conversation:', convErr.message);
      return;
    }

    conv = newConv;

    // Auto-create a lead for the new contact
    await supabase
      .from('leads')
      .insert({
        user_id: userId,
        name:    senderName,
        source:  platform,
        interest: '',
        budget:  '',
        status:  'New',
        ai_score: null,
      })
      .catch((err) => console.warn('[Webhook] Lead creation skipped:', err.message));

    console.log(`[Webhook] 🆕 New conversation created for ${senderName} via ${platform}`);
  }

  if (!conv) return;

  const ts = timeStr();

  // ── 3. Save the incoming message ─────────────────────────────────────────
  await supabase.from('messages').insert({
    conversation_id: conv.id,
    type:            'in',
    text,
    time_text:       ts,
    label:           null,
  });

  // ── 4. Generate AI reply ──────────────────────────────────────────────────
  const aiActive = conv.ai_active !== false;

  if (!aiActive) {
    console.log('[Webhook] AI is disabled for this conversation — no auto-reply');
    return;
  }

  const { text: aiText, escalate } = await generateAIReply({
    messageText:    text,
    userId:         userId,
    conversationId: conv.id,
    agentName:      'BILT Africa',
  });
  const aiTs = ts + ' · 3 sec';

  // ── 5. Save AI reply to DB ────────────────────────────────────────────────
  await supabase.from('messages').insert({
    conversation_id: conv.id,
    type:            'ai',
    text:            aiText,
    time_text:       aiTs,
    label:           escalate ? '🤖 AI Reply — escalating to agent' : '🤖 AI Reply',
  });

  // Update conversation status if escalating
  const newStatus = escalate ? 'Needs you' : 'AI live';
  await supabase
    .from('conversations')
    .update({ last_message: aiText, status: newStatus, ai_active: !escalate })
    .eq('id', conv.id);

  // ── 6. Auto-pipeline: silently detect buying intent ──────────────────────
  tryAutoCreateDeal({
    conversationId: conv.id,
    userId,
    clientName:  conv.name,
    messageText: text,
  }).catch(() => {});

  // ── 7. Send AI reply back through the platform ────────────────────────────
  try {
    await sendPlatformMessage(platform, platformId, aiText);
    console.log(`[Webhook] ✅ AI reply sent via ${platform} to ${platformId}`);
  } catch (err) {
    console.error(`[Webhook] ❌ Failed to send ${platform} reply:`, err.message);
    // The reply is already saved in DB — agent can manually follow up
  }
}

// ── Export the platformId extractor (used by conversations route) ─────────────
function parsePlatformContext(contextStr) {
  if (!contextStr || !contextStr.includes(':')) return null;
  const idx = contextStr.indexOf(':');
  return {
    platform:   contextStr.slice(0, idx),   // e.g. "WhatsApp"
    platformId: contextStr.slice(idx + 1),  // e.g. "233501234567"
  };
}

module.exports = router;
module.exports.parsePlatformContext = parsePlatformContext;
