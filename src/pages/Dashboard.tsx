import React, { useState, useEffect } from 'react';
import { Package, Scale, TrendingUp, ShoppingBag, Diamond, Star, Clock, Edit2, X } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useInventory } from '../store/InventoryContext';
import OwnerOverview from '../components/OwnerOverview';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const Dashboard: React.FC = () => {
  const { user, hasPermission, activeBranchId } = useAuth();
  const { itemTypes } = useInventory();
  const currency = user?.shopCurrency || 'AED';

  const [stats, setStats] = useState<any>(null);
  const [ownerStats, setOwnerStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role === 'OWNER') {
      const fetchBranches = async () => {
        try {
          const res = await api.get('/branches');
          setBranches(res.data);
        } catch (err) {
          console.error(err);
        }
      };
      fetchBranches();
    }
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        if (user?.role === 'OWNER' && !selectedBranchId) {
          const res = await api.get('/dashboard/owner-stats');
          setOwnerStats(res.data);
          setStats(null);
        } else {
          let url = '/dashboard/stats';
          const branchToFilter = selectedBranchId || activeBranchId;
          if (branchToFilter) {
            url += `?branchId=${branchToFilter}`;
          }
          const res = await api.get(url);
          setStats(res.data);
          setOwnerStats(null);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to load dashboard stats');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [selectedBranchId, activeBranchId, user]);

  const [dailyRates, setDailyRates] = useState<Record<string, number>>({});
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [editRates, setEditRates] = useState<Record<string, number>>({});
  const [savingRate, setSavingRate] = useState<string | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await api.get('/gold_rates');
        if (Array.isArray(res.data)) {
          const newRates: Record<string, number> = {};
          res.data.forEach((r: any) => { newRates[r.type] = r.rate; });
          setDailyRates(newRates);
        }
      } catch (err) {
        console.error("Failed to fetch rates", err);
      }
    };
    fetchRates();
  }, []);

  const openRatesModal = () => {
    setEditRates({ ...dailyRates });
    setIsRatesModalOpen(true);
  };

  const handleRateChange = (type: string, value: string) => {
    const parsed = parseFloat(value);
    setEditRates(prev => ({
      ...prev,
      [type]: isNaN(parsed) ? 0 : parsed
    }));
  };

  const handleSaveRate = async (type: string) => {
    setSavingRate(type);
    try {
      await api.post('/gold_rates', { type, rate: editRates[type] || 0 });
      toast.success(`Rate for ${type} updated!`);
      setDailyRates(prev => ({ ...prev, [type]: editRates[type] || 0 }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update rate');
    } finally {
      setSavingRate(null);
    }
  };

  if (isLoading || (!stats && !ownerStats)) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="relative w-12 h-12">
          <svg viewBox="0 0 64 64" className="w-12 h-12 animate-spin">
            <circle cx="32" cy="32" r="24" fill="none" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="4" />
            <circle cx="32" cy="32" r="24" fill="none" stroke="#C28C46" strokeWidth="4" strokeLinecap="round" strokeDasharray="40 150" />
          </svg>
        </div>
      </div>
    );
  }

  // Determine the effective branch being viewed (explicit dropdown > active context)
  const effectiveBranchId = selectedBranchId || activeBranchId;
  const effectiveBranch = branches.find(b => b.id === effectiveBranchId);
  // Main branch: hide all sales sections — they only do stock/transfers, not retail sales
  const isMainBranch = effectiveBranch?.isMain === true;

  const StatCard = ({ label, value, icon: Icon, colorClass }: { label: string, value: string | number, icon: any, colorClass: string }) => (
    <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-full hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 relative overflow-hidden group">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity blur-2xl ${colorClass.replace('text-', 'bg-')}`}></div>
      <div className="flex items-center gap-2 mb-3 relative z-10">
        <Icon className={`w-4 h-4 ${colorClass}`} />
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight relative z-10">{value}</h3>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out pb-12 space-y-6 w-full">
      
      {/* Daily Rates Strip */}
      <div className="w-full bg-slate-900 dark:bg-slate-950 text-white border border-slate-800 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm shadow-md">
        <div className="flex items-center gap-2 text-amber-500 font-medium shrink-0">
          <TrendingUp className="w-4 h-4" />
          <span>Daily Rates</span>
        </div>
        <div className="flex-1 flex flex-wrap items-center gap-4 sm:justify-end">
          {Object.keys(dailyRates).length === 0 ? (
            <span className="text-slate-400 text-xs">No rates configured</span>
          ) : (
            Object.entries(dailyRates).map(([type, rate]) => (
              <div key={type} className="flex items-center gap-1.5 border-r border-slate-700 pr-4 last:border-0 last:pr-0">
                <span className="text-slate-400">{type}</span>
                <span className="font-semibold text-white">{currency}{Number(rate).toFixed(2)}</span>
              </div>
            ))
          )}
          {(user?.role === 'OWNER' || hasPermission('edit_vault')) && (
            <button
              onClick={openRatesModal}
              className="ml-2 p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
              title="Edit Rates"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time overview of inventory and financials</p>
        </div>
        {(user?.role === 'OWNER' || !activeBranchId) && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Branch:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-2 text-sm focus:ring-[#C28C46] focus:border-[#C28C46] shadow-sm font-medium"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {ownerStats ? (
        <OwnerOverview stats={ownerStats} />
      ) : (
        <>
      {/* Financial Hero Section */}
      {!isMainBranch && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
          {/* Cash Receivable Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 p-6 rounded-[2rem] border border-slate-700/50 relative overflow-hidden shadow-xl shadow-slate-900/10 group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500 ease-out"></div>
            <h3 className="text-slate-400 font-medium flex items-center gap-2 mb-2 relative z-10">
              <TrendingUp className="w-5 h-5 text-emerald-400"/> Outstanding Cash Receivable
            </h3>
            <div className="flex items-end gap-3 relative z-10">
              <h2 className="text-5xl font-extrabold text-white tracking-tight">
                {currency} {stats.totalCashReceivable?.toFixed(2) || '0.00'}
              </h2>
            </div>
            <div className="mt-6 pt-5 border-t border-slate-700/50 flex justify-between items-center text-sm relative z-10">
              <span className="text-slate-400">Making Charge Billed: <strong className="text-emerald-400">{currency} {stats.totalMakingChargeBilled?.toFixed(2) || '0.00'}</strong></span>
              <span className="text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full text-xs font-medium">Included in Cash Bal</span>
            </div>
          </div>

          {/* Gold Receivable Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 p-6 rounded-[2rem] border border-slate-700/50 relative overflow-hidden shadow-xl shadow-slate-900/10 group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#C28C46]/10 rounded-full blur-3xl group-hover:bg-[#C28C46]/20 transition-all duration-500 ease-out"></div>
            <h3 className="text-slate-400 font-medium flex items-center gap-2 mb-2 relative z-10">
              <Diamond className="w-5 h-5 text-[#C28C46]"/> Outstanding Gold Receivable
            </h3>
            <div className="flex items-end gap-3 relative z-10">
              <h2 className="text-5xl font-extrabold text-white tracking-tight">
                {stats.totalGoldReceivable?.toFixed(2) || '0.00'} <span className="text-2xl text-slate-400 font-medium ml-1">g</span>
              </h2>
            </div>
            <div className="mt-6 pt-5 border-t border-slate-700/50 flex justify-between items-center text-sm relative z-10">
              <span className="text-slate-400">Calculated as Pure Gold</span>
              <span className="text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full text-xs font-medium">Net Sales vs Receipts</span>
            </div>
          </div>
        </div>
      )}

      {/* Aging Stock Alert */}
      {stats.agingStockCount > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-3xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-100 dark:bg-rose-900 rounded-xl text-rose-600 dark:text-rose-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-rose-800 dark:text-rose-300">Aging Stock Alert</h4>
              <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">You have {stats.agingStockCount} items in the vault sitting for more than 90 days.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Inventory KPIs */}
        <StatCard label="Vault Pure Wt (g)" value={stats.totalPureWeightInStock?.toFixed(2) || '0.00'} icon={Diamond} colorClass="text-[#C28C46]" />
        <StatCard label="Items In Stock" value={stats.totalItemsInStock} icon={Package} colorClass="text-blue-500" />
        <StatCard label="Vault Gross Wt (g)" value={stats.totalGrossWeightInStock?.toFixed(2) || '0.00'} icon={Scale} colorClass="text-slate-500" />
        
        {!isMainBranch ? (
          <StatCard label="Sales Today" value={stats.totalSalesTodayItems} icon={ShoppingBag} colorClass="text-emerald-500" />
        ) : (
          <StatCard label="Total Making Charge" value={`${currency}${stats.totalMakingChargeInStock?.toFixed(2) || '0.00'}`} icon={Star} colorClass="text-[#C28C46]" />
        )}

        {/* Breakdown Blocks */}
        
        {/* Stock by Type */}
        <div className="md:col-span-2 xl:col-span-1 bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800/60 p-6 flex flex-col h-[280px] shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wider"><Diamond className="w-4 h-4 text-[#C28C46]"/> Stock by Type</h3>
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {!stats.typeWiseStock || Object.keys(stats.typeWiseStock).length === 0 ? (
              <p className="text-slate-400 text-sm">No data available.</p>
            ) : (
              Object.entries(stats.typeWiseStock).map(([type, data]: any) => (
                <div key={type} className="flex justify-between items-center text-sm py-1 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">{type}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{data.weight?.toFixed(2) || '0.00'}g</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stock by Model */}
        <div className="md:col-span-2 xl:col-span-1 bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800/60 p-6 flex flex-col h-[280px] shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wider"><Package className="w-4 h-4 text-blue-500"/> Stock by Model</h3>
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {!stats.topStockModels || stats.topStockModels.length === 0 ? (
              <p className="text-slate-400 text-sm">No data available.</p>
            ) : (
              stats.topStockModels.map(([model, data]: any) => (
                <div key={model} className="flex justify-between items-center text-sm py-1 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                  <span className="text-slate-600 dark:text-slate-400 font-medium truncate pr-2">{model}</span>
                  <span className="font-bold text-slate-900 dark:text-white shrink-0">{data.weight?.toFixed(2) || '0.00'}g</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sales by Type, Recent Sales — hidden for main branch */}
        {!isMainBranch && (
          <>
            {/* Sales by Type */}
            <div className="md:col-span-2 xl:col-span-2 bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800/60 p-6 flex flex-col h-[280px] shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wider"><TrendingUp className="w-4 h-4 text-emerald-500"/> Sales Performance</h3>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Items Sold</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalItemsSold}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Total Wt (g)</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalSalesNetWeight?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
                
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Top Selling Categories</h4>
                {(!stats.topCategories || stats.topCategories.length === 0) ? (
                  <p className="text-slate-400 text-sm">No sales data.</p>
                ) : (
                  <div className="h-40 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.topCategories}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {stats.topCategories.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Sales Activity Table */}
            <div className="md:col-span-4 bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800/60 p-6 flex flex-col h-[360px] shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wider"><Clock className="w-4 h-4 text-purple-500"/> Recent Sales Activity</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {(!stats.recentSales || stats.recentSales.length === 0) ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <ShoppingBag className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm font-medium">No recent sales.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white dark:bg-slate-950 z-10">
                      <tr className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <th className="pb-3 pt-1">Item Details</th>
                        <th className="pb-3 pt-1 text-right">Net Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {stats.recentSales.map((sale: any) => (
                        <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                          <td className="py-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#C28C46] transition-colors">
                              {sale.type} {sale.model ? <span className="text-slate-400 font-medium">/ {sale.model}</span> : ''}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-500 mt-1 font-medium">
                              {sale.barcode} <span className="mx-1">•</span> {sale.buyer_name || 'Walk-in'}
                            </div>
                          </td>
                          <td className="py-4 text-right font-bold text-slate-900 dark:text-slate-100">
                            {(Number(sale.weight) - Number(sale.stone_weight || 0)).toFixed(2)}g
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Daily Rates Modal */}
      {isRatesModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                Edit Daily Gold Rates
              </h2>
              <button 
                onClick={() => setIsRatesModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-white dark:bg-slate-800 shadow-sm rounded-full p-2 transition-all hover:scale-105"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {itemTypes.length === 0 ? (
                <div className="text-center p-8 text-slate-400">
                  No Item Types configured yet. Add them in Inventory settings.
                </div>
              ) : (
                <div className="space-y-3">
                  {itemTypes.map((type) => (
                    <div key={type.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-700/50 transition-colors focus-within:border-amber-500/50 focus-within:bg-amber-50/30 dark:focus-within:bg-amber-900/10">
                      <span className="font-medium text-slate-700 dark:text-slate-200 ml-2">{type.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
                            {currency}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editRates[type.name] === undefined ? '' : editRates[type.name]}
                            onChange={(e) => handleRateChange(type.name, e.target.value)}
                            className="pl-10 pr-3 py-2 w-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-right font-medium text-sm"
                            placeholder="0.00"
                          />
                        </div>
                        <button
                          onClick={() => handleSaveRate(type.name)}
                          disabled={savingRate === type.name || editRates[type.name] === undefined}
                          className="flex items-center justify-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                        >
                          {savingRate === type.name ? '...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        </>
      )}

      {/* Global CSS for custom scrollbar in Bento boxes */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
