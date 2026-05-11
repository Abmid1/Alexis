const express = require('express');
const supabase = require('../lib/supabase');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
};

// Follow-up thresholds per status (hours)
const FOLLOW_UP_HOURS = { Hot: 4, Warm: 24, New: 2, Cold: 168, Qualified: Infinity };

const fmt = (l) => ({ ...l, added: timeAgo(l.created_at) });

// GET /api/leads
router.get('/', async (req, res) => {
  const { status, source } = req.query;
  let q = supabase.from('leads').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  if (source) q = q.eq('source', source);
  const { data: leads, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  // ── Enrich with "last contacted" data ──────────────────────────────
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, name')
    .eq('user_id', req.user.id);

  // name → conversation_id map
  const nameToConvId = {};
  (conversations || []).forEach(c => { nameToConvId[c.name] = c.id; });

  // Batch-fetch last outbound/ai message per relevant conversation
  const convIds = leads.map(l => nameToConvId[l.name]).filter(Boolean);
  let lastContactMap = {};

  if (convIds.length > 0) {
    const { data: lastMsgs } = await supabase
      .from('messages')
      .select('conversation_id, created_at')
      .in('conversation_id', convIds)
      .in('type', ['out', 'ai'])
      .order('created_at', { ascending: false });

    (lastMsgs || []).forEach(m => {
      if (!lastContactMap[m.conversation_id]) {
        lastContactMap[m.conversation_id] = m.created_at;
      }
    });
  }

  const enriched = leads.map(l => {
    const convId   = nameToConvId[l.name];
    const lastAt   = convId ? (lastContactMap[convId] || null) : null;
    const threshold = FOLLOW_UP_HOURS[l.status] ?? Infinity;
    const hoursSince = lastAt
      ? (Date.now() - new Date(lastAt).getTime()) / 3_600_000
      : Infinity;
    return {
      ...fmt(l),
      last_contacted_at: lastAt,
      due_for_follow_up: hoursSince >= threshold,
    };
  });

  res.json(enriched);
});

// GET /api/leads/stats
router.get('/stats', async (req, res) => {
  const { data, error } = await supabase.from('leads').select('status, ai_score, created_at').eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });

  const today = new Date(); today.setHours(0,0,0,0);
  const total = data.length;
  const newToday = data.filter(l => new Date(l.created_at) >= today).length;
  const aiQualified = data.filter(l => l.ai_score !== null).length;

  res.json({ total, newToday, aiQualified });
});

// POST /api/leads
router.post('/', async (req, res) => {
  const { name, source, interest, budget } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const { data, error } = await supabase
    .from('leads')
    .insert({ user_id: req.user.id, name, source: source || 'WhatsApp', interest: interest || '', budget: budget || '', status: 'New', ai_score: null })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(fmt(data));
});

// PATCH /api/leads/:id
router.patch('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('leads').update(req.body).eq('id', req.params.id).eq('user_id', req.user.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(data));
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('leads').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
