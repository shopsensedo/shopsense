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
import { searchByImageLocal, searchByTextLocal, parseQuery } from './lib/localSearch';
import { searchLive, searchLiveText, SourceStatus, DescribedImage } from './lib/liveSearch';
import {
  describeImage,
  downscaleToJpeg,
  describeNoticeSeen,
  markDescribeNoticeSeen,
} from './lib/describeImage';
import type { FilterFunnel } from './lib/liveNormalize';
import { preloadClipModels, isClipPreloaded, onPreloadProgress } from './lib/clipEmbed';
import { isDemoMode } from './lib/demoMode';
import {
  isLoggedIn,
  logout as apiLogout,
  validateSession,
  serverSaveItem,
  serverGetSaved,
  serverDeleteSaved,
  serverAddHistory,
  serverGetHistory,
  serverAddAlert,
  serverGetAlerts,
  serverDeleteAlert,
  listingToProduct,
  type ServerAlert as ServerAlertRow,
  type ServerHistoryItem as ServerHistoryRow,
  type ServerListing,
} from './lib/authClient';
import { getCached, setCached, cacheKeyForText, cacheKeyForImage } from './lib/searchCache';
import { ThemeProvider, useTheme } from './lib/theme';
import { Navbar } from './components/ui/Navbar';
import { BottomNav } from './components/ui/BottomNav';
import { HomeScreen } from './components/features/HomeScreen';
import { loadDemoCatalogueFile, demoItemsToProducts } from './lib/demoCatalogue';
import { CropPreviewModal } from './components/features/CropPreviewModal';
import { OutfitItemPicker } from './components/features/OutfitItemPicker';
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
  const [liveSourcesDisabled, setLiveSourcesDisabled] = useState(false);
  const [demoCatalogueName, setDemoCatalogueName] = useState<string | null>(null);
  const [mappedQuery, setMappedQuery] = useState<string | null>(null);
  const [marketplaceQuery, setMarketplaceQuery] = useState<string | null>(null);
  const [priceSort, setPriceSort] = useState<'asc' | 'desc' | null>(null);
  const [cacheInfo, setCacheInfo] = useState<{ at: number } | null>(null);
  /** Results returned by the sources after URL dedupe — the "M" in "Showing N of M". */
  const [totalResults, setTotalResults] = useState<number | null>(null);
  /** Honest per-stage drop counts for the "How results were filtered" line (text search). */
  const [filterFunnel, setFilterFunnel] = useState<FilterFunnel | null>(null);
  const [lastSearch, setLastSearch] = useState<
    { type: 'image'; dataUrl: string } | { type: 'text'; query: string } | null
  >(null);
  /** T2: Gemini description of the photo (null when basic recognition was used). */
  const [imageDescription, setImageDescription] = useState<DescribedImage | null>(null);
  /** T2: true when the describe call failed/missing-key and we fell back. */
  const [describeFallback, setDescribeFallback] = useState(false);
  /** T2: one-time privacy notice while the photo is being described. */
  const [showDescribeNotice, setShowDescribeNotice] = useState(false);

  // User State — production starts as Guest; the fake MOCK_USER is demo-only.
  const [user, setUser] = useState<User | null>(() =>
    demoMode
      ? MOCK_USER
      : { id: 'guest', name: 'Guest', email: '', isGuest: true, preferredLanguage: 'en' },
  );
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // ---- T4: real-account server sync -------------------------------------
  // When signed in, the backend is the source of truth for saved items,
  // alerts and history; localStorage remains the guest/offline store.
  // Merges de-duplicate by listing URL so guest work is never lost.
  const mergeServerSaved = (prev: SavedItem[], rows: ServerListing[]): SavedItem[] => {
    const urls = new Set(prev.map((s) => s.product.platformUrl));
    const mapped: SavedItem[] = rows
      .filter((r) => !urls.has(r.url))
      .map((r) => ({
        id: `server-${r.id}`,
        product: listingToProduct(r),
        savedAt: 'Synced',
        initialPrice: r.price_pkr,
        currentPrice: r.price_pkr,
        priceChange: 0,
      }));
    return [...mapped, ...prev];
  };

  const mergeServerAlerts = (prev: PriceAlert[], rows: ServerAlertRow[]): PriceAlert[] => {
    const keys = new Set(prev.map((a) => `${a.product.platformUrl}|${a.targetPrice}`));
    const mapped: PriceAlert[] = rows
      .filter((r) => !keys.has(`${r.url}|${r.target_pkr}`))
      .map((r) => ({
        id: `alert-server-${r.alert_id}`,
        product: listingToProduct(r),
        targetPrice: r.target_pkr,
        currentPrice: r.price_pkr,
        enabled: r.is_active === 1,
        createdAt: 'Synced',
        notificationsSent: 0,
      }));
    return [...mapped, ...prev];
  };

  const mergeServerHistory = (
    prev: SearchHistoryItem[], rows: ServerHistoryRow[]
  ): SearchHistoryItem[] => {
    const queries = new Set(prev.map((h) => h.queryText));
    const mapped: SearchHistoryItem[] = rows
      .filter((r) => !queries.has(r.query_text))
      .map((r) => ({
        id: `hist-server-${r.id}`,
        queryText: r.query_text,
        timestamp: new Date(r.created_at * 1000).toLocaleDateString(),
        resultsCount: 0,
        category: '',
      }));
    return [...mapped, ...prev];
  };

  const pullServerState = async () => {
    try {
      const [saved, alerts, history] = await Promise.all([
        serverGetSaved(),
        serverGetAlerts(),
        serverGetHistory(),
      ]);
      setSavedItems((prev) => mergeServerSaved(prev, saved));
      setPriceAlerts((prev) => mergeServerAlerts(prev, alerts));
      setSearchHistory((prev) => mergeServerHistory(prev, history));
    } catch {
      // Backend unreachable — local state stands, user stays signed in
      // locally until the token is proven invalid.
    }
  };

  const handleLoginSuccess = (loggedUser: User) => {
    setUser(loggedUser);
    void pullServerState();
  };

  const handleLogout = () => {
    apiLogout();
    setUser({ id: 'guest', name: 'Guest', email: '', isGuest: true, preferredLanguage: 'en' });
    showToast('Signed out', 'info');
  };

  // Restore a previous session on launch (production only).
  useEffect(() => {
    if (demoMode) return;
    let cancelled = false;
    validateSession()
      .then((bu) => {
        if (cancelled || !bu) return;
        setUser({
          id: `backend-${bu.id}`,
          name: bu.name || bu.email.split('@')[0],
          email: bu.email,
          isGuest: false,
          preferredLanguage: 'en',
        });
        void pullServerState();
      })
      .catch(() => {
        // No valid session — stay as guest.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search & Products State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  // Outfit analysis (Phase A): item picker shown before the cropper
  const [isOutfitPickerOpen, setIsOutfitPickerOpen] = useState(false);
  const [outfitItems, setOutfitItems] = useState<import('./lib/describeImage').OutfitItem[]>([]);
  const [outfitGender, setOutfitGender] = useState<'men' | 'women' | null>(null);
  const [outfitLoading, setOutfitLoading] = useState(false);
  const [localClipProgress, setLocalClipProgress] = useState<number | null>(null);
  const [clipProgressLabel, setClipProgressLabel] = useState<string | undefined>(undefined);
  // Background CLIP preload progress (0-100) shown as a small pill on the
  // home screen; null = not started or already done.
  const [modelPreloadPct, setModelPreloadPct] = useState<number | null>(null);
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
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(() => {
    try {
      const raw = localStorage.getItem('shopsense_price_alerts_v1');
      if (raw) return JSON.parse(raw) as PriceAlert[];
    } catch {
      // storage unavailable — fall through to defaults
    }
    return demoMode ? INITIAL_PRICE_ALERTS : [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('shopsense_price_alerts_v1', JSON.stringify(priceAlerts));
    } catch {
      // storage unavailable — session-only behavior, non-fatal
    }
  }, [priceAlerts]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem('shopsense_search_history_v1');
      if (raw) return JSON.parse(raw) as SearchHistoryItem[];
    } catch {
      // storage unavailable — fall through to defaults
    }
    return demoMode ? INITIAL_SEARCH_HISTORY : [];
  });

  useEffect(() => {
    try {
      // Cap at 30 items and drop oversized inline photos (data URLs) so a
      // single huge screenshot can't blow the ~5MB localStorage quota.
      const slim = searchHistory.slice(0, 30).map((h) => ({
        ...h,
        queryImage:
          h.queryImage && h.queryImage.length > 100_000 ? undefined : h.queryImage,
      }));
      localStorage.setItem('shopsense_search_history_v1', JSON.stringify(slim));
    } catch {
      // storage unavailable — session-only behavior, non-fatal
    }
  }, [searchHistory]);

  // Background CLIP preload: start downloading both model towers (vision +
  // text, ~150MB total) during home-page idle time, without blocking the UI.
  // Skipped in demo mode (seed/mock fallbacks don't need the models).
  useEffect(() => {
    if (demoMode) return;
    let cancelled = false;
    const off = onPreloadProgress((f) => {
      if (!cancelled) setModelPreloadPct(f >= 1 ? null : Math.round(f * 100));
    });
    const start = () => {
      if (cancelled) return;
      preloadClipModels().catch(() => {
        // Download failed (offline?) — hide the pill; the next search retries
        // and surfaces the honest error.
        if (!cancelled) setModelPreloadPct(null);
      });
    };
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId: number | undefined;
    let timer: number | undefined;
    if (typeof w.requestIdleCallback === 'function') {
      idleId = w.requestIdleCallback(start, { timeout: 5000 });
    } else {
      timer = window.setTimeout(start, 1500);
    }
    return () => {
      cancelled = true;
      off();
      if (idleId !== undefined) w.cancelIdleCallback?.(idleId);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [demoMode]);

  // Handle image selected for upload
  const handleImageSelected = async (imageDataUrl: string, sourceName?: string) => {
    setUploadedImage(imageDataUrl);
    setSearchQueryText(sourceName || (isUrduMode ? 'Screenshot se talash' : 'Visual Search Query'));

    // Outfit flow (Phase A, behind flag): analyse the outfit first. If a
    // person with items is detected, show the item picker; otherwise fall
    // through to the cropper. Skip logic: 0 items or 1 item covering >50%
    // of the frame → skip the picker.
    const { isOutfitEnabled, describeOutfit, downscaleToJpeg } = await import('./lib/describeImage');
    if (isOutfitEnabled()) {
      setOutfitLoading(true);
      try {
        const jpeg = await downscaleToJpeg(imageDataUrl, 768);
        const r = await describeOutfit(jpeg);
        if (r.ok && r.outfit.photoType === 'person' && r.outfit.items.length > 0) {
          const items = r.outfit.items.slice(0, 5); // cap at 5 per Claude
          // Skip if single item covers >50% of frame
          if (items.length === 1 && items[0].box) {
            const b = items[0].box;
            const coverage = (b.width * b.height) / (1000 * 1000);
            if (coverage > 0.5) {
              setIsCropModalOpen(true); // single dominant item → straight to cropper
              return;
            }
          }
          setOutfitItems(items);
          setOutfitGender(r.outfit.apparentGender);
          setIsOutfitPickerOpen(true);
          return;
        }
      } catch {
        // fall through to cropper on any error
      } finally {
        setOutfitLoading(false);
      }
    }
    setIsCropModalOpen(true);
  };

  /**
   * Outfit picker: "Find this" — search for the tapped item using its own
   * queries. Crops to the item's box (with padding) when available, so the
   * visual search focuses on that item.
   */
  const handleOutfitFindItem = async (item: import('./lib/describeImage').OutfitItem) => {
    setIsOutfitPickerOpen(false);
    if (!uploadedImage) return;
    // Crop to the item's box with 12% padding when we have one
    let searchImage = uploadedImage;
    if (item.box) {
      try {
        searchImage = await cropToBox(uploadedImage, item.box, 0.12);
      } catch {
        // fall back to full image
      }
    }
    // Inject the item's queries as the description (skip describe-image call)
    // by stashing them for handleConfirmCrop to pick up.
    (window as any).__outfitItemQueries = {
      category: item.type,
      product_type: item.type,
      brand: item.brand,
      queries: item.queries,
    };
    (window as any).__outfitGender = outfitGender;
    handleConfirmCrop(searchImage);
  };

  /** Outfit picker: "Adjust" — open the cropper pre-snapped to the item's box. */
  const handleOutfitAdjustItem = (item: import('./lib/describeImage').OutfitItem) => {
    setIsOutfitPickerOpen(false);
    // Stash the box for CropPreviewModal to pick up as initial crop
    (window as any).__outfitInitialBox = item.box ?? null;
    (window as any).__outfitItemQueries = {
      category: item.type,
      product_type: item.type,
      brand: item.brand,
      queries: item.queries,
    };
    setIsCropModalOpen(true);
  };

  /** Outfit picker: skip → search the whole photo. */
  const handleOutfitSkipAll = () => {
    setIsOutfitPickerOpen(false);
    setIsCropModalOpen(true);
  };

  /**
   * Crop a data-URL image to a normalized 0-1000 box with padding fraction.
   * Returns a JPEG data URL. Pads with white, never black.
   */
  async function cropToBox(
    dataUrl: string,
    box: { x: number; y: number; width: number; height: number },
    paddingFrac: number,
  ): Promise<string> {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('decode failed'));
      img.src = dataUrl;
    });
    const px = (box.x / 1000) * img.width;
    const py = (box.y / 1000) * img.height;
    const pw = (box.width / 1000) * img.width;
    const ph = (box.height / 1000) * img.height;
    const padX = pw * paddingFrac;
    const padY = ph * paddingFrac;
    const sx = Math.max(0, px - padX);
    const sy = Math.max(0, py - padY);
    const sw = Math.min(img.width - sx, pw + padX * 2);
    const sh = Math.min(img.height - sy, ph + padY * 2);
    // Enforce minimum 224px on short side (upscale)
    const scale = Math.max(1, 224 / Math.min(sw, sh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  // If the user starts a search before the background preload finished, wait
  // for the models (showing the honest label) instead of starting a second
  // download — the search runs automatically when they are ready.
  const waitForModelsIfNeeded = async () => {
    if (isClipPreloaded()) return;
    setLocalClipProgress(0);
    setClipProgressLabel(
      isUrduMode
        ? 'AI model abhi load ho raha hai, search khud shuru ho jayegi…'
        : 'AI model is still loading, your search will start automatically…',
    );
    try {
      await preloadClipModels();
    } catch {
      // fall through — the pipeline below surfaces the honest error
    }
  };

  // Confirm crop and execute visual search.
  // Production: backend (local dev) → LIVE pipeline. Any failure shows an
  // honest error — NEVER sample/seed/mock data. Demo mode (?demo=1) additionally
  // falls back to the seed catalog and then the mock catalog, under a banner.
  const handleConfirmCrop = async (croppedDataUrl: string, forceRefresh = false) => {
    setIsCropModalOpen(false);
    setSearchReady(false);
    setSearchError(null);
    setSourceStatus(null);
    setMappedQuery(null);
    setMarketplaceQuery(null);
    setImageDescription(null);
    setDescribeFallback(false);
    setShowDescribeNotice(false);
    setCurrentScreen('search_loading');
    setCacheInfo(null);
    setTotalResults(null); // image search has no relevance floor — M = shown
    setFilterFunnel(null); // image search has no text funnel

    // Served-from-cache path: key is the SHA-256 of the downscaled image.
    if (!demoMode && !forceRefresh) {
      try {
        const hit = await getCached(await cacheKeyForImage(croppedDataUrl));
        if (hit && hit.products.length > 0) {
          setSearchError(null);
          setCurrentProducts(hit.products);
          setDemoCatalogueName(null);
          setSourceStatus(hit.sources ?? null);
          setLastSearch({ type: 'image', dataUrl: croppedDataUrl });
          setCacheInfo({ at: hit.at });
          // Restore the honest description/fallback chip for cached results.
          setImageDescription(hit.described ?? null);
          setDescribeFallback(hit.describeFallback ?? false);
          setSearchReady(true);
          return;
        }
      } catch {
        // hashing failed — fall through to the live pipeline
      }
    }

    let matchedProducts: Product[] | null = null;
    let detectedCat = 'Footwear';
    let freshSources: SourceStatus | null = null;
    // T2 description hoisted so the cache write below can persist it.
    let described: DescribedImage | null = null;

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
        //
        // T2: first ask /api/describe-image (Gemini Flash) to describe the
        // downscaled photo. Any failure (no key, timeout, bad output) falls
        // back to the on-device 80-category classification below.
        described = null;
        try {
          const jpeg = await downscaleToJpeg(croppedDataUrl, 768);
          // Enter determinate progress BEFORE the describe request: the
          // privacy notice only renders in the determinate branch, and the
          // request takes long enough for it to paint.
          setLocalClipProgress(0);
          if (!describeNoticeSeen()) {
            setShowDescribeNotice(true);
            markDescribeNoticeSeen();
          }
          setClipProgressLabel(
            isUrduMode ? 'Tasveer samjhi ja rahi hai…' : 'Understanding your photo…',
          );
          // Outfit flow: if the user picked an item in the outfit picker, its
          // queries are stashed — use them directly instead of describe-image.
          const stashed = (window as any).__outfitItemQueries as {
            category: string; product_type: string; brand: string | null; queries: string[];
          } | undefined;
          if (stashed && Array.isArray(stashed.queries) && stashed.queries.length > 0) {
            described = {
              category: stashed.category,
              product_type: stashed.product_type,
              brand: stashed.brand,
              queries: stashed.queries,
            };
            setImageDescription(described);
            (window as any).__outfitItemQueries = undefined;
            // Feed the outfit's apparent gender into the gender filter
            const og = (window as any).__outfitGender as 'men' | 'women' | null;
            if (og) (window as any).__outfitGenderPref = og;
            (window as any).__outfitGender = undefined;
          } else {
            const d = await describeImage(jpeg);
            if (d.ok) {
              described = {
                category: d.description.category,
                product_type: d.description.product_type,
                brand: d.description.brand,
                queries: d.description.queries,
              };
              setImageDescription(described);
            } else {
              setDescribeFallback(true);
            }
          }
        } catch {
          setDescribeFallback(true); // downscale/describe blew up — basic recognition
        } finally {
          setShowDescribeNotice(false);
        }
        await waitForModelsIfNeeded();
        setLocalClipProgress(0);
        const live = await searchLive(
          croppedDataUrl,
          (p) => {
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
          },
          described,
          // Outfit flow: gender from the outfit's apparentGender (clothing-based)
          (window as any).__outfitGenderPref as 'men' | 'women' | undefined,
        );
        (window as any).__outfitGenderPref = undefined;
        // Always surface what each source did — even when it failed.
        setSourceStatus(live.sources);
        setLiveSourcesDisabled(!!live.liveSourcesDisabled);
        freshSources = live.sources;
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
    setDemoCatalogueName(null);
    setLastSearch({ type: 'image', dataUrl: croppedDataUrl });
    if (!demoMode) {
      try {
        await setCached({
          key: await cacheKeyForImage(croppedDataUrl),
          at: Date.now(),
          products: matchedProducts,
          category: detectedCat,
          sources: freshSources,
          described,
          describeFallback,
        });
      } catch {
        // cache write failed — results are still shown, non-fatal
      }
    }

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
    // T4: write-through to the account when signed in.
    if (isLoggedIn() && historyItem.queryText) {
      serverAddHistory(historyItem.queryText).catch(() => {
        // offline — local copy stands
      });
    }

    // Products are set; the loading screen (staged animation) hands off to results.
    setSearchReady(true);
  };

  // Handle text-based search (supports Roman Urdu e.g. "kala joota").
  // Production: backend (local dev) only — no live text pipeline yet, and
  // NEVER seed/mock fallbacks. Any failure shows an honest error.
  // Demo mode (?demo=1) keeps the seed + mock fallbacks, under a banner.
  const handleTextSearch = async (query: string, forceRefresh = false) => {
    setSearchQueryText(query);
    setSearchReady(false);
    setSearchError(null);
    setSourceStatus(null);
    setMappedQuery(null);
    setMarketplaceQuery(null);
    setPriceSort(null);
    setCurrentScreen('search_loading');
    setCacheInfo(null);
    setTotalResults(null);
    setFilterFunnel(null);

    // Served-from-cache path: skip the live pipeline entirely.
    if (!demoMode && !forceRefresh) {
      const { keywords, priceIntent } = parseQuery(query);
      const hit = await getCached(cacheKeyForText(keywords.join(' '), priceIntent));
      if (hit && hit.products.length > 0) {
        setSearchError(null);
        setCurrentProducts(hit.products);
        setSourceStatus(hit.sources ?? null);
        setMappedQuery(hit.mappedQuery ?? null);
        setMarketplaceQuery(hit.marketplaceQuery ?? null);
        setPriceSort(hit.priceSort ?? null);
        setTotalResults(hit.totalCandidates ?? hit.products.length);
        setFilterFunnel(hit.funnel ?? null);
        setCacheInfo({ at: hit.at });
        setLastSearch({ type: 'text', query });
        setSearchReady(true);
        return;
      }
    }

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
      matched = null; // backend unreachable — try the live pipeline
    }

    if (!matched) {
      try {
        // LIVE text pipeline: Roman Urdu -> English keywords -> REAL listings
        // from PriceOye + Daraz -> CLIP text-to-image ranking over thumbnails.
        // No mock data in this path; source failures are reported, not hidden.
        await waitForModelsIfNeeded();
        setLocalClipProgress(0);
        setMappedQuery(null);
        const live = await searchLiveText(query, (p) => {
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
        setLiveSourcesDisabled(!!live.liveSourcesDisabled);
        setMappedQuery(live.mappedQuery);
        setMarketplaceQuery(live.marketplaceQuery);
        setPriceSort(live.priceSort);
        setTotalResults(live.totalCandidates);
        setFilterFunnel(live.funnel);
        if (live.products.length > 0) {
          matched = live.products;
          cat = live.category || 'General';
          queryImage = live.products[0].imageUrl;
          if (!demoMode) {
            const { keywords, priceIntent } = parseQuery(query);
            await setCached({
              key: cacheKeyForText(keywords.join(' '), priceIntent),
              at: Date.now(),
              products: live.products,
              mappedQuery: live.mappedQuery,
              marketplaceQuery: live.marketplaceQuery,
              priceSort: live.priceSort,
              category: live.category,
              sources: live.sources,
              totalCandidates: live.totalCandidates,
              funnel: live.funnel,
            });
          }
        } else {
          matched = null;
        }
      } catch {
        matched = null; // live failed (e.g. model load) — demo fallbacks / honest error below
      } finally {
        setLocalClipProgress(null);
        setClipProgressLabel(undefined);
      }
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
    // T4: write-through to the account when signed in.
    if (isLoggedIn() && query.trim()) {
      serverAddHistory(query.trim()).catch(() => {
        // offline — local copy stands
      });
    }
    setLastSearch({ type: 'text', query });

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
      const existing = savedItems.find((s) => s.product.id === product.id);
      setSavedItems((prev) => prev.filter((s) => s.product.id !== product.id));
      // T4: write-through to the account when signed in.
      if (existing && isLoggedIn() && existing.id.startsWith('server-')) {
        const listingId = Number(existing.id.replace('server-', ''));
        if (Number.isFinite(listingId)) {
          serverDeleteSaved(listingId).catch(() => {
            // offline — local removal stands
          });
        }
      }
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
      // T4: write-through to the account when signed in; adopt the server id.
      if (isLoggedIn()) {
        serverSaveItem(product)
          .then((srv) => {
            setSavedItems((prev) =>
              prev.map((s) =>
                s.id === newSavedItem.id ? { ...s, id: `server-${srv.id}` } : s
              )
            );
          })
          .catch(() => {
            // offline — local copy stands
          });
      }
      showToast('Saved to your wishlist! We will track its price.', 'success');
    }
  };

  // Handle adding a price alert
  const handleSetAlert = (product: Product, targetPrice: number, channel = 'whatsapp', contact = '') => {
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
    // T4: write-through to the account when signed in; adopt the server id.
    if (isLoggedIn() && contact.trim()) {
      serverAddAlert(product, targetPrice, channel, contact.trim())
        .then((srv) => {
          setPriceAlerts((prev) =>
            prev.map((a) =>
              a.id === newAlert.id ? { ...a, id: `alert-server-${srv.alert_id}` } : a
            )
          );
        })
        .catch(() => {
          // offline — local copy stands
        });
    }
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
    // T4: write-through to the account when signed in.
    if (isLoggedIn() && id.startsWith('alert-server-')) {
      const alertId = Number(id.replace('alert-server-', ''));
      if (Number.isFinite(alertId)) {
        serverDeleteAlert(alertId).catch(() => {
          // offline — local removal stands
        });
      }
    }
    showToast('Price alert deleted', 'info');
  };

  // Remove saved item
  const handleRemoveSaved = (id: string) => {
    setSavedItems((prev) => prev.filter((s) => s.id !== id));
    // T4: write-through to the account when signed in.
    if (isLoggedIn() && id.startsWith('server-')) {
      const listingId = Number(id.replace('server-', ''));
      if (Number.isFinite(listingId)) {
        serverDeleteSaved(listingId).catch(() => {
          // offline — local removal stands
        });
      }
    }
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
            <>
            <HomeScreen
              onImageSelected={handleImageSelected}
              onTextSearch={handleTextSearch}
              recentSearches={searchHistory}
              onRerunHistory={handleRerunHistory}
              isUrduMode={isUrduMode}
              modelPreloadPct={modelPreloadPct}
            />
            {/* R9: demo catalogue loader — hand-curated JSON, never mixed with live */}
            <div className="px-4 pb-8 text-center">
              <label className="text-xs text-smoke dark:text-fog underline cursor-pointer">
                Load demo catalogue (JSON)
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const cat = await loadDemoCatalogueFile(f);
                      setCurrentProducts(demoItemsToProducts(cat));
                      setDemoCatalogueName(cat.name);
                      setSourceStatus(null);
                      setCurrentScreen('results');
                    } catch (err) {
                      alert(`Could not load demo catalogue: ${(err as Error).message}`);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            </>
          )}

          {currentScreen === 'search_loading' && (
            <SearchLoadingScreen
              onComplete={() => setCurrentScreen('results')}
              isUrduMode={isUrduMode}
              progress={localClipProgress}
              progressLabel={clipProgressLabel}
              canComplete={searchReady}
              showPrivacyNotice={showDescribeNotice}
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
              liveSourcesDisabled={liveSourcesDisabled}
              demoCatalogueName={demoCatalogueName}
              mappedQuery={mappedQuery}
              marketplaceQuery={marketplaceQuery}
              priceSort={priceSort}
              searchKind={lastSearch?.type === 'text' ? 'text' : 'image'}
              cacheAt={cacheInfo?.at ?? null}
              totalResults={totalResults}
              filterFunnel={filterFunnel}
              onRefresh={() => {
                if (lastSearch?.type === 'text') handleTextSearch(lastSearch.query, true);
                else if (lastSearch?.type === 'image')
                  handleConfirmCrop(lastSearch.dataUrl, true);
              }}
              imageDescription={imageDescription}
              describeFallback={describeFallback}
              onDescribeEdit={(text) => handleTextSearch(text)}
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
              onLogout={handleLogout}
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

      {/* 1b. Outfit Item Picker (Phase A) — shown before the cropper when a
          person with items is detected and the outfit flag is on */}
      {uploadedImage && (
        <OutfitItemPicker
          isOpen={isOutfitPickerOpen}
          imageSrc={uploadedImage}
          items={outfitItems}
          apparentGender={outfitGender}
          isUrduMode={isUrduMode}
          onFindItem={handleOutfitFindItem}
          onAdjustItem={handleOutfitAdjustItem}
          onClose={() => setIsOutfitPickerOpen(false)}
          onSkipAll={handleOutfitSkipAll}
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
        onLoginSuccess={handleLoginSuccess}
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
