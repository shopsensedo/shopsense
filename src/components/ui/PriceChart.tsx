import React, { useState } from 'react';
import { PricePoint } from '../../types';
import { formatPKR } from './PriceTag';
import { TrendingDown } from 'lucide-react';

interface PriceChartProps {
  data: PricePoint[];
  currentPrice: number;
  className?: string;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  data,
  currentPrice,
  className = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div className="text-xs text-slate-400 py-4 text-center">No price history available</div>;
  }

  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const width = 460;
  const height = 160;
  const paddingX = 40;
  const paddingY = 25;

  const getX = (index: number) => {
    return paddingX + (index / (data.length - 1)) * (width - paddingX * 2);
  };

  const getY = (price: number) => {
    const normalized = (price - minPrice) / priceRange;
    return height - paddingY - normalized * (height - paddingY * 2);
  };

  // Generate SVG path points
  const points = data.map((d, i) => `${getX(i)},${getY(d.price)}`).join(' ');
  const areaPoints = `${getX(0)},${height - paddingY} ${points} ${getX(data.length - 1)},${height - paddingY}`;

  const lowestPointIndex = prices.indexOf(minPrice);
  const savingsAmount = maxPrice - minPrice;

  return (
    <div className={`bg-white dark:bg-[#1A1A1A] rounded-xl border border-slate-200 dark:border-[#262626] p-4 transition-colors ${className}`}>
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-xs font-semibold text-[#0C0C0C] dark:text-[#F5F5F5]">Price History (Last 30 Days)</h4>
          <p className="text-[11px] text-[#5F5F60] dark:text-[#9C9C9D]">All prices in PKR across Pakistani sellers</p>
        </div>

        {savingsAmount > 0 && (
          <div className="flex items-center gap-1 text-xs font-bold text-[#16A34A] dark:text-[#4ADE80] bg-[#F0FDF4] dark:bg-[#052E16] border border-[#BBF7D0] dark:border-[#166534] px-2 py-0.5 rounded-md">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Down {formatPKR(savingsAmount)}</span>
          </div>
        )}
      </div>

      {/* SVG Container */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-36 overflow-visible"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B9C006" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#B9C006" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Baseline hairline grid */}
          <line
            x1={paddingX}
            y1={getY(minPrice)}
            x2={width - paddingX}
            y2={getY(minPrice)}
            className="stroke-slate-200 dark:stroke-[#333333]"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <line
            x1={paddingX}
            y1={getY(maxPrice)}
            x2={width - paddingX}
            y2={getY(maxPrice)}
            className="stroke-slate-200 dark:stroke-[#333333]"
            strokeDasharray="4 4"
            strokeWidth="1"
          />

          {/* Shaded Area */}
          <polygon points={areaPoints} fill="url(#chartGradient)" />

          {/* Stroke Line */}
          <polyline
            fill="none"
            stroke="#B9C006"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
            className="stroke-[#0C0C0C] dark:stroke-[#B9C006]"
          />

          {/* Data Points */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.price);
            const isHovered = hoveredIndex === i;
            const isLowest = i === lowestPointIndex;

            return (
              <g key={i} className="cursor-pointer">
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6 : isLowest ? 4.5 : 3.5}
                  fill={isLowest ? '#16A34A' : '#B9C006'}
                  strokeWidth="2"
                  className={`transition-all duration-150 stroke-white dark:stroke-[#1A1A1A] ${
                    isLowest ? 'fill-[#16A34A] dark:fill-[#22C55E]' : 'fill-[#0C0C0C] dark:fill-[#B9C006]'
                  }`}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* X Axis Labels */}
                <text
                  x={cx}
                  y={height - 6}
                  fontSize="10"
                  className="fill-slate-400 dark:fill-slate-500"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {d.date}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && (
          <div
            className="absolute -top-1 pointer-events-none transform -translate-x-1/2 bg-[#0C0C0C] dark:bg-[#262626] text-white text-[11px] font-semibold py-1 px-2.5 rounded-md shadow-lg border border-slate-700 dark:border-slate-600"
            style={{
              left: `${(getX(hoveredIndex) / width) * 100}%`,
            }}
          >
            <div>{formatPKR(data[hoveredIndex].price)}</div>
            <div className="text-[9px] text-slate-300 dark:text-slate-400 font-normal">{data[hoveredIndex].date}</div>
          </div>
        )}
      </div>

      {/* Footer Metrics */}
      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-[#262626] flex items-center justify-between text-xs text-[#5F5F60] dark:text-[#9C9C9D]">
        <span>Lowest: <strong className="text-[#16A34A] dark:text-[#4ADE80]">{formatPKR(minPrice)}</strong></span>
        <span>Highest: <strong className="text-slate-700 dark:text-slate-300">{formatPKR(maxPrice)}</strong></span>
        <span>Current: <strong className="text-[#0C0C0C] dark:text-[#B9C006]">{formatPKR(currentPrice)}</strong></span>
      </div>
    </div>
  );
};
