import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import ThermalPrintLayout from './ThermalPrintLayout';
import InvoicePrintLayout from './InvoicePrintLayout';

const Layout: React.FC = () => {
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-900 shadow-inner md:rounded-l-2xl md:border-l border-slate-800 relative z-10 print:hidden pb-20 md:pb-0">
        <div className="w-full max-w-[1600px] p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
      <MobileNav />
      <ThermalPrintLayout />
      <InvoicePrintLayout />
    </div>
  );
};

export default Layout;
