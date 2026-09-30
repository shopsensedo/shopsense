import React from 'react';
import { Camera, Heart, Bell, History, User as UserIcon, Globe, Sun, Moon } from 'lucide-react';
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
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#131B2E]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#1E293B] shadow-2xs transition-colors">
      {/* Strict Top Bar Contract: 3 zones */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 cursor-pointer text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white shadow-xs">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] font-heading group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition-colors">
              ShopSense
            </span>
          </button>
        </div>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors py-1 relative ${
              currentScreen === 'home' || currentScreen === 'results' || currentScreen === 'comparison'
                ? 'text-[#4F46E5] dark:text-[#818CF8] font-semibold'
                : ''
            }`}
          >
            {isUrduMode ? 'Home' : 'Explore'}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('saved')}
            className={`hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors py-1 flex items-center gap-1.5 ${
              currentScreen === 'saved' ? 'text-[#4F46E5] dark:text-[#818CF8] font-semibold' : ''
            }`}
          >
            <span>{isUrduMode ? 'Mehfooz' : 'Saved'}</span>
            {savedCount > 0 && (
              <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#A5B4FC]">
                {savedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('tracking')}
            className={`hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors py-1 flex items-center gap-1.5 ${
              currentScreen === 'tracking' ? 'text-[#4F46E5] dark:text-[#818CF8] font-semibold' : ''
            }`}
          >
            <span>{isUrduMode ? 'Qeemat Alerts' : 'Price Alerts'}</span>
            {trackingCount > 0 && (
              <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-[#FFF7ED] dark:bg-[#431407] text-[#F97316] dark:text-[#FB923C]">
                {trackingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('history')}
            className={`hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors py-1 ${
              currentScreen === 'history' ? 'text-[#4F46E5] dark:text-[#818CF8] font-semibold' : ''
            }`}
          >
            {isUrduMode ? 'Tareekh' : 'History'}
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions + theme & language toggles */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle (Light / Dark) */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="h-9 w-9 rounded-lg border border-slate-200 dark:border-[#283548] hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1E293B] flex items-center justify-center transition-colors cursor-pointer"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-[#F59E0B]" /> : <Moon className="w-4 h-4 text-[#4F46E5]" />}
            </button>
          )}

          {/* Language Toggle: English <-> Roman Urdu */}
          <button
            type="button"
            onClick={onToggleLanguage}
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-[#283548] hover:border-slate-300 dark:hover:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1E293B] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Toggle between English and Roman Urdu"
          >
            <Globe className="w-3.5 h-3.5 text-[#4F46E5] dark:text-[#818CF8]" />
            <span className="hidden sm:inline">{isUrduMode ? 'Roman Urdu' : 'English'}</span>
            <span className="sm:hidden">{isUrduMode ? 'اردو' : 'EN'}</span>
          </button>

          {/* User Account / Profile */}
          {user && !user.isGuest ? (
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="flex items-center gap-2 p-1 pl-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
            >
              <span className="hidden sm:inline text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate max-w-[100px]">
                {user.name.split(' ')[0]}
              </span>
              <div className="w-8 h-8 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                {user.name.charAt(0)}
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="h-9 px-3.5 rounded-lg bg-[#4F46E5] hover:bg-[#3730A3] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs min-h-[36px]"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>{isUrduMode ? 'Dakhil Hon' : 'Sign In'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

