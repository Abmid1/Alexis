'use client';
import { useEffect, useRef, useState } from 'react';
import { Tag } from '@/components/ui/Tag';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { Property } from '@/lib/types';

const colorMap: Record<string, string> = {
  green: '#E1F5EE', blue: '#E6F1FB', amber: '#FAEEDA', purple: '#EEEDFE', coral: '#FAECE7', teal: '#E1F5EE',
};

interface Props { showModal: boolean; onModalClose: () => void; }

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Compress an image file to JPEG at max 1200px, quality 0.82. Returns raw base64 (no prefix). */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img   = new Image();
    const url   = URL.createObjectURL(file);
    img.onload  = () => {
      const MAX  = 1200;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      resolve(dataUrl.split(',')[1]); // strip "data:image/jpeg;base64," prefix
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

/** Convert any file to raw base64 (for video). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Extract YouTube video ID from a URL. */
function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]{11})/);
  return m ? m[1] : null;
}

/** Detect if a URL is a direct video file. */
function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(url);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Properties({ showModal, onModalClose }: Props) {
  const [properties, setProperties]   = useState<Property[]>([]);
  const [stats, setStats]             = useState<any>(null);
  const [typeFilter, setTypeFilter]   = useState('all');

  // Basic form
  const [form, setForm] = useState({ name: '', location: '', price: '', price_numeric: '', type: 'sale' });

  // Image state
  type ImgEntry = { preview: string; file: File };
  const [images, setImages]           = useState<ImgEntry[]>([]);
  const imgInputRef                   = useRef<HTMLInputElement>(null);

  // Video state
  const [videoTab, setVideoTab]       = useState<'url' | 'file'>('url');
  const [videoUrl, setVideoUrl]       = useState('');
  const [videoFile, setVideoFile]     = useState<File | null>(null);
  const [videoFilePreview, setVideoFilePreview] = useState('');
  const videoInputRef                 = useRef<HTMLInputElement>(null);

  // UI state
  const [saving, setSaving]           = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [migrationSql, setMigrationSql] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const load = (type: string) => {
    api.properties.list(type !== 'all' ? type : undefined).then(setProperties).catch(() => {});
  };

  useEffect(() => { load(typeFilter); }, [typeFilter]);
  useEffect(() => { api.properties.stats().then(setStats).catch(() => {}); }, []);

  // ── Image selection ──────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = 10 - images.length;
    const selected  = files.slice(0, remaining);

    const newEntries: ImgEntry[] = selected.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newEntries]);
    if (imgInputRef.current) imgInputRef.current.value = '';
  };

  const removeImage = (idx: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // ── Video file selection ─────────────────────────────────────────
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setVideoFilePreview(URL.createObjectURL(file));
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const removeVideo = () => {
    if (videoFilePreview) URL.revokeObjectURL(videoFilePreview);
    setVideoFile(null);
    setVideoFilePreview('');
    setVideoUrl('');
  };

  // ── Reset form state ─────────────────────────────────────────────
  const resetMedia = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    if (videoFilePreview) URL.revokeObjectURL(videoFilePreview);
    setImages([]);
    setVideoFile(null);
    setVideoFilePreview('');
    setVideoUrl('');
    setVideoTab('url');
    setUploadProgress('');
    setMigrationSql('');
  };

  const handleClose = () => {
    resetMedia();
    setForm({ name: '', location: '', price: '', price_numeric: '', type: 'sale' });
    onModalClose();
  };

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setUploadProgress('');

    try {
      let imageUrls: string[]  = [];
      let finalVideoUrl        = videoTab === 'url' ? videoUrl.trim() : '';

      // ── Upload images ──────────────────────────────────────────
      if (images.length > 0) {
        setUploadProgress(`Compressing ${images.length} photo${images.length > 1 ? 's' : ''}…`);

        const compressed = await Promise.all(
          images.map(async ({ file }) => ({
            name: file.name,
            type: 'image/jpeg',
            data: await compressImage(file),
          }))
        );

        setUploadProgress(`Uploading photos…`);
        const result = await api.upload.media(compressed);
        imageUrls = result.urls;
      }

      // ── Upload video file ──────────────────────────────────────
      if (videoTab === 'file' && videoFile) {
        setUploadProgress('Uploading video…');
        const b64 = await fileToBase64(videoFile);
        const result = await api.upload.media([{
          name: videoFile.name,
          type: videoFile.type,
          data: b64,
        }]);
        finalVideoUrl = result.urls[0] || '';
      }

      setUploadProgress('Creating listing…');

      const prop = await api.properties.create({
        ...form,
        price_numeric: parseInt(form.price_numeric.replace(/[^0-9]/g, ''), 10) || 0,
        images:    imageUrls,
        video_url: finalVideoUrl || null,
      });

      setProperties((prev) => [prop, ...prev]);
      setStats((s: any) => s ? { ...s, listed: s.listed + 1 } : s);
      resetMedia();
      setForm({ name: '', location: '', price: '', price_numeric: '', type: 'sale' });
      onModalClose();
    } catch (err: any) {
      if (err.sql) {
        setMigrationSql(err.sql);
        setUploadProgress(`Database migration required — images won't persist until you run the SQL below.`);
      } else {
        setUploadProgress(`Error: ${err.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Filters ──────────────────────────────────────────────────────
  const filters = [
    { key: 'all',  label: `All (${stats?.listed ?? '…'})` },
    { key: 'sale', label: `For sale (${stats?.forSaleCount ?? '…'})` },
    { key: 'rent', label: `For rent (${stats?.forRentCount ?? '…'})` },
    { key: 'land', label: 'Land' },
  ];

  const ytId = getYouTubeId(videoUrl);

  return (
    <div>
      {/* ── Stats ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { label: 'Listed',      val: stats?.listed ?? '…',       change: 'Active inventory', icon: '🏘️', sm: false },
          { label: 'For sale',    val: stats?.forSaleCount ?? '…', change: stats?.saleValueFmt ?? 'Portfolio value', icon: '🏷️', sm: false },
          { label: 'For rent',    val: stats?.forRentCount ?? '…', change: stats?.rentValueFmt ?? 'Monthly value',   icon: '🔑', sm: false },
          { label: 'Total value', val: stats?.saleValueFmt ?? '…', change: 'Sale listings',    icon: '💰', sm: true },
        ].map((m) => (
          <div key={m.label} className="metric-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
              <span style={{ fontSize: 16, opacity: 0.5 }}>{m.icon}</span>
            </div>
            <div style={{ fontSize: m.sm ? 26 : 36, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 10 }}>{String(m.val)}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>{m.change}</div>
          </div>
        ))}
      </div>

      {/* ── Filter tabs ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {filters.map((f) => (
          <button key={f.key} className={`filter-btn${typeFilter === f.key ? ' sel' : ''}`} onClick={() => setTypeFilter(f.key)}>{f.label}</button>
        ))}
        <button className="filter-btn">Verified ✓</button>
      </div>

      {/* ── Property cards ──────────────────────────────────────── */}
      {properties.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏡</div>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, fontSize: 15 }}>No properties listed yet</div>
          <div>Click <strong>+ Add property</strong> to add your first listing.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {properties.map((p: any) => {
            const hasImages = p.images?.length > 0;
            const hasVideo  = !!p.videoUrl || !!p.video_url;
            const vidUrl    = p.videoUrl || p.video_url || '';
            const ytIdCard  = getYouTubeId(vidUrl);

            return (
              <div key={p.id} style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                overflow: 'hidden',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(52,211,153,0.35)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                {/* Banner image */}
                <div style={{ height: 160, position: 'relative', overflow: 'hidden', cursor: hasImages ? 'pointer' : 'default' }}
                  onClick={() => hasImages && setLightboxSrc(p.images[0])}>
                  {hasImages ? (
                    <img src={p.images[0]} alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                    />
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, background: colorMap[p.color] || '#E1F5EE' }}>
                      {p.emoji}
                    </div>
                  )}
                  {/* Gradient overlay at bottom */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(transparent, rgba(0,0,0,0.55))' }} />
                  {/* Top badges */}
                  <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 5 }}>
                    {hasImages && p.images.length > 1 && (
                      <span style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, backdropFilter: 'blur(4px)' }}>
                        📷 {p.images.length}
                      </span>
                    )}
                    {hasVideo && (
                      <span style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, backdropFilter: 'blur(4px)' }}>
                        ▶ Video
                      </span>
                    )}
                  </div>
                  {/* Price on image */}
                  <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 14, fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                    {p.price}
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding: '14px 14px 12px' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3, lineHeight: 1.3 }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5z"/>
                      <circle cx="8" cy="6" r="1.5"/>
                    </svg>
                    {p.location}
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <Tag label={p.type} />
                    <Tag label={p.status} />
                  </div>

                  {/* YouTube embed */}
                  {hasVideo && ytIdCard && (
                    <a href={vidUrl} target="_blank" rel="noreferrer"
                      style={{ display: 'block', marginTop: 10, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                      <img src={`https://img.youtube.com/vi/${ytIdCard}/mqdefault.jpg`} alt="Video preview"
                        style={{ width: '100%', height: 60, objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 12, marginLeft: 2 }}>▶</span>
                        </div>
                      </div>
                    </a>
                  )}

                  {/* Direct video link */}
                  {hasVideo && !ytIdCard && (
                    <a href={vidUrl} target="_blank" rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, fontSize: 11, fontWeight: 500, color: '#1D9E75', textDecoration: 'none' }}>
                      <span>▶</span> Watch property video
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Lightbox ─────────────────────────────────────────────── */}
      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
        >
          <img src={lightboxSrc} alt="Full view" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
          <button onClick={() => setLightboxSrc(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 18, width: 36, height: 36, borderRadius: '50%', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* ── Add Property Modal ───────────────────────────────────── */}
      {showModal && (
        <Modal title="Add Property" onClose={handleClose}>
          <form onSubmit={handleSubmit} style={{ maxHeight: '80vh', overflowY: 'auto', paddingRight: 4 }}>

            {/* Basic info */}
            <div className="form-group">
              <label className="form-label">Property name *</label>
              <input className="form-input" required value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. 3 Bed House · East Legon" />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="e.g. Accra · Added May 2025" />
            </div>
            <div className="form-group">
              <label className="form-label">Price (display) *</label>
              <input className="form-input" required value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="e.g. GHS 480,000 or GHS 4,200 / mo" />
            </div>
            <div className="form-group">
              <label className="form-label">Price (number, for metrics)</label>
              <input className="form-input" type="number" value={form.price_numeric}
                onChange={(e) => setForm((p) => ({ ...p, price_numeric: e.target.value }))}
                placeholder="e.g. 480000" />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
                <option value="land">Land</option>
              </select>
            </div>

            {/* ── Photos ─────────────────────────────────────────── */}
            <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', margin: '14px 0 12px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" style={{ margin: 0 }}>
                Photos <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>({images.length}/10) — auto-compressed</span>
              </label>
              {images.length < 10 && (
                <button type="button" onClick={() => imgInputRef.current?.click()}
                  style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, border: '0.5px solid var(--color-border-secondary)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                  + Add photos
                </button>
              )}
            </div>

            <input ref={imgInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageSelect} />

            {images.length === 0 ? (
              <button type="button" onClick={() => imgInputRef.current?.click()}
                style={{ width: '100%', height: 80, border: '1.5px dashed var(--color-border-secondary)', borderRadius: 8, background: 'var(--color-background-secondary)', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span style={{ fontSize: 22 }}>🖼️</span>
                <span>Click to add property photos</span>
                <span style={{ fontSize: 9, opacity: 0.7 }}>JPG, PNG, WEBP · up to 10 photos</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {images.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', width: 72, height: 72, borderRadius: 6, overflow: 'hidden', border: '0.5px solid var(--color-border-tertiary)', flexShrink: 0 }}>
                    <img src={img.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => removeImage(idx)}
                      style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                      ✕
                    </button>
                    {idx === 0 && (
                      <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 7, textAlign: 'center', padding: '1px 0' }}>Cover</span>
                    )}
                  </div>
                ))}
                {images.length < 10 && (
                  <button type="button" onClick={() => imgInputRef.current?.click()}
                    style={{ width: 72, height: 72, borderRadius: 6, border: '1.5px dashed var(--color-border-secondary)', background: 'var(--color-background-secondary)', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    +
                  </button>
                )}
              </div>
            )}

            {/* ── Video ──────────────────────────────────────────── */}
            <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', margin: '14px 0 12px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" style={{ margin: 0 }}>Video</label>
              <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '0.5px solid var(--color-border-secondary)' }}>
                {(['url', 'file'] as const).map((tab) => (
                  <button key={tab} type="button" onClick={() => { setVideoTab(tab); removeVideo(); }}
                    style={{ fontSize: 9, padding: '3px 10px', border: 'none', cursor: 'pointer', fontWeight: 500,
                      background: videoTab === tab ? '#1D9E75' : 'transparent',
                      color:      videoTab === tab ? '#fff'     : 'var(--color-text-tertiary)' }}>
                    {tab === 'url' ? '🔗 Paste link' : '📤 Upload file'}
                  </button>
                ))}
              </div>
            </div>

            {videoTab === 'url' ? (
              <div>
                <input className="form-input" value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="YouTube, Vimeo, or direct video URL…" />

                {/* YouTube preview */}
                {ytId && (
                  <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                    <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="YouTube preview"
                      style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                      <span style={{ fontSize: 28 }}>▶</span>
                    </div>
                    <div style={{ position: 'absolute', bottom: 4, left: 6, fontSize: 9, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '1px 5px', borderRadius: 4 }}>YouTube · link confirmed ✓</div>
                  </div>
                )}
                {videoUrl && !ytId && isVideoUrl(videoUrl) && (
                  <div style={{ marginTop: 6, fontSize: 10, color: '#1D9E75' }}>✓ Direct video URL detected</div>
                )}
              </div>
            ) : (
              <div>
                <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={handleVideoSelect} />

                {!videoFile ? (
                  <button type="button" onClick={() => videoInputRef.current?.click()}
                    style={{ width: '100%', height: 70, border: '1.5px dashed var(--color-border-secondary)', borderRadius: 8, background: 'var(--color-background-secondary)', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    <span style={{ fontSize: 20 }}>🎬</span>
                    <span>Click to upload a video file</span>
                    <span style={{ fontSize: 9, opacity: 0.7 }}>MP4, MOV, WEBM · recommended under 25 MB</span>
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, background: 'var(--color-background-secondary)' }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>🎬</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{videoFile.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</div>
                    </div>
                    <button type="button" onClick={removeVideo}
                      style={{ fontSize: 10, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                  </div>
                )}
              </div>
            )}

            {/* ── Upload progress / error ─────────────────────────── */}
            {uploadProgress && (
              <div style={{ marginTop: 10, fontSize: 10, color: uploadProgress.startsWith('Error') || migrationSql ? '#993C1D' : '#1D9E75', background: uploadProgress.startsWith('Error') || migrationSql ? '#FAECE7' : '#E1F5EE', borderRadius: 6, padding: '6px 10px' }}>
                {uploadProgress.startsWith('Error') || migrationSql ? '❌' : '⏳'} {uploadProgress}
              </div>
            )}
            {migrationSql && (
              <div style={{ marginTop: 8, borderRadius: 6, border: '1px solid rgba(216,90,48,0.3)', overflow: 'hidden' }}>
                <div style={{ background: 'rgba(216,90,48,0.1)', padding: '5px 10px', fontSize: 9, fontWeight: 600, color: '#993C1D', letterSpacing: '0.04em' }}>
                  RUN THIS ONCE IN SUPABASE SQL EDITOR → supabase.com/dashboard
                </div>
                <pre style={{ margin: 0, padding: '8px 10px', fontSize: 10, color: '#E4E4E7', background: '#1A1A1D', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {migrationSql}
                </pre>
              </div>
            )}

            {/* ── Actions ────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button type="button" className="btn" onClick={handleClose}>Cancel</button>
              <button type="submit" className="btn btn-green" disabled={saving}>
                {saving ? (uploadProgress || 'Uploading…') : 'Add Property'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
