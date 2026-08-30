'use client';
import React, { useState } from 'react';
import { Send, Sparkles, Paperclip, Smile } from 'lucide-react';
import Button from '../ui/Button';

export default function MessageComposer({ onSendMessage, isAIActive, onToggleAI }) {
  const [text, setText] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="p-3 bg-white border-t border-[#E5E7EB]">
      {/* Active AI / Agent Mode Bar */}
      <div className="flex items-center justify-between pb-2 px-1 text-xs">
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${isAIActive ? 'bg-[#63B99B] animate-pulse' : 'bg-purple-600'}`} />
          <span className="font-semibold text-[#111111]">
            {isAIActive ? 'AI Copilot Active' : 'Human Agent Takeover'}
          </span>
        </div>
        <button
          onClick={onToggleAI}
          className="text-xs font-semibold text-[#63B99B] hover:text-[#52a688] transition-colors"
        >
          {isAIActive ? 'Switch to Manual Takeover' : 'Reactivate AI Copilot'}
        </button>
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="flex items-end space-x-2">
        <div className="flex-1 bg-gray-50 border border-[#E5E7EB] rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#63B99B]/40 focus-within:border-[#63B99B] transition-all flex items-end">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a WhatsApp reply..."
            rows={1}
            className="w-full bg-transparent border-0 focus:outline-none resize-none text-sm text-[#111111] max-h-32 custom-scrollbar placeholder-[#667085]"
          />
        </div>
        <Button type="submit" variant="primary" size="md" className="shrink-0 h-10 px-4">
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}