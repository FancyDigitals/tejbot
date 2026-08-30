'use client';
import React from 'react';

export default function Badge({ children, variant = 'default', size = 'md', className = '' }) {
  const variants = {
    hot: 'bg-red-50 text-red-700 border border-red-200',
    warm: 'bg-amber-50 text-amber-700 border border-amber-200',
    cold: 'bg-blue-50 text-blue-700 border border-blue-200',
    active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    human: 'bg-purple-50 text-purple-700 border border-purple-200',
    brand: 'bg-[#F5FAF7] text-[#52a688] border border-[#63B99B]/30',
    default: 'bg-gray-50 text-gray-700 border border-gray-200',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
  };

  return (
    <span className={`inline-flex items-center rounded-full ${variants[variant] || variants.default} ${sizes[size] || sizes.md} ${className}`}>
      {children}
    </span>
  );
}