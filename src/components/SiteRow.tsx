import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  QrCode,
  Trash2,
  Edit3,
  Globe,
  Eye,
  Star,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { SiteItem } from '../types';

interface SiteRowProps {
  site: SiteItem;
  isAdmin: boolean;
  onDelete: (site: SiteItem) => void;
  onEdit: (site: SiteItem) => void;
  onOpenQr: (site: SiteItem) => void;
  onOpenPreview: (site: SiteItem) => void;
  onVisit: (site: SiteItem) => void;
}

export const SiteRow: React.FC<SiteRowProps> = ({
  site,
  isAdmin,
  onDelete,
  onEdit,
  onOpenQr,
  onOpenPreview,
  onVisit,
}) => {
  const [copied, setCopied] = useState(false);

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

  const handleRowClick = () => {
    onVisit(site);
    window.open(site.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      whileHover={{ x: 2 }}
      onClick={handleRowClick}
      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-400/50 hover:bg-slate-850/80 transition-all cursor-pointer shadow-sm"
    >
      {/* Left: Favicon & Details */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow-inner p-2">
          {site.faviconUrl ? (
            <img
              src={site.faviconUrl}
              alt=""
              className="w-6 h-6 object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          ) : (
            <Globe className="w-6 h-6 text-amber-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate">
              {site.title}
            </h4>
            {site.badge && (
              <span className="text-[10px] font-semibold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                {site.badge}
              </span>
            )}
            {site.rating && (
              <span className="flex items-center gap-0.5 text-amber-400 text-xs font-bold">
                <Star className="w-3 h-3 fill-amber-400" />
                <span>{site.rating.toFixed(1)}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
            {site.description}
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenPreview(site);
          }}
          title="Interactive Preview"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
        >
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span>Preview</span>
        </button>

        <button
          type="button"
          onClick={handleCopy}
          title="Copy URL"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenQr(site);
          }}
          title="QR Code"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden sm:inline-flex"
        >
          <QrCode className="w-4 h-4" />
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
          <Edit3 className="w-4 h-4" />
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
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="p-1.5 text-slate-400 group-hover:text-amber-400 transition-colors">
          <ExternalLink className="w-4 h-4" />
        </div>
      </div>
    </motion.div>
  );
};
