'use client';
import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle2, RefreshCw, PowerOff, Smartphone, Sparkles, ShieldCheck } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function WhatsAppConnectCard() {
  const [session, setSession] = useState({
    status: 'CONNECTING',
    qrCodeDataUrl: null,
    connectedPhone: null,
    connectedName: null,
  });
  const [loading, setLoading] = useState(false);

  // Poll for real-time QR / connection status every 3 seconds
  useEffect(() => {
    let interval;
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/qr');
        if (res.ok) {
          const data = await res.json();
          setSession(data);
        }
      } catch (err) {
        console.error('Failed to poll WA status:', err);
      }
    };

    fetchStatus();
    interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this WhatsApp number?')) return;
    setLoading(true);
    try {
      await fetch('/api/whatsapp/disconnect', { method: 'POST' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isConnected = session.status === 'CONNECTED';
  const isScanning = session.status === 'SCAN_QR' && session.qrCodeDataUrl;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4 mb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#63B99B] to-[#90C92E] flex items-center justify-center text-white shadow-xs">
            <Smartphone size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111111]">WhatsApp Direct Live Connect</h3>
            <p className="text-xs text-[#667085]">Link any WhatsApp Business or Personal number via QR code.</p>
          </div>
        </div>

        <div>
          {isConnected ? (
            <Badge variant="active" className="text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              CONNECTED & LIVE
            </Badge>
          ) : isScanning ? (
            <Badge variant="warm">
              <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5 animate-ping" />
              READY FOR SCAN
            </Badge>
          ) : (
            <Badge variant="default">INITIALIZING...</Badge>
          )}
        </div>
      </div>

      {/* CONNECTED STATE */}
      {isConnected && (
        <div className="space-y-4">
          <div className="bg-[#F5FAF7] border border-[#63B99B]/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-full bg-[#63B99B] text-white flex items-center justify-center font-bold shadow-xs">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-xs text-[#667085]">Active WhatsApp Number</p>
                <p className="text-base font-bold text-[#111111]">+{session.connectedPhone}</p>
                <p className="text-[11px] text-[#63B99B] font-semibold">{session.connectedName || 'TEJUROLEX GLOBAL'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="danger"
                size="sm"
                isLoading={loading}
                onClick={handleDisconnect}
              >
                <PowerOff size={14} className="mr-1.5" /> Disconnect / Link New Number
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-[#667085] bg-gray-50 p-3 rounded-lg border border-[#E5E7EB]">
            <Sparkles size={14} className="text-[#63B99B] shrink-0" />
            <span>AI Auto-Responder is active and automatically answering incoming chats 24/7.</span>
          </div>
        </div>
      )}

      {/* SCANNING QR CODE STATE */}
      {isScanning && !isConnected && (
        <div className="flex flex-col md:flex-row items-center gap-8 py-2">
          {/* QR Box */}
          <div className="p-3 bg-white border-2 border-[#63B99B] rounded-2xl shadow-md flex flex-col items-center shrink-0">
            <img
              src={session.qrCodeDataUrl}
              alt="Scan WhatsApp QR Code"
              className="w-60 h-60 object-contain rounded-lg"
            />
            <p className="text-[11px] text-[#667085] font-semibold mt-2 flex items-center">
              <RefreshCw size={11} className="mr-1 animate-spin text-[#63B99B]" /> Auto-refreshes live
            </p>
          </div>

          {/* Instructions */}
          <div className="space-y-3.5 max-w-md">
            <h4 className="font-bold text-sm text-[#111111]">How to link TEJUROLEX WhatsApp:</h4>
            <ol className="space-y-2 text-xs text-[#667085] list-decimal list-inside leading-relaxed">
              <li>Open <strong className="text-[#111111]">WhatsApp</strong> on the phone you want to use.</li>
              <li>Tap <strong className="text-[#111111]">Settings</strong> (iPhone) or <strong className="text-[#111111]">Three Dots ⋮</strong> (Android).</li>
              <li>Select <strong className="text-[#111111]">Linked Devices</strong>.</li>
              <li>Tap <strong className="text-[#111111]">Link a Device</strong> and point your camera at this QR code.</li>
            </ol>

            <div className="pt-2">
              <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                <ShieldCheck size={13} className="mr-1.5" /> No Meta Developer setup required. Ready instantly.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CONNECTING / LOADING STATE */}
      {!isConnected && !isScanning && (
        <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
          <RefreshCw size={28} className="text-[#63B99B] animate-spin" />
          <p className="text-xs font-semibold text-[#111111]">Starting WhatsApp Engine & Generating QR Code...</p>
          <p className="text-[11px] text-[#667085]">Please wait a few seconds.</p>
        </div>
      )}
    </div>
  );
}