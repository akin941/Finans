"use client";

import { useState } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface ChartData {
  name: string;
  value: number;
  color: string;
}

const CATEGORY_COLORS: { [key: string]: string } = {
  'Market': '#10b981',
  'Fatura': '#f97316',
  'Kira': '#ffffff',
  'Yemek': '#eab308',
  'Akaryakıt': '#3b82f6',
  'Ulaşım': '#0ea5e9',
  'Eğlence': '#a855f7',
  'Sağlık': '#f43f5e',
  'Kişisel Bakım': '#ec4899',
  'Abonelik': '#6366f1',
  'Diğer': '#71717a'
};

export function ProfessionalPieChart({ transactions }: { transactions: any[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  type CategoryData = {
    name: string;
    value: number;
    color: string;
  };

  const expenseData: CategoryData[] = Object.entries(
    transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const cat = t.category || 'Diğer';
        acc[cat] = (acc[cat] || 0) + Math.abs(t.amount);
        return acc;
      }, {} as { [key: string]: number })
  ).map(([name, value]) => ({
    name,
    value: Number(value),
    color: CATEGORY_COLORS[name] || CATEGORY_COLORS['Diğer']
  })).sort((a, b) => b.value - a.value);

  const total = expenseData.reduce((acc, curr) => acc + curr.value, 0);

  if (total === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-12 flex flex-col items-center justify-center shadow-lg">
        <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Gider verisi yok</p>
      </div>
    );
  }

  const size = 420;
  const radius = 100;
  const centerX = size / 2;
  const centerY = 140;

  let cumulativeAngle = -Math.PI / 2;

  const getCoordinatesForAngle = (angle: number, r: number) => {
    return [
      centerX + r * Math.cos(angle),
      centerY + r * Math.sin(angle)
    ];
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 shadow-xl overflow-hidden group relative">
      <h3 className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] mb-8 text-center">Harcama Analizi</h3>
      
      <div className="relative w-full overflow-visible flex justify-center h-[280px]">
        <svg width={size} height={280} viewBox={`0 0 ${size} 280`} className="overflow-visible">
          {expenseData.map((slice, i) => {
            const sliceShare = slice.value / total;
            const sliceAngle = sliceShare * 2 * Math.PI;
            const isSelected = selectedIndex === i;
            const isAnySelected = selectedIndex !== null;

            if (sliceShare > 0.999) {
              return (
                <g key={i}>
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r={radius}
                    fill={slice.color}
                    className={`cursor-pointer transition-all duration-300 ${isAnySelected && !isSelected ? 'opacity-20 scale-95' : 'opacity-100'}`}
                    style={{ 
                      transformOrigin: `${centerX}px ${centerY}px`,
                      transform: isSelected ? 'scale(1.08)' : 'scale(1)'
                    }}
                    onClick={() => setSelectedIndex(selectedIndex === i ? null : i)}
                  />
                  <g className={`transition-opacity duration-500 ${isAnySelected && !isSelected ? 'opacity-0' : 'opacity-100'}`}>
                    <text
                      x={centerX}
                      y={centerY + radius + 40}
                      textAnchor="middle"
                      className="text-base font-black fill-white uppercase tracking-tighter"
                    >
                      {slice.name}
                    </text>
                    <text
                      x={centerX}
                      y={centerY + radius + 58}
                      textAnchor="middle"
                      className="text-sm font-bold fill-zinc-500 tracking-tighter"
                    >
                      ₺{slice.value.toLocaleString()} (100%)
                    </text>
                  </g>
                </g>
              );
            }

            const startAngle = cumulativeAngle;
            const endAngle = cumulativeAngle + sliceAngle;
            const midAngle = startAngle + sliceAngle / 2;
            
            const [startX, startY] = getCoordinatesForAngle(startAngle, radius);
            const [endX, endY] = getCoordinatesForAngle(endAngle, radius);
            
            const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

            // Connector Line Points
            const lineStartRadius = radius;
            const lineMidRadius = radius + 35;
            const [lx1, ly1] = getCoordinatesForAngle(midAngle, lineStartRadius);
            const [lx2, ly2] = getCoordinatesForAngle(midAngle, lineMidRadius);
            
            const isLeft = midAngle > Math.PI / 2 && midAngle < (3 * Math.PI) / 2;
            const lx3 = isLeft ? lx2 - 30 : lx2 + 30;
            const ly3 = ly2;

            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${startX} ${startY}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
              `Z`
            ].join(' ');

            cumulativeAngle += sliceAngle;

            // Only show labels for slices > 5% to avoid clutter, or if selected
            const showLabel = (slice.value / total > 0.05) || isSelected;

            return (
              <g key={i} className="transition-all duration-500">
                <path
                  d={pathData}
                  fill={slice.color}
                  className={`cursor-pointer transition-all duration-300 ${isAnySelected && !isSelected ? 'opacity-20 scale-95' : 'opacity-100'}`}
                  style={{ 
                    transformOrigin: `${centerX}px ${centerY}px`,
                    transform: isSelected ? 'scale(1.08)' : 'scale(1)'
                  }}
                  onClick={() => setSelectedIndex(selectedIndex === i ? null : i)}
                />
                
                {showLabel && (
                  <g className={`transition-opacity duration-500 ${isAnySelected && !isSelected ? 'opacity-0' : 'opacity-100'}`}>
                    <path
                      d={`M ${lx1} ${ly1} L ${lx2} ${ly2} L ${lx3} ${ly3}`}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth="2"
                      className="opacity-50"
                    />
                    <text
                      x={isLeft ? lx3 - 8 : lx3 + 8}
                      y={ly3}
                      textAnchor={isLeft ? 'end' : 'start'}
                      className="text-base font-black fill-white uppercase tracking-tighter"
                      dy="0.32em"
                    >
                      {slice.name}
                    </text>
                    <text
                      x={isLeft ? lx3 - 8 : lx3 + 8}
                      y={ly3 + 18}
                      textAnchor={isLeft ? 'end' : 'start'}
                      className="text-sm font-bold fill-zinc-500 tracking-tighter"
                      dy="0.32em"
                    >
                      ₺{slice.value.toLocaleString()} ({Math.round((slice.value / total) * 100)}%)
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail Panel */}
      <div className="mt-6 min-h-[60px] border-t border-zinc-800/50 pt-6 animate-in slide-in-from-bottom-2 duration-500">
        {selectedIndex !== null && (
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: expenseData[selectedIndex].color }} />
              <div>
                <div className="text-base font-black text-white uppercase tracking-wider">{expenseData[selectedIndex].name}</div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Kategori Toplamı</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-white">₺{expenseData[selectedIndex].value.toLocaleString()}</div>
              <div className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Kategori Payı %{Math.round((expenseData[selectedIndex].value / total) * 100)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
