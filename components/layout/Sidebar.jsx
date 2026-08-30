'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Flame,
  Users,
  CalendarCheck,
  BookOpen,
  GraduationCap,
  FileText,
  BarChart3,
  UserCheck,
  Settings,
  Sparkles
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'WhatsApp Inbox', href: '/inbox', icon: MessageSquare, badge: 'Live' },
  { name: 'Leads Pipeline', href: '/leads', icon: Flame },
  { name: 'Customers CRM', href: '/customers', icon: Users },
  { name: 'Follow-ups', href: '/follow-ups', icon: CalendarCheck },
  { name: 'Knowledge Base', href: '/knowledge', icon: BookOpen },
  { name: 'Courses & Fees', href: '/courses', icon: GraduationCap },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Team Agents', href: '/team', icon: UserCheck },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const pathname = usePathname();
  const [logoError, setLogoError] = useState(false);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-[#E5E7EB] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand Header with Real Logo */}
        <div className="h-16 flex items-center px-4 border-b border-[#E5E7EB] justify-between">
          <Link href="/dashboard" className="flex items-center space-x-2.5 min-w-0">
            {!logoError ? (
              <img
                src="/logo.png"
                alt="TEJUROLEX GLOBAL"
                className="h-9 w-auto max-w-[120px] object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#63B99B] to-[#90C92E] flex items-center justify-center text-white shadow-sm font-bold text-sm shrink-0">
                TG
              </div>
            )}
            <div className="min-w-0">
              <span className="font-bold text-xs text-[#111111] tracking-tight truncate block">TEJUROLEX GLOBAL</span>
              <span className="text-[9px] uppercase tracking-wider text-[#63B99B] font-bold block">WHATSAPP BOT</span>
            </div>
          </Link>

          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[#F5FAF7] text-[#63B99B] border border-[#63B99B]/30 shrink-0">
            <Sparkles size={9} className="mr-0.5" /> LIVE
          </span>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#F5FAF7] text-[#111111] border border-[#63B99B]/40 shadow-xs'
                    : 'text-[#667085] hover:text-[#111111] hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon size={18} className={isActive ? 'text-[#63B99B]' : 'text-[#667085]'} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-[#63B99B] text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3.5 border-t border-[#E5E7EB] bg-gray-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-full bg-[#111111] text-white flex items-center justify-center text-[10px] font-bold">
              TG
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#111111] truncate">Tejurolex Admin</p>
              <p className="text-[10px] text-[#667085] truncate">tejurolexglobal.com.ng</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}