/**
 * BILT AFRICA — Meta Graph API Client
 * Handles sending messages back through WhatsApp, Facebook Messenger, and Instagram.
 *
 * Requires these env vars (set in .env):
 *   WHATSAPP_ACCESS_TOKEN       — from Meta App Dashboard > WhatsApp > API Setup
 *   WHATSAPP_PHONE_NUMBER_ID    — the phone number ID (not the display number)
 *   FACEBOOK_PAGE_ACCESS_TOKEN  — from Meta App Dashboard > Messenger > Configuration
 *   FACEBOOK_PAGE_ID            — your Facebook Page ID
 *   INSTAGRAM_ACCESS_TOKEN      — same app token with instagram_basic & pages_messaging scope
 *   INSTAGRAM_BUSINESS_ID       — your Instagram Business Account ID
 */

const GRAPH = 'https://graph.facebook.com/v19.0';

/**
 * Low-level POST to Meta Graph API.
 */
async function metaPost(endpoint, payload, accessToken) {
  const url = `${GRAPH}/${endpoint}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error(`[Meta API] ${endpoint} error:`, JSON.stringify(data));
      throw new Error(data.error?.message || `Meta API ${res.status}`);
    }

    return data;
  } catch (err) {
    console.error(`[Meta API] Failed to POST ${endpoint}:`, err.message);
    throw err;
  }
}

// ── WhatsApp ────────────────────────────────────────────────────────────────

/**
 * Send a text message via WhatsApp Business API.
 * @param {string} to   - Recipient phone number in E.164 format (e.g. "233501234567")
 * @param {string} text - Message body
 */
async function sendWhatsAppMessage(to, text) {
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    console.warn('[Meta] WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set — skipping send');
    return null;
  }

  return metaPost(
    `${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text, preview_url: false },
    },
    process.env.WHATSAPP_ACCESS_TOKEN
  );
}

/**
 * Send a WhatsApp template message (for first-touch / outside 24-hr window).
 * @param {string} to           - Recipient phone
 * @param {string} templateName - Approved template name
 * @param {string} langCode     - e.g. "en_US"
 */
async function sendWhatsAppTemplate(to, templateName, langCode = 'en_US') {
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) return null;

  return metaPost(
    `${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: templateName, language: { code: langCode } },
    },
    process.env.WHATSAPP_ACCESS_TOKEN
  );
}

// ── Facebook Messenger ──────────────────────────────────────────────────────

/**
 * Send a text message via Facebook Messenger.
 * @param {string} recipientId - The sender's Page-Scoped ID (PSID)
 * @param {string} text        - Message body
 */
async function sendMessengerMessage(recipientId, text) {
  if (!process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
    console.warn('[Meta] FACEBOOK_PAGE_ACCESS_TOKEN not set — skipping Messenger send');
    return null;
  }

  return metaPost(
    'me/messages',
    {
      recipient: { id: recipientId },
      message: { text },
      messaging_type: 'RESPONSE',
    },
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  );
}

// ── Instagram ───────────────────────────────────────────────────────────────

/**
 * Send a text message via Instagram Messaging.
 * @param {string} recipientId - The sender's Instagram-Scoped ID (IGSID)
 * @param {string} text        - Message body
 */
async function sendInstagramMessage(recipientId, text) {
  if (!process.env.INSTAGRAM_ACCESS_TOKEN) {
    console.warn('[Meta] INSTAGRAM_ACCESS_TOKEN not set — skipping Instagram send');
    return null;
  }

  return metaPost(
    'me/messages',
    {
      recipient: { id: recipientId },
      message: { text },
    },
    process.env.INSTAGRAM_ACCESS_TOKEN
  );
}

// ── Unified sender ──────────────────────────────────────────────────────────

/**
 * Send a message through the correct platform based on source.
 * @param {'WhatsApp'|'Facebook'|'Instagram'} platform
 * @param {string} platformId - Phone number or PSID/IGSID
 * @param {string} text
 */
async function sendPlatformMessage(platform, platformId, text) {
  switch (platform) {
    case 'WhatsApp':
      return sendWhatsAppMessage(platformId, text);
    case 'Facebook':
      return sendMessengerMessage(platformId, text);
    case 'Instagram':
      return sendInstagramMessage(platformId, text);
    default:
      console.warn(`[Meta] Unknown platform: ${platform}`);
      return null;
  }
}

module.exports = {
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
  sendMessengerMessage,
  sendInstagramMessage,
  sendPlatformMessage,
};
