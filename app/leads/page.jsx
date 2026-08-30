'use client';
import React, { useState, useEffect } from 'react';
import Badge from '../../components/ui/Badge';
import { ArrowUpRight, RefreshCw } from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filtered = filter === 'ALL' ? leads : leads.filter(l => l.lead_temperature === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#111111]">Leads Qualification Pipeline</h1>
          <p className="text-xs text-[#667085] mt-0.5">Automated lead scoring, temperature tracking & conversion flow.</p>
        </div>
        <button onClick={fetchLeads} className="p-2 hover:bg-gray-100 rounded-lg text-[#667085]">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

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

      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 border-b border-[#E5E7EB] text-[#667085] font-semibold">
            <tr>
              <th className="px-5 py-3">Lead / Phone</th>
              <th className="px-5 py-3">Interested Programme</th>
              <th className="px-5 py-3">Score & Temperature</th>
              <th className="px-5 py-3">Stage</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {filtered.map(l => (
              <tr key={l.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="font-bold text-[#111111]">{l.name}</p>
                  <p className="text-[11px] text-[#667085]">+{l.phone}</p>
                </td>
                <td className="px-5 py-3.5 font-medium text-[#111111]">{l.interested_course || 'Not specified yet'}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center space-x-2">
                    <Badge variant={l.lead_temperature.toLowerCase()}>{l.lead_temperature}</Badge>
                    <span className="font-bold text-gray-700">{l.lead_score}/100</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="bg-[#F5FAF7] text-[#63B99B] border border-[#63B99B]/30 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                    {l.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <a
                    href={`https://wa.me/${l.phone}`}
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