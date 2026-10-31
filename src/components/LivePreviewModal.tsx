import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Sparkles,
  Star,
  Users,
  Layers,
  CheckCircle2,
  Compass,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SiteItem } from '../types';

interface LivePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: SiteItem | null;
  onVisit: (site: SiteItem) => void;
}

export const LivePreviewModal: React.FC<LivePreviewModalProps> = ({
  isOpen,
  onClose,
  site,
  onVisit,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'intel'>('preview');
  const [iframeKey, setIframeKey] = useState(0);

  if (!isOpen || !site) return null;

  const handleLaunch = () => {
    onVisit(site);
    window.open(site.url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(site.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`relative w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-100 transition-all duration-300 ${
            isFullscreen ? 'h-[96vh] max-w-[98vw]' : 'h-[88vh] max-w-5xl'
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-950/80 border-b border-slate-800/80 shrink-0">
            {/* Site Identity */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center p-2 shrink-0 shadow-inner">
                {site.faviconUrl ? (
                  <img
                    src={site.faviconUrl}
                    alt=""
                    className="w-6 h-6 object-contain rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <Compass className="w-5 h-5 text-amber-400" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                    {site.title}
                  </h3>
                  {site.badge && (
                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/20">
                      {site.badge}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  <span className="font-mono text-amber-300 text-[11px] truncate max-w-xs">{site.url}</span>
                  {site.rating && (
                    <span className="flex items-center gap-1 text-amber-400 font-semibold text-[11px]">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{site.rating.toFixed(1)}</span>
                    </span>
                  )}
                  {site.usersCount && (
                    <span className="hidden md:flex items-center gap-1 text-emerald-400 text-[11px]">
                      <Users className="w-3 h-3" />
                      <span>{site.usersCount}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Tab Switcher */}
              <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    activeTab === 'preview'
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Interactive Frame
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('intel')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    activeTab === 'intel'
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Features & Intel
                </button>
              </div>

              {/* Copy URL */}
              <button
                type="button"
                onClick={handleCopy}
                title="Copy Link"
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Fullscreen toggle */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors hidden sm:inline-flex"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Primary Launch CTA */}
              <button
                type="button"
                onClick={handleLaunch}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02]"
              >
                <span>Launch App</span>
                <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-hidden relative bg-slate-950">
            {activeTab === 'preview' ? (
              <div className="w-full h-full flex flex-col relative">
                {/* Embedded Frame Header Note */}
                <div className="px-4 py-1.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live In-App Sandbox Preview</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-500 hidden md:inline">For the best interactive experience with full audio & GPU hardware, click &quot;Launch App&quot;</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIframeKey((k) => k + 1)}
                      className="text-slate-400 hover:text-amber-400 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reload Frame</span>
                    </button>
                  </div>
                </div>

                {/* The Iframe */}
                <iframe
                  key={iframeKey}
                  src={site.url}
                  title={site.title}
                  className="w-full flex-1 border-0 bg-slate-950"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; geolocation; microphone; midi"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                />
              </div>
            ) : (
              /* Features & Intel Tab */
              <div className="w-full h-full overflow-y-auto p-6 sm:p-10 space-y-8 max-w-4xl mx-auto">
                {/* Hero Description */}
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-xs font-semibold text-amber-300 mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{site.category}</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
                    {site.title}
                  </h2>
                  <p className="text-base text-slate-300 leading-relaxed">
                    {site.description}
                  </p>
                </div>

                {/* Key Features */}
                {site.features && site.features.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Flagship Capabilities & Why Users Love It</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {site.features.map((feat, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3"
                        >
                          <div className="w-6 h-6 rounded-lg bg-amber-400/10 text-amber-400 font-bold flex items-center justify-center shrink-0 text-xs">
                            {idx + 1}
                          </div>
                          <p className="text-xs sm:text-sm text-slate-200 leading-snug">{feat}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tech Stack */}
                {site.techStack && site.techStack.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span>Technology Stack & Architecture</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {site.techStack.map((tech, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-mono text-slate-200"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Launch Banner Card */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 border border-amber-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <span>Verified Official Web Platform</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Engineered & published by Hafiz Muhammed Huzaifa Shamim
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLaunch}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm rounded-xl shadow-xl shadow-amber-400/20 transition-all hover:scale-105"
                  >
                    <span>Open Live Web Platform</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
