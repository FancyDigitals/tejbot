'use client';
import React from 'react';
import Badge from '../ui/Badge';
import { Phone, Mail, MapPin, Calendar, BookOpen, Flame, Tag, Clock } from 'lucide-react';

export default function CustomerPanel({ customer, lead, onClose }) {
  if (!customer) return null;

  return (
    <div className="w-80 bg-white border-l border-[#E5E7EB] h-full flex flex-col overflow-y-auto custom-scrollbar">
      {/* Header Info */}
      <div className="p-6 border-b border-[#E5E7EB] text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-xl mb-3 shadow-sm">
          {customer.name ? customer.name.split(' ').map(n => n[0]).join('') : 'TG'}
        </div>
        <h3 className="font-bold text-base text-[#111111]">{customer.name || 'Unknown Contact'}</h3>
        <p className="text-xs text-[#667085] mt-0.5">{customer.phone}</p>

        <div className="flex items-center space-x-2 mt-3">
          <Badge variant={lead?.lead_temperature?.toLowerCase() || 'cold'}>
            {lead?.lead_temperature === 'HOT' ? '🔥 HOT LEAD' : lead?.lead_temperature === 'WARM' ? '🟡 WARM LEAD' : 'COLD LEAD'}
          </Badge>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            Score: {lead?.lead_score || 0}/100
          </span>
        </div>
      </div>

      {/* Lead & Academic Details */}
      <div className="p-5 space-y-4 text-xs">
        <h4 className="font-bold text-[#111111] uppercase tracking-wider text-[10px]">Lead Attributes</h4>

        <div className="space-y-2.5">
          <div className="flex items-start space-x-2.5">
            <BookOpen size={15} className="text-[#63B99B] shrink-0 mt-0.5" />
            <div>
              <span className="text-[#667085] block">Target Programme</span>
              <span className="font-semibold text-[#111111]">{lead?.interested_course || 'Not specified'}</span>
            </div>
          </div>

          <div className="flex items-start space-x-2.5">
            <Clock size={15} className="text-[#63B99B] shrink-0 mt-0.5" />
            <div>
              <span className="text-[#667085] block">Preferred Schedule</span>
              <span className="font-semibold text-[#111111]">{lead?.preferred_schedule || 'Flexible'}</span>
            </div>
          </div>

          <div className="flex items-start space-x-2.5">
            <MapPin size={15} className="text-[#63B99B] shrink-0 mt-0.5" />
            <div>
              <span className="text-[#667085] block">Location</span>
              <span className="font-semibold text-[#111111]">{lead?.location || 'Nigeria'}</span>
            </div>
          </div>

          <div className="flex items-start space-x-2.5">
            <Tag size={15} className="text-[#63B99B] shrink-0 mt-0.5" />
            <div>
              <span className="text-[#667085] block">Pipeline Stage</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                {lead?.status || 'NEW'}
              </span>
            </div>
          </div>
        </div>

        <hr className="border-[#E5E7EB] my-4" />

        <h4 className="font-bold text-[#111111] uppercase tracking-wider text-[10px]">Contact Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`https://wa.me/${customer.phone?.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center py-2 px-3 rounded-lg border border-[#E5E7EB] hover:bg-[#F5FAF7] text-xs font-semibold text-[#111111]"
          >
            <Phone size={13} className="mr-1.5 text-[#63B99B]" /> WhatsApp
          </a>
          <button
            onClick={() => alert(`Creating follow-up reminder for ${customer.name || customer.phone}`)}
            className="flex items-center justify-center py-2 px-3 rounded-lg border border-[#E5E7EB] hover:bg-[#F5FAF7] text-xs font-semibold text-[#111111]"
          >
            <Calendar size={13} className="mr-1.5 text-blue-600" /> Follow-up
          </button>
        </div>
      </div>
    </div>
  );
}