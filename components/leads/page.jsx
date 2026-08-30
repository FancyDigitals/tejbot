'use client';
import React, { useState } from 'react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Search, Filter, Flame, Phone, Calendar, ArrowUpRight } from 'lucide-react';

const mockLeads = [
  { id: '1', name: 'Muhammad Bashir', phone: '+234 803 123 4567', course: 'German A1 Intensive', score: 85, temp: 'HOT', status: 'READY_TO_REGISTER', lastContact: '10 mins ago' },
  { id: '2', name: 'Aminah Yusuf', phone: '+234 812 987 6543', course: 'German Weekend Executive', score: 55, temp: 'WARM', status: 'INTERESTED', lastContact: '2 hours ago' },
  { id: '3', name: 'Chinedu Okafor', phone: '+234 701 445 8899', course: 'German B1 Intermediate', score: 60, temp: 'WARM', status: 'CONTACTED', lastContact: '3 hours ago' },
  { id: '4', name: 'Zainab Bello', phone: '+234 802 334 1122', course: 'German A2 Elementary', score: 40, temp: 'COLD', status: 'NEW', lastContact: '1 day ago' },
];

export default function LeadsPage() {
  const [leads] = useState(mockLeads);
  const [filter, setFilter] = useState('ALL');

  const filtered = filter === 'ALL' ? leads : leads.filter(l => l.temp === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#111111]">Leads Qualification Pipeline</h1>
          <p className="text-xs text-[#667085] mt-0.5">Automated lead scoring, temperature tracking & conversion flow.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" size="sm">Export Leads</Button>
          <Button variant="primary" size="sm">+ Add Lead Manually</Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center space-x-2 border-b border-[#E5E7EB] pb-2 text-xs font-semibold">
        {['ALL', 'HOT', 'WARM', 'COLD'].map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === t ? 'bg-[#111111] text-white' : 'text-[#667085] hover:text-[#111111] hover:bg-gray-100'
            }`}
          >
            {t === 'HOT' ? '🔥 Hot Leads' : t === 'WARM' ? '🟡 Warm Leads' : t === 'COLD' ? '❄️ Cold Leads' : 'All Leads'}
          </button>
        ))}
      </div>

      {/* Leads Table Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 border-b border-[#E5E7EB] text-[#667085] font-semibold">
            <tr>
              <th className="px-5 py-3">Lead / Phone</th>
              <th className="px-5 py-3">Interested Programme</th>
              <th className="px-5 py-3">Score & Temperature</th>
              <th className="px-5 py-3">Stage</th>
              <th className="px-5 py-3">Last Contact</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {filtered.map(l => (
              <tr key={l.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="font-bold text-[#111111]">{l.name}</p>
                  <p className="text-[11px] text-[#667085]">{l.phone}</p>
                </td>
                <td className="px-5 py-3.5 font-medium text-[#111111]">{l.course}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center space-x-2">
                    <Badge variant={l.temp.toLowerCase()}>{l.temp}</Badge>
                    <span className="font-bold text-gray-700">{l.score}/100</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="bg-[#F5FAF7] text-[#63B99B] border border-[#63B99B]/30 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                    {l.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-[#667085]">{l.lastContact}</td>
                <td className="px-5 py-3.5 text-right space-x-2">
                  <a
                    href={`https://wa.me/${l.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-[#63B99B] font-bold hover:underline"
                  >
                    WhatsApp <ArrowUpRight size={13} className="ml-0.5" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}