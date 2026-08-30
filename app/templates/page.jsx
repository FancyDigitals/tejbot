'use client';
import React, { useState, useEffect } from 'react';
import Badge from '../../components/ui/Badge';
import { Copy, RefreshCw } from 'lucide-react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    alert('Template copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#111111]">WhatsApp Message Templates</h1>
          <p className="text-xs text-[#667085] mt-0.5">Approved standardized messages used by both AI and Human staff agents.</p>
        </div>
        <button onClick={fetchTemplates} className="p-2 hover:bg-gray-100 rounded-lg text-[#667085]">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(t => (
          <div key={t.id} className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-700">{t.category}</span>
                <Badge variant="brand">Active</Badge>
              </div>
              <h3 className="font-bold text-sm text-[#111111] mt-2">{t.name}</h3>
              <p className="text-xs text-[#667085] mt-2 leading-relaxed bg-gray-50 p-3 rounded-lg border border-[#E5E7EB] font-mono whitespace-pre-wrap">{t.content}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs">
              <button onClick={() => handleCopy(t.content)} className="flex items-center text-[#63B99B] font-semibold hover:underline">
                <Copy size={13} className="mr-1" /> Copy Template
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}