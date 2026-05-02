const express = require('express');
const supabase = require('../lib/supabase');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const fmt = (t) => ({ ...t, trigger: t.trigger_desc });

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('ai_templates').select('*').eq('user_id', req.user.id).order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(fmt));
});

router.post('/', async (req, res) => {
  const { triggerLabel, triggerColor, trigger, question, answer, autoTag } = req.body;
  if (!trigger || !question || !answer) return res.status(400).json({ error: 'trigger, question and answer are required' });
  const { data, error } = await supabase
    .from('ai_templates')
    .insert({ user_id: req.user.id, trigger_label: triggerLabel || 'New', trigger_color: triggerColor || 'new', trigger_desc: trigger, question, answer, auto_tag: autoTag || 'Auto' })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(fmt(data));
});

router.patch('/:id', async (req, res) => {
  const updates = { ...req.body };
  if (updates.trigger) { updates.trigger_desc = updates.trigger; delete updates.trigger; }
  const { data, error } = await supabase
    .from('ai_templates').update(updates).eq('id', req.params.id).eq('user_id', req.user.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(data));
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('ai_templates').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
