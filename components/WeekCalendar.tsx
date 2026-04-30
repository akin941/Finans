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

export function WeekCalendar({ payments = [] }: { payments?: Payment[] }) {
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
              const dayStatus = getDayStatus(day);

              return (
                <div
                  key={i}
                  className={`flex-1 min-w-[55px] flex flex-col items-center px-3 py-3 rounded-2xl transition-all relative ${
                    isToday ? 'bg-emerald-600 text-white shadow-lg scale-105 z-10' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-widest font-bold opacity-70">
                    {format(day, 'EEE', { locale: tr })}
                  </div>
                  <div className="text-lg font-black mt-1">
                    {format(day, 'd')}
                  </div>
                  {dayStatus && (
                    <div className={`absolute bottom-2 w-1.5 h-1.5 rounded-full ${
                      isToday ? 'bg-white' : 
                      dayStatus === 'overdue' ? 'bg-red-500 animate-pulse' : 'bg-orange-500 animate-pulse'
                    }`}></div>
                  )}
                </div>
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
                const dayStatus = getDayStatus(day);

                return (
                  <div
                    key={i}
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all relative ${
                      isToday 
                        ? 'bg-emerald-600 text-white shadow-md' 
                        : isCurrentMonth 
                          ? 'hover:bg-zinc-800 text-zinc-300' 
                          : 'text-zinc-700 opacity-30'
                    }`}
                  >
                    <span className="text-sm font-bold">{format(day, 'd')}</span>
                    {dayStatus && (
                      <div className={`absolute bottom-1.5 w-1 h-1 rounded-full ${
                        isToday ? 'bg-white' : 
                        dayStatus === 'overdue' ? 'bg-red-500' : 'bg-orange-500'
                      }`}></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
