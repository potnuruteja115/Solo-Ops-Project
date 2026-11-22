'use client';

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  subtitle?: string;
}

export function Logo({ size = 'md', showText = true, subtitle }: LogoProps) {
  const boxSize = {
    sm: 'h-8 w-8 rounded-xl',
    md: 'h-10 w-10 rounded-2xl',
    lg: 'h-12 w-12 rounded-2xl',
  }[size];

  const textSize = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  }[size];

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <div
        className={`${boxSize} relative flex shrink-0 items-center justify-center bg-[#b8623f] text-[#fffaf5] shadow-[4px_4px_10px_rgba(184,98,63,0.28),inset_1px_1px_1px_rgba(255,255,255,0.35)]`}
      >
        <svg
          viewBox="0 0 36 36"
          fill="none"
          className="h-3/4 w-3/4"
          aria-hidden="true"
        >
          {/* Ledger frame */}
          <rect
            x="4"
            y="4"
            width="28"
            height="28"
            rx="8"
            stroke="#fffaf5"
            strokeOpacity="0.28"
            strokeWidth="1.5"
          />
          {/* Stylized S / Cash-Flow Signal */}
          <path
            d="M11 13.5C11 11.015 13.015 9 15.5 9H24.5M25 22.5C25 24.985 22.985 27 20.5 27H11.5"
            stroke="#fffaf5"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M11 18H25"
            stroke="#f3d9c6"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray="2.5 3.5"
          />
          <circle cx="24.5" cy="9" r="2.4" fill="#fffaf5" />
          <circle cx="11.5" cy="27" r="2.4" fill="#e6dfd3" />
        </svg>
      </div>

      {showText && (
        <div className="leading-tight">
          <span
            className={`${textSize} font-heading font-bold tracking-tight text-[#2a2622]`}
          >
            Solo<span className="text-[#b8623f]">Ops</span>
          </span>
          {subtitle && (
            <p className="text-[11px] font-medium text-[#5c554e]">{subtitle}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default Logo;
