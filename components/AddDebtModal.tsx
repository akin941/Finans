"use client";

import { useState, useEffect } from 'react';
import { X, Building2, Calendar, CreditCard, Hash, Plus } from 'lucide-react';
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://cvymnyaqeupwdpknbqlo.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2eW1ueWFxZXVwd2Rwa25icWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NDYyNDcsImV4cCI6MjA5MzEyMjI0N30.3X2CyM4w1vCueZjpliiNgEOcn88zqFk5EmL8Y2to4xQ"
);

interface Bank {
  id: string;
  name: string;
}

interface AddDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (debt: {
    bank_id: string;
    name: string;
    monthly_payment: number;
    total_installments: number;
    next_due_date: string;
  }) => Promise<void>;
}

export function AddDebtModal({ isOpen, onClose, onAdd }: AddDebtModalProps) {
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isAddingNewBank, setIsAddingNewBank] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  
  const [formData, setFormData] = useState({
    bank_id: '',
    name: '', // This is now the debt description (e.g. "Konut Kredisi")
    monthly_payment: '',
    total_installments: '',
    next_due_date: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchBanks();
    }
  }, [isOpen]);

  async function fetchBanks() {
    const { data } = await supabase.from('banks').select('*').order('name');
    setBanks(data || []);
  }

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let bankId = formData.bank_id;

      if (isAddingNewBank && newBankName) {
        const { data: newBank, error: bankError } = await supabase
          .from('banks')
          .insert({ name: newBankName })
          .select()
          .single();
        
        if (bankError) throw bankError;
        bankId = newBank.id;
      }

      if (!bankId) throw new Error("Banka seçilmeli");

      await onAdd({
        bank_id: bankId,
        name: formData.name,
        monthly_payment: Number(formData.monthly_payment),
        total_installments: Number(formData.total_installments),
        next_due_date: formData.next_due_date,
      });
      
      onClose();
      setFormData({ bank_id: '', name: '', monthly_payment: '', total_installments: '', next_due_date: '' });
      setIsAddingNewBank(false);
      setNewBankName('');
    } catch (error: any) {
      alert("Hata: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Yeni Borç Ekle</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-4">
            {/* Bank Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Banka Seçin</label>
                <button 
                  type="button"
                  onClick={() => setIsAddingNewBank(!isAddingNewBank)}
                  className="text-[10px] font-bold text-emerald-500 uppercase tracking-tight hover:text-emerald-400"
                >
                  {isAddingNewBank ? 'Listeye Dön' : 'Yeni Banka Ekle'}
                </button>
              </div>
              
              {isAddingNewBank ? (
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    required
                    type="text"
                    placeholder="Banka Adı girin..."
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
                  />
                </div>
              ) : (
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <select
                    required
                    value={formData.bank_id}
                    onChange={(e) => setFormData({ ...formData, bank_id: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-2xl pl-12 pr-10 py-3.5 outline-none focus:ring-2 focus:ring-emerald-600 appearance-none transition-all"
                  >
                    <option value="">Banka Seçin...</option>
                    {banks.map(bank => (
                      <option key={bank.id} value={bank.id}>{bank.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Debt Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Borç Türü / Açıklama</label>
              <div className="relative">
                <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  required
                  type="text"
                  placeholder="Örn: Konut Kredisi, Kart Borcu..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Monthly Payment */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Aylık Ödeme</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    required
                    type="number"
                    placeholder="0"
                    value={formData.monthly_payment}
                    onChange={(e) => setFormData({ ...formData, monthly_payment: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
                  />
                </div>
              </div>

              {/* Installments */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Taksit Sayısı</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    required
                    type="number"
                    placeholder="12"
                    value={formData.total_installments}
                    onChange={(e) => setFormData({ ...formData, total_installments: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">İlk Ödeme Tarihi</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  required
                  type="date"
                  value={formData.next_due_date}
                  onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-2xl transition-all"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
            >
              {loading ? 'Kaydediliyor...' : 'Borç Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
