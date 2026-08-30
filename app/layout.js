'use client';
import { useState } from 'react';
import './globals.css';
import Sidebar from '../components/layout/Sidebar';
import MobileHeader from '../components/layout/MobileHeader';

export default function RootLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <html lang="en">
      <head>
        <title>TEJUROLEX GLOBAL — WhatsApp AI Sales Engine & CRM</title>
        <meta name="description" content="AI WhatsApp automation, lead qualification & CRM for Tejurolex Global." />
        <link rel="icon" href="/logo.png" />
      </head>
      <body className="bg-[#FAFAFA] text-[#111111] antialiased">
        <div className="min-h-screen flex flex-col lg:flex-row">
          <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
          <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
            <MobileHeader setMobileOpen={setMobileOpen} />
            <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}