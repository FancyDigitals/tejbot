'use client';
import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Link from 'next/link';

export default function MobileHeader({ setMobileOpen }) {
  const [logoError, setLogoError] = useState(false);

  return (
    <header className="lg:hidden h-14 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 sticky top-0 z-30">
      <button
        onClick={() => setMobileOpen(true)}
        className="p-2 rounded-lg text-[#667085] hover:text-[#111111] hover:bg-gray-100 focus:outline-none"
      >
        <Menu size={20} />
      </button>

      <Link href="/dashboard" className="flex items-center space-x-2">
        {!logoError ? (
          <img
            src="/logo.png"
            alt="TEJUROLEX GLOBAL"
            className="h-7 w-auto object-contain"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-[#63B99B] to-[#90C92E] flex items-center justify-center text-white text-xs font-bold">
            TG
          </div>
        )}
        <span className="font-bold text-xs text-[#111111]">TEJUROLEX GLOBAL</span>
      </Link>

      <div className="w-8" />
    </header>
  );
}