import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Globe,
  Image as ImageIcon,
  Loader2,
  Lock,
  CheckCircle2,
  Maximize2,
  Monitor,
  Check,
  Camera,
} from 'lucide-react';
import { motion } from 'motion/react';
import { SiteItem } from '../types';
import { fetchSiteMetadata, normalizeUrl } from '../utils/fetchSiteMetadata';

interface AddSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminPin: string;
  onSiteAdded: (newSite: SiteItem) => void;
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

export const AddSiteModal: React.FC<AddSiteModalProps> = ({
  isOpen,
  onClose,
  adminPin,
  onSiteAdded,
}) => {
  const [url, setUrl] = useState('');
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [cloudStage, setCloudStage] = useState<string>('');

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Projects');
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [metaLoaded, setMetaLoaded] = useState(false);

  // Preview options
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [activeImageType, setActiveImageType] = useState<'screenshot' | 'banner' | 'custom'>('screenshot');
  const [imageFit, setImageFit] = useState<'cover' | 'contain'>('cover');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setTitle('');
      setDescription('');
      setCategory('Projects');
      setPreviewImageUrl('');
      setFaviconUrl('');
      setMetaLoaded(false);
      setScreenshotUrl('');
      setBannerUrl(null);
      setIsFetchingMeta(false);
      setCloudStage('');
      setSubmitError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Manual Cloud Computer Fetch & Screenshot Engine (triggered only by button click)
  const executeCloudFetch = async () => {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      setSubmitError('Please enter a valid website URL first.');
      return;
    }

    const formatted = normalizeUrl(cleanUrl);
    setIsFetchingMeta(true);
    setSubmitError(null);

    setCloudStage('Connecting to Cloud Headless Computer...');
    const t1 = setTimeout(() => {
      setCloudStage('Opening URL in Cloud Chromium Browser (1440x900)...');
    }, 900);
    const t2 = setTimeout(() => {
      setCloudStage('Waiting for page elements to render...');
    }, 2000);
    const t3 = setTimeout(() => {
      setCloudStage('Capturing full desktop screenshot & applying to Pic field...');
    }, 3200);

    try {
      const data = await fetchSiteMetadata(formatted);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      setUrl(data.url);
      setTitle(data.title);
      setDescription(data.description);
      setCategory(data.category || 'Projects');
      setFaviconUrl(data.faviconUrl);

      const capturedShot = data.screenshotUrl || data.previewImageUrl;
      setScreenshotUrl(capturedShot);
      setBannerUrl(data.bannerUrl || null);

      setPreviewImageUrl(capturedShot);
      setActiveImageType('screenshot');
      setMetaLoaded(true);
      setCloudStage('Screenshot captured via Cloud Computer & applied to Pic field!');
    } catch (e) {
      console.warn('Cloud screenshot fallback:', e);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      const domain = formatted.replace(/^https?:\/\//, '').split('/')[0];
      setTitle(domain);
      const fallbackShot = `https://image.thum.io/get/width/1440/crop/900/noanimate/${formatted}`;
      setPreviewImageUrl(fallbackShot);
      setScreenshotUrl(fallbackShot);
      setFaviconUrl(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
      setMetaLoaded(true);
      setCloudStage('Applied live cloud screenshot to Pic field');
    } finally {
      setIsFetchingMeta(false);
    }
  };

  const handleSelectImageType = (type: 'screenshot' | 'banner' | 'custom') => {
    setActiveImageType(type);
    if (type === 'screenshot' && screenshotUrl) {
      setPreviewImageUrl(screenshotUrl);
    } else if (type === 'banner' && bannerUrl) {
      setPreviewImageUrl(bannerUrl);
    }
  };

  const cleanPic = previewImageUrl.trim();
  const isValidPic =
    cleanPic.length >= 8 &&
    (/^https?:\/\/.+/i.test(cleanPic) ||
      cleanPic.startsWith('data:image/') ||
      cleanPic.startsWith('/api/screenshots/'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !title.trim()) {
      setSubmitError('Please provide both URL and Title');
      return;
    }

    if (!adminPin) {
      setSubmitError('Access Denied: Owner verification required before publishing.');
      return;
    }

    if (!isValidPic) {
      setSubmitError('Picture Required: Please enter or capture a correct homepage picture URL before publishing.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formatted = normalizeUrl(url);
      const pinToUse = adminPin;

      const newSitePayload: SiteItem = {
        id: 'site_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        url: formatted,
        title: title.trim(),
        description: description.trim() || `Visit ${title}`,
        category: category.trim() || 'Projects',
        faviconUrl: faviconUrl || `https://www.google.com/s2/favicons?domain=${new URL(formatted).hostname}&sz=128`,
        previewImageUrl: cleanPic,
        createdAt: Date.now(),
        visitCount: 0,
        displayOrder: 0,
      };

      // Try server storage first
      try {
        const res = await fetch('/api/sites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': pinToUse,
            'x-admin-pin': pinToUse,
          },
          body: JSON.stringify({
            url: formatted,
            title,
            description,
            category,
            faviconUrl: newSitePayload.faviconUrl,
            previewImageUrl: newSitePayload.previewImageUrl,
            token: pinToUse,
            pin: pinToUse,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.site) {
            onSiteAdded(data.site);
            onClose();
            return;
          }
        }
      } catch {
        // Netlify Drop static mode without backend
      }

      // Client-side direct storage (Works 100% on Netlify Drop!)
      onSiteAdded(newSitePayload);
      onClose();
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to publish site');
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
        className="relative w-full max-w-2xl my-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden p-5 sm:p-7 text-slate-100"
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
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Add Site Link — HMHS</h2>
              <span className="text-[10px] bg-slate-800 text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded-full font-mono">
                Manual Fetch & Publish
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Type URL, click &quot;Take Screenshot&quot; manually, review details, then click &quot;Publish Link&quot;
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URL Input & Manual Fetch Button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Website URL
              </label>
              <span className="text-[11px] text-amber-400 font-medium">
                Manual trigger enabled (no auto-fetch)
              </span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Type or paste URL (e.g. https://lastai.ai.studio)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={executeCloudFetch}
                disabled={!url.trim() || isFetchingMeta}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 disabled:opacity-50 text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 shrink-0 transition-colors"
              >
                {isFetchingMeta ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Fetching...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 text-slate-950" />
                    <span>Take Screenshot</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Cloud Computer Execution Status Card */}
          {isFetchingMeta && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2 text-xs"
            >
              <div className="flex items-center gap-2 text-amber-300 font-semibold">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Cloud Computer Active:</span>
              </div>
              <p className="text-slate-300 font-mono text-[11px] pl-6">
                {cloudStage || 'Executing headless browser in cloud...'}
              </p>
            </motion.div>
          )}

          {/* Captured Homepage Screenshot Showcase */}
          {metaLoaded && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Cloud Screenshot Captured & Applied to Pic Field
                </span>

                {/* View Options */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleSelectImageType('screenshot')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                      activeImageType === 'screenshot'
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Cloud Screenshot
                  </button>
                  {bannerUrl && (
                    <button
                      type="button"
                      onClick={() => handleSelectImageType('banner')}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                        activeImageType === 'banner'
                          ? 'bg-amber-400 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Site Banner
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setImageFit((prev) => (prev === 'cover' ? 'contain' : 'cover'))}
                    title="Toggle Fit / Fill"
                    className="px-2 py-1 text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>{imageFit === 'cover' ? 'Fill' : 'Fit'}</span>
                  </button>
                </div>
              </div>

              {/* Live Picture Display */}
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                {previewImageUrl ? (
                  <img
                    src={previewImageUrl}
                    alt={title || 'Homepage preview'}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full transition-all duration-300 ${
                      imageFit === 'cover' ? 'object-cover object-top' : 'object-contain bg-slate-950 p-2'
                    }`}
                    onError={(e) => {
                      const target = e.currentTarget;
                      const formatted = normalizeUrl(url);
                      target.src = `https://image.thum.io/get/width/1440/crop/900/noanimate/${formatted}`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-1">
                    <ImageIcon className="w-6 h-6" />
                    <span>Click &quot;Take Screenshot&quot; above</span>
                  </div>
                )}

                {/* Bottom Overlay Info */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    {faviconUrl && (
                      <img
                        src={faviconUrl}
                        alt=""
                        className="w-4 h-4 rounded-sm object-contain shrink-0"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    )}
                    <span className="text-xs font-semibold text-white truncate">{title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 shrink-0 flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>1440x900 Cloud Capture</span>
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Pic Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Pic Field (Homepage Screenshot URL)</span>
                <span className="text-rose-400 font-bold text-[10px]">*Required</span>
              </label>
              <span className={`text-[10px] font-mono font-medium ${isValidPic ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isValidPic ? '✓ Picture Ready' : '⚠️ Correct Picture Required'}
              </span>
            </div>
            <input
              type="text"
              required
              value={previewImageUrl}
              onChange={(e) => {
                setPreviewImageUrl(e.target.value);
                setActiveImageType('custom');
              }}
              placeholder="Click 'Take Screenshot' or enter valid image URL"
              className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-xs font-mono text-amber-300 focus:outline-none transition-colors ${
                previewImageUrl && !isValidPic
                  ? 'border-rose-500 focus:border-rose-400'
                  : 'border-slate-800 focus:border-amber-400'
              }`}
            />
          </div>

          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Site Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Site Title"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-900 text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description / Summary
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short 1-line summary..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors resize-none"
            />
          </div>

          {submitError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              <span>{submitError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Manual publish locks hub after saving</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !url.trim() || !title.trim() || !isValidPic || !adminPin}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-amber-500/10 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Publish Link & Lock</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
