"use client";

import { Home, TrendingUp, TrendingDown, Settings } from 'lucide-react';

export type NavItem = 'home' | 'income' | 'expense' | 'settings';

export function BottomNav({ active, onNavigate }: {
  active: NavItem;
  onNavigate: (item: NavItem) => void;
}) {
  const navItems = [
    { id: 'home' as NavItem, icon: Home, label: 'Ana Sayfa' },
    { id: 'income' as NavItem, icon: TrendingUp, label: 'Gelir' },
    { id: 'expense' as NavItem, icon: TrendingDown, label: 'Gider' },
    { id: 'settings' as NavItem, icon: Settings, label: 'Ayarlar' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-800 safe-area-inset-bottom">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="flex flex-col items-center gap-1 transition-colors"
              >
                <Icon
                  className={`w-6 h-6 transition-colors ${
                    isActive ? 'text-emerald-500' : 'text-zinc-500'
                  }`}
                />
                <span
                  className={`text-xs transition-colors ${
                    isActive ? 'text-emerald-500 font-semibold' : 'text-zinc-500'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
