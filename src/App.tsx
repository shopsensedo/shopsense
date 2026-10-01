import React, { useState, useEffect } from 'react';
import { AppScreen, Product, User, SavedItem, PriceAlert, SearchHistoryItem } from './types';
import {
  SAMPLE_PRODUCTS,
  INITIAL_SAVED_ITEMS,
  INITIAL_PRICE_ALERTS,
  INITIAL_SEARCH_HISTORY,
  MOCK_USER,
  SNEAKER_IMAGE,
  KURTA_IMAGE,
} from './lib/mockData';
import { ToastProvider, useToast } from './components/ui/Toast';
import { searchByImage, searchByText } from './lib/api';
import { searchByImageLocal, searchByTextLocal } from './lib/localSearch';
import { searchLive, SourceStatus } from './lib/liveSearch';
import { isDemoMode } from './lib/demoMode';
import { ThemeProvider, useTheme } from './lib/theme';
import { Navbar } from './components/ui/Navbar';
import { BottomNav } from './components/ui/BottomNav';
import { HomeScreen } from './components/features/HomeScreen';
import { CropPreviewModal } from './components/features/CropPreviewModal';
import { SearchLoadingScreen } from './components/features/SearchLoadingScreen';
import { ResultsScreen } from './components/features/ResultsScreen';
import { ComparisonViewScreen } from './components/features/ComparisonViewScreen';
import { ProductDetailModal } from './components/features/ProductDetailModal';
import { PriceAlertModal } from './components/features/PriceAlertModal';
import { SavedItemsScreen } from './components/features/SavedItemsScreen';
import { PriceTrackingScreen } from './components/features/PriceTrackingScreen';
import { SearchHistoryScreen } from './components/features/SearchHistoryScreen';
import { AuthModal } from './components/features/AuthModal';
import { ProfileScreen } from './components/features/ProfileScreen';
import { FlutterHandoffView } from './components/features/FlutterHandoffView';

function ShopSenseApp() {
  const { showToast } = useToast();
  const { isDarkMode, toggleTheme } = useTheme();

  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [isUrduMode, setIsUrduMode] = useState<boolean>(false);

  // Demo mode: ?demo=1 or VITE_DEMO_MODE=true. Seed/mock data is ONLY
  // allowed here — production shows live listings or an honest error.
  const [demoMode] = useState<boolean>(() => isDemoMode());

  // Search failure state (production): honest error + retry, never fake data.
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sourceStatus, setSourceStatus] = useState<SourceStatus | null>(null);
  const [lastSearch, setLastSearch] = useState<
    { type: 'image'; dataUrl: string } | { type: 'text'; query: string } | null
  >(null);

  // User State — production starts as Guest; the fake MOCK_USER is demo-only.
  const [user, setUser] = useState<User | null>(() =>
    demoMode
      ? MOCK_USER
      : { id: 'guest', name: 'Guest', email: '', isGuest: true, preferredLanguage: 'en' },
  );
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Search & Products State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [localClipProgress, setLocalClipProgress] = useState<number | null>(null);
  const [clipProgressLabel, setClipProgressLabel] = useState<string | undefined>(undefined);
  const [searchReady, setSearchReady] = useState(true);
  const [searchQueryText, setSearchQueryText] = useState<string>('');
  const [currentProducts, setCurrentProducts] = useState<Product[]>([]);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [selectedProductForComparison, setSelectedProductForComparison] = useState<Product | null>(null);
  const [selectedProductForAlert, setSelectedProductForAlert] = useState<Product | null>(null);

  // Saved Items, Alerts & History State
  // Saved items persist across reloads via localStorage (demo seed on first run in demo mode).
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    try {
      const raw = localStorage.getItem('shopsense_saved_items_v1');
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(
            (s): s is SavedItem =>
              !!s && typeof s === 'object' && !!(s as SavedItem).product && typeof (s as SavedItem).product.id === 'string'
          );
          if (valid.length > 0 || parsed.length === 0) return valid;
        }
      }
    } catch {
      // corrupted storage or private mode — fall through to seed data
    }
    return demoMode ? INITIAL_SAVED_ITEMS : [];
  });
  useEffect(() => {
    try {
      localStorage.setItem('shopsense_saved_items_v1', JSON.stringify(savedItems));
    } catch {
      // storage unavailable — session-only behavior, non-fatal
    }
  }, [savedItems]);
  // Fake seed alerts/history are demo-only; production starts empty.
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(() =>
    demoMode ? INITIAL_PRICE_ALERTS : [],
  );
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() =>
    demoMode ? INITIAL_SEARCH_HISTORY : [],
  );

  // Handle image selected for upload
  const handleImageSelected = (imageDataUrl: string, sourceName?: string) => {
    setUploadedImage(imageDataUrl);
    setSearchQueryText(sourceName || (isUrduMode ? 'Screenshot se talash' : 'Visual Search Query'));
    setIsCropModalOpen(true);
  };

  // Confirm crop and execute visual search.
  // Production: backend (local dev) → LIVE pipeline. Any failure shows an
  // honest error — NEVER sample/seed/mock data. Demo mode (?demo=1) additionally
  // falls back to the seed catalog and then the mock catalog, under a banner.
  const handleConfirmCrop = async (croppedDataUrl: string) => {
    setIsCropModalOpen(false);
    setSearchReady(false);
    setSearchError(null);
    setSourceStatus(null);
    setCurrentScreen('search_loading');

    let matchedProducts: Product[] | null = null;
    let detectedCat = 'Footwear';

    try {
      matchedProducts = await searchByImage(croppedDataUrl, 7);
      if (matchedProducts.length > 0) detectedCat = matchedProducts[0].category || 'Footwear';
    } catch {
      matchedProducts = null; // backend unreachable — try the live pipeline
    }

    if (!matchedProducts) {
      try {
        // LIVE pipeline: understand the photo → fetch REAL listings from
        // PriceOye + Daraz → CLIP-embed product images → visual rank.
        // No mock data in this path; source failures are reported, not hidden.
        setLocalClipProgress(0);
        const live = await searchLive(croppedDataUrl, (p) => {
          if (typeof p === 'number') {
            setLocalClipProgress(p * 0.4);
            setClipProgressLabel(isUrduMode ? 'AI model load ho raha hai…' : 'Loading AI model…');
          } else if (p.stage === 'fetch') {
            setLocalClipProgress(0.45);
            setClipProgressLabel(
              isUrduMode ? 'Live listings la rahe hain…' : 'Fetching live listings…',
            );
          } else if (p.stage === 'match') {
            setLocalClipProgress(0.5 + 0.5 * (p.done / Math.max(1, p.total)));
            setClipProgressLabel(
              isUrduMode
                ? `Tasveerain match ho rahi hain ${p.done}/${p.total}…`
                : `Matching photos ${p.done}/${p.total}…`,
            );
          }
        });
        // Always surface what each source did — even when it failed.
        setSourceStatus(live.sources);
        if (live.products.length > 0) {
          matchedProducts = live.products;
          detectedCat = live.category;
        } else {
          matchedProducts = null;
        }
      } catch {
        matchedProducts = null; // live failed (e.g. model load) — honest error below
      } finally {
        setLocalClipProgress(null);
        setClipProgressLabel(undefined);
      }
    }

    if (!matchedProducts && demoMode) {
      try {
        // DEMO ONLY: in-browser CLIP against the bundled 7 seed products.
        // First run downloads the quantized model once (~90MB, cached after).
        setLocalClipProgress(0);
        matchedProducts = await searchByImageLocal(croppedDataUrl, 7, (f) =>
          setLocalClipProgress(f),
        );
        if (matchedProducts.length > 0)
          detectedCat = matchedProducts[0].category || 'Footwear';
      } catch {
        matchedProducts = null; // fall through to mock matching
      } finally {
        setLocalClipProgress(null);
      }
    }

    if (!matchedProducts && demoMode) {
      // DEMO ONLY: offline fallback to the hardcoded mock catalog.
      let fallback = SAMPLE_PRODUCTS;

      if (croppedDataUrl.includes('kurta') || searchQueryText.toLowerCase().includes('kurta') || searchQueryText.toLowerCase().includes('suit')) {
        fallback = SAMPLE_PRODUCTS.filter((p) => p.category === 'Ethnic Wear');
        detectedCat = 'Ethnic Wear';
      } else if (croppedDataUrl.includes('smartwatch') || searchQueryText.toLowerCase().includes('watch')) {
        fallback = SAMPLE_PRODUCTS.filter((p) => p.category === 'Smartwatches');
        detectedCat = 'Smartwatches';
      } else if (croppedDataUrl.includes('bag') || searchQueryText.toLowerCase().includes('bag')) {
        fallback = SAMPLE_PRODUCTS.filter((p) => p.category === 'Bags & Accessories');
        detectedCat = 'Bags & Accessories';
      } else {
        fallback = SAMPLE_PRODUCTS.filter((p) => p.category === 'Footwear');
      }
      matchedProducts = fallback;
    }

    if (!matchedProducts) {
      // Production failure: honest state, no fake data.
      setSearchError(
        isUrduMode ? 'Live search abhi dastyab nahi hai' : 'Live search is unavailable right now',
      );
      setLastSearch({ type: 'image', dataUrl: croppedDataUrl });
      setCurrentProducts([]);
      setSearchReady(true);
      return;
    }

    setSearchError(null);
    setCurrentProducts(matchedProducts);

    // Add to search history
    const historyItem: SearchHistoryItem = {
      id: `hist-${Date.now()}`,
      queryImage: croppedDataUrl,
      queryText: searchQueryText || (isUrduMode ? 'Screenshot se talash' : 'Screenshot Visual Search'),
      timestamp: 'Just now',
      resultsCount: matchedProducts.length,
      category: detectedCat,
    };
    setSearchHistory((prev) => [historyItem, ...prev]);

    // Products are set; the loading screen (staged animation) hands off to results.
    setSearchReady(true);
  };

  // Handle text-based search (supports Roman Urdu e.g. "kala joota").
  // Production: backend (local dev) only — no live text pipeline yet, and
  // NEVER seed/mock fallbacks. Any failure shows an honest error.
  // Demo mode (?demo=1) keeps the seed + mock fallbacks, under a banner.
  const handleTextSearch = async (query: string) => {
    setSearchQueryText(query);
    setSearchReady(false);
    setSearchError(null);
    setSourceStatus(null);
    setCurrentScreen('search_loading');

    let matched: Product[] | null = null;
    let cat = 'General';
    let queryImage: string | undefined;

    try {
      matched = await searchByText(query, 7);
      if (matched.length > 0) {
        cat = matched[0].category || 'General';
        queryImage = matched[0].imageUrl;
      }
    } catch {
      matched = null; // backend unreachable
    }

    if (!matched && demoMode) {
      // DEMO ONLY: local Roman Urdu keyword search over the seed catalog.
      const local = searchByTextLocal(query, 7);
      if (local.length > 0) {
        matched = local;
        cat = local[0].category || 'General';
        queryImage = local[0].imageUrl;
      }
    }

    if (!matched && demoMode) {
      const qLower = query.toLowerCase();
      matched = SAMPLE_PRODUCTS;

      if (qLower.includes('joota') || qLower.includes('shoe') || qLower.includes('sneaker') || qLower.includes('kala')) {
        matched = SAMPLE_PRODUCTS.filter((p) => p.category === 'Footwear');
        cat = 'Footwear';
        setUploadedImage(SNEAKER_IMAGE);
      } else if (qLower.includes('suit') || qLower.includes('kurta') || qLower.includes('lal') || qLower.includes('lawn')) {
        matched = SAMPLE_PRODUCTS.filter((p) => p.category === 'Ethnic Wear');
        cat = 'Ethnic Wear';
        setUploadedImage(KURTA_IMAGE);
      } else if (qLower.includes('watch') || qLower.includes('smartwatch') || qLower.includes('t800')) {
        matched = SAMPLE_PRODUCTS.filter((p) => p.category === 'Smartwatches');
        cat = 'Smartwatches';
      } else if (qLower.includes('bag') || qLower.includes('leather')) {
        matched = SAMPLE_PRODUCTS.filter((p) => p.category === 'Bags & Accessories');
        cat = 'Bags & Accessories';
      }
    }

    if (!matched) {
      // Production failure: honest state, no fake data.
      setSearchError(
        isUrduMode ? 'Live search abhi dastyab nahi hai' : 'Live search is unavailable right now',
      );
      setLastSearch({ type: 'text', query });
      setCurrentProducts([]);
      setSearchReady(true);
      return;
    }

    setSearchError(null);
    setCurrentProducts(matched);

    const historyItem: SearchHistoryItem = {
      id: `hist-${Date.now()}`,
      queryImage: queryImage || uploadedImage || undefined,
      queryText: query,
      timestamp: 'Just now',
      resultsCount: matched.length,
      category: cat,
    };
    setSearchHistory((prev) => [historyItem, ...prev]);

    setSearchReady(true);
  };

  // Re-run an item from search history — re-executes the real search
  // (live in production, seed/mock fallbacks only in demo mode).
  const handleRerunHistory = (item: SearchHistoryItem) => {
    setSearchQueryText(item.queryText || '');
    if (item.queryImage) {
      handleConfirmCrop(item.queryImage);
    } else if (item.queryText) {
      handleTextSearch(item.queryText);
    }
  };

  // Retry the last failed search from the honest error state.
  const handleRetrySearch = () => {
    if (!lastSearch) return;
    if (lastSearch.type === 'image') {
      handleConfirmCrop(lastSearch.dataUrl);
    } else {
      handleTextSearch(lastSearch.query);
    }
  };

  // Toggle saving an item
  const handleToggleSave = (product: Product) => {
    const isAlreadySaved = savedItems.some((s) => s.product.id === product.id);

    if (isAlreadySaved) {
      setSavedItems((prev) => prev.filter((s) => s.product.id !== product.id));
      showToast('Removed from saved items', 'info');
    } else {
      const newSavedItem: SavedItem = {
        id: `save-${Date.now()}`,
        product,
        savedAt: 'Just now',
        initialPrice: product.price,
        currentPrice: product.price,
        priceChange: 0,
      };
      setSavedItems((prev) => [newSavedItem, ...prev]);
      showToast('Saved to your wishlist! We will track its price.', 'success');
    }
  };

  // Handle adding a price alert
  const handleSetAlert = (product: Product, targetPrice: number) => {
    const newAlert: PriceAlert = {
      id: `alert-${Date.now()}`,
      product,
      targetPrice,
      currentPrice: product.price,
      enabled: true,
      createdAt: 'Today',
      notificationsSent: 0,
    };
    setPriceAlerts((prev) => [newAlert, ...prev]);
  };

  // Toggle alert active/inactive
  const handleToggleAlert = (id: string) => {
    setPriceAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
    showToast('Alert notification status updated', 'info');
  };

  // Delete an alert
  const handleDeleteAlert = (id: string) => {
    setPriceAlerts((prev) => prev.filter((a) => a.id !== id));
    showToast('Price alert deleted', 'info');
  };

  // Remove saved item
  const handleRemoveSaved = (id: string) => {
    setSavedItems((prev) => prev.filter((s) => s.id !== id));
    showToast('Removed from saved items', 'info');
  };

  // Delete history item
  const handleDeleteHistory = (id: string) => {
    setSearchHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const handleClearAllHistory = () => {
    setSearchHistory([]);
    showToast('Search history cleared', 'info');
  };

  const handleCompareProduct = (product: Product) => {
    setSelectedProductForComparison(product);
    setCurrentScreen('comparison');
  };

  const savedIds = savedItems.map((s) => s.product.id);

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#0C0C0C] text-[#0C0C0C] dark:text-[#F5F5F5] flex flex-col antialiased transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        currentScreen={currentScreen}
        onNavigate={(screen) => setCurrentScreen(screen)}
        savedCount={savedItems.length}
        trackingCount={priceAlerts.filter((a) => a.enabled).length}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        isUrduMode={isUrduMode}
        onToggleLanguage={() => setIsUrduMode(!isUrduMode)}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      {/* Guest Banner if not logged in */}
      {(!user || user.isGuest) && currentScreen !== 'home' && (
        <div className="bg-[#F2F4D6] dark:bg-[#2B2F0C] border-b border-indigo-100 dark:border-indigo-900/50 px-4 py-2 text-xs text-[#0C0C0C] dark:text-[#CDD835] flex items-center justify-between">
          <span>
            {isUrduMode
              ? 'Mehmaan Shopper: WhatsApp price alerts ke liye account banayein.'
              : 'Browsing as Guest: Sign in to sync saved items & receive WhatsApp price drop alerts.'}
          </span>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="font-bold underline hover:text-[#262626] dark:hover:text-white ml-2 shrink-0 cursor-pointer"
          >
            Sign In
          </button>
        </div>
      )}

      {/* Demo banner — shown on EVERY screen while demo mode is on, because
          demo mode is the only place sample/seed/mock data can appear. */}
      {demoMode && (
        <div
          role="note"
          className="bg-amber-300 dark:bg-amber-400 text-black px-4 py-2 text-xs font-bold text-center tracking-wide uppercase"
        >
          {isUrduMode
            ? 'Demo data — ye namoonay ki ashya hain, asal listings nahi'
            : 'Demo data — sample products shown, not real listings'}
        </div>
      )}

      {/* Dynamic Screen Content */}
      <main className="flex-1 pb-20 md:pb-8">
          {currentScreen === 'home' && (
            <HomeScreen
              onImageSelected={handleImageSelected}
              onTextSearch={handleTextSearch}
              recentSearches={searchHistory}
              onRerunHistory={handleRerunHistory}
              isUrduMode={isUrduMode}
            />
          )}

          {currentScreen === 'search_loading' && (
            <SearchLoadingScreen
              onComplete={() => setCurrentScreen('results')}
              isUrduMode={isUrduMode}
              progress={localClipProgress}
              progressLabel={clipProgressLabel}
              canComplete={searchReady}
            />
          )}

          {currentScreen === 'results' && (
            <ResultsScreen
              products={currentProducts}
              queryImage={uploadedImage || undefined}
              queryText={searchQueryText}
              savedItemIds={savedIds}
              onToggleSave={handleToggleSave}
              onSelectProduct={(p) => setSelectedProductForDetail(p)}
              onCompareProduct={handleCompareProduct}
              onNewSearch={() => setCurrentScreen('home')}
              isUrduMode={isUrduMode}
              searchError={searchError}
              onRetry={handleRetrySearch}
              sourceStatus={sourceStatus}
            />
          )}

          {currentScreen === 'comparison' && selectedProductForComparison && (
            <ComparisonViewScreen
              selectedProduct={selectedProductForComparison}
              allProducts={currentProducts}
              onBack={() => setCurrentScreen('results')}
              onSelectProduct={(p) => setSelectedProductForDetail(p)}
              onOpenPriceAlert={(p) => setSelectedProductForAlert(p)}
              isUrduMode={isUrduMode}
            />
          )}

          {currentScreen === 'saved' && (
            <SavedItemsScreen
              items={savedItems}
              onRemoveItem={handleRemoveSaved}
              onSelectProduct={(p) => setSelectedProductForDetail(p)}
              onCompareProduct={handleCompareProduct}
              onExplore={() => setCurrentScreen('home')}
              isUrduMode={isUrduMode}
            />
          )}

          {currentScreen === 'tracking' && (
            <PriceTrackingScreen
              alerts={priceAlerts}
              onToggleAlert={handleToggleAlert}
              onDeleteAlert={handleDeleteAlert}
              onSelectProduct={(p) => setSelectedProductForDetail(p)}
              onCompareProduct={handleCompareProduct}
              onExplore={() => setCurrentScreen('home')}
              isUrduMode={isUrduMode}
            />
          )}

          {currentScreen === 'history' && (
            <SearchHistoryScreen
              history={searchHistory}
              onRerunSearch={handleRerunHistory}
              onDeleteItem={handleDeleteHistory}
              onClearAll={handleClearAllHistory}
              onStartSearch={() => setCurrentScreen('home')}
              isUrduMode={isUrduMode}
            />
          )}

          {currentScreen === 'profile' && (
            <ProfileScreen
              user={user}
              onLogout={() => {
                setUser({ id: 'guest', name: 'Guest', email: '', isGuest: true, preferredLanguage: 'en' });
                showToast('Signed out', 'info');
              }}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              isUrduMode={isUrduMode}
              onToggleLanguage={() => setIsUrduMode(!isUrduMode)}
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
            />
          )}

          {currentScreen === 'flutter_handoff' && (
            <FlutterHandoffView />
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav
          currentScreen={currentScreen}
          onNavigate={(screen) => setCurrentScreen(screen)}
          savedCount={savedItems.length}
          trackingCount={priceAlerts.filter((a) => a.enabled).length}
          isUrduMode={isUrduMode}
        />

      {/* Global Modals */}
      {/* 1. Crop & Preview Modal */}
      {uploadedImage && (
        <CropPreviewModal
          isOpen={isCropModalOpen}
          imageSrc={uploadedImage}
          onConfirmCrop={handleConfirmCrop}
          onChangeImage={() => {
            const input = document.querySelector('input[type="file"]') as HTMLInputElement;
            input?.click();
          }}
          onClose={() => setIsCropModalOpen(false)}
          isUrduMode={isUrduMode}
        />
      )}

      {/* 2. Product Detail Modal with 30-day Price Chart */}
      <ProductDetailModal
        product={selectedProductForDetail}
        isOpen={selectedProductForDetail !== null}
        onClose={() => setSelectedProductForDetail(null)}
        isSaved={selectedProductForDetail ? savedIds.includes(selectedProductForDetail.id) : false}
        onToggleSave={handleToggleSave}
        onOpenPriceAlert={(p) => {
          setSelectedProductForDetail(null);
          setSelectedProductForAlert(p);
        }}
        isUrduMode={isUrduMode}
      />

      {/* 3. Price Alert Modal */}
      <PriceAlertModal
        product={selectedProductForAlert}
        isOpen={selectedProductForAlert !== null}
        onClose={() => setSelectedProductForAlert(null)}
        onSetAlert={handleSetAlert}
        isUrduMode={isUrduMode}
      />

      {/* 4. Login / Sign Up Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(loggedUser) => setUser(loggedUser)}
        onContinueGuest={() => {
          setUser({ id: 'guest', name: 'Guest Shopper', email: '', isGuest: true, preferredLanguage: 'en' });
        }}
        isUrduMode={isUrduMode}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ShopSenseApp />
      </ToastProvider>
    </ThemeProvider>
  );
}
