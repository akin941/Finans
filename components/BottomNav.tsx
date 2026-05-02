"use client";

import { Home, TrendingUp, TrendingDown, Settings, Mic, Loader2 } from 'lucide-react';

export type NavItem = 'home' | 'income' | 'expense' | 'settings';

export function BottomNav({ active, onNavigate, onVoiceClick, voiceState = 'idle' }: {
  active: NavItem;
  onNavigate: (item: NavItem) => void;
  onVoiceClick?: () => void;
  voiceState?: 'idle' | 'recording' | 'processing';
}) {
  const navItems = [
    { id: 'home' as NavItem, icon: Home, label: 'Ana Sayfa' },
    { id: 'income' as NavItem, icon: TrendingUp, label: 'Gelir' },
    { id: 'expense' as NavItem, icon: TrendingDown, label: 'Gider' },
    { id: 'settings' as NavItem, icon: Settings, label: 'Ayarlar' },
  ];

  return (
    <>
      {/* Floating Mic Button (Premium Fintech Style) */}
      <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-[60]">
        <button
          onClick={onVoiceClick}
          disabled={voiceState === 'processing'}
          className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(16,185,129,0.25)] transition-all active:scale-95 border-[3px] border-zinc-950 ${
            voiceState === 'recording' ? 'bg-red-500' : 
            voiceState === 'processing' ? 'bg-zinc-800' : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          {voiceState === 'recording' && (
            <>
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ripple" />
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ripple [animation-delay:0.6s]" />
            </>
          )}
          
          <div className="relative flex flex-col items-center justify-center">
            {voiceState === 'processing' ? (
              <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
            ) : (
              <>
                <Mic className={`w-5 h-5 text-white transition-transform ${
                  voiceState === 'recording' ? 'scale-110 mb-1' : ''
                }`} />
                {voiceState === 'recording' && (
                  <div className="flex items-center gap-0.5 h-2">
                    <div className="w-0.5 h-full bg-white rounded-full animate-waveform" />
                    <div className="w-0.5 h-full bg-white rounded-full animate-waveform [animation-delay:0.1s]" />
                    <div className="w-0.5 h-full bg-white rounded-full animate-waveform [animation-delay:0.2s]" />
                  </div>
                )}
              </>
            )}
          </div>
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
        <div className="max-w-md mx-auto bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800/50 rounded-3xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-2 py-3">
            {navItems.map((item, idx) => {
              const Icon = item.icon!;
              const isActive = active === item.id;
              const isMiddle = idx === 1;

              return (
                <div key={item.id} className={`flex-1 flex justify-center ${isMiddle ? 'mr-10' : idx === 2 ? 'ml-10' : ''}`}>
                  <button
                    onClick={() => onNavigate(item.id)}
                    className="flex flex-col items-center gap-1 transition-colors group"
                  >
                    <div className={`p-2 rounded-xl transition-all ${
                      isActive ? 'bg-emerald-500/10 text-emerald-500' : 'text-zinc-500 group-hover:text-zinc-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-[9px] uppercase font-black tracking-widest transition-colors ${
                        isActive ? 'text-emerald-500' : 'text-zinc-500'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
