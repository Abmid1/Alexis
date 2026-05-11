const express = require('express');
const supabase = require('../lib/supabase');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const emojiFor = (type) => type === 'land' ? '🌳' : type === 'rent' ? '🏢' : '🏠';

// GET /api/properties
router.get('/', async (req, res) => {
  const { type } = req.query;
  let q = supabase.from('properties').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
  if (type && type !== 'all') q = q.eq('type', type);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/properties/stats
router.get('/stats', async (req, res) => {
  const { data, error } = await supabase.from('properties').select('type, status, price_numeric').eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });

  const listed = data.length;
  const forSale = data.filter(p => p.type === 'sale');
  const forRent = data.filter(p => p.type === 'rent');
  const saleValue = forSale.reduce((s, p) => s + (p.price_numeric || 0), 0);
  const rentValue = forRent.reduce((s, p) => s + (p.price_numeric || 0), 0);

  res.json({
    listed,
    forSaleCount: forSale.length,
    forRentCount: forRent.length,
    saleValueFmt: `GHS ${(saleValue / 1000000).toFixed(1)}m`,
    rentValueFmt: `GHS ${(rentValue / 1000).toFixed(0)}k/mo`,
  });
});

// POST /api/properties
router.post('/', async (req, res) => {
  const { name, location, price, price_numeric, type, images, video_url } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'name and price are required' });

  // Base insert (always works)
  const insertPayload = {
    user_id: req.user.id,
    name, location: location || 'Accra', price,
    price_numeric: price_numeric || 0,
    type: type || 'sale',
    status: 'Pending',
    emoji: emojiFor(type),
    color: 'green',
  };

  // Attempt to include media fields (requires the columns to exist — see SQL comment in upload.js)
  if (Array.isArray(images) && images.length) insertPayload.images    = images;
  if (video_url)                               insertPayload.video_url = video_url;

  let { data, error } = await supabase
    .from('properties')
    .insert(insertPayload)
    .select().single();

  // If media columns don't exist yet in the DB, retry without them
  if (error && (error.code === '42703' || error.message?.includes('column'))) {
    console.warn('[Properties] Media columns not found — insert without images/video. Run the SQL in upload.js to add them.');
    delete insertPayload.images;
    delete insertPayload.video_url;
    const retry = await supabase.from('properties').insert(insertPayload).select().single();
    data  = retry.data;
    error = retry.error;
  }

  if (error) return res.status(500).json({ error: error.message });

  // Always return the full object including media (even if not stored in DB)
  res.status(201).json({ ...data, images: images || [], video_url: video_url || null });
});

// PATCH /api/properties/:id
router.patch('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('properties').update(req.body).eq('id', req.params.id).eq('user_id', req.user.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

// DELETE /api/properties/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('properties').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
