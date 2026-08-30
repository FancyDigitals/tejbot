'use client';
import React, { useState, useEffect } from 'react';
import Badge from '../../components/ui/Badge';
import { RefreshCw } from 'lucide-react';

export default function TeamPage() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/team');
      if (res.ok) {
        const data = await res.json();
        setTeam(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#111111]">Staff & Agent Directory</h1>
          <p className="text-xs text-[#667085] mt-0.5">Manage human advisors assigned to live WhatsApp customer handoffs.</p>
        </div>
        <button onClick={fetchTeam} className="p-2 hover:bg-gray-100 rounded-lg text-[#667085]">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-[#667085] font-semibold border-b border-[#E5E7EB]">
            <tr>
              <th className="px-5 py-3">Agent Name</th>
              <th className="px-5 py-3">Email Address</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {team.length > 0 ? (
              team.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/70">
                  <td className="px-5 py-3.5 font-bold text-[#111111]">{t.name}</td>
                  <td className="px-5 py-3.5 text-[#667085]">{t.email}</td>
                  <td className="px-5 py-3.5">
                    <span className="font-semibold px-2 py-0.5 bg-gray-100 rounded text-gray-800">{t.role}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Badge variant="brand">{t.is_active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-xs text-[#667085]">
                  No registered staff agents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}