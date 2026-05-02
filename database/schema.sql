-- ============================================================
-- BILT AFRICA — Supabase Schema
-- Run this in the Supabase SQL Editor to initialise the database
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users (custom auth, NOT Supabase Auth) ───────────────────
CREATE TABLE IF NOT EXISTS users (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  role           TEXT DEFAULT 'agent',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Password reset tokens ────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Leads ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  source     TEXT DEFAULT 'WhatsApp',
  interest   TEXT DEFAULT '',
  budget     TEXT DEFAULT '',
  status     TEXT DEFAULT 'New',
  ai_score   INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Properties ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  location      TEXT DEFAULT 'Accra',
  price         TEXT NOT NULL,
  price_numeric BIGINT DEFAULT 0,
  type          TEXT DEFAULT 'sale',
  status        TEXT DEFAULT 'Pending',
  emoji         TEXT DEFAULT '🏠',
  color         TEXT DEFAULT 'green',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Conversations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  initials     TEXT,
  avatar_color TEXT DEFAULT 'g',
  last_message TEXT DEFAULT '',
  source       TEXT DEFAULT 'WhatsApp',
  status       TEXT DEFAULT 'AI live',
  ai_active    BOOLEAN DEFAULT true,
  context      TEXT DEFAULT '',
  lead_status  TEXT,
  unread       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Messages ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  text            TEXT NOT NULL,
  time_text       TEXT,
  label           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Pipeline deals ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_deals (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  property_name  TEXT NOT NULL,
  client         TEXT NOT NULL,
  amount         TEXT NOT NULL,
  amount_numeric BIGINT DEFAULT 0,
  stage          TEXT DEFAULT 'New',
  progress       INTEGER DEFAULT 10,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Follow-ups ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follow_ups (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  subtitle   TEXT DEFAULT '',
  time_text  TEXT DEFAULT '',
  status     TEXT DEFAULT 'Scheduled',
  completed  BOOLEAN DEFAULT false,
  section    TEXT DEFAULT 'today',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Campaigns ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  color      TEXT DEFAULT 'g',
  title      TEXT NOT NULL,
  subtitle   TEXT DEFAULT '',
  status     TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AI Response Templates ────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_templates (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  trigger_label  TEXT DEFAULT 'New',
  trigger_color  TEXT DEFAULT 'new',
  trigger_desc   TEXT NOT NULL,
  question       TEXT NOT NULL,
  answer         TEXT NOT NULL,
  used_count     INTEGER DEFAULT 0,
  continue_rate  INTEGER DEFAULT 0,
  auto_tag       TEXT DEFAULT 'Auto',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_user        ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_user   ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_convs_user        ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_msgs_conv         ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_user     ON pipeline_deals(user_id);
CREATE INDEX IF NOT EXISTS idx_followups_user    ON follow_ups(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user    ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_user    ON ai_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_resets_token      ON password_resets(token);
