import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Lock, Barcode, BookOpen, Settings as SettingsIcon, ShieldCheck, ArrowRightLeft } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';

import api from '../lib/api';

const MobileNav: React.FC = () => {
  const { user, hasPermission, activeBranchId } = useAuth();
  const [branches, setBranches] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (user?.role === 'OWNER') {
      api.get('/branches').then(res => setBranches(res.data)).catch(console.error);
    }
  }, [user]);

  const isRetailBranch = Boolean(activeBranchId && branches.length > 0 && branches.find(b => b.id === activeBranchId)?.isMain === false);

  let links: any[] = [];
  
  if (user?.role === 'SUPERADMIN') {
    links = [{ to: '/dashboard/admin', icon: ShieldCheck, label: 'Admin' }];
  } else {
    if (hasPermission('view_dashboard')) links.push({ to: '/dashboard', icon: LayoutDashboard, label: 'Dash' });
    if (hasPermission('view_vault')) links.push({ to: '/dashboard/vault', icon: Lock, label: 'Vault' });
    if (hasPermission('view_vault')) links.push({ to: '/dashboard/transfers', icon: ArrowRightLeft, label: 'Transfers' });
    if (hasPermission('access_pos')) links.push({ to: '/dashboard/pos', icon: Barcode, label: 'POS' });
    if (hasPermission('view_ledger')) links.push({ to: '/dashboard/ledger', icon: BookOpen, label: 'Ledger' });
    if (user?.role === 'OWNER' && !isRetailBranch) links.push({ to: '/dashboard/settings', icon: SettingsIcon, label: 'Set' });
  }



  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800/50 z-50 px-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-colors duration-300">
      <nav className="flex justify-around items-center h-16">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors relative',
                  isActive 
                    ? 'text-[#C28C46]' 
                    : 'text-slate-400 hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#C28C46] rounded-b-full shadow-[0_2px_10px_rgba(194,140,70,0.5)]"></div>
                  )}
                  <Icon className="w-6 h-6" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{link.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileNav;
