"use client";

export function BalanceChart({ 
  currentCash = 0, 
  currentDebt = 0,
  monthlyNet = 0
}: { 
  currentCash?: number;
  currentDebt?: number;
  monthlyNet?: number;
}) {

  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
      <div className="space-y-3">
        <div>
          <div className="text-xs text-zinc-500 mb-1">Toplam Nakit</div>
          <div className="text-2xl font-bold text-emerald-400">₺{currentCash.toLocaleString()}</div>
        </div>
        <div className="h-px bg-zinc-800"></div>
        <div>
          <div className="text-xs text-zinc-500 mb-1">Toplam Borç</div>
          <div className="text-2xl font-bold text-red-400">₺{currentDebt.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
