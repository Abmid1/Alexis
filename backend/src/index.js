require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5000",
    "https://alexis-gqtzfsj0j-tipagya518-3934s-projects.vercel.app"
  ],
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.options("*", cors());

// Increase body limit for base64-encoded image uploads (compressed ~300KB each × 12 = ~4MB)
app.use(express.json({ limit: '20mb' }));

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/leads',         require('./routes/leads'));
app.use('/api/properties',    require('./routes/properties'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/pipeline',      require('./routes/pipeline'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/followups',     require('./routes/followups'));
app.use('/api/airesponses',   require('./routes/airesponses'));
app.use('/api/upload',        require('./routes/upload'));
app.use('/api/ai-report',     require('./routes/ai-report'));
app.use('/api/auto-followups',require('./routes/auto-followups'));

// ── Meta Webhook (WhatsApp / Facebook / Instagram) ─────────────────
// No auth middleware — Meta calls this directly from their servers.
app.use('/api/webhook',       require('./routes/webhook'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n✅  BILT AFRICA API → http://localhost:${PORT}`);
  console.log(`   Supabase: ${process.env.SUPABASE_URL || 'NOT SET'}\n`);

  // Start proactive AI follow-up scheduler
  const { startFollowUpScheduler } = require('./jobs/followupScheduler');
  startFollowUpScheduler();
});
