/**
 * BILT AFRICA — Media Upload Route
 * POST /api/upload
 *
 * Accepts base64-encoded files (images or video), uploads them to Supabase
 * Storage, and returns the public URLs.
 *
 * ── Supabase Storage setup (one-time) ────────────────────────────────────────
 * Run this SQL in your Supabase SQL Editor to add media columns to properties:
 *
 *   ALTER TABLE properties
 *     ADD COLUMN IF NOT EXISTS images  jsonb DEFAULT '[]',
 *     ADD COLUMN IF NOT EXISTS video_url text;
 *
 * The storage bucket "property-media" is created automatically on first upload.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const supabase = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const BUCKET = 'property-media';

// ── Ensure the storage bucket exists ─────────────────────────────────────────
let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET);

    if (!exists) {
      const { error } = await supabase.storage.createBucket(BUCKET, {
        public: true,                   // URLs are publicly accessible (needed to show images)
        fileSizeLimit: 26214400,        // 25 MB per file
        allowedMimeTypes: [
          'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
          'video/mp4', 'video/mov', 'video/avi', 'video/webm',
        ],
      });
      if (error) console.error('[Upload] Bucket creation error:', error.message);
      else       console.log(`[Upload] ✅ Created storage bucket: ${BUCKET}`);
    }

    bucketReady = true;
  } catch (err) {
    console.error('[Upload] Failed to ensure bucket:', err.message);
  }
}

// ── POST /api/upload ──────────────────────────────────────────────────────────
/**
 * Body: {
 *   files: Array<{
 *     name: string,   // original filename
 *     type: string,   // MIME type  e.g. "image/jpeg"
 *     data: string,   // base64-encoded file content (NO data: prefix)
 *   }>
 * }
 * Response: { urls: string[] }
 */
router.post('/', async (req, res) => {
  const { files } = req.body;

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'files array is required' });
  }

  if (files.length > 12) {
    return res.status(400).json({ error: 'Maximum 12 files per upload' });
  }

  await ensureBucket();

  const urls = [];
  const errors = [];

  for (const file of files) {
    const { name, type, data } = file;

    if (!name || !type || !data) {
      errors.push(`Missing fields for file: ${name}`);
      continue;
    }

    try {
      // Decode base64 → Buffer
      const buffer = Buffer.from(data, 'base64');

      // Sanitise filename + add unique timestamp prefix
      const safeName  = name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath  = `${req.user.id}/${Date.now()}-${safeName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, buffer, {
          contentType: type,
          upsert: false,
          cacheControl: '31536000', // 1 year cache
        });

      if (uploadError) {
        console.error('[Upload] Supabase storage error:', uploadError.message);
        errors.push(`Failed to upload ${name}: ${uploadError.message}`);
        continue;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

      urls.push(urlData.publicUrl);
      console.log(`[Upload] ✅ Uploaded: ${filePath}`);
    } catch (err) {
      console.error('[Upload] Error processing file:', err.message);
      errors.push(`Error processing ${name}: ${err.message}`);
    }
  }

  if (urls.length === 0 && errors.length > 0) {
    return res.status(500).json({ error: errors[0], details: errors });
  }

  res.json({ urls, errors: errors.length ? errors : undefined });
});

module.exports = router;
