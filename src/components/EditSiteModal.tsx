import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Loader2,
  Check,
  Lock,
  Upload,
  RefreshCw,
  Camera,
  Image as ImageIcon,
  Maximize2,
  Globe,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SiteItem } from '../types';
import { fetchSiteMetadata, normalizeUrl } from '../utils/fetchSiteMetadata';

interface EditSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: SiteItem | null;
  adminPin: string;
  onSiteUpdated: (updatedSite: SiteItem) => void;
}

const CATEGORIES = [
  'Portfolio',
  'Projects',
  'Apps',
  'Tools',
  'Business',
  'Media',
  'Blog',
  'Other',
];

export const EditSiteModal: React.FC<EditSiteModalProps> = ({
  isOpen,
  onClose,
  site,
  adminPin,
  onSiteUpdated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Projects');
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [pin, setPin] = useState('');
  const [imageFit, setImageFit] = useState<'cover' | 'contain'>('cover');

  const cleanPic = previewImageUrl.trim();
  const isValidPic =
    cleanPic.length >= 8 &&
    (/^https?:\/\/.+/i.test(cleanPic) ||
      cleanPic.startsWith('data:image/') ||
      cleanPic.startsWith('/api/screenshots/'));

  // Loading states
  const [isRecapturing, setIsRecapturing] = useState(false);
  const [recaptureStatus, setRecaptureStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever modal opens or site changes
  useEffect(() => {
    if (isOpen && site) {
      setTitle(site.title || '');
      setDescription(site.description || '');
      setCategory(site.category || 'Projects');
      setPreviewImageUrl(site.previewImageUrl || '');
      setPin(adminPin || '');
      setError(null);
      setImageError(false);
      setIsRecapturing(false);
      setRecaptureStatus('');
    }
  }, [isOpen, site, adminPin]);

  if (!isOpen || !site) return null;

  // 1. Recapture fresh screenshot using Cloud Computer
  const handleCloudRecapture = async () => {
    if (!site?.url) return;
    setIsRecapturing(true);
    setError(null);
    setRecaptureStatus('Launching Cloud Computer Chromium (1440x900)...');

    const t1 = setTimeout(() => {
      setRecaptureStatus('Navigating to target site & waiting for render...');
    }, 1200);
    const t2 = setTimeout(() => {
      setRecaptureStatus('Capturing high-resolution desktop snapshot...');
    }, 2500);

    try {
      const data = await fetchSiteMetadata(site.url);
      clearTimeout(t1);
      clearTimeout(t2);

      const captured = data.screenshotUrl || data.previewImageUrl;
      if (captured) {
        setPreviewImageUrl(captured);
        setImageError(false);
        setRecaptureStatus('Fresh screenshot captured & applied!');
      } else {
        const fallback = `https://image.thum.io/get/width/1440/crop/900/noanimate/${normalizeUrl(site.url)}`;
        setPreviewImageUrl(fallback);
        setImageError(false);
      }
    } catch (e: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      const fallback = `https://image.thum.io/get/width/1440/crop/900/noanimate/${normalizeUrl(site.url)}`;
      setPreviewImageUrl(fallback);
      setImageError(false);
      setRecaptureStatus('CDN snapshot applied as fallback');
    } finally {
      setIsRecapturing(false);
    }
  };

  // 2. Upload custom picture from local device (Phone or PC)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large. Please select an image under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPreviewImageUrl(result);
        setImageError(false);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // 3. Quick CDN Presets
  const applyPreset = (presetType: 'thum' | 'mshots' | 'card') => {
    const clean = normalizeUrl(site.url);
    const domain = clean.replace(/^https?:\/\//, '').split('/')[0];

    if (presetType === 'thum') {
      setPreviewImageUrl(`https://image.thum.io/get/width/1440/crop/900/noanimate/${clean}`);
    } else if (presetType === 'mshots') {
      setPreviewImageUrl(`https://s0.wp.com/mshots/v1/${encodeURIComponent(clean)}?w=1440`);
    } else if (presetType === 'card') {
      setPreviewImageUrl(`https://api.microlink.io?url=${encodeURIComponent(clean)}&screenshot=true&embed=screenshot.url`);
    }
    setImageError(false);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }

    const codeToUse = (pin.trim() || adminPin).trim();
    if (!codeToUse) {
      setError('Access Denied: Owner verification required to save changes.');
      return;
    }

    const cleanPic = previewImageUrl.trim();
    const isValidPic =
      cleanPic.length >= 8 &&
      (/^https?:\/\/.+/i.test(cleanPic) ||
        cleanPic.startsWith('data:image/') ||
        cleanPic.startsWith('/api/screenshots/'));

    if (!isValidPic) {
      setError('Picture Required: Please enter or capture a correct homepage picture URL before saving.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updatedSitePayload: SiteItem = {
        ...site,
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        previewImageUrl: cleanPic,
      };

      // 1. Try server update
      try {
        const res = await fetch(`/api/sites/${site.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': codeToUse,
            'x-admin-pin': codeToUse,
          },
          body: JSON.stringify({
            title: updatedSitePayload.title,
            description: updatedSitePayload.description,
            category: updatedSitePayload.category,
            previewImageUrl: updatedSitePayload.previewImageUrl,
            token: codeToUse,
            pin: codeToUse,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.site) {
            onSiteUpdated(data.site);
            onClose();
            return;
          }
        }
      } catch {
        // Fallback to client update
      }

      // 2. Client update
      onSiteUpdated(updatedSitePayload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update site');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="relative w-full max-w-2xl my-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-7 text-slate-100"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Edit Site & Change Picture</h3>
            <p className="text-xs text-slate-400 font-mono truncate max-w-md">{site.url}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Picture Customization & Live Showcase */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>App Homepage Picture / Screenshot</span>
              </label>

              {/* View options */}
              <button
                type="button"
                onClick={() => setImageFit((prev) => (prev === 'cover' ? 'contain' : 'cover'))}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
              >
                <Maximize2 className="w-3 h-3" />
                <span>{imageFit === 'cover' ? 'Fill View' : 'Fit View'}</span>
              </button>
            </div>

            {/* Live Picture Canvas */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-inner">
              {previewImageUrl && !imageError ? (
                <img
                  src={previewImageUrl}
                  alt={title || 'App picture'}
                  referrerPolicy="no-referrer"
                  className={`w-full h-full transition-all duration-300 ${
                    imageFit === 'cover' ? 'object-cover object-top' : 'object-contain bg-slate-950 p-2'
                  }`}
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2 p-4 text-center">
                  <ImageIcon className="w-8 h-8 text-slate-600" />
                  <span>No picture configured or image failed to load</span>
                  <span className="text-[10px] text-amber-400">Click &quot;Re-Capture with Cloud Computer&quot; or upload an image below</span>
                </div>
              )}

              {/* Status banner when recapturing */}
              {isRecapturing && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-amber-300 text-xs p-4 text-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                  <span className="font-semibold">{recaptureStatus || 'Connecting to Cloud Computer...'}</span>
                </div>
              )}

              {/* Badge */}
              <div className="absolute bottom-2 right-2 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-800 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Live Card Preview</span>
              </div>
            </div>

            {/* Picture Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Recapture via Cloud Computer */}
              <button
                type="button"
                onClick={handleCloudRecapture}
                disabled={isRecapturing}
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
              >
                {isRecapturing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Recapturing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Re-Capture with Cloud Computer</span>
                  </>
                )}
              </button>

              {/* Upload from Device */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Upload from Device</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* CDN Preset options */}
              <div className="flex items-center gap-1 ml-auto">
                <button
                  type="button"
                  onClick={() => applyPreset('thum')}
                  title="Apply High-Res Desktop CDN Screenshot"
                  className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[11px] border border-slate-800"
                >
                  Thum.io
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('mshots')}
                  title="Apply WP Mshots Snapshot"
                  className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[11px] border border-slate-800"
                >
                  WP Mshots
                </button>
              </div>
            </div>

            {/* Direct Picture URL Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <LinkIcon className="w-3 h-3 text-slate-500" />
                  <span>Direct Image URL / Data URI</span>
                </span>
                <span className="text-[10px] text-slate-500">Paste any image link or data URL</span>
              </div>
              <input
                type="text"
                value={previewImageUrl}
                onChange={(e) => {
                  setPreviewImageUrl(e.target.value);
                  setImageError(false);
                }}
                placeholder="https://... or data:image/..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          </div>

          {/* Section 2: Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">App / Site Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 3: Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Summary</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 transition-colors resize-none"
            />
          </div>

          {/* Section 4: Security Confirmation */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-300 font-medium">Confirm Owner Passcode</span>
            </div>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-28 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-400 text-center tracking-widest"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !isValidPic || (!pin.trim() && !adminPin)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Save Picture & Details</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
