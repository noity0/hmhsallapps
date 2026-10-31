import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { SiteItem } from '../types';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: SiteItem | null;
  adminPin: string;
  onDeleted: (siteId: string) => void;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  site,
  adminPin,
  onDeleted,
}) => {
  if (!isOpen || !site) return null;

  const [pin, setPin] = useState(adminPin || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    const codeToUse = (pin.trim() || adminPin).trim();

    if (!codeToUse) {
      setError('Access Denied: Owner verification required to delete site.');
      setIsDeleting(false);
      return;
    }

    try {
      // Try server delete if running full stack
      await fetch(`/api/sites/${site.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': codeToUse,
          'x-admin-pin': codeToUse,
        },
        body: JSON.stringify({ token: codeToUse, pin: codeToUse }),
      });
    } catch {
      // Netlify Drop static mode without backend
    }

    onDeleted(site.id);
    onClose();
    setIsDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 text-center"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-3 text-rose-400">
          <Trash2 className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-white tracking-tight mb-1">
          Delete Site Link?
        </h3>
        <p className="text-xs text-slate-400 mb-4 truncate px-2">
          {site.title} ({site.url})
        </p>

        <div className="mb-4 text-left">
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Confirm Owner Passcode
          </label>
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-center font-mono text-sm text-white focus:outline-none focus:border-rose-400"
            autoFocus
          />
        </div>

        {error && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 mb-3">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || (!pin.trim() && !adminPin)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors shadow-lg shadow-rose-600/20"
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>Delete</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
