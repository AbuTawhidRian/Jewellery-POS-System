import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Lock, Barcode, BookOpen, Diamond, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  let links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/dashboard/vault', icon: Lock, label: 'The Vault' },
    { to: '/dashboard/pos', icon: Barcode, label: 'POS Terminal' },
    { to: '/dashboard/ledger', icon: BookOpen, label: 'Sales Ledger' },
  ];

  if (user?.role === 'OWNER') {
    links.push({ to: '/dashboard/settings', icon: SettingsIcon, label: 'Settings' });
  } else if (user?.role === 'SUPERADMIN') {
    links = [
      { to: '/dashboard/admin', icon: ShieldCheck, label: 'Super Admin' }
    ];
  }

  return (
    <div className="w-64 bg-[#0B0F19] h-screen flex flex-col hidden md:flex shrink-0">
      <div className="h-20 px-6 flex items-center gap-3 shrink-0">
        <div className="h-10 w-10 bg-gradient-to-br from-[#C28C46] to-[#8C622C] rounded-xl flex items-center justify-center shadow-lg shadow-[#C28C46]/20">
          <Diamond className="text-white w-6 h-6" />
        </div>
        <h1 className="text-xl font-extrabold text-white tracking-wider">
          RIAN<span className="text-[#C28C46]">JEWEL</span>
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group outline-none focus:outline-none focus:ring-0',
                  isActive 
                    ? 'bg-gradient-to-r from-[#C28C46]/10 to-transparent text-[#C28C46] font-bold border-l-2 border-[#C28C46]' 
                    : 'text-[#94A3B8] font-medium border-l-2 border-transparent hover:bg-[#151B23] hover:text-white'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <div className="px-4 py-3 bg-[#151B23] rounded-xl border border-[#334155]/50 flex items-center gap-3 shadow-lg">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div>
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-bold">System Status</p>
            <p className="text-sm font-medium text-emerald-400 leading-none mt-1">Operational</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
