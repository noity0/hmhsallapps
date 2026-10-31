import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ExternalLink,
  Eye,
  Star,
  Users,
  ChevronLeft,
  ChevronRight,
  Flame,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SiteItem } from '../types';

interface SpotlightBannerProps {
  sites: SiteItem[];
  onOpenPreview: (site: SiteItem) => void;
  onVisit: (site: SiteItem) => void;
}

export const SpotlightBanner: React.FC<SpotlightBannerProps> = ({
  sites,
  onOpenPreview,
  onVisit,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  if (!sites || sites.length === 0) return null;

  const current = sites[currentIndex % sites.length];

  // Auto-rotate spotlight every 7 seconds unless user hovers
  useEffect(() => {
    if (isPaused || sites.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sites.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [isPaused, sites.length]);

  const handleLaunch = (e: React.MouseEvent) => {
    e.stopPropagation();
    onVisit(current);
    window.open(current.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative mb-10 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border-2 border-amber-400/40 shadow-2xl shadow-amber-500/10 group"
    >
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row items-center gap-8 justify-between">
        {/* Left Information Column */}
        <div className="flex-1 space-y-4 max-w-xl text-left">
          {/* Top Pill Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md">
              <Flame className="w-3.5 h-3.5 fill-slate-950" />
              <span>Spotlight Feature</span>
            </span>

            {current.badge && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-semibold">
                {current.badge}
              </span>
            )}

            {current.rating && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-amber-400 text-xs font-bold">
                <Star className="w-3 h-3 fill-amber-400" />
                <span>{current.rating.toFixed(1)}</span>
              </span>
            )}
          </div>

          {/* Title */}
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                {current.title}
              </h2>
              <p className="text-sm sm:text-base text-slate-300 line-clamp-3 mt-2 leading-relaxed">
                {current.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Key Feature Pills */}
          {current.features && current.features.length > 0 && (
            <div className="hidden sm:flex flex-col gap-1.5 pt-1">
              {current.features.slice(0, 2).map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="truncate">{feat}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleLaunch}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-xl shadow-amber-400/25 transition-all hover:scale-105 active:scale-95"
            >
              <span>Launch Platform</span>
              <ExternalLink className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={() => onOpenPreview(current)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-slate-800/90 hover:bg-slate-750 text-white font-bold text-sm rounded-xl border border-slate-700 hover:border-amber-400 transition-all hover:scale-105"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>Interactive Preview</span>
            </button>
          </div>
        </div>

        {/* Right Visual Image Showcase Column */}
        <div className="w-full lg:w-1/2 max-w-lg">
          <div
            onClick={() => onOpenPreview(current)}
            className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-700/80 shadow-2xl cursor-pointer group/img transition-transform duration-300 group-hover:scale-[1.01]"
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={current.id}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                src={current.previewImageUrl}
                alt={current.title}
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  e.currentTarget.src = `https://image.thum.io/get/width/1440/crop/900/noanimate/${current.url}`;
                }}
              />
            </AnimatePresence>

            {/* Scrim Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

            {/* Hover Badge */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200">
              <div className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-2xl">
                <Eye className="w-4 h-4" />
                <span>Click to Test Drive</span>
              </div>
            </div>

            {/* Bottom Domain Ribbon */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
              <span className="px-2.5 py-1 rounded-md bg-slate-900/90 backdrop-blur-md border border-slate-700 font-mono text-[11px] text-amber-300">
                {current.url.replace(/^https?:\/\//, '')}
              </span>
              {current.usersCount && (
                <span className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{current.usersCount}</span>
                </span>
              )}
            </div>
          </div>

          {/* Navigation Controls & Dots */}
          <div className="flex items-center justify-between mt-3 px-1">
            <div className="flex items-center gap-1.5">
              {sites.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentIndex % sites.length
                      ? 'w-7 bg-amber-400'
                      : 'w-2 bg-slate-700 hover:bg-slate-500'
                  }`}
                  title={s.title}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((prev) => (prev - 1 + sites.length) % sites.length)
                }
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                title="Previous App"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((prev) => (prev + 1) % sites.length)
                }
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                title="Next App"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
