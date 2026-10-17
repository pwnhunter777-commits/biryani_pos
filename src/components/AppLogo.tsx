import React from 'react';

interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  textColor?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  className = '',
  showText = false,
  textColor = 'text-slate-900',
}) => {
  const sizeMap = {
    xs: { dim: 24, text: 'text-xs' },
    sm: { dim: 32, text: 'text-sm' },
    md: { dim: 44, text: 'text-base' },
    lg: { dim: 72, text: 'text-xl' },
    xl: { dim: 96, text: 'text-2xl' },
  };

  const { dim } = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm transition-transform hover:scale-105"
      >
        <defs>
          <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="50%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <linearGradient id="logoGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        {/* Base Squircle Container */}
        <rect width="512" height="512" rx="112" fill="url(#logoBgGrad)" />
        <rect
          x="20"
          y="20"
          width="472"
          height="472"
          rx="96"
          stroke="#ffffff"
          strokeWidth="6"
          strokeOpacity="0.2"
        />

        {/* Aromatic Steam */}
        <g stroke="url(#logoGoldGrad)" strokeWidth="16" strokeLinecap="round">
          <path d="M 210 165 C 195 125, 235 95, 210 55" />
          <path d="M 256 155 C 240 110, 275 80, 256 40" />
          <path d="M 302 165 C 320 125, 280 95, 302 55" />
        </g>

        {/* Handi Lid / Rim */}
        <ellipse cx="256" cy="205" rx="142" ry="24" fill="#ffffff" />
        <ellipse cx="256" cy="202" rx="128" ry="18" fill="#dbeafe" />

        {/* Handi Pot Body */}
        <path
          d="M 120 205 C 105 270, 135 370, 256 370 C 377 370, 407 270, 392 205 Z"
          fill="#ffffff"
        />

        {/* Side Handles */}
        <path
          d="M 112 215 C 80 215, 80 250, 115 255"
          stroke="#ffffff"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M 400 215 C 432 215, 432 250, 397 255"
          stroke="#ffffff"
          strokeWidth="14"
          strokeLinecap="round"
        />

        {/* Center POS Bill Emblem */}
        <g transform="translate(256, 288)">
          <rect x="-42" y="-45" width="84" height="90" rx="12" fill="#1d4ed8" />
          <line x1="-26" y1="-25" x2="26" y2="-25" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          <line x1="-26" y1="-10" x2="16" y2="-10" stroke="#93c5fd" strokeWidth="5" strokeLinecap="round" />
          <line x1="-26" y1="5" x2="26" y2="5" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          <line x1="-26" y1="20" x2="8" y2="20" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" />
        </g>

        {/* Bottom Banner */}
        <rect x="166" y="405" width="180" height="46" rx="23" fill="#ffffff" />
        <text
          x="256"
          y="436"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="24"
          fontWeight="900"
          fill="#1d4ed8"
          letterSpacing="3"
        >
          POS BILL
        </text>
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-black uppercase tracking-tight ${textColor} leading-tight`}>
            Biryani POS
          </span>
        </div>
      )}
    </div>
  );
};
