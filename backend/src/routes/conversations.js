const express = require('express');
const supabase = require('../lib/supabase');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const aiReplies = [
  "Thanks for your message! Let me pull up the best options for you 🏠",
  "Great question! We have several properties that match your criteria. Would you like me to share the details?",
  "I'll connect you with our agent who can arrange a viewing 📅",
  "That's a wonderful choice! The property is still available. Shall I send you the full details?",
  "We have exactly what you're looking for. Can I ask what your move-in timeline is?",
];

// GET /api/conversations
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('conversations').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/conversations/:id
router.get('/:id', async (req, res) => {
  const { data: conv, error } = await supabase
    .from('conversations').select('*').eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle();
  if (error || !conv) return res.status(404).json({ error: 'Not found' });

  const { data: msgs } = await supabase
    .from('messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: true });

  // Mark as read
  await supabase.from('conversations').update({ unread: false }).eq('id', conv.id);

  res.json({ ...conv, messages: (msgs || []).map(m => ({ ...m, time: m.time_text })) });
});

// POST /api/conversations/:id/messages
router.post('/:id/messages', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const { data: conv } = await supabase
    .from('conversations').select('*').eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle();
  if (!conv) return res.status(404).json({ error: 'Not found' });

  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const { data: userMsg } = await supabase
    .from('messages').insert({ conversation_id: conv.id, type: 'out', text, time_text: timeStr }).select().single();

  const result = [{ ...userMsg, time: userMsg.time_text }];

  if (conv.ai_active) {
    const aiText = aiReplies[Math.floor(Math.random() * aiReplies.length)];
    const aiTimeStr = timeStr + ' · 3 sec';
    const { data: aiMsg } = await supabase
      .from('messages').insert({ conversation_id: conv.id, type: 'ai', text: aiText, time_text: aiTimeStr, label: '🤖 AI Reply' }).select().single();
    result.push({ ...aiMsg, time: aiMsg.time_text });
  }

  await supabase.from('conversations').update({ last_message: text, unread: false }).eq('id', conv.id);
  res.status(201).json(result);
});

module.exports = router;
