const express = require('express');
const supabase = require('../lib/supabase');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const STAGES = ['New', 'Qualified', 'Negotiating', 'Closed'];

// GET /api/pipeline
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('pipeline_deals').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const grouped = Object.fromEntries(STAGES.map(s => [s, []]));
  data.forEach(d => { if (grouped[d.stage]) grouped[d.stage].push({ ...d, property: d.property_name }); });

  // Compute stats
  const closed = data.filter(d => d.stage === 'Closed');
  const totalValue = data.reduce((s, d) => s + (d.amount_numeric || 0), 0);
  const avgDeal = data.length ? Math.round(totalValue / data.length) : 0;
  const winRate = data.length ? Math.round((closed.length / data.length) * 100) : 0;

  res.json({
    deals: data.map(d => ({ ...d, property: d.property_name })),
    grouped,
    stats: { totalValue, totalValueFmt: `GHS ${(totalValue / 1000000).toFixed(1)}m`, avgDeal, avgDealFmt: `GHS ${(avgDeal / 1000).toFixed(0)}k`, winRate, closedCount: closed.length },
  });
});

// POST /api/pipeline
router.post('/', async (req, res) => {
  const { property, client, amount, amount_numeric, stage } = req.body;
  if (!property || !client || !amount) return res.status(400).json({ error: 'property, client and amount required' });
  const { data, error } = await supabase
    .from('pipeline_deals')
    .insert({ user_id: req.user.id, property_name: property, client, amount, amount_numeric: amount_numeric || 0, stage: stage || 'New', progress: 10 })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ ...data, property: data.property_name });
});

// PATCH /api/pipeline/:id
router.patch('/:id', async (req, res) => {
  const updates = { ...req.body };
  if (updates.property) { updates.property_name = updates.property; delete updates.property; }
  if (updates.stage === 'Closed') updates.progress = 100;
  const { data, error } = await supabase
    .from('pipeline_deals').update(updates).eq('id', req.params.id).eq('user_id', req.user.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ ...data, property: data.property_name });
});

// DELETE /api/pipeline/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('pipeline_deals').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
