"use client";

import { useState, useEffect } from 'react';
import { X, Building2, Calendar, CreditCard, Hash, Plus, FileText, Trash2, AlertTriangle } from 'lucide-react';
import { createClient } from "@supabase/supabase-js";
import { Debt } from './DebtsOverview';

const supabase = createClient(
  "https://cvymnyaqeupwdpknbqlo.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2eW1ueWFxZXVwd2Rwa25icWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NDYyNDcsImV4cCI6MjA5MzEyMjI0N30.3X2CyM4w1vCueZjpliiNgEOcn88zqFk5EmL8Y2to4xQ"
);

interface Bank {
  id: string;
  name: string;
}

interface EditDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt;
  onUpdate: (id: string, updates: {
    bank_id: string;
    name: string;
    description?: string;
    monthly_payment: number;
    total_installments: number;
    next_due_date: string;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function EditDebtModal({ isOpen, onClose, debt, onUpdate, onDelete }: EditDebtModalProps) {
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  
  const [formData, setFormData] = useState({
    bank_id: debt.bank_id,
    name: debt.name,
    description: debt.description || '',
    monthly_payment: debt.monthlyPayment.toString(),
    total_installments: debt.totalInstallments?.toString() || '12',
    next_due_date: debt.nextDueDate ? new Date(debt.nextDueDate).toISOString().split('T')[0] : '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchBanks();
      setShowDeleteConfirm(false);
      // Reset form data when modal opens with a new debt
      setFormData({
        bank_id: debt.bank_id,
        name: debt.name,
        description: debt.description || '',
        monthly_payment: debt.monthlyPayment.toString(),
        total_installments: debt.totalInstallments?.toString() || '12',
        next_due_date: debt.nextDueDate ? new Date(debt.nextDueDate).toISOString().split('T')[0] : '',
      });
    }
  }, [isOpen, debt]);

  async function fetchBanks() {
    const { data } = await supabase.from('banks').select('*').order('name');
    setBanks(data || []);
  }

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!formData.bank_id) throw new Error("Banka seçilmeli");

      await onUpdate(debt.id, {
        bank_id: formData.bank_id,
        name: formData.name,
        description: formData.description,
        monthly_payment: Number(formData.monthly_payment),
        total_installments: Number(formData.total_installments),
        next_due_date: formData.next_due_date,
      });
      
      onClose();
    } catch (error: any) {
      alert("Hata: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete(debt.id);
      onClose();
    } catch (error: any) {
      alert("Silme hatası: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 relative">
        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-[120] bg-zinc-900/95 flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="text-center space-y-4 max-w-xs">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Borcu Sil</h3>
              <p className="text-zinc-400 text-sm">
                Bu borcu silmek istediğine emin misin? Bu işlem geri alınamaz.
              </p>
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-900/20"
                >
                  {loading ? 'Siliniyor...' : 'Evet, Sil'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-2xl transition-all"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Borcu Düzenle</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            {/* Bank Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Banka Seçin</label>
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
            </div>

            {/* Debt Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Borç Adı</label>
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

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Açıklama (Opsiyonel)</label>
              <div className="relative">
                <div className="absolute left-4 top-4 text-zinc-500">
                  <FileText className="w-5 h-5" />
                </div>
                <textarea
                  placeholder="Borç hakkında detaylı bilgi..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-emerald-600 transition-all min-h-[100px] resize-none"
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
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Borcu Sil
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
            >
              {loading ? 'Güncelleniyor...' : 'Güncelle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
