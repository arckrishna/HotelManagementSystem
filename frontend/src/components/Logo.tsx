import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  theme?: 'dark' | 'light';
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md', 
  showSubtitle = true,
  theme = 'dark'
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Luxury Crest Icon */}
      <div className={`relative flex-shrink-0 ${iconSizes[size]} rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-[1.5px] shadow-lg shadow-amber-500/10`}>
        <div className="w-full h-full rounded-[10.5px] bg-slate-950 flex items-center justify-center relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-amber-500/20" />
          
          {/* Custom Luxury Emblem SVG */}
          <svg viewBox="0 0 40 40" className="w-[70%] h-[70%] text-amber-400" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Architectural Arch / Hotel Tower Outline */}
            <path 
              d="M20 5L33 13V33C33 34.1 32.1 35 31 35H9C7.9 35 7 34.1 7 33V13L20 5Z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            {/* The Stylized S & Keyhole Wave */}
            <path 
              d="M15 16C15 14.34 16.34 13 18 13H22C23.66 13 25 14.34 25 16C25 18 20 19 20 21C20 23 25 24 25 26C25 27.66 23.66 29 22 29H18C16.34 29 15 27.66 15 26" 
              stroke="url(#gold-grad)" 
              strokeWidth="2.5" 
              strokeLinecap="round"
            />
            {/* Center Sync Pivot Star */}
            <circle cx="20" cy="21" r="1.5" fill="#FDE68A" />

            <defs>
              <linearGradient id="gold-grad" x1="15" y1="13" x2="25" y2="29" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F59E0B" />
                <stop offset="0.5" stopColor="#FCD34D" />
                <stop offset="1" stopColor="#D97706" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Brand Typography */}
      <div>
        <div className="flex items-center">
          <span className={`font-black tracking-tight leading-none ${titleSizes[size]} ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            Stay<span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">Sync</span>
          </span>
        </div>
        {showSubtitle && (
          <p className="text-[9px] uppercase tracking-[0.25em] font-semibold text-slate-400 mt-1">
            Hospitality Suite
          </p>
        )}
      </div>
    </div>
  );
};
