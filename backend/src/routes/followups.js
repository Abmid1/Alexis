const express = require('express');
const supabase = require('../lib/supabase');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const [{ data: followUps }, { data: campaigns }] = await Promise.all([
    supabase.from('follow_ups').select('*').eq('user_id', req.user.id).order('created_at', { ascending: true }),
    supabase.from('campaigns').select('*').eq('user_id', req.user.id).order('created_at', { ascending: true }),
  ]);
  res.json({
    followUps: (followUps || []).map(f => ({ ...f, time: f.time_text })),
    campaigns: campaigns || [],
  });
});

router.post('/', async (req, res) => {
  const { title, subtitle, time } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const { data, error } = await supabase
    .from('follow_ups')
    .insert({ user_id: req.user.id, title, subtitle: subtitle || '', time_text: time || '', status: 'Scheduled', completed: false })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ ...data, time: data.time_text });
});

router.patch('/:id', async (req, res) => {
  const updates = { ...req.body };
  if (updates.completed === true) updates.status = 'Done';
  if (updates.completed === false && updates.status === 'Done') updates.status = 'Scheduled';
  const { data, error } = await supabase
    .from('follow_ups').update(updates).eq('id', req.params.id).eq('user_id', req.user.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ ...data, time: data.time_text });
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('follow_ups').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
