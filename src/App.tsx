import React, { useState, useEffect, useMemo } from 'react';
import { Search, Sparkles, Plus, Share2, Check, ArrowUpDown, Filter, Lock, Dices } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { SiteItem } from './types';
import { Navbar } from './components/Navbar';
import { SiteCard } from './components/SiteCard';
import { SiteRow } from './components/SiteRow';
import { EmptyState } from './components/EmptyState';
import { PinModal } from './components/PinModal';
import { AddSiteModal } from './components/AddSiteModal';
import { EditSiteModal } from './components/EditSiteModal';
import { DeleteModal } from './components/DeleteModal';
import { QrModal } from './components/QrModal';
import { SpotlightBanner } from './components/SpotlightBanner';
import { LivePreviewModal } from './components/LivePreviewModal';

const LOCAL_STORAGE_KEY = 'my_web_hub_sites_cache';

export default function App() {
  const [sites, setSites] = useState<SiteItem[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  // View & Filter states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'alpha'>('newest');

  // Modals state & PIN gated action
  type PendingAction =
    | { type: 'add' }
    | { type: 'edit'; site: SiteItem }
    | { type: 'delete'; site: SiteItem }
    | null;

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [verifiedPin, setVerifiedPin] = useState<string>('');

  const [editingSite, setEditingSite] = useState<SiteItem | null>(null);
  const [deletingSite, setDeletingSite] = useState<SiteItem | null>(null);
  const [qrSite, setQrSite] = useState<SiteItem | null>(null);
  const [previewSite, setPreviewSite] = useState<SiteItem | null>(null);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Helper to merge two lists without ever losing any site
  const mergeSiteLists = (local: SiteItem[], server: SiteItem[]): SiteItem[] => {
    const map = new Map<string, SiteItem>();
    for (const item of local) {
      if (item && item.url) map.set(item.url.toLowerCase().trim(), item);
    }
    for (const item of server) {
      if (item && item.url) {
        const key = item.url.toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, item);
        } else {
          const ex = map.get(key)!;
          map.set(key, {
            ...ex,
            ...item,
            title: item.title || ex.title,
            description: item.description || ex.description,
            previewImageUrl: item.previewImageUrl || ex.previewImageUrl,
            category: item.category || ex.category,
            faviconUrl: item.faviconUrl || ex.faviconUrl,
            visitCount: Math.max(ex.visitCount || 0, item.visitCount || 0),
          });
        }
      }
    }
    return Array.from(map.values()).sort(
      (x, y) => (x.displayOrder ?? 0) - (y.displayOrder ?? 0) || (y.createdAt || 0) - (x.createdAt || 0)
    );
  };

  // Fetch sites and run bidirectional sync (server <-> client localStorage)
  const fetchSites = async () => {
    let localItems: SiteItem[] = [];
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) localItems = JSON.parse(cached);
      if (!Array.isArray(localItems)) localItems = [];
    } catch {
      localItems = [];
    }

    try {
      // 1. Call bidirectional sync endpoint
      const res = await fetch('/api/sites/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sites: localItems }),
      });
      if (res.ok) {
        const data = await res.json();
        const serverSites: SiteItem[] = Array.isArray(data.sites) ? data.sites : [];
        const merged = mergeSiteLists(localItems, serverSites);
        setSites(merged);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Sync attempt fallback:', err);
    }

    try {
      // 2. Fallback to GET /api/sites
      const res = await fetch('/api/sites');
      if (res.ok) {
        const data = await res.json();
        const serverSites: SiteItem[] = Array.isArray(data.sites) ? data.sites : [];
        const merged = mergeSiteLists(localItems, serverSites);
        setSites(merged);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Server fetch fallback:', err);
    }

    // 3. If offline / static hosting, preserve local cache
    if (localItems.length > 0) {
      setSites(localItems);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSites();
  }, []);

  // Sync cache safely (never wipe with empty array)
  useEffect(() => {
    if (sites.length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sites));
      } catch {
        // ignore
      }
    }
  }, [sites]);

  // When user triggers "+ Add Site Link" (PIN Required):
  const handleTriggerAddSite = () => {
    setPendingAction({ type: 'add' });
    setIsPinModalOpen(true);
  };

  // When user triggers Edit Site / Change Picture (PIN Required):
  const handleTriggerEditSite = (site: SiteItem) => {
    setPendingAction({ type: 'edit', site });
    setIsPinModalOpen(true);
  };

  // When user triggers Delete Site (PIN Required):
  const handleTriggerDeleteSite = (site: SiteItem) => {
    setPendingAction({ type: 'delete', site });
    setIsPinModalOpen(true);
  };

  // As soon as PIN is entered and verified:
  const handlePinSuccess = (pin: string) => {
    setVerifiedPin(pin);
    if (!pendingAction) return;

    if (pendingAction.type === 'add') {
      setIsAddModalOpen(true);
    } else if (pendingAction.type === 'edit') {
      setEditingSite(pendingAction.site);
    } else if (pendingAction.type === 'delete') {
      setDeletingSite(pendingAction.site);
    }
    setPendingAction(null);
  };

  const handleClosePinModal = () => {
    setIsPinModalOpen(false);
    setPendingAction(null);
  };

  // When site is added and published:
  const handleSiteAdded = (newSite: SiteItem) => {
    setSites((prev) => {
      const filtered = prev.filter((s) => s.url.toLowerCase() !== newSite.url.toLowerCase());
      const updated = [newSite, ...filtered];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // Background sync to server
    fetch('/api/sites/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sites: [newSite] }),
    }).catch(() => {});

    setVerifiedPin('');
    showToast(`"${newSite.title}" published! Hub locked automatically.`);
  };

  // When site is edited:
  const handleSiteUpdated = (updatedSite: SiteItem) => {
    setSites((prev) => {
      const updated = prev.map((s) => (s.id === updatedSite.id ? updatedSite : s));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // Background sync to server
    fetch('/api/sites/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sites: [updatedSite] }),
    }).catch(() => {});

    showToast(`"${updatedSite.title}" updated and locked.`);
  };

  // When site is deleted:
  const handleSiteDeleted = (siteId: string) => {
    setSites((prev) => {
      const updated = prev.filter((s) => s.id !== siteId);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    showToast('Site deleted and safely archived in backup.');
  };

  // Increment visit count on 1-tap open
  const handleVisit = async (site: SiteItem) => {
    try {
      fetch(`/api/sites/${site.id}/visit`, { method: 'POST' });
      setSites((prev) =>
        prev.map((s) => (s.id === site.id ? { ...s, visitCount: (s.visitCount || 0) + 1 } : s))
      );
    } catch {
      // non-blocking
    }
  };

  // Share showcase URL
  const handleShareHub = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    showToast('Hub link copied to clipboard!');
    setTimeout(() => setCopiedShare(false), 2000);
  };

  // Serendipitous random app launch
  const handleRandomLaunch = () => {
    if (sites.length === 0) return;
    const random = sites[Math.floor(Math.random() * sites.length)];
    showToast(`🎲 Surprise Pick! Launching "${random.title}"...`);
    handleVisit(random);
    setTimeout(() => {
      window.open(random.url, '_blank', 'noopener,noreferrer');
    }, 600);
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: sites.length };
    sites.forEach((s) => {
      if (s.category) {
        counts[s.category] = (counts[s.category] || 0) + 1;
      }
    });
    return counts;
  }, [sites]);

  // Available categories based on existing sites
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    sites.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return ['All', ...Array.from(set)];
  }, [sites]);

  // Filtered & sorted sites
  const filteredSites = useMemo(() => {
    let result = [...sites];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.url.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      result = result.filter((s) => s.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Sort order
    if (sortBy === 'newest') {
      result.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortBy === 'popular') {
      result.sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));
    } else if (sortBy === 'alpha') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [sites, searchQuery, selectedCategory, sortBy]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Top Bar Header */}
      <Navbar
        totalSites={sites.length}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        onTriggerAddSite={handleTriggerAddSite}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="mb-12 text-center max-w-4xl mx-auto">
          {/* Official Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-amber-400/30 text-xs font-semibold text-amber-300 mb-4 shadow-lg shadow-amber-400/5 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="tracking-wider uppercase text-[11px] font-bold">Official Web Launchpad & Directory</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight mb-4">
            HMHS ALL SITES
          </h1>

          {/* Prominent High-Impact Signature Showcase */}
          <div className="my-4 px-5 py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-400/25 to-amber-500/15 border-2 border-amber-400/50 shadow-2xl shadow-amber-500/10 backdrop-blur-md">
            <p className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-1">
              Architected & Engineered
            </p>
            <p className="text-xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-snug">
              ALL APPS MADE BY <span className="text-amber-300 underline decoration-amber-400 decoration-4 underline-offset-4">HAFIZ MUHAMMED HUZAIFA SHAMIM</span>
            </p>
          </div>

          <p className="text-sm sm:text-base text-slate-300 text-balance leading-relaxed max-w-2xl mx-auto mt-3">
            One-tap direct access to all websites, autonomous AI platforms, and web utilities engineered by Hafiz Muhammed Huzaifa Shamim.
          </p>

          {/* Live System Status Ribbon */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-white">{sites.length}</span>
              <span>{sites.length === 1 ? 'App Live' : 'Apps Live'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Owner Passcode Protected (Add · Edit · Delete)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Permanent Auto-Sync Storage</span>
            </span>
          </div>
        </div>

        {/* Flagship Platform Spotlight Carousel */}
        {sites.length > 0 && !searchQuery && selectedCategory === 'All' && (
          <SpotlightBanner
            sites={sites}
            onOpenPreview={setPreviewSite}
            onVisit={handleVisit}
          />
        )}

        {/* Toolbar: Search, Filters, Share, & Sort */}
        <div className="space-y-4 mb-8">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search platforms by title, keyword, tech..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Right Tools: Sort Selector, Surprise Me, Share, Add Site */}
            <div className="flex items-center gap-2 justify-end flex-wrap">
              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs text-slate-300 font-medium focus:outline-none cursor-pointer pr-1"
                >
                  <option value="newest" className="bg-slate-900 text-white">Newest First</option>
                  <option value="popular" className="bg-slate-900 text-white">Most Popular</option>
                  <option value="alpha" className="bg-slate-900 text-white">Alphabetical (A-Z)</option>
                </select>
              </div>

              {/* Surprise Me / Random Launch Button */}
              <button
                type="button"
                onClick={handleRandomLaunch}
                title="Random Platform Test-Drive"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 hover:from-amber-400/25 hover:to-amber-500/35 border border-amber-400/40 text-xs font-bold text-amber-300 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-sm"
              >
                <Dices className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                <span className="hidden md:inline">Surprise Me</span>
              </button>

              {/* Share Button */}
              <button
                onClick={handleShareHub}
                title="Share this showcase"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 rounded-xl transition-colors"
              >
                {copiedShare ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Share</span>
                  </>
                )}
              </button>

              {/* Add Link Quick CTA */}
              <button
                onClick={handleTriggerAddSite}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Add Site Link</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>

          {/* Category Filter Buttons with Live App Counts */}
          {availableCategories.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs text-slate-500 font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                <span>Filter:</span>
              </span>
              {availableCategories.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                        : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {categoryCounts[cat] || 0}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sites Showcase Content */}
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading your sites showcase...</p>
          </div>
        ) : sites.length === 0 ? (
          <EmptyState onTriggerAddSite={handleTriggerAddSite} />
        ) : filteredSites.length === 0 ? (
          <EmptyState
            isFiltered
            onClearFilter={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            onTriggerAddSite={handleTriggerAddSite}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredSites.map((site) => (
                <SiteCard
                  key={site.id}
                  site={site}
                  isAdmin={true}
                  onDelete={handleTriggerDeleteSite}
                  onEdit={handleTriggerEditSite}
                  onOpenQr={setQrSite}
                  onOpenPreview={setPreviewSite}
                  onVisit={handleVisit}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-2.5 max-w-4xl mx-auto">
            <AnimatePresence>
              {filteredSites.map((site) => (
                <SiteRow
                  key={site.id}
                  site={site}
                  isAdmin={true}
                  onDelete={handleTriggerDeleteSite}
                  onEdit={handleTriggerEditSite}
                  onOpenQr={setQrSite}
                  onOpenPreview={setPreviewSite}
                  onVisit={handleVisit}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 mt-16 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            HMHS All Sites · Crafted by Hafiz Muhammed Huzaifa Shamim · Direct 1-Tap Access
          </p>
          <div className="flex items-center gap-2 text-[11px]">
            <span>Owner Secured Hub</span>
            <span>·</span>
            <span>Auto-locks after every change</span>
          </div>
        </div>
      </footer>

      {/* Universal PIN Security Gate Modal (Enforced for Add, Edit, Delete) */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={handleClosePinModal}
        onSuccess={handlePinSuccess}
        title="Owner Security Passcode"
        subtitle={
          pendingAction?.type === 'add'
            ? 'Enter PIN to unlock and publish a new site link'
            : pendingAction?.type === 'edit'
            ? 'Enter PIN to edit details or change site picture'
            : pendingAction?.type === 'delete'
            ? 'Enter PIN to authorize deleting this site'
            : 'Enter PIN to verify owner access'
        }
      />

      {/* Add Site Modal (Opens only when owner passcode is verified) */}
      <AddSiteModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setVerifiedPin('');
        }}
        adminPin={verifiedPin}
        onSiteAdded={handleSiteAdded}
      />

      {/* Edit Site Modal (Opens only when owner passcode is verified) */}
      <EditSiteModal
        isOpen={Boolean(editingSite)}
        site={editingSite}
        onClose={() => {
          setEditingSite(null);
          setVerifiedPin('');
        }}
        adminPin={verifiedPin}
        onSiteUpdated={handleSiteUpdated}
      />

      {/* Delete Confirmation Modal (Opens only when owner passcode is verified) */}
      <DeleteModal
        isOpen={Boolean(deletingSite)}
        site={deletingSite}
        onClose={() => {
          setDeletingSite(null);
          setVerifiedPin('');
        }}
        adminPin={verifiedPin}
        onDeleted={handleSiteDeleted}
      />

      {/* QR Code Modal */}
      <QrModal
        isOpen={Boolean(qrSite)}
        site={qrSite}
        onClose={() => setQrSite(null)}
      />

      {/* Interactive In-App Test Drive & Live Preview Modal */}
      <LivePreviewModal
        isOpen={Boolean(previewSite)}
        site={previewSite}
        onClose={() => setPreviewSite(null)}
        onVisit={handleVisit}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium shadow-2xl flex items-center gap-2"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
