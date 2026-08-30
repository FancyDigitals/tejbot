'use client';
import React, { useState, useEffect } from 'react';
import MessageBubble from '../../components/inbox/MessageBubble';
import MessageComposer from '../../components/inbox/MessageComposer';
import CustomerPanel from '../../components/inbox/CustomerPanel';
import Badge from '../../components/ui/Badge';
import { Search, RefreshCw, MessageSquare } from 'lucide-react';

export default function InboxPage() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [search, setSearch] = useState('');
  const [showCustomerPanel, setShowCustomerPanel] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (!activeConvId && data.length > 0) {
          setActiveConvId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    // Real-time chat polling every 3 seconds
    const interval = setInterval(fetchConversations, 3000);
    return () => clearInterval(interval);
  }, [activeConvId]);

  const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0];
  const isAIActive = activeConv?.state === 'AI_ACTIVE';

  const handleSendMessage = async (text) => {
    if (!activeConv) return;

    try {
      await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConv.id,
          content: text,
        }),
      });
      fetchConversations();
    } catch (err) {
      console.error('Failed to send agent message:', err);
    }
  };

  const handleToggleAI = async () => {
    if (!activeConv) return;
    const newState = activeConv.state === 'AI_ACTIVE' ? 'HUMAN_ACTIVE' : 'AI_ACTIVE';

    try {
      await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConv.id,
          toggleState: newState,
        }),
      });
      fetchConversations();
    } catch (err) {
      console.error('Failed to toggle AI mode:', err);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    (c.customer.name || '').toLowerCase().includes(search.toLowerCase()) ||
    c.customer.phone.includes(search)
  );

  return (
    <div className="h-[calc(100vh-6rem)] bg-white border border-[#E5E7EB] rounded-xl shadow-xs flex overflow-hidden">
      {/* 1. LEFT COLUMN: Conversation List */}
      <div className="w-full md:w-80 lg:w-96 border-r border-[#E5E7EB] flex flex-col shrink-0">
        {/* Search header */}
        <div className="p-3 border-b border-[#E5E7EB] flex items-center space-x-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-2.5 text-[#667085]" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#63B99B]/40"
            />
          </div>
          <button
            onClick={fetchConversations}
            className="p-2 hover:bg-gray-100 rounded-lg text-[#667085] transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* List items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#E5E7EB]">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              const temp = (conv.lead?.lead_temperature || 'COLD').toLowerCase();
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    isActive ? 'bg-[#F5FAF7]' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {conv.customer.name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#111111] truncate">{conv.customer.name}</p>
                        <p className="text-[11px] text-[#667085] truncate mt-0.5">{conv.lastMessage}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1 shrink-0 ml-2">
                      <span className="text-[10px] text-[#667085]">{conv.time}</span>
                      <Badge variant={temp === 'hot' ? 'hot' : temp === 'warm' ? 'warm' : 'cold'} size="sm">
                        {temp === 'hot' ? '🔥 Hot' : temp === 'warm' ? '🟡 Warm' : '❄️ Cold'}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-[#667085]">
              <MessageSquare size={24} className="mx-auto mb-2 text-gray-300" />
              <p>No active chats found.</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. CENTER COLUMN: Chat View */}
      {activeConv ? (
        <div className="flex-1 flex flex-col bg-[#FAFAFA] min-w-0">
          {/* Chat top header */}
          <div className="h-16 bg-white border-b border-[#E5E7EB] px-5 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-xs">
                {activeConv.customer.name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-bold text-[#111111]">{activeConv.customer.name}</h2>
                  <span className="text-xs text-[#667085]">(+{activeConv.customer.phone})</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-[#667085]">
                  <span className={`w-2 h-2 rounded-full ${isAIActive ? 'bg-[#63B99B] animate-pulse' : 'bg-purple-600'}`} />
                  <span>{isAIActive ? 'AI Copilot Active' : 'Human Staff Takeover Active'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCustomerPanel(!showCustomerPanel)}
                className="px-3 py-1.5 text-xs font-semibold text-[#111111] border border-[#E5E7EB] rounded-lg hover:bg-gray-50"
              >
                {showCustomerPanel ? 'Hide CRM' : 'Show CRM'}
              </button>
            </div>
          </div>

          {/* Chat message bubbles */}
          <div className="flex-1 p-5 overflow-y-auto custom-scrollbar wa-chat-bg">
            {activeConv.messages && activeConv.messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </div>

          {/* Message Composer */}
          <MessageComposer
            onSendMessage={handleSendMessage}
            isAIActive={isAIActive}
            onToggleAI={handleToggleAI}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[#667085]">
          <MessageSquare size={32} className="mb-2 text-gray-300" />
          <p className="font-bold text-[#111111] text-sm">Select a Conversation</p>
          <p className="mt-1">Messages from your WhatsApp customers will appear in this window.</p>
        </div>
      )}

      {/* 3. RIGHT COLUMN: Customer & Lead Details Panel */}
      {showCustomerPanel && activeConv && (
        <CustomerPanel
          customer={activeConv.customer}
          lead={activeConv.lead}
          onClose={() => setShowCustomerPanel(false)}
        />
      )}
    </div>
  );
}