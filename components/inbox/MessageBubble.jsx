'use client';
import React from 'react';
import { Bot, User, Sparkles, AlertCircle, Check, CheckCheck } from 'lucide-react';

export default function MessageBubble({ message }) {
  const isCustomer = message.sender_type === 'CUSTOMER';
  const isAI = message.sender_type === 'AI';
  const isAgent = message.sender_type === 'AGENT';
  const isSystem = message.sender_type === 'SYSTEM';

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center space-x-1.5 shadow-xs">
          <AlertCircle size={13} className="text-amber-600" />
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col mb-3 ${isCustomer ? 'items-start' : 'items-end'}`}>
      {/* Sender Label Header */}
      <div className="flex items-center space-x-1 mb-1 px-1">
        {isCustomer && <span className="text-[11px] font-semibold text-[#667085]">Customer</span>}
        {isAI && (
          <span className="text-[11px] font-bold text-[#63B99B] flex items-center space-x-1">
            <Sparkles size={11} /> <span>Tejurolex AI</span>
          </span>
        )}
        {isAgent && (
          <span className="text-[11px] font-bold text-purple-700 flex items-center space-x-1">
            <User size={11} /> <span>Staff Agent</span>
          </span>
        )}
      </div>

      {/* Message Bubble Card */}
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-xs text-sm ${
          isCustomer
            ? 'bg-white text-[#111111] rounded-tl-xs border border-[#E5E7EB]'
            : isAI
            ? 'bg-[#EBF7F2] text-[#111111] rounded-tr-xs border border-[#63B99B]/30'
            : 'bg-purple-600 text-white rounded-tr-xs'
        }`}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

        <div className={`flex items-center justify-end space-x-1 mt-1 text-[10px] ${
          isAgent ? 'text-purple-200' : 'text-[#667085]'
        }`}>
          <span>
            {new Date(message.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isCustomer && (
            <CheckCheck size={13} className={isAI ? 'text-[#63B99B]' : 'text-purple-200'} />
          )}
        </div>
      </div>
    </div>
  );
}