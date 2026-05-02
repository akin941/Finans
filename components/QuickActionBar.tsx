"use client";

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

export function QuickActionBar({ onAddIncome, onAddExpense }: {
  onAddIncome: (amount: number, description?: string, category?: string) => void;
  onAddExpense: (amount: number, description?: string, category?: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Diğer');

  const categories = [
    'Market', 'Fatura', 'Yemek', 'Akaryakıt', 
    'Ulaşım', 'Eğlence', 'Sağlık', 'Kişisel Bakım', 'Abonelik', 'Diğer'
  ];

  const hasValue = amount && parseFloat(amount) > 0;

  const handleIncome = () => {
    const value = parseFloat(amount);
    if (value > 0) {
      onAddIncome(value, description || undefined, 'Gelir');
      setAmount('');
      setDescription('');
    }
  };

  const handleExpense = () => {
    const value = parseFloat(amount);
    if (value > 0) {
      onAddExpense(value, description || undefined, category);
      setAmount('');
      setDescription('');
    }
  };

  return (
    <div className="bg-zinc-900 rounded-2xl p-5 shadow-xl border border-zinc-800">
      <input
        type="number"
        inputMode="decimal"
        placeholder="Tutar girin"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-xl px-4 py-4 mb-3 text-xl outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
      />
      <input
        type="text"
        placeholder="Açıklama (opsiyonel)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-xl px-4 py-3 mb-3 text-sm outline-none focus:ring-1 focus:ring-emerald-600 transition-all"
      />
      
      {/* Category Selection */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 py-1">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              category === cat 
                ? 'bg-emerald-600 text-white shadow-lg' 
                : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleIncome}
          disabled={!hasValue}
          className={`flex items-center justify-center gap-2 rounded-xl py-4 font-semibold text-base transition-all active:scale-95 ${
            hasValue
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          }`}
        >
          <Plus className="w-5 h-5" />
          Gelir
        </button>
        <button
          onClick={handleExpense}
          disabled={!hasValue}
          className={`flex items-center justify-center gap-2 rounded-xl py-4 font-semibold text-base transition-all active:scale-95 ${
            hasValue
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          }`}
        >
          <Minus className="w-5 h-5" />
          Gider
        </button>
      </div>
    </div>
  );
}
