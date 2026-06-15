import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import TopNav from './TopNav';
import ThermalPrintLayout from './ThermalPrintLayout';
import InvoicePrintLayout from './InvoicePrintLayout';

const Layout: React.FC = () => {
  return (
    <div className="flex h-screen bg-[#0B0F19] overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-[#0B0F19]">
        <TopNav />
        <main className="flex-1 overflow-y-auto bg-[#151B23] shadow-inner md:rounded-tl-3xl md:border-t md:border-l border-[#334155]/50 relative z-10 print:hidden pb-20 md:pb-0">
          <div className="w-full max-w-[1600px] p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
      <ThermalPrintLayout />
      <InvoicePrintLayout />
    </div>
  );
};

export default Layout;
