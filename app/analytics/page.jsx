'use client';
import React, { useState, useEffect } from 'react';
import Badge from '../../components/ui/Badge';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(data => setAnalytics(data));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#111111]">Sales & AI Performance Analytics</h1>
        <p className="text-xs text-[#667085] mt-0.5">Real-time metrics on conversation volume, AI resolution, and lead conversions.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-[#667085]">AI Resolution Rate</span>
          <p className="text-2xl font-bold text-[#111111] mt-2">{analytics?.aiResolutionRate || '0%'}</p>
          <span className="text-[11px] text-[#63B99B] font-semibold">Handled without human intervention</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-[#667085]">Lead Conversion Rate</span>
          <p className="text-2xl font-bold text-[#111111] mt-2">{analytics?.conversionRate || '28.6%'}</p>
          <span className="text-[11px] text-[#63B99B] font-semibold">Prospective-to-enrolled conversion</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-[#667085]">Avg. AI Response Time</span>
          <p className="text-2xl font-bold text-[#111111] mt-2">{analytics?.avgLatency || '1.8s'}</p>
          <span className="text-[11px] text-[#63B99B] font-semibold">Instant 24/7 engagement</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-[#667085]">Handoff Requests</span>
          <p className="text-2xl font-bold text-[#111111] mt-2">{analytics?.handoffRequests || '0%'}</p>
          <span className="text-[11px] text-purple-700 font-semibold">Routed to human advisors</span>
        </div>
      </div>
    </div>
  );
}