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
    xs: { dim: 28, text: 'text-xs' },
    sm: { dim: 36, text: 'text-sm' },
    md: { dim: 48, text: 'text-base' },
    lg: { dim: 88, text: 'text-xl' },
    xl: { dim: 120, text: 'text-2xl' },
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
        className="shrink-0 drop-shadow-md transition-transform hover:scale-105 duration-200"
      >
        <defs>
          {/* Gradients for Golden Script Text */}
          <linearGradient id="goldTextGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="25%" stopColor="#fef08a" />
            <stop offset="60%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>

          <linearGradient id="goldRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="50%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {/* Copper Deg / Handi Pot Gradient */}
          <linearGradient id="copperPotGrad" x1="0%" y1="0%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="35%" stopColor="#d97706" />
            <stop offset="70%" stopColor="#f59e0b" />
            <stop offset="90%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {/* Emerald Green Oval Plaque Gradient */}
          <linearGradient id="emeraldPlaqueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="50%" stopColor="#022c22" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>

          {/* Silver Chrome for POS text */}
          <linearGradient id="silverChromeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#e2e8f0" />
            <stop offset="75%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          {/* Chicken Leg Roast Gradient */}
          <linearGradient id="chickenRoastGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="45%" stopColor="#d97706" />
            <stop offset="85%" stopColor="#9a3412" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>

          {/* Biryani Rice Mound Gradient */}
          <linearGradient id="riceMoundGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="80%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Filter for rich 3D drop shadow */}
          <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000000" floodOpacity="0.4" />
          </filter>
          <filter id="innerGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#fbbf24" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Ambient Dark Container Circle for Contrast */}
        <circle cx="256" cy="256" r="248" fill="#0f172a" />
        <circle cx="256" cy="256" r="244" stroke="url(#goldRimGrad)" strokeWidth="6" strokeOpacity="0.7" />

        {/* ================= 1. CHEF HAT (Top Left / Center) ================= */}
        <g filter="url(#logoShadow)">
          {/* Hat puffs */}
          <path
            d="M 195 130 C 170 120 155 85 180 55 C 205 25 245 35 256 50 C 275 30 325 35 340 70 C 355 100 335 125 315 135 Z"
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth="4"
          />
          {/* Hat puff inner shadow creases */}
          <path d="M 215 65 C 220 95 230 115 240 130" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M 275 58 C 270 90 275 115 285 130" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" fill="none" />
          {/* Hat gold rim band */}
          <path
            d="M 192 130 Q 256 142 320 130 L 322 148 Q 256 160 190 148 Z"
            fill="url(#goldTextGrad)"
            stroke="#854d0e"
            strokeWidth="2.5"
          />
        </g>

        {/* Steam Puffs */}
        <g opacity="0.75" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" fill="none">
          <path d="M 140 120 C 130 90 155 70 145 40" />
          <path d="M 165 105 C 160 80 175 65 170 45" />
        </g>

        {/* ================= 2. POS BILLING TERMINAL (Top Right) ================= */}
        <g filter="url(#logoShadow)">
          {/* Swivel Base & Stand */}
          <path d="M 390 280 L 415 280 L 405 240 L 385 240 Z" fill="#334155" />
          <ellipse cx="400" cy="282" rx="35" ry="10" fill="#1e293b" />

          {/* POS Tablet Screen Body */}
          <rect
            x="320"
            y="110"
            width="145"
            height="125"
            rx="14"
            fill="#1e293b"
            stroke="url(#goldRimGrad)"
            strokeWidth="3.5"
            transform="rotate(6, 392, 172)"
          />

          {/* Screen Glass */}
          <rect
            x="328"
            y="118"
            width="129"
            height="109"
            rx="8"
            fill="#0f172a"
            transform="rotate(6, 392, 172)"
          />

          {/* Order UI preview inside POS screen */}
          <g transform="rotate(6, 392, 172)">
            {/* Food item row 1 */}
            <circle cx="345" cy="138" r="10" fill="#ea580c" />
            <rect x="362" y="132" width="45" height="5" rx="2" fill="#94a3b8" />
            <rect x="362" y="140" width="30" height="4" rx="2" fill="#64748b" />
            <rect x="422" y="132" width="22" height="12" rx="3" fill="#16a34a" />

            {/* Food item row 2 */}
            <circle cx="345" cy="162" r="10" fill="#eab308" />
            <rect x="362" y="156" width="50" height="5" rx="2" fill="#94a3b8" />
            <rect x="362" y="164" width="25" height="4" rx="2" fill="#64748b" />
            <rect x="422" y="156" width="22" height="12" rx="3" fill="#16a34a" />

            {/* Food item row 3 */}
            <circle cx="345" cy="186" r="10" fill="#f97316" />
            <rect x="362" y="180" width="40" height="5" rx="2" fill="#94a3b8" />
            <rect x="422" y="180" width="22" height="12" rx="3" fill="#16a34a" />
          </g>

          {/* Thermal Paper Receipt Spooling Out at Top */}
          <path
            d="M 375 110 L 375 70 Q 405 60 435 70 L 435 110 Z"
            fill="#f8fafc"
            stroke="#cbd5e1"
            strokeWidth="2"
          />
          {/* Receipt Lines */}
          <line x1="385" y1="78" x2="425" y2="78" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="385" y1="85" x2="415" y2="85" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <line x1="385" y1="92" x2="425" y2="92" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="385" y1="99" x2="405" y2="99" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* ================= 3. TRADITIONAL COPPER BIRYANI HANDI POT ================= */}
        <g filter="url(#logoShadow)">
          {/* Pot Handles (Left & Right) */}
          <path
            d="M 52 230 C 35 230 35 270 55 278"
            stroke="url(#goldRimGrad)"
            strokeWidth="16"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 320 230 C 340 230 340 270 320 278"
            stroke="url(#goldRimGrad)"
            strokeWidth="16"
            strokeLinecap="round"
            fill="none"
          />

          {/* Pot Body */}
          <path
            d="M 60 215 C 50 285 75 345 190 350 C 300 345 325 285 315 215 Z"
            fill="url(#copperPotGrad)"
            stroke="#78350f"
            strokeWidth="4"
          />

          {/* Pot Specular Metallic Highlight Curve */}
          <path
            d="M 78 225 C 72 275 95 325 185 332 C 120 315 95 270 90 225 Z"
            fill="#fde047"
            opacity="0.35"
          />

          {/* Pot Neck / Rim Collar */}
          <ellipse cx="187" cy="214" rx="130" ry="26" fill="url(#goldRimGrad)" stroke="#78350f" strokeWidth="4" />
          <ellipse cx="187" cy="212" rx="122" ry="21" fill="#78350f" />

          {/* ================= 4. MOUND OF STEAMING BIRYANI RICE ================= */}
          <ellipse cx="187" cy="208" rx="116" ry="34" fill="url(#riceMoundGrad)" />

          {/* Detailed rice grains & saffron textures */}
          <g stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.75">
            <line x1="120" y1="205" x2="132" y2="208" />
            <line x1="140" y1="195" x2="152" y2="198" />
            <line x1="170" y1="215" x2="182" y2="216" />
            <line x1="210" y1="202" x2="222" y2="206" />
            <line x1="230" y1="215" x2="242" y2="218" />
            <line x1="160" y1="225" x2="172" y2="228" />
          </g>
          {/* Caramelized golden onion slivers (Birista) */}
          <g stroke="#451a03" strokeWidth="3" strokeLinecap="round">
            <path d="M 135 212 Q 142 208 150 214" fill="none" />
            <path d="M 195 218 Q 205 222 215 216" fill="none" />
            <path d="M 235 208 Q 242 204 250 210" fill="none" />
            <path d="M 160 200 Q 168 196 175 202" fill="none" />
          </g>

          {/* Whole Spices (Star Anise & Cloves) */}
          <circle cx="155" cy="210" r="4" fill="#291305" />
          <circle cx="230" cy="210" r="3.5" fill="#291305" />

          {/* ================= 5. ROASTED CHICKEN DRUMSTICK ================= */}
          <g transform="rotate(-28, 145, 175)">
            {/* Bone end */}
            <ellipse cx="90" cy="170" rx="9" ry="7" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
            <ellipse cx="90" cy="180" rx="9" ry="7" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
            {/* Bone shaft */}
            <rect x="94" y="168" width="22" height="14" rx="3" fill="#f1f5f9" />
            {/* Drumstick meat */}
            <path
              d="M 110 160 C 130 145 170 145 190 165 C 205 180 200 205 180 215 C 155 225 125 210 110 190 Z"
              fill="url(#chickenRoastGrad)"
              stroke="#451a03"
              strokeWidth="3.5"
            />
            {/* Roasted char marks & glossy sheen */}
            <ellipse cx="160" cy="175" rx="18" ry="8" fill="#fde047" opacity="0.4" />
            <circle cx="170" cy="190" r="3" fill="#451a03" />
            <circle cx="145" cy="185" r="2.5" fill="#451a03" />
          </g>

          {/* Fresh Green Mint / Coriander Leaves */}
          <g fill="#16a34a" stroke="#14532d" strokeWidth="2">
            {/* Left mint sprig */}
            <path d="M 115 190 Q 95 180 100 170 Q 115 175 115 190 Z" fill="#22c55e" />
            <path d="M 115 190 Q 125 175 140 180 Q 130 195 115 190 Z" fill="#16a34a" />
            {/* Center mint sprig */}
            <path d="M 215 185 Q 205 165 220 160 Q 230 175 215 185 Z" fill="#22c55e" />
            <path d="M 215 185 Q 235 175 245 190 Q 225 195 215 185 Z" fill="#15803d" />
          </g>
        </g>

        {/* ================= 6. 3D EMBOSSED "BRIYANI" GOLDEN TITLE ================= */}
        <g filter="url(#logoShadow)">
          {/* Dark 3D Extrusion Shadow Layer */}
          <text
            x="256"
            y="350"
            textAnchor="middle"
            fontFamily="'Impact', 'Arial Black', sans-serif"
            fontSize="88"
            fontWeight="900"
            fontStyle="italic"
            letterSpacing="2"
            fill="#451a03"
            stroke="#291305"
            strokeWidth="18"
            strokeLinejoin="round"
          >
            Briyani
          </text>

          {/* Mid Warm Gold Layer */}
          <text
            x="256"
            y="346"
            textAnchor="middle"
            fontFamily="'Impact', 'Arial Black', sans-serif"
            fontSize="88"
            fontWeight="900"
            fontStyle="italic"
            letterSpacing="2"
            fill="#ca8a04"
            stroke="#854d0e"
            strokeWidth="10"
            strokeLinejoin="round"
          >
            Briyani
          </text>

          {/* Top Shiny Gold Layer */}
          <text
            x="256"
            y="342"
            textAnchor="middle"
            fontFamily="'Impact', 'Arial Black', sans-serif"
            fontSize="88"
            fontWeight="900"
            fontStyle="italic"
            letterSpacing="2"
            fill="url(#goldTextGrad)"
          >
            Briyani
          </text>
        </g>

        {/* ================= 7. EMERALD GREEN OVAL "POS" PLAQUE ================= */}
        <g filter="url(#logoShadow)">
          {/* Side Mint Leaves flanking the POS oval */}
          <g fill="#15803d" stroke="#facc15" strokeWidth="3">
            {/* Left Leaf */}
            <path d="M 65 405 Q 40 375 75 365 Q 90 395 65 405 Z" fill="#16a34a" />
            <line x1="60" y1="388" x2="75" y2="382" stroke="#facc15" strokeWidth="2" />
            {/* Right Leaf */}
            <path d="M 445 405 Q 470 375 435 365 Q 420 395 445 405 Z" fill="#16a34a" />
            <line x1="450" y1="388" x2="435" y2="382" stroke="#facc15" strokeWidth="2" />
          </g>

          {/* Outer Gold Border of Oval */}
          <ellipse
            cx="256"
            cy="420"
            rx="160"
            ry="48"
            fill="url(#goldRimGrad)"
            stroke="#451a03"
            strokeWidth="5"
          />

          {/* Inner Emerald Plaque */}
          <ellipse
            cx="256"
            cy="420"
            rx="148"
            ry="38"
            fill="url(#emeraldPlaqueGrad)"
            stroke="#fef08a"
            strokeWidth="3"
          />

          {/* 3D Extruded "POS" Letters */}
          {/* 3D Shadow */}
          <text
            x="256"
            y="437"
            textAnchor="middle"
            fontFamily="'Arial Black', 'Impact', sans-serif"
            fontSize="54"
            fontWeight="900"
            letterSpacing="12"
            fill="#022c22"
            stroke="#000000"
            strokeWidth="10"
            strokeLinejoin="round"
          >
            POS
          </text>

          {/* Chrome Front Surface */}
          <text
            x="256"
            y="434"
            textAnchor="middle"
            fontFamily="'Arial Black', 'Impact', sans-serif"
            fontSize="54"
            fontWeight="900"
            letterSpacing="12"
            fill="url(#silverChromeGrad)"
            stroke="#475569"
            strokeWidth="1.5"
          >
            POS
          </text>

          {/* Specular dots on the gold rim */}
          <circle cx="120" cy="420" r="4" fill="#fef08a" />
          <circle cx="392" cy="420" r="4" fill="#fef08a" />
        </g>
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
