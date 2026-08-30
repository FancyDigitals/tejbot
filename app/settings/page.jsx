'use client';
import React, { useState } from 'react';
import WhatsAppConnectCard from '../../components/whatsapp/WhatsAppConnectCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { Save, Clock, Sparkles, Globe } from 'lucide-react';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-[#111111]">Platform Settings & Integrations</h1>
        <p className="text-xs text-[#667085] mt-0.5">Manage live WhatsApp connection, AI responses, and business operating hours.</p>
      </div>

      {/* 1. DIRECT WHATSAPP QR LINK CARD */}
      <WhatsAppConnectCard />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Profile */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <h3 className="text-sm font-bold text-[#111111] flex items-center">
              <Globe size={15} className="mr-2 text-[#63B99B]" /> Business Profile Information
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Company Name" defaultValue="TEJUROLEX GLOBAL" readOnly />
            <Input label="Official Website" defaultValue="tejurolexglobal.com.ng" readOnly />
          </div>
          <Input label="Head Office Address" defaultValue="12 Airport Road, Ikeja, Lagos, Nigeria" />
        </div>

        {/* Business Hours */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <h3 className="text-sm font-bold text-[#111111] flex items-center">
              <Clock size={15} className="mr-2 text-[#63B99B]" /> Operating Hours & Availability
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Opening Time" defaultValue="08:00 AM" />
            <Input label="Closing Time" defaultValue="08:00 PM" />
          </div>
          <Input label="Working Days" defaultValue="Monday – Saturday" />
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          {saved && <span className="text-xs font-bold text-[#63B99B]">✓ Settings saved successfully!</span>}
          <div className="flex-1" />
          <Button type="submit" variant="primary">
            <Save size={15} className="mr-1.5" /> Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}