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
import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List } from 'lucide-react';
import { Payment } from './UpcomingPayments';

interface DayCardProps {
  day: Date;
  isSelected: boolean;
  isToday: boolean;
  dayStatus: 'overdue' | 'pending' | null;
  dayTotal: number;
  formattedAmount: string | null;
  onSelect: (day: Date) => void;
}

function DayCard({ day, isSelected, isToday, dayStatus, dayTotal, formattedAmount, onSelect }: DayCardProps) {
  const getAmountFontSize = (text: string | null) => {
    if (!text) return 'text-[10px]';
    if (text.length > 5) return 'text-[11px]';
    if (text.length > 4) return 'text-[12px]';
    return 'text-[13px]';
  };

  return (
    <button
      onPointerDown={(e) => e.currentTarget.classList.add('scale-95', 'opacity-80')}
      onPointerUp={(e) => e.currentTarget.classList.remove('scale-95', 'opacity-80')}
      onPointerLeave={(e) => e.currentTarget.classList.remove('scale-95', 'opacity-80')}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(day);
      }}
      className={`flex-1 flex flex-col items-center justify-between py-2 rounded-lg transition-all duration-150 border relative min-h-[64px] active:scale-95 ${
        isSelected
          ? 'bg-zinc-100 text-black border-white shadow-lg'
          : isToday 
            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' 
            : 'bg-zinc-900 text-zinc-400 border-zinc-800/50'
      }`}
    >
      <div className={`text-[7px] uppercase font-black tracking-widest ${isSelected ? 'text-black/40' : isToday ? 'text-white/60' : 'text-white/50'}`}>
        {format(day, 'EEE', { locale: tr })}
      </div>
      
      <div className={`text-xs font-black leading-none ${isSelected ? 'text-black/60' : isToday ? 'text-white/80' : 'text-white/80'}`}>
        {format(day, 'd')}
      </div>

      <div className="flex items-center justify-center w-full mt-1">
        {formattedAmount ? (
          <div className={`${getAmountFontSize(formattedAmount)} font-black tracking-tight leading-none ${
            isSelected ? 'text-emerald-700' : isToday ? 'text-white' : 'text-emerald-500'
          }`}>
            {formattedAmount}
          </div>
        ) : (
          <div className="w-1 h-1 rounded-full bg-zinc-800/50" />
        )}
      </div>

      {dayStatus && (
        <div className={`absolute top-1.5 right-1.5 w-1 h-1 rounded-full ${
          isSelected ? 'bg-emerald-600' :
          isToday ? 'bg-white' : 
          dayStatus === 'overdue' ? 'bg-red-500' : 'bg-orange-500'
        }`} />
      )}
    </button>
  );
}

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
  const [weekOffset, setWeekOffset] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // High-frequency gesture state (non-reactive for performance/reliability)
  const gestureRef = useRef({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false,
    directionLocked: null as 'horizontal' | 'vertical' | null,
    hasMoved: false,
    startTime: 0
  });

  const today = new Date();

  // Navigation helpers
  const finishSwipe = useCallback((direction: number) => {
    setIsAnimating(true);
    const containerWidth = containerRef.current?.offsetWidth || 300;
    const targetOffset = direction === 1 ? -containerWidth : containerWidth;
    
    setDragOffset(targetOffset);
    
    setTimeout(() => {
      setWeekOffset(prev => prev + direction);
      setDragOffset(0);
      setIsAnimating(false);
    }, 200);
  }, []);

  const cancelSwipe = useCallback(() => {
    setIsAnimating(true);
    setDragOffset(0);
    setTimeout(() => {
      setIsAnimating(false);
    }, 200);
  }, []);

  // Strict State Machine for Touch
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resetGesture = () => {
      gestureRef.current = {
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        isDragging: false,
        directionLocked: null,
        hasMoved: false,
        startTime: 0
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isAnimating) return;
      const touch = e.touches[0];
      resetGesture();
      gestureRef.current.startX = touch.clientX;
      gestureRef.current.startY = touch.clientY;
      gestureRef.current.startTime = Date.now();
    };

    const handleTouchMove = (e: TouchEvent) => {
      const g = gestureRef.current;
      if (g.startTime === 0 || isAnimating) return;

      const touch = e.touches[0];
      g.currentX = touch.clientX;
      g.currentY = touch.clientY;

      const deltaX = g.currentX - g.startX;
      const deltaY = g.currentY - g.startY;

      // Detect Intent / Direction Lock
      if (g.directionLocked === null) {
        if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
          g.directionLocked = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
        }
      }

      if (g.directionLocked === 'horizontal') {
        // PREVENT browser scroll/bounce in Safari
        if (e.cancelable) e.preventDefault();
        
        g.isDragging = true;
        g.hasMoved = true;
        
        // Sync to React state for UI update
        if (!isDragging) setIsDragging(true);
        setDragOffset(deltaX);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const g = gestureRef.current;
      if (g.startTime === 0) return;

      const duration = Date.now() - g.startTime;
      const deltaX = g.currentX !== 0 ? g.currentX - g.startX : 0;
      const totalDist = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(g.currentY - g.startY, 2));

      // 1. Check for TAP (Click)
      // If movement is tiny and duration is short, let the button's onClick handle it
      // BUT if we are in horizontal lock, we must decide here to cancel or finish
      
      if (g.directionLocked === 'horizontal' && g.isDragging) {
        const containerWidth = container.offsetWidth || 300;
        const threshold = containerWidth * 0.2;
        
        if (Math.abs(deltaX) > threshold) {
          const direction = deltaX > 0 ? -1 : 1;
          finishSwipe(direction);
        } else {
          cancelSwipe();
        }
      } else if (!g.hasMoved && totalDist < 10 && duration < 300) {
        // This was a clean tap. 
        // We don't preventDefault here, allowing the button's onClick to fire naturally.
      }

      // 2. ABSOLUTE RESET
      setIsDragging(false);
      resetGesture();
    };

    const handleTouchCancel = () => {
      if (gestureRef.current.isDragging) {
        cancelSwipe();
      }
      setIsDragging(false);
      resetGesture();
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isAnimating, isDragging, finishSwipe, cancelSwipe]);

  // Mouse Drag Support (Desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isAnimating) return;
    const g = gestureRef.current;
    g.startX = e.clientX;
    g.startTime = Date.now();
    g.directionLocked = 'horizontal'; // Mouse drag is always horizontal in this UI
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - g.startX;
      if (Math.abs(deltaX) > 5) {
        g.isDragging = true;
        g.hasMoved = true;
        setIsDragging(true);
        setDragOffset(deltaX);
      }
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      if (g.isDragging) {
        const deltaX = upEvent.clientX - g.startX;
        const containerWidth = containerRef.current?.offsetWidth || 300;
        const threshold = containerWidth * 0.2;
        if (Math.abs(deltaX) > threshold) {
          finishSwipe(deltaX > 0 ? -1 : 1);
        } else {
          cancelSwipe();
        }
      }
      
      // Delay reset slightly to avoid blocking click if movement was tiny
      setTimeout(() => {
        setIsDragging(false);
        resetGesture();
      }, 0);
    };

    const resetGesture = () => {
      g.startX = 0;
      g.startTime = 0;
      g.isDragging = false;
      g.hasMoved = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const getDayStatus = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayPayments = payments.filter(p => format(p.dueDate, 'yyyy-MM-dd') === dayStr);
    if (dayPayments.length === 0) return null;
    return dayPayments.some(p => p.status === 'overdue') ? 'overdue' : 'pending';
  };

  const formatCompactAmount = (amount: number) => {
    if (amount === 0) return null;
    const absAmount = Math.abs(amount);
    if (absAmount >= 1000) {
      const formatted = (absAmount / 1000).toFixed(1).replace(/\.0$/, '');
      return `₺${formatted}K`;
    }
    return `₺${Math.floor(absAmount)}`;
  };

  const getDayTotal = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return payments
      .filter(p => format(p.dueDate, 'yyyy-MM-dd') === dayStr)
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const currentWeekDays = Array.from({ length: 7 }, (_, i) => addDays(today, (weekOffset * 7) + i));
  const incomingOffset = dragOffset > 0 ? -1 : 1;
  const incomingWeekDays = Array.from({ length: 7 }, (_, i) => addDays(today, ((weekOffset + incomingOffset) * 7) + i));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: startDate, end: endDate });

  const dragProgress = containerRef.current ? Math.min(Math.abs(dragOffset) / containerRef.current.offsetWidth, 1) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {viewMode === 'month' ? (
            <div className="flex items-center gap-1 mr-2 animate-in fade-in slide-in-from-left-2 duration-300">
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
          ) : (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-xs font-black text-zinc-500 uppercase tracking-widest px-1">
                {weekOffset === 0 ? 'Bu Hafta' : 
                 weekOffset === 1 ? 'Gelecek Hafta' :
                 weekOffset === -1 ? 'Geçen Hafta' : 
                 format(currentWeekDays[0], 'd MMM', { locale: tr }) + ' - ' + format(currentWeekDays[6], 'd MMM', { locale: tr })}
              </span>
              {weekOffset !== 0 && (
                <button 
                  onClick={() => setWeekOffset(0)}
                  className="text-[10px] font-black text-emerald-500 uppercase tracking-tight hover:text-emerald-400 transition-colors"
                >
                  Bugüne Dön
                </button>
              )}
            </div>
          )}
        </div>
        <div className="bg-zinc-900 p-1 rounded-lg border border-zinc-800 flex gap-1">
          <button
            onClick={() => setViewMode('week')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'week' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'month' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* View Container */}
      <div className="overflow-hidden">
        {viewMode === 'week' ? (
          <div 
            ref={containerRef}
            className="relative w-full h-[64px] touch-none cursor-grab active:cursor-grabbing select-none overflow-hidden"
            onMouseDown={handleMouseDown}
          >
            {/* Current Layer */}
            <div 
              className={`absolute inset-0 flex gap-1 w-full ${isAnimating ? 'transition-all duration-200 ease-out' : ''}`}
              style={{ 
                transform: `translateX(${dragOffset}px)`,
                opacity: 1 - (dragProgress * 0.6),
                zIndex: 2
              }}
            >
              {currentWeekDays.map((day, i) => (
                <DayCard 
                  key={`${day.getTime()}-${i}`}
                  day={day}
                  isSelected={!!(selectedDate && isSameDay(day, selectedDate))}
                  isToday={isSameDay(day, today)}
                  dayStatus={getDayStatus(day)}
                  dayTotal={getDayTotal(day)}
                  formattedAmount={formatCompactAmount(getDayTotal(day))}
                  onSelect={(d) => !gestureRef.current.hasMoved && onDateSelect?.(d)}
                />
              ))}
            </div>

            {/* Incoming Layer */}
            {(isDragging || isAnimating) && (
              <div 
                className={`absolute inset-0 flex gap-1 w-full ${isAnimating ? 'transition-all duration-200 ease-out' : ''}`}
                style={{ 
                  transform: `translateX(${dragOffset + (incomingOffset * (containerRef.current?.offsetWidth || 0))}px)`,
                  opacity: dragProgress,
                  zIndex: 1
                }}
              >
                {incomingWeekDays.map((day, i) => (
                  <DayCard 
                    key={`${day.getTime()}-${i}-inc`}
                    day={day}
                    isSelected={!!(selectedDate && isSameDay(day, selectedDate))}
                    isToday={isSameDay(day, today)}
                    dayStatus={getDayStatus(day)}
                    dayTotal={getDayTotal(day)}
                    formattedAmount={formatCompactAmount(getDayTotal(day))}
                    onSelect={(d) => !gestureRef.current.hasMoved && onDateSelect?.(d)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-zinc-900 rounded-3xl p-4 border border-zinc-800 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="grid grid-cols-7 mb-2">
              {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((d) => (
                <div key={d} className="text-[10px] text-center font-bold text-white/40 uppercase tracking-tighter py-2">
                  {d}
                </div>
              ))}
            </div>
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
                            : 'hover:bg-zinc-800 text-white/80' 
                          : 'text-white/20'
                    }`}
                  >
                    <span className={`text-sm font-bold ${isCurrentMonth ? 'text-white/90' : ''}`}>{format(day, 'd')}</span>
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
