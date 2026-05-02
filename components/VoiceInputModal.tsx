"use client";

import { useState, useEffect } from 'react';
import { X, ArrowDown, ArrowUp, AlertCircle, Edit3 } from 'lucide-react';

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { type: 'income' | 'expense', amount: number, category: string, description: string }) => void;
  initialData: {
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description: string;
  } | null;
  error?: string | null;
}

export function VoiceInputModal({ isOpen, onClose, onConfirm, initialData, error }: VoiceInputModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    if (isOpen) {
      setIsEditing(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setEditAmount(initialData.amount.toString());
      setEditCategory(initialData.category);
      setEditDescription(initialData.description);
    }
  }, [initialData]);

  const handleSave = () => {
    onConfirm({
      type: initialData?.type || 'expense',
      amount: parseFloat(editAmount),
      category: editCategory,
      description: editDescription
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-8 flex flex-col items-center text-center">
          
          {/* Header */}
          <div className="w-full flex justify-end mb-2">
            <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Icon Area */}
          <div className="relative mb-8">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
              error ? 'bg-red-500/10' : 
              initialData?.type === 'income' ? 'bg-emerald-500/15' : 'bg-red-500/15'
            }`}>
              {error ? (
                <AlertCircle className="w-10 h-10 text-red-500" />
              ) : initialData?.type === 'income' ? (
                <ArrowDown className="w-10 h-10 text-emerald-500" />
              ) : (
                <ArrowUp className="w-10 h-10 text-red-500" />
              )}
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-2 mb-8 min-h-[60px] w-full">
            {error ? (
              <>
                <h2 className="text-xl font-black text-red-500 uppercase tracking-tight">HATA</h2>
                <p className="text-zinc-500 text-sm px-4">{error}</p>
              </>
            ) : initialData && (
              <div className="animate-in slide-in-from-bottom-2 duration-500">
                {!isEditing ? (
                  <>
                    <h2 className={`text-xl font-black uppercase tracking-tight mb-1 ${initialData.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {initialData.type === 'income' ? '+' : '-'}₺{initialData.amount.toLocaleString()} {initialData.type === 'income' ? 'Kazanç' : initialData.category.toLowerCase() + ' gideri'} eklensin mi?
                    </h2>
                    {initialData.description && (
                      <p className="text-zinc-500 text-xs italic opacity-80 underline decoration-zinc-800 underline-offset-4">
                        "{initialData.description}"
                      </p>
                    )}
                  </>
                ) : (
                  <div className="space-y-3 w-full text-left">
                    <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Düzenle</div>
                    <input 
                      type="number" 
                      value={editAmount} 
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Tutar"
                    />
                    <select 
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {["Market", "Fatura", "Yemek", "Akaryakıt", "Ulaşım", "Eğlence", "Sağlık", "Kişisel Bakım", "Abonelik", "Gelir", "Diğer"].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <input 
                      type="text" 
                      value={editDescription} 
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Açıklama"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="w-full flex flex-col gap-3">
            {error ? (
              <button 
                onClick={onClose}
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all"
              >
                Kapat
              </button>
            ) : initialData && (
              <>
                <button 
                  onClick={handleSave}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                >
                  {isEditing ? 'KAYDET VE EKLE' : 'EVET, EKLE'}
                </button>
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    {isEditing ? 'İPTAL' : 'DÜZENLE'}
                  </div>
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
