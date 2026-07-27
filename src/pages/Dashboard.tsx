import React, { useState, useEffect } from 'react';
import { Package, Scale, TrendingUp, ShoppingBag, Diamond, Star, Clock, Edit2, X } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useInventory } from '../store/InventoryContext';

const Dashboard: React.FC = () => {
  const { user, hasPermission, activeBranchId } = useAuth();
  const { itemTypes } = useInventory();
  const currency = user?.shopCurrency || 'AED';

  const [stats, setStats] = useState<any>(null);
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
        let url = '/dashboard/stats';
        if ((user?.role === 'OWNER' || !activeBranchId) && selectedBranchId) {
          url += `?branchId=${selectedBranchId}`;
        }
        const res = await api.get(url);
        setStats(res.data);
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to load dashboard stats');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [selectedBranchId, user]);

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

  if (isLoading || !stats) {
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

  const StatCard = ({ label, value, icon: Icon, colorClass }: { label: string, value: string | number, icon: any, colorClass: string }) => (
    <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-full">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${colorClass}`} />
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <h3 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">{value}</h3>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out pb-12 max-w-7xl mx-auto space-y-6">
      
      {/* Daily Rates Strip */}
      <div className="w-full bg-slate-900 dark:bg-slate-950 text-white border border-slate-800 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Overview of inventory and sales</p>
        </div>
        {(user?.role === 'OWNER' || !activeBranchId) && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Branch:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-sm focus:ring-[#C28C46] focus:border-[#C28C46]"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Inventory KPIs */}
        <StatCard label="Items In Stock" value={stats.totalItemsInStock} icon={Package} colorClass="text-slate-700 dark:text-slate-300" />
        <StatCard label="Net Weight (g)" value={stats.totalWeightInStock?.toFixed(2) || '0.00'} icon={Scale} colorClass="text-slate-700 dark:text-slate-300" />
        <StatCard label="Gross Wt (g)" value={stats.totalGrossWeightInStock?.toFixed(2) || '0.00'} icon={Scale} colorClass="text-slate-700 dark:text-slate-300" />
        <StatCard label="Pure Wt (g)" value={stats.totalPureWeightInStock?.toFixed(2) || '0.00'} icon={Diamond} colorClass="text-slate-700 dark:text-slate-300" />
        
        {/* Sales KPIs */}
        <StatCard label="Total Items Sold" value={stats.totalItemsSold} icon={ShoppingBag} colorClass="text-slate-700 dark:text-slate-300" />
        <StatCard label="Total Sales Wt (g)" value={stats.totalSalesNetWeight?.toFixed(2) || '0.00'} icon={Scale} colorClass="text-slate-700 dark:text-slate-300" />
        <StatCard label="Sales Today" value={stats.totalSalesTodayItems} icon={TrendingUp} colorClass="text-slate-700 dark:text-slate-300" />
        <StatCard label="Today Sales Wt (g)" value={stats.todaySalesNetWeight?.toFixed(2) || '0.00'} icon={Scale} colorClass="text-slate-700 dark:text-slate-300" />

        {/* Breakdown Blocks */}
        
        {/* Stock by Type */}
        <div className="md:col-span-2 xl:col-span-1 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col h-[280px]">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2"><Diamond className="w-4 h-4"/> Stock by Type</h3>
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {!stats.typeWiseStock || Object.keys(stats.typeWiseStock).length === 0 ? (
              <p className="text-slate-400 text-xs">No data.</p>
            ) : (
              Object.entries(stats.typeWiseStock).map(([type, data]: any) => (
                <div key={type} className="flex justify-between items-center text-sm">
                  <span className="text-slate-700 dark:text-slate-200">{type}</span>
                  <span className="font-medium text-slate-900 dark:text-white">{data.weight?.toFixed(2) || '0.00'}g</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stock by Model */}
        <div className="md:col-span-2 xl:col-span-1 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col h-[280px]">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2"><Package className="w-4 h-4"/> Stock by Model</h3>
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {!stats.topStockModels || stats.topStockModels.length === 0 ? (
              <p className="text-slate-400 text-xs">No data.</p>
            ) : (
              stats.topStockModels.map(([model, data]: any) => (
                <div key={model} className="flex justify-between items-center text-sm">
                  <span className="text-slate-700 dark:text-slate-200 truncate pr-2">{model}</span>
                  <span className="font-medium text-slate-900 dark:text-white shrink-0">{data.weight?.toFixed(2) || '0.00'}g</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sales by Type */}
        <div className="md:col-span-2 xl:col-span-1 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col h-[280px]">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> Sales by Type</h3>
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {!stats.typeWiseSales || Object.keys(stats.typeWiseSales).length === 0 ? (
              <p className="text-slate-400 text-xs">No data.</p>
            ) : (
              Object.entries(stats.typeWiseSales).map(([type, data]: any) => (
                <div key={type} className="flex justify-between items-center text-sm">
                  <span className="text-slate-700 dark:text-slate-200">{type}</span>
                  <span className="font-medium text-slate-900 dark:text-white">{data.weight?.toFixed(2) || '0.00'}g</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Selling Models */}
        <div className="md:col-span-2 xl:col-span-1 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col h-[280px]">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2"><Star className="w-4 h-4"/> Top Models</h3>
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {!stats.topModels || stats.topModels.length === 0 ? (
              <p className="text-slate-400 text-xs">No data.</p>
            ) : (
              stats.topModels.map(([model, data]: any) => (
                <div key={model} className="flex justify-between items-center text-sm">
                  <span className="text-slate-700 dark:text-slate-200 truncate pr-2">{model}</span>
                  <span className="font-medium text-slate-900 dark:text-white shrink-0">{data.weight?.toFixed(2) || '0.00'}g</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Sales Activity Table */}
        <div className="md:col-span-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col h-[360px]">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2"><Clock className="w-4 h-4"/> Recent Sales</h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {(!stats.recentSales || stats.recentSales.length === 0) ? (
              <p className="text-slate-400 text-xs">No recent sales.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white dark:bg-slate-950 z-10">
                  <tr className="text-slate-400 text-xs font-medium border-b border-slate-200 dark:border-slate-800">
                    <th className="pb-3 font-normal uppercase tracking-wider">Item Details</th>
                    <th className="pb-3 font-normal uppercase tracking-wider text-right">Net Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {stats.recentSales.map((sale: any) => (
                    <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-200">
                          {sale.type} {sale.model ? <span className="text-slate-500 font-normal">/ {sale.model}</span> : ''}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {sale.barcode} • {sale.buyer_name || 'Walk-in'}
                        </div>
                      </td>
                      <td className="py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                        {(Number(sale.weight) - Number(sale.stone_weight || 0)).toFixed(2)}g
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

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
