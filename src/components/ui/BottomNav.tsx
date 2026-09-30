import React from 'react';
import { Home, Heart, Bell, History, User as UserIcon } from 'lucide-react';
import { AppScreen } from '../../types';

interface BottomNavProps {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  savedCount: number;
  trackingCount: number;
  isUrduMode: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onNavigate,
  savedCount,
  trackingCount,
  isUrduMode,
}) => {
  const tabs = [
    {
      id: 'home' as AppScreen,
      label: isUrduMode ? 'Home' : 'Home',
      icon: Home,
    },
    {
      id: 'saved' as AppScreen,
      label: isUrduMode ? 'Mehfooz' : 'Saved',
      icon: Heart,
      badge: savedCount,
    },
    {
      id: 'tracking' as AppScreen,
      label: isUrduMode ? 'Alerts' : 'Alerts',
      icon: Bell,
      badge: trackingCount,
    },
    {
      id: 'history' as AppScreen,
      label: isUrduMode ? 'Tareekh' : 'History',
      icon: History,
    },
    {
      id: 'profile' as AppScreen,
      label: isUrduMode ? 'Profile' : 'Profile',
      icon: UserIcon,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#131B2E]/95 backdrop-blur-md border-t border-slate-200 dark:border-[#1E293B] shadow-lg safe-bottom transition-colors">
      <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentScreen === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className="relative flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] transition-colors cursor-pointer select-none"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive
                      ? 'text-[#4F46E5] dark:text-[#818CF8] scale-110 stroke-[2.5]'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                />

                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#F97316] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] font-medium mt-1 leading-none transition-colors ${
                  isActive ? 'text-[#4F46E5] dark:text-[#818CF8] font-bold' : 'text-[#64748B] dark:text-[#94A3B8]'
                }`}
              >
                {tab.label}
              </span>

              {/* Active Dot Marker */}
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#4F46E5] dark:bg-[#818CF8]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
