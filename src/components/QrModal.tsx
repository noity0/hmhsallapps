import React, { useState } from 'react';
import { X, QrCode, Copy, Check, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { SiteItem } from '../types';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: SiteItem | null;
}

export const QrModal: React.FC<QrModalProps> = ({ isOpen, onClose, site }) => {
  if (!isOpen || !site) return null;
  const [copied, setCopied] = useState(false);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=15&data=${encodeURIComponent(
    site.url
  )}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(site.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-xs rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 text-center"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mx-auto w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-3 text-amber-400">
          <QrCode className="w-5 h-5" />
        </div>

        <h3 className="text-base font-bold text-white tracking-tight">{site.title}</h3>
        <p className="text-xs text-slate-400 mt-1 truncate max-w-xs mx-auto">
          Scan with mobile camera to open instantly
        </p>

        <div className="my-5 p-3 bg-white rounded-2xl shadow-inner inline-block">
          <img
            src={qrImageUrl}
            alt={`QR code for ${site.title}`}
            className="w-48 h-48 rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-medium text-slate-200 rounded-xl border border-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy URL</span>
              </>
            )}
          </button>

          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-xs font-semibold text-slate-950 rounded-xl transition-colors"
          >
            <span>Open in Browser</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </motion.div>
    </div>
  );
};
