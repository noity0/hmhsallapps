import React from 'react';
import { Lock, Plus, LayoutGrid, List, Sparkles } from 'lucide-react';

interface NavbarProps {
  totalSites: number;
  viewMode: 'grid' | 'list';
  onToggleViewMode: (mode: 'grid' | 'list') => void;
  onTriggerAddSite: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  totalSites,
  viewMode,
  onToggleViewMode,
  onTriggerAddSite,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/85 border-b border-slate-800 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/10">
            <Sparkles className="w-5 h-5 text-slate-950" />
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
              HMHS All Sites
            </span>
            <span className="text-[11px] text-amber-400/90 font-medium whitespace-nowrap hidden sm:inline">
              By Hafiz Muhammed Huzaifa Shamim
            </span>
          </div>
        </div>

        {/* Zone 2: View Controls & Metrics */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="text-xs text-slate-400 font-medium hidden md:flex items-center gap-2">
            <span className="tabular-nums font-semibold text-slate-300">{totalSites}</span>
            <span>{totalSites === 1 ? 'Site' : 'Sites'}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-emerald-400">1-Tap Direct Launch</span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => onToggleViewMode('grid')}
              title="Grid Card View"
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onToggleViewMode('list')}
              title="Compact List View"
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Zone 3: 1 Primary Action Area */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onTriggerAddSite}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md shadow-amber-500/10 transition-all hover:scale-[1.02] whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Link</span>
          </button>
        </div>
      </div>
    </header>
  );
};
