'use client';
import React, { useState, useEffect } from 'react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Calendar, Clock, Send, Sparkles, RefreshCw } from 'lucide-react';

export default function FollowUpsPage() {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFollowups = async () => {
    try {
      const res = await fetch('/api/followups');
      if (res.ok) {
        const data = await res.json();
        setFollowups(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowups();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-[#111111]">Follow-Up Automation Engine</h1>
            <Badge variant="brand"><Sparkles size={11} className="mr-1 inline" /> AI Trigger Active</Badge>
          </div>
          <p className="text-xs text-[#667085] mt-0.5">Automated gentle re-engagement reminders scheduled by the AI Sales agent.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchFollowups} isLoading={loading}>
          <RefreshCw size={14} />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {followups.map(f => (
          <div key={f.id} className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <Badge variant={f.status === 'PENDING' ? 'warm' : 'default'}>{f.status}</Badge>
                <span className="text-[11px] font-semibold text-amber-700 flex items-center">
                  <Clock size={12} className="mr-1" /> 
                  {new Date(f.scheduled_for).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              <h3 className="font-bold text-sm text-[#111111] mt-3">{f.lead_name}</h3>
              <p className="text-[11px] text-[#667085]">+{f.phone}</p>
              <p className="text-xs font-semibold text-[#63B99B] mt-2">Target: {f.course || 'German Language'}</p>
              <p className="text-xs text-[#667085] mt-1 bg-gray-50 p-2 rounded-lg border border-[#E5E7EB] font-mono whitespace-pre-wrap">
                {f.message_template}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
              <button className="text-xs text-red-600 font-semibold hover:underline">Cancel</button>
              <Button size="sm" variant="primary">
                <Send size={12} className="mr-1" /> Send Now
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}