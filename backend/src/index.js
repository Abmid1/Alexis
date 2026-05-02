require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/leads',         require('./routes/leads'));
app.use('/api/properties',    require('./routes/properties'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/pipeline',      require('./routes/pipeline'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/followups',     require('./routes/followups'));
app.use('/api/airesponses',   require('./routes/airesponses'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n✅  BILT AFRICA API → http://localhost:${PORT}`);
  console.log(`   Supabase: ${process.env.SUPABASE_URL || 'NOT SET'}\n`);
});
