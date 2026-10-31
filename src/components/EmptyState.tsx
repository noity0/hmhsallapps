import React from 'react';
import { Plus, Sparkles, Layers, Lock } from 'lucide-react';

interface EmptyStateProps {
  onTriggerAddSite: () => void;
  isFiltered?: boolean;
  onClearFilter?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onTriggerAddSite,
  isFiltered,
  onClearFilter,
}) => {
  if (isFiltered) {
    return (
      <div className="py-20 text-center max-w-md mx-auto px-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white mb-1.5">No Matching Sites Found</h3>
        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          Try searching for a different keyword or switch the category filter.
        </p>
        {onClearFilter && (
          <button
            onClick={onClearFilter}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 rounded-xl transition-colors"
          >
            Clear Search & Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="py-24 text-center max-w-lg mx-auto px-4">
      {/* Decorative Icon Container */}
      <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 flex items-center justify-center mx-auto mb-6 shadow-2xl">
        <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
          <Sparkles className="w-5 h-5" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-white tracking-tight mb-2">
        HMHS App Launchpad
      </h3>

      <p className="text-sm text-slate-400 mb-6 leading-relaxed">
        Directory of all apps made by <span className="text-amber-400 font-semibold">Hafiz Muhammed Huzaifa Shamim</span>. Add any link to automatically capture a right-side-up homepage picture and store it permanently.
      </p>

      <div>
        <button
          onClick={onTriggerAddSite}
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add First Site Link</span>
        </button>
      </div>
    </div>
  );
};
