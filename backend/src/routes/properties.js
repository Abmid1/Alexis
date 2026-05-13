const express = require('express');
const supabase = require('../lib/supabase');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const emojiFor = (type) => type === 'land' ? '🌳' : type === 'rent' ? '🏢' : '🏠';

// GET /api/properties
router.get('/', async (req, res) => {
  const { type, archived } = req.query;
  const STATUS_FILTERS = { available: 'Available', sold: 'Sold', rented: 'Rented', offmarket: 'Off Market' };
  const showArchived = archived === 'true';

  let q = supabase.from('properties').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });

  // Filter by archived flag (default: only show active)
  q = q.eq('archived', showArchived);

  if (type && STATUS_FILTERS[type]) {
    q = q.eq('status', STATUS_FILTERS[type]);
  } else if (type && type !== 'all') {
    q = q.eq('type', type);
  }

  const { data, error } = await q;
  if (error) {
    // If archived column doesn't exist yet, fall back to unfiltered
    if (error.code === '42703' || error.message?.includes('archived')) {
      const { data: fallback, error: e2 } = await supabase
        .from('properties').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
      if (e2) return res.status(500).json({ error: e2.message });
      return res.json(showArchived ? [] : (fallback || []));
    }
    return res.status(500).json({ error: error.message });
  }
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
  const { name, location, price, price_numeric, type, status, images, video_url } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'name and price are required' });

  const VALID_STATUSES = ['Available', 'Sold', 'Rented', 'Off Market'];
  const resolvedStatus = VALID_STATUSES.includes(status) ? status : 'Available';

  // Base insert (always works)
  const insertPayload = {
    user_id: req.user.id,
    name, location: location || 'Accra', price,
    price_numeric: price_numeric || 0,
    type: type || 'sale',
    status: resolvedStatus,
    archived: false,
    emoji: emojiFor(type),
    color: 'green',
  };

  // Attempt to include media fields (requires the columns to exist — see SQL comment in upload.js)
  if (Array.isArray(images) && images.length) insertPayload.images    = images;
  if (video_url)                               insertPayload.video_url = video_url;

  const { data, error } = await supabase
    .from('properties')
    .insert(insertPayload)
    .select().single();

  if (error) {
    if (error.code === '42703' || error.message?.includes('column')) {
      return res.status(500).json({
        error: 'Database migration required',
        detail: 'The properties table is missing the images/video_url columns. Run this SQL in your Supabase SQL Editor to fix it:',
        sql: "ALTER TABLE properties ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]', ADD COLUMN IF NOT EXISTS video_url text;",
      });
    }
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);
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
