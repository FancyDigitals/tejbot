'use client';
import React, { useState, useEffect } from 'react';
import Badge from '../../components/ui/Badge';
import { Search, Phone, RefreshCw } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = customers.filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#111111]">Customer Relationship Management</h1>
          <p className="text-xs text-[#667085] mt-0.5">Directory of all WhatsApp prospective and enrolled students.</p>
        </div>
        <button onClick={fetchCustomers} className="p-2 hover:bg-gray-100 rounded-lg text-[#667085]">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E5E7EB] flex items-center">
          <Search size={16} className="text-[#667085] mr-2" />
          <input
            type="text"
            placeholder="Search customers by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-transparent focus:outline-none"
          />
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-[#667085] font-semibold border-b border-[#E5E7EB]">
            <tr>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Conversations</th>
              <th className="px-5 py-3">First Seen</th>
              <th className="px-5 py-3 text-right">Quick Contact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-gray-50/70">
                <td className="px-5 py-3.5">
                  <p className="font-bold text-[#111111]">{c.name || 'Prospect'}</p>
                  <p className="text-[11px] text-[#667085]">+{c.phone}</p>
                </td>
                <td className="px-5 py-3.5 text-[#667085]">{c.email || 'None'}</td>
                <td className="px-5 py-3.5">
                  <Badge variant={c.status.includes('REGISTERED') ? 'brand' : 'default'}>{c.status}</Badge>
                </td>
                <td className="px-5 py-3.5 text-[#111111] font-semibold">{c.total_messages || 0} messages</td>
                <td className="px-5 py-3.5 text-[#667085]">
                  {new Date(c.created_at).toLocaleDateString([], { dateStyle: 'medium' })}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <a
                    href={`https://wa.me/${c.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-[#63B99B] font-bold hover:underline"
                  >
                    <Phone size={12} className="mr-1" /> WhatsApp
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