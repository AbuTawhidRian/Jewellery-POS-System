import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Lock, Barcode, BookOpen } from 'lucide-react';
import clsx from 'clsx';

const MobileNav: React.FC = () => {
  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dash' },
    { to: '/vault', icon: Lock, label: 'Vault' },
    { to: '/pos', icon: Barcode, label: 'POS' },
    { to: '/ledger', icon: BookOpen, label: 'Ledger' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 z-50 px-2 pb-safe">
      <nav className="flex justify-around items-center h-16">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors',
                  isActive 
                    ? 'text-gold-500' 
                    : 'text-slate-500 hover:text-slate-300'
                )
              }
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileNav;
