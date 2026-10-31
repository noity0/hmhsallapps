import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  QrCode,
  Trash2,
  Edit3,
  Globe,
  Camera,
  Star,
  Eye,
  Users,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { SiteItem } from '../types';

interface SiteCardProps {
  site: SiteItem;
  isAdmin: boolean;
  onDelete: (site: SiteItem) => void;
  onEdit: (site: SiteItem) => void;
  onOpenQr: (site: SiteItem) => void;
  onOpenPreview: (site: SiteItem) => void;
  onVisit: (site: SiteItem) => void;
}

export const SiteCard: React.FC<SiteCardProps> = ({
  site,
  isAdmin,
  onDelete,
  onEdit,
  onOpenQr,
  onOpenPreview,
  onVisit,
}) => {
  const [copied, setCopied] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const domain = (() => {
    try {
      return new URL(site.url).hostname.replace(/^www\./, '');
    } catch {
      return site.url;
    }
  })();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(site.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCardClick = () => {
    onVisit(site);
    window.open(site.url, '_blank', 'noopener,noreferrer');
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenPreview(site);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-400/60 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Visual Header: Live Homepage Screenshot (16:9 Aspect Ratio) */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950 border-b border-slate-800/80">
        {!imageError && site.previewImageUrl ? (
          <>
            <img
              src={site.previewImageUrl}
              alt={`${site.title} homepage preview`}
              referrerPolicy="no-referrer"
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={`w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-slate-500 text-xs gap-2">
                <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span>Loading preview...</span>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-400">
            <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mb-2 shadow-inner">
              {site.faviconUrl ? (
                <img
                  src={site.faviconUrl}
                  alt=""
                  className="w-6 h-6 rounded object-contain"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              ) : (
                <Globe className="w-6 h-6 text-amber-400" />
              )}
            </div>
            <span className="text-xs font-mono text-slate-400">{domain}</span>
          </div>
        )}

        {/* Scrim Gradient for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-10">
          {site.badge ? (
            <span className="px-2.5 py-1 rounded-lg bg-slate-950/90 backdrop-blur-md border border-amber-400/40 text-[10px] font-bold text-amber-300 shadow-md flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="truncate max-w-[170px]">{site.badge}</span>
            </span>
          ) : (
            <div />
          )}

          {/* Quick Change Pic Button (Visible on Hover) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(site);
            }}
            title="Edit Picture"
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-2 py-1 bg-slate-900/90 hover:bg-slate-850 backdrop-blur-md rounded-lg border border-slate-700 hover:border-amber-400 text-[10px] font-semibold text-slate-200 hover:text-amber-400 shadow-lg flex items-center gap-1"
          >
            <Camera className="w-3 h-3 text-amber-400" />
            <span>Change Pic</span>
          </button>
        </div>

        {/* Hover Center Overlay: Instant Test-Drive Trigger */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-200">
          <button
            type="button"
            onClick={handlePreviewClick}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-xl transition-transform hover:scale-105"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Interactive Test Drive</span>
          </button>
        </div>

        {/* Domain & Favicon Overlay at bottom of thumbnail */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2 max-w-[70%]">
            <div className="w-5 h-5 rounded-md bg-slate-900/90 backdrop-blur-md border border-slate-700/80 flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src={site.faviconUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                alt=""
                className="w-3.5 h-3.5 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <span className="font-mono text-[11px] text-slate-200 font-medium truncate">
              {domain}
            </span>
          </div>

          {site.usersCount && (
            <span className="text-[10px] font-semibold text-emerald-400 bg-slate-950/80 backdrop-blur-sm px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
              <Users className="w-2.5 h-2.5" />
              <span>{site.usersCount}</span>
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          {/* Category & Rating */}
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-amber-400 font-semibold">{site.category || 'Projects'}</span>
            {site.rating && (
              <span className="flex items-center gap-1 text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20 text-[11px]">
                <Star className="w-3 h-3 fill-amber-400" />
                <span>{site.rating.toFixed(1)}</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-base font-extrabold text-white group-hover:text-amber-300 transition-colors tracking-tight line-clamp-1">
            {site.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {site.description}
          </p>

          {/* Feature Highlights */}
          {site.features && site.features.length > 0 && (
            <div className="pt-1 space-y-1">
              {site.features.slice(0, 2).map((feat, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                  <span className="text-amber-400 shrink-0 font-bold">✓</span>
                  <span className="truncate">{feat}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tech Stack Tags */}
          {site.techStack && site.techStack.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1.5">
              {site.techStack.slice(0, 3).map((tech, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
          {/* Quick Launch & Test Drive */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCardClick}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all hover:scale-105 active:scale-95"
            >
              <span>Launch</span>
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={handlePreviewClick}
              title="Test Drive In-App"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Preview</span>
            </button>
          </div>

          {/* Tool Icons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              title="Copy URL"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenQr(site);
              }}
              title="QR Code"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(site);
              }}
              title="Edit Details & Change Picture"
              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(site);
              }}
              title="Delete Site"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
