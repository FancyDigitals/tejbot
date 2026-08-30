'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Users,
  Flame,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Phone
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 6 seconds for live stats
    const interval = setInterval(fetchStats, 6000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    {
      name: "Today's Chats",
      value: data?.metrics?.todayConversations ?? 0,
      sub: `${data?.metrics?.totalConversations ?? 0} total`,
      icon: MessageSquare,
      color: 'text-[#63B99B]'
    },
    {
      name: 'New Leads',
      value: data?.metrics?.newLeads ?? 0,
      sub: 'Inbound prospects',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      name: 'Hot Leads',
      value: data?.metrics?.hotLeads ?? 0,
      sub: 'Ready to register',
      icon: Flame,
      color: 'text-red-500'
    },
    {
      name: 'Awaiting Action',
      value: data?.metrics?.awaitingResponse ?? 0,
      sub: 'Human handoffs',
      icon: Clock,
      color: 'text-amber-500'
    },
    {
      name: 'Converted',
      value: data?.metrics?.converted ?? 0,
      sub: 'Enrolled students',
      icon: CheckCircle2,
      color: 'text-[#90C92E]'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-[#111111]">TEJUROLEX GLOBAL</h1>
            <Badge variant="brand">
              <span className="w-2 h-2 rounded-full bg-[#63B99B] mr-1.5 animate-pulse" />
              LIVE SALES ENGINE
            </Badge>
          </div>
          <p className="text-xs text-[#667085] mt-1">Real-time WhatsApp sales, lead qualification & CRM command center.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" size="sm" onClick={fetchStats} isLoading={loading}>
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
          <Link href="/inbox">
            <Button variant="primary">
              <MessageSquare size={16} className="mr-2" /> Open Live Inbox
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#667085]">{stat.name}</span>
                <Icon size={18} className={stat.color} />
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-[#111111]">{stat.value}</span>
                <span className="text-[11px] font-medium text-[#667085] bg-gray-50 px-2 py-0.5 rounded-md border border-[#E5E7EB]">
                  {stat.sub}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Split Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Real Recent WhatsApp Conversations */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#111111]">Recent WhatsApp Conversations</h2>
              <p className="text-xs text-[#667085]">Live database activity from prospective students</p>
            </div>
            <Link href="/inbox" className="text-xs font-semibold text-[#63B99B] hover:text-[#52a688] flex items-center">
              View all <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>

          <div className="divide-y divide-[#E5E7EB] flex-1">
            {data?.recentConversations && data.recentConversations.length > 0 ? (
              data.recentConversations.map((conv) => {
                const temp = (conv.lead_temperature || 'COLD').toLowerCase();
                const timeStr = conv.last_message_time
                  ? new Date(conv.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Recent';

                return (
                  <Link
                    key={conv.id}
                    href="/inbox"
                    className="p-4 hover:bg-[#F5FAF7]/60 transition-colors flex items-center justify-between block"
                  >
                    <div className="flex items-start space-x-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {conv.name ? conv.name.split(' ').map((n) => n[0]).join('').substring(0, 2) : 'TG'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-[#111111] truncate">{conv.name}</span>
                          <span className="text-[10px] text-[#667085] flex items-center">
                            <Phone size={10} className="mr-0.5" /> +{conv.phone}
                          </span>
                        </div>
                        <p className="text-xs text-[#667085] truncate mt-0.5 max-w-md">{conv.last_message}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-1.5 shrink-0 ml-4">
                      <span className="text-[10px] text-[#667085]">{timeStr}</span>
                      <div className="flex items-center space-x-1.5">
                        <Badge variant={temp === 'hot' ? 'hot' : temp === 'warm' ? 'warm' : 'cold'}>
                          {temp === 'hot' ? '🔥 Hot' : temp === 'warm' ? '🟡 Warm' : '❄️ Cold'}
                        </Badge>
                        {conv.state === 'HUMAN_REQUIRED' && (
                          <Badge variant="human">Handoff Req.</Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="py-12 px-6 text-center text-xs text-[#667085]">
                <MessageSquare size={28} className="mx-auto mb-2 text-gray-300" />
                <p className="font-semibold text-[#111111]">No WhatsApp conversations yet.</p>
                <p className="mt-1">Send a message to your connected WhatsApp number to see it appear live here!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Follow-ups Due */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-[#E5E7EB]">
            <h2 className="text-sm font-bold text-[#111111]">Follow-ups Requiring Attention</h2>
            <p className="text-xs text-[#667085]">Automated student re-engagements</p>
          </div>

          <div className="p-4 space-y-3 flex-1">
            {data?.followUpsDue && data.followUpsDue.length > 0 ? (
              data.followUpsDue.map((item) => (
                <div key={item.id} className="p-3 rounded-lg border border-[#E5E7EB] bg-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#111111]">{item.name}</p>
                    <p className="text-[11px] text-[#667085]">{item.course}</p>
                    <span className="text-[10px] text-amber-700 font-semibold mt-1 block">
                      ⏰ {new Date(item.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <Link href="/follow-ups">
                    <Button size="sm" variant="secondary">Send</Button>
                  </Link>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[#667085]">
                <p>No pending follow-ups right now.</p>
                <p className="text-[10px] mt-1 text-emerald-600 font-semibold">AI is automatically scheduling reminders based on buying signals.</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-[#E5E7EB] bg-[#F5FAF7]">
            <div className="flex items-center space-x-2 text-xs text-[#63B99B] font-semibold">
              <Sparkles size={14} />
              <span>AI Autonomous Follow-Up Engine Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}