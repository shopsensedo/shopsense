import React, { useState } from 'react';
import { User as UserIcon, Globe, Bell, Moon, Sun, LogOut, Shield, MessageSquare, Phone } from 'lucide-react';
import { User } from '../../types';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

interface ProfileScreenProps {
  user: User | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  isUrduMode: boolean;
  onToggleLanguage: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onLogout,
  onOpenAuth,
  isUrduMode,
  onToggleLanguage,
  isDarkMode,
  onToggleTheme,
}) => {
  const { showToast } = useToast();
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 animate-fade-in">
      {/* Account Info Header */}
      <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-slate-200 dark:border-[#262626] p-5 sm:p-6 mb-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#0C0C0C] text-white flex items-center justify-center text-xl font-bold font-heading shadow-xs">
            {user && !user.isGuest ? user.name.charAt(0) : 'G'}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#0C0C0C] dark:text-[#F5F5F5] font-heading">
                {user && !user.isGuest ? user.name : 'Guest Shopper'}
              </h2>
              {user && !user.isGuest ? (
                <span className="text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  Demo account
                </span>
              ) : (
                <span className="text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  Guest
                </span>
              )}
            </div>

            <p className="text-xs text-[#5F5F60] dark:text-[#9C9C9D] mt-0.5">
              {user && !user.isGuest ? user.email || user.phone : 'Sign in to save items across mobile & web'}
            </p>
            {user && !user.isGuest && (
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mt-2">
                {isUrduMode
                  ? 'Demo sign-in sirf — asal accounts abhi nahi hain.'
                  : 'Demo sign-in only. No real accounts yet.'}
              </p>
            )}
          </div>
        </div>

        {user && !user.isGuest ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            leftIcon={<LogOut className="w-4 h-4 text-slate-500" />}
          >
            {isUrduMode ? 'Sign Out' : 'Sign Out'}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenAuth}
          >
            {isUrduMode ? 'Sign In / Register' : 'Sign In / Register'}
          </Button>
        )}
      </div>

      {/* Settings Sections */}
      <div className="space-y-4">
        {/* Theme Preference */}
        <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-slate-200 dark:border-[#262626] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-[#2B2F0C] text-amber-600 dark:text-amber-400 flex items-center justify-center">
                {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0C0C0C] dark:text-[#F5F5F5]">Theme Appearance</h3>
                <p className="text-xs text-[#5F5F60] dark:text-[#9C9C9D]">Switch between Pearl Light (#F5F5F5) & Void Dark (#0C0C0C) — lime accent</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#333333] hover:border-slate-300 dark:hover:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#262626] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
              <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
          </div>
        </div>

        {/* Language Selection Card */}
        <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-slate-200 dark:border-[#262626] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F2F4D6] dark:bg-[#2B2F0C] text-[#0C0C0C] dark:text-[#B9C006] flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0C0C0C] dark:text-[#F5F5F5]">Display Language</h3>
                <p className="text-xs text-[#5F5F60] dark:text-[#9C9C9D]">Switch UI labels between English and Roman Urdu</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleLanguage}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#333333] hover:border-[#0C0C0C] text-xs font-semibold text-[#0C0C0C] dark:text-[#CDD835] bg-[#F2F4D6] dark:bg-[#2B2F0C] transition-colors cursor-pointer"
            >
              {isUrduMode ? 'Roman Urdu (اردو)' : 'English (Default)'}
            </button>
          </div>
        </div>

        {/* Notifications & WhatsApp Alerts */}
        <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-slate-200 dark:border-[#262626] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-[#052E16] text-emerald-600 dark:text-[#4ADE80] flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0C0C0C] dark:text-[#F5F5F5]">Price Drop Notifications</h3>
              <p className="text-xs text-[#5F5F60] dark:text-[#9C9C9D]">How you receive alerts when tracked items drop in PKR</p>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-[#262626]">
            <div>
              <span className="text-xs font-semibold text-[#0C0C0C] dark:text-[#F5F5F5] block">WhatsApp Price Drop Alerts</span>
              <span className="text-[11px] text-[#5F5F60] dark:text-[#9C9C9D]">Receive instant WhatsApp message when price drops</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={whatsappAlerts}
                onChange={() => setWhatsappAlerts(!whatsappAlerts)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#16A34A]" />
            </label>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-[#262626]">
            <div>
              <span className="text-xs font-semibold text-[#0C0C0C] dark:text-[#F5F5F5] block">Daily Pakistani Deals Digest</span>
              <span className="text-[11px] text-[#5F5F60] dark:text-[#9C9C9D]">Top 5 discounts on Daraz & Telemart every morning</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={dailyDigest}
                onChange={() => setDailyDigest(!dailyDigest)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0C0C0C]" />
            </label>
          </div>
        </div>

        {/* Support & Privacy */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#262626] text-xs text-[#5F5F60] dark:text-[#9C9C9D] flex items-center gap-3">
          <Shield className="w-5 h-5 text-[#0C0C0C] dark:text-[#B9C006] shrink-0" />
          <p>
            ShopSense Pakistan respects your privacy. We do not store your private WhatsApp chats. Uploaded screenshots are processed strictly for visual product comparison.
          </p>
        </div>
      </div>
    </div>
  );
};
