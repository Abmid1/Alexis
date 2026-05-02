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

const fmt = (l) => ({ ...l, added: timeAgo(l.created_at) });

// GET /api/leads
router.get('/', async (req, res) => {
  const { status, source } = req.query;
  let q = supabase.from('leads').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  if (source) q = q.eq('source', source);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(fmt));
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
