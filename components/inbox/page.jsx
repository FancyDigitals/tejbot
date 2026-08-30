'use client';
import React, { useState } from 'react';
import MessageBubble from '../../components/inbox/MessageBubble';
import MessageComposer from '../../components/inbox/MessageComposer';
import CustomerPanel from '../../components/inbox/CustomerPanel';
import Badge from '../../components/ui/Badge';
import { Search, UserCheck, Bot, Phone, MoreVertical, Sparkles } from 'lucide-react';

const mockConversations = [
  {
    id: 'conv-1',
    customer: {
      id: 'cust-1',
      name: 'Muhammad Bashir',
      phone: '2348031234567',
      email: 'm.bashir@example.com',
    },
    lead: {
      lead_score: 85,
      lead_temperature: 'HOT',
      interested_course: 'German A1 Intensive Programme',
      preferred_schedule: 'Weekday Evening (6:00 PM)',
      location: 'Lagos',
      status: 'READY_TO_REGISTER',
    },
    state: 'AI_ACTIVE',
    lastMessage: 'I would like to register for the German A1 Intensive class.',
    time: '10:42 AM',
    unread: 0,
    messages: [
      { id: 'm1', sender_type: 'CUSTOMER', content: 'Hello, good morning. How much is German A1 class?', created_at: new Date(Date.now() - 3600000).toISOString() },
      { id: 'm2', sender_type: 'AI', content: 'Hi 👋\n\nOur German A1 Intensive Programme fee is ₦150,000 for the full 8-week duration.\n\nClasses run on Mondays, Wednesdays & Fridays from 6:00 PM – 8:30 PM with comprehensive Goethe-Zertifikat exam prep.\n\nWould you like me to reserve your slot or provide the registration details?', created_at: new Date(Date.now() - 3500000).toISOString() },
      { id: 'm3', sender_type: 'CUSTOMER', content: 'I would like to register for the German A1 Intensive class.', created_at: new Date(Date.now() - 600000).toISOString() },
      { id: 'm4', sender_type: 'AI', content: 'Excellent choice! 🎓\n\nTo complete your German A1 registration, please reply with your:\n1. Full Legal Name\n2. Email Address\n\nI will generate your student enrollment record right away.', created_at: new Date(Date.now() - 300000).toISOString() },
    ]
  },
  {
    id: 'conv-2',
    customer: {
      id: 'cust-2',
      name: 'Aminah Yusuf',
      phone: '2348129876543',
      email: null,
    },
    lead: {
      lead_score: 55,
      lead_temperature: 'WARM',
      interested_course: 'German Weekend Executive',
      preferred_schedule: 'Weekend',
      location: 'Abuja',
      status: 'INTERESTED',
    },
    state: 'AI_ACTIVE',
    lastMessage: 'What is the schedule for weekend German classes?',
    time: '09:15 AM',
    unread: 1,
    messages: [
      { id: 'm10', sender_type: 'CUSTOMER', content: 'Hi, do you have weekend classes for working professionals?', created_at: new Date(Date.now() - 7200000).toISOString() },
      { id: 'm11', sender_type: 'AI', content: 'Hello! Yes, we offer the German Weekend Executive (A1) programme specifically designed for professionals.\n\nSchedule: Saturdays (10:00 AM – 3:00 PM) & Sundays (1:00 PM – 5:00 PM). Tuition is ₦165,000 for 10 weeks.', created_at: new Date(Date.now() - 7100000).toISOString() },
      { id: 'm12', sender_type: 'CUSTOMER', content: 'What is the schedule for weekend German classes?', created_at: new Date(Date.now() - 3600000).toISOString() },
    ]
  },
  {
    id: 'conv-3',
    customer: {
      id: 'cust-3',
      name: 'Chinedu Okafor',
      phone: '2347014458899',
      email: null,
    },
    lead: {
      lead_score: 60,
      lead_temperature: 'WARM',
      interested_course: 'Study in Germany Advisory',
      preferred_schedule: 'Flexible',
      location: 'Enugu',
      status: 'CONTACTED',
    },
    state: 'HUMAN_REQUIRED',
    lastMessage: 'Can I speak with an advisor about document certification?',
    time: '08:50 AM',
    unread: 2,
    messages: [
      { id: 'm20', sender_type: 'CUSTOMER', content: 'Can I speak with an advisor about document certification?', created_at: new Date(Date.now() - 10800000).toISOString() },
      { id: 'm21', sender_type: 'AI', content: "I'll connect you right away with a TEJUROLEX GLOBAL advisor. Please hold on while an agent joins the conversation.", created_at: new Date(Date.now() - 10700000).toISOString() },
      { id: 'm22', sender_type: 'SYSTEM', content: 'Human agent handoff requested by customer.', created_at: new Date(Date.now() - 10600000).toISOString() },
    ]
  }
];

export default function InboxPage() {
  const [conversations, setConversations] = useState(mockConversations);
  const [activeConvId, setActiveConvId] = useState(mockConversations[0].id);
  const [search, setSearch] = useState('');
  const [showCustomerPanel, setShowCustomerPanel] = useState(true);

  const activeConv = conversations.find(c => c.id === activeConvId) || conversations[0];
  const isAIActive = activeConv.state === 'AI_ACTIVE';

  const handleSendMessage = (text) => {
    const newMessage = {
      id: `m_${Date.now()}`,
      sender_type: isAIActive ? 'AI' : 'AGENT',
      content: text,
      created_at: new Date().toISOString(),
    };

    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeConvId) {
          return {
            ...c,
            lastMessage: text,
            messages: [...c.messages, newMessage],
          };
        }
        return c;
      })
    );
  };

  const handleToggleAI = () => {
    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeConvId) {
          const newState = c.state === 'AI_ACTIVE' ? 'HUMAN_ACTIVE' : 'AI_ACTIVE';
          return {
            ...c,
            state: newState,
            messages: [
              ...c.messages,
              {
                id: `sys_${Date.now()}`,
                sender_type: 'SYSTEM',
                content: newState === 'AI_ACTIVE' ? 'AI Copilot reactivated.' : 'Human agent took over conversation.',
                created_at: new Date().toISOString(),
              }
            ]
          };
        }
        return c;
      })
    );
  };

  const filteredConversations = conversations.filter(c =>
    c.customer.name.toLowerCase().includes(search.toLowerCase()) ||
    c.customer.phone.includes(search)
  );

  return (
    <div className="h-[calc(100vh-6rem)] bg-white border border-[#E5E7EB] rounded-xl shadow-xs flex overflow-hidden">
      {/* 1. LEFT COLUMN: Conversation List */}
      <div className="w-full md:w-80 lg:w-96 border-r border-[#E5E7EB] flex flex-col shrink-0">
        {/* Search header */}
        <div className="p-3 border-b border-[#E5E7EB]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-[#667085]" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#63B99B]/40"
            />
          </div>
        </div>

        {/* List items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#E5E7EB]">
          {filteredConversations.map((conv) => {
            const isActive = conv.id === activeConvId;
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
                      {conv.customer.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#111111] truncate">{conv.customer.name}</p>
                      <p className="text-[11px] text-[#667085] truncate mt-0.5">{conv.lastMessage}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1 shrink-0 ml-2">
                    <span className="text-[10px] text-[#667085]">{conv.time}</span>
                    <Badge variant={conv.lead.lead_temperature.toLowerCase()} size="sm">
                      {conv.lead.lead_temperature === 'HOT' ? '🔥 Hot' : '🟡 Warm'}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. CENTER COLUMN: Chat View */}
      <div className="flex-1 flex flex-col bg-[#FAFAFA] min-w-0">
        {/* Chat top header */}
        <div className="h-16 bg-white border-b border-[#E5E7EB] px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-xs">
              {activeConv.customer.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-[#111111]">{activeConv.customer.name}</h2>
                <span className="text-xs text-[#667085]">({activeConv.customer.phone})</span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-[#667085]">
                <span className={`w-2 h-2 rounded-full ${isAIActive ? 'bg-[#63B99B]' : 'bg-purple-600'}`} />
                <span>{isAIActive ? 'AI Assistant Active' : 'Human Agent Responding'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCustomerPanel(!showCustomerPanel)}
              className="px-3 py-1.5 text-xs font-semibold text-[#111111] border border-[#E5E7EB] rounded-lg hover:bg-gray-50"
            >
              {showCustomerPanel ? 'Hide Lead CRM' : 'Show Lead CRM'}
            </button>
          </div>
        </div>

        {/* Chat message bubbles scroll container */}
        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar wa-chat-bg">
          {activeConv.messages.map((m) => (
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

      {/* 3. RIGHT COLUMN: Customer & Lead Details Panel */}
      {showCustomerPanel && (
        <CustomerPanel
          customer={activeConv.customer}
          lead={activeConv.lead}
          onClose={() => setShowCustomerPanel(false)}
        />
      )}
    </div>
  );
}