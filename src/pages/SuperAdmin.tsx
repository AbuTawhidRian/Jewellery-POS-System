import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import api from '../lib/api';

interface Shop {
  id: number;
  name: string;
  createdAt: string;
  users: { name: string; email: string }[];
  subscription?: {
    status: string;
    trialEndsAt: string;
    startedAt?: string;
    endsAt?: string;
    voucherNumber?: string;
  };
}

const SuperAdmin: React.FC = () => {
  const { user } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingShop, setActivatingShop] = useState<number | null>(null);
  const [voucher, setVoucher] = useState('');
  const [error, setError] = useState('');

  const fetchShops = async () => {
    try {
      const res = await api.get('/admin/shops');
      setShops(res.data);
    } catch (err: any) {
      setError('Failed to load shops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleActivate = async (shopId: number) => {
    try {
      await api.patch(`/admin/subscriptions/${shopId}`, {
        status: 'ACTIVE',
        voucherNumber: voucher || undefined
      });
      setActivatingShop(null);
      setVoucher('');
      fetchShops();
    } catch (err: any) {
      alert('Failed to activate subscription');
    }
  };

  if (user?.role !== 'SUPERADMIN') {
    return <div className="p-8 text-center text-red-500">Access Denied</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-gold-500 w-8 h-8" />
            Super Admin Dashboard
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Manage all shops and subscriptions</p>
        </div>
      </div>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">{error}</div>}

      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white dark:bg-slate-950/50">
                <th className="p-4 text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">Shop ID</th>
                <th className="p-4 text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">Shop Name</th>
                <th className="p-4 text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">Owner</th>
                <th className="p-4 text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">Sub Status</th>
                <th className="p-4 text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">Voucher</th>
                <th className="p-4 text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">Trial Ends</th>
                <th className="p-4 text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Loading...</td></tr>
              ) : shops.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">No shops found.</td></tr>
              ) : (
                shops.map((shop) => (
                  <tr key={shop.id} className="border-b border-slate-200 dark:border-slate-800/50 hover:bg-slate-100 dark:bg-slate-800/20 transition-colors">
                    <td className="p-4 text-slate-700 dark:text-slate-300">{shop.id}</td>
                    <td className="p-4 font-medium text-slate-900 dark:text-white">{shop.name}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      {shop.users[0]?.name} <br/>
                      <span className="text-xs">{shop.users[0]?.email}</span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        shop.subscription?.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        shop.subscription?.status === 'TRIAL' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        shop.subscription?.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {shop.subscription?.status === 'ACTIVE' ? <CheckCircle2 className="w-3.5 h-3.5" /> : 
                         shop.subscription?.status === 'TRIAL' ? <ShieldCheck className="w-3.5 h-3.5" /> :
                         <XCircle className="w-3.5 h-3.5" />}
                        {shop.subscription?.status || 'NONE'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">{shop.subscription?.voucherNumber || '-'}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 text-sm">
                      {new Date(shop.subscription?.trialEndsAt || '').toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      {activatingShop === shop.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <input 
                            type="text" 
                            placeholder="Voucher #" 
                            value={voucher}
                            onChange={(e) => setVoucher(e.target.value)}
                            className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg px-2 py-1.5 w-24 focus:outline-none focus:border-gold-500"
                          />
                          <button 
                            onClick={() => handleActivate(shop.id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 dark:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setActivatingShop(null)}
                            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setActivatingShop(shop.id); setVoucher(shop.subscription?.voucherNumber || ''); }}
                          disabled={shop.subscription?.status === 'ACTIVE'}
                          className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:hover:bg-gold-500 text-slate-950 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdmin;
