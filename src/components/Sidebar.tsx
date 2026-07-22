import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Lock, Barcode, BookOpen, Diamond, Settings as SettingsIcon, ShieldCheck, ArrowRightLeft } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';

import api from '../lib/api';

const Sidebar: React.FC = () => {
  const { user, hasPermission, activeBranchId } = useAuth();
  const [branches, setBranches] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (user?.role === 'OWNER') {
      api.get('/branches').then(res => setBranches(res.data)).catch(console.error);
    }
  }, [user]);

  const isRetailBranch = activeBranchId && branches.length > 0 && !branches.find(b => b.id === activeBranchId)?.isMain;

  let links: any[] = [];
  
  if (user?.role === 'SUPERADMIN') {
    links = [{ to: '/dashboard/admin', icon: ShieldCheck, label: 'Super Admin' }];
  } else {
    if (hasPermission('view_dashboard')) links.push({ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' });
    if (hasPermission('view_vault')) links.push({ to: '/dashboard/vault', icon: Lock, label: 'The Vault' });
    if (hasPermission('view_vault')) links.push({ to: '/dashboard/transfers', icon: ArrowRightLeft, label: 'Transfers' });
    if (hasPermission('access_pos')) links.push({ to: '/dashboard/pos', icon: Barcode, label: 'POS Terminal' });
    if (hasPermission('view_ledger')) links.push({ to: '/dashboard/ledger', icon: BookOpen, label: 'Sales Ledger' });
    if (user?.role === 'OWNER' && !isRetailBranch) links.push({ to: '/dashboard/settings', icon: SettingsIcon, label: 'Settings' });
  }



  return (
    <div className="w-64 bg-white dark:bg-slate-950 transition-colors duration-300 h-screen flex flex-col hidden md:flex shrink-0">
      <div className="h-20 px-6 flex items-center gap-3 shrink-0 overflow-hidden">
        <div className="h-10 w-10 bg-gradient-to-br from-[#C28C46] to-[#8C622C] rounded-xl flex items-center justify-center shadow-lg shadow-[#C28C46]/20 shrink-0">
          <Diamond className="text-white w-6 h-6" />
        </div>
        <h1 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-wider truncate" title={user?.shopName || 'RIANJEWEL'}>
          {user?.shopName ? user.shopName.toUpperCase() : (
            <>RIAN<span className="text-[#C28C46]">JEWEL</span></>
          )}
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/dashboard'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group outline-none focus:outline-none focus:ring-0',
                  isActive 
                    ? 'bg-gradient-to-r from-[#C28C46]/10 to-transparent text-[#C28C46] font-bold border-l-2 border-[#C28C46]' 
                    : 'text-slate-600 dark:text-slate-400 font-medium border-l-2 border-transparent hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
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
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/50 flex items-center gap-3 shadow-lg transition-colors duration-300">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">System Status</p>
            <p className="text-sm font-medium text-emerald-500 dark:text-emerald-400 leading-none mt-1">Operational</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
