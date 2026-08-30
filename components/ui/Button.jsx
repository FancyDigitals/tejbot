'use client';
import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-[#63B99B] hover:bg-[#52a688] text-white focus:ring-[#63B99B] shadow-sm',
    accent: 'bg-[#90C92E] hover:bg-[#7db324] text-brand-dark focus:ring-[#90C92E] font-semibold',
    secondary: 'bg-white hover:bg-[#F5FAF7] text-[#111111] border border-[#E5E7EB] focus:ring-[#63B99B]',
    outline: 'border-2 border-[#63B99B] text-[#63B99B] hover:bg-[#63B99B]/10 focus:ring-[#63B99B]',
    danger: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500',
    ghost: 'text-[#667085] hover:text-[#111111] hover:bg-gray-100',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center space-x-2">
          <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Loading...</span>
        </span>
      ) : children}
    </button>
  );
}