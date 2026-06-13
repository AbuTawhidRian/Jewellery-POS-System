import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Lock, Barcode, BookOpen, Diamond } from 'lucide-react';
import clsx from 'clsx';

const Sidebar: React.FC = () => {
  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/vault', icon: Lock, label: 'The Vault' },
    { to: '/pos', icon: Barcode, label: 'POS Terminal' },
    { to: '/ledger', icon: BookOpen, label: 'Sales Ledger' },
  ];

  return (
    <div className="w-64 bg-slate-950 h-screen flex flex-col border-r border-slate-800 hidden md:flex shrink-0">
      <div className="p-6 flex items-center gap-3">
        <Diamond className="text-gold-500 w-8 h-8" />
        <h1 className="text-xl font-bold text-slate-100 tracking-wider">
          ALEX GOLD <span className="text-gold-500">FZC</span>
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
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group outline-none focus:outline-none focus:ring-0',
                  isActive 
                    ? 'bg-slate-900 text-gold-500 shadow-sm' 
                    : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="px-4 py-3 bg-slate-900 rounded-lg border border-slate-800">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Status</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-sm text-slate-300">System Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
