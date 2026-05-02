"use client";

import { 
  format, 
  addDays, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday as isTodayFn
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List } from 'lucide-react';
import { Payment } from './UpcomingPayments';

export function WeekCalendar({ 
  payments = [], 
  selectedDate, 
  onDateSelect 
}: { 
  payments?: Payment[],
  selectedDate?: Date,
  onDateSelect?: (date: Date) => void 
}) {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const today = new Date();
  
  // Week view days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  // Month view days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getDayStatus = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayPayments = payments.filter(p => format(p.dueDate, 'yyyy-MM-dd') === dayStr);
    if (dayPayments.length === 0) return null;
    return dayPayments.some(p => p.status === 'overdue') ? 'overdue' : 'pending';
  };

  const getDayTotal = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return payments
      .filter(p => format(p.dueDate, 'yyyy-MM-dd') === dayStr)
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="space-y-4">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {viewMode === 'month' && (
            <div className="flex items-center gap-1 mr-2">
              <button onClick={prevMonth} className="p-1 text-zinc-500 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-white min-w-[100px] text-center">
                {format(currentDate, 'MMMM yyyy', { locale: tr })}
              </span>
              <button onClick={nextMonth} className="p-1 text-zinc-500 hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <div className="bg-zinc-900 p-1 rounded-lg border border-zinc-800 flex gap-1">
          <button
            onClick={() => setViewMode('week')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'week' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Haftalık Görünüm"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'month' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Aylık Görünüm"
          >
            <CalendarIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Views */}
      <div className="transition-all duration-300">
        {viewMode === 'week' ? (
          <div className="flex gap-2 w-full overflow-x-auto no-scrollbar pb-2">
            {weekDays.map((day, i) => {
              const isToday = isSameDay(day, today);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const dayStatus = getDayStatus(day);
              const dayTotal = getDayTotal(day);

              return (
                <button
                  key={i}
                  onClick={() => onDateSelect?.(day)}
                  className={`flex-1 min-w-[58px] flex flex-col items-center px-1 py-2.5 rounded-xl transition-all relative ${
                    isToday 
                      ? 'bg-emerald-600 text-white shadow-md scale-105 z-10' 
                      : isSelected
                        ? 'bg-zinc-100 text-black border-white shadow-lg'
                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700/50'
                  }`}
                >
                  <div className={`text-[9px] uppercase tracking-tighter font-black ${isSelected ? 'text-black/60' : 'opacity-60'}`}>
                    {format(day, 'EEE', { locale: tr })}
                  </div>
                  <div className="text-base font-black mt-0.5">
                    {format(day, 'd')}
                  </div>
                  {dayTotal > 0 && (
                    <div className={`text-[8px] font-black mt-0.5 ${isToday ? 'text-white' : isSelected ? 'text-emerald-700' : 'text-emerald-500'}`}>
                      ₺{dayTotal.toLocaleString()}
                    </div>
                  )}
                  {dayStatus && (
                    <div className={`absolute bottom-1 w-1 h-1 rounded-full ${
                      isToday ? 'bg-white' : 
                      isSelected ? 'bg-emerald-600' :
                      dayStatus === 'overdue' ? 'bg-red-500 animate-pulse' : 'bg-orange-500 animate-pulse'
                    }`}></div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-zinc-900 rounded-3xl p-4 border border-zinc-800 shadow-2xl animate-in fade-in zoom-in duration-300">
            {/* Weekday Labels */}
            <div className="grid grid-cols-7 mb-2">
              {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((d) => (
                <div key={d} className="text-[10px] text-center font-bold text-zinc-600 uppercase tracking-tighter py-2">
                  {d}
                </div>
              ))}
            </div>
            {/* Month Grid */}
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((day, i) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isTodayFn(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const dayStatus = getDayStatus(day);
                const dayTotal = getDayTotal(day);

                return (
                  <button
                    key={i}
                    onClick={() => onDateSelect?.(day)}
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all relative ${
                      isToday 
                        ? 'bg-emerald-600 text-white shadow-md' 
                        : isCurrentMonth 
                          ? isSelected
                            ? 'bg-zinc-700 text-white shadow-inner'
                            : 'hover:bg-zinc-800 text-zinc-300' 
                          : 'text-zinc-700 opacity-30'
                    }`}
                  >
                    <span className="text-sm font-bold">{format(day, 'd')}</span>
                    {dayTotal > 0 && isCurrentMonth && (
                      <div className={`text-[8px] font-black mt-0.5 leading-none ${isToday ? 'text-white' : 'text-emerald-500'}`}>
                        ₺{dayTotal.toLocaleString()}
                      </div>
                    )}
                    {dayStatus && (
                      <div className={`absolute bottom-1 w-0.5 h-0.5 rounded-full ${
                        isToday ? 'bg-white' : 
                        dayStatus === 'overdue' ? 'bg-red-500' : 'bg-orange-500'
                      }`}></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
