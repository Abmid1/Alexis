/**
 * BILT AFRICA — Auto Follow-up Logs Route
 * GET /api/auto-followups  — returns the log of AI-sent follow-ups for the dashboard
 * POST /api/auto-followups/run — manually trigger the job (for testing)
 */

const express = require('express');
const supabase = require('../lib/supabase');
const auth     = require('../middleware/auth');
const { runFollowUpJob } = require('../jobs/followupScheduler');

const router = express.Router();
router.use(auth);

// GET /api/auto-followups
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('auto_follow_up_logs')
    .select('*')
    .eq('user_id', req.user.id)
    .order('sent_at', { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// POST /api/auto-followups/run  — manually trigger (useful for testing)
router.post('/run', async (req, res) => {
  res.json({ message: 'Follow-up job triggered' });
  runFollowUpJob().catch(err => console.error('[Manual trigger]', err.message));
});

// PATCH /api/auto-followups/:id/replied — mark a follow-up as replied
router.patch('/:id/replied', async (req, res) => {
  const { data, error } = await supabase
    .from('auto_follow_up_logs')
    .update({ replied: true })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
