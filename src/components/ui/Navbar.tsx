import React, { useState } from 'react';
import { Camera, Heart, Globe, Sun, Moon, Menu, X, LayoutGrid } from 'lucide-react';
import { AppScreen, User } from '../../types';

interface NavbarProps {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  savedCount: number;
  trackingCount: number;
  user: User | null;
  onOpenAuth: () => void;
  isUrduMode: boolean;
  onToggleLanguage: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  savedCount,
  trackingCount,
  user,
  onOpenAuth,
  isUrduMode,
  onToggleLanguage,
  isDarkMode = false,
  onToggleTheme,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const isExploreActive = currentScreen === 'home' || currentScreen === 'results' || currentScreen === 'comparison';

  // Desktop tab pills: the lime "active circle" transfers to whichever tab is active.
  const tabCls = (active: boolean) =>
    `h-10 px-5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
      active
        ? 'bg-lime text-void shadow-[0_4px_16px_-4px_rgba(185,192,6,0.6)]'
        : 'text-smoke dark:text-fog hover:text-void dark:hover:text-bone'
    }`;

  // Count badges must stay readable when their parent pill turns lime.
  const badgeCls = (active: boolean) =>
    `text-[11px] font-bold px-1.5 py-px rounded-full ${active ? 'bg-void text-lime' : 'bg-lime text-void'}`;

  const mobileLinks: { id: AppScreen; label: string }[] = [
    { id: 'home', label: isUrduMode ? 'Home' : 'Explore' },
    { id: 'saved', label: isUrduMode ? 'Mehfooz' : 'Saved' },
    { id: 'tracking', label: isUrduMode ? 'Qeemat Alerts' : 'Price Alerts' },
    { id: 'history', label: isUrduMode ? 'Tareekh' : 'History' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-void/90 backdrop-blur-md border-b border-[#E5E5E1] dark:border-graphite transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-[72px] flex items-center justify-between gap-3">
        {/* Brand */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 cursor-pointer text-left group shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-lime flex items-center justify-center shadow-[0_4px_16px_-4px_rgba(185,192,6,0.6)] group-hover:scale-105 transition-transform">
            <Camera className="w-5 h-5 text-void" strokeWidth={2.25} />
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-wide text-void dark:text-bone font-heading">
            ShopSense
          </span>
        </button>

        {/* Desktop nav — Protech style: pill tabs, lime active pill transfers to the active tab */}
        <nav className="hidden md:flex items-center gap-2" aria-label="Primary">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`h-10 px-5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              isExploreActive
                ? 'bg-lime text-void shadow-[0_4px_16px_-4px_rgba(185,192,6,0.6)]'
                : 'bg-void text-white hover:bg-graphite dark:bg-graphite dark:text-bone dark:hover:bg-ash'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            {isUrduMode ? 'Catalog' : 'Catalog'}
          </button>

          <button type="button" onClick={() => onNavigate('saved')} className={tabCls(currentScreen === 'saved')}>
            <span className="flex items-center gap-1.5">
              {isUrduMode ? 'Mehfooz' : 'Saved'}
              {savedCount > 0 && (
                <span className={badgeCls(currentScreen === 'saved')}>
                  {savedCount}
                </span>
              )}
            </span>
          </button>

          <button type="button" onClick={() => onNavigate('tracking')} className={tabCls(currentScreen === 'tracking')}>
            <span className="flex items-center gap-1.5">
              {isUrduMode ? 'Qeemat Alerts' : 'Price Alerts'}
              {trackingCount > 0 && (
                <span className={badgeCls(currentScreen === 'tracking')}>
                  {trackingCount}
                </span>
              )}
            </span>
          </button>

          <button type="button" onClick={() => onNavigate('history')} className={tabCls(currentScreen === 'history')}>
            {isUrduMode ? 'Tareekh' : 'History'}
          </button>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Saved shortcut — hidden on mobile (BottomNav already has Saved with badge) */}
          <button
            type="button"
            onClick={() => onNavigate('saved')}
            className="relative hidden md:flex h-10 w-10 rounded-full border border-[#E5E5E1] dark:border-ash hover:border-void dark:hover:border-lime text-void dark:text-bone items-center justify-center transition-colors cursor-pointer"
            title={isUrduMode ? 'Mehfooz ashya' : 'Saved items'}
            aria-label="Saved items"
          >
            <Heart className="w-[18px] h-[18px]" />
            {savedCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-lime text-void text-[10px] font-bold flex items-center justify-center">
                {savedCount}
              </span>
            )}
          </button>

          {/* Theme toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="h-10 w-10 rounded-full border border-[#E5E5E1] dark:border-ash hover:border-void dark:hover:border-lime text-void dark:text-bone flex items-center justify-center transition-colors cursor-pointer"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-[18px] h-[18px] text-lime" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
          )}

          {/* Language toggle */}
          <button
            type="button"
            onClick={onToggleLanguage}
            className="h-10 px-2.5 sm:px-3.5 rounded-full border border-[#E5E5E1] dark:border-ash hover:border-void dark:hover:border-lime text-xs font-semibold text-void dark:text-bone flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Toggle between English and Roman Urdu"
          >
            <Globe className="w-3.5 h-3.5 text-olive dark:text-lime" />
            <span className="hidden sm:inline">{isUrduMode ? 'Roman Urdu' : 'English'}</span>
            <span className="sm:hidden">{isUrduMode ? 'اردو' : 'EN'}</span>
          </button>

          {/* Auth */}
          {user && !user.isGuest ? (
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="hidden sm:flex items-center gap-2 h-10 pl-3 pr-1.5 rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <span className="text-xs font-semibold text-void dark:text-bone truncate max-w-[90px]">
                {user.name.split(' ')[0]}
              </span>
              <div className="w-8 h-8 rounded-full bg-lime text-void flex items-center justify-center text-xs font-bold">
                {user.name.charAt(0)}
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="hidden sm:inline-flex h-10 px-5 rounded-full bg-void hover:bg-graphite dark:bg-lime dark:hover:bg-limedeep text-white dark:text-void text-xs font-bold items-center transition-colors cursor-pointer"
            >
              {isUrduMode ? 'Dakhil Hon' : 'Sign In'}
            </button>
          )}

          {/* Mobile menu */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden h-10 w-10 rounded-full border border-[#E5E5E1] dark:border-ash text-void dark:text-bone flex items-center justify-center cursor-pointer"
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <nav className="md:hidden border-t border-[#E5E5E1] dark:border-graphite bg-white dark:bg-void px-4 py-3 flex flex-col gap-1 animate-fade-in">
          {mobileLinks.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                onNavigate(l.id);
                setMenuOpen(false);
              }}
              className={`text-left px-4 py-2.5 rounded-full text-sm font-medium cursor-pointer ${
                currentScreen === l.id
                  ? 'bg-lime text-void font-semibold'
                  : 'text-smoke dark:text-fog hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
              }`}
            >
              {l.label}
            </button>
          ))}
          {!user || user.isGuest ? (
            <button
              type="button"
              onClick={() => {
                onOpenAuth();
                setMenuOpen(false);
              }}
              className="sm:hidden mt-1 h-11 rounded-full bg-void dark:bg-lime text-white dark:text-void text-sm font-bold cursor-pointer"
            >
              {isUrduMode ? 'Dakhil Hon' : 'Sign In'}
            </button>
          ) : null}
        </nav>
      )}
    </header>
  );
};
