import React from 'react';
import { useInventory } from '../store/InventoryContext';
import { Package, Scale, TrendingUp, ShoppingBag, LayoutDashboard, Diamond, Star, Clock } from 'lucide-react';
import { isToday, parseISO } from 'date-fns';

const Dashboard: React.FC = () => {
  const { items, sales, itemTypes } = useInventory();

  const activeStock = items.filter(i => i.status === 'In Stock');
  const totalItemsInStock = activeStock.length;
  const totalWeightInStock = activeStock.reduce((acc, item) => acc + Math.max(0, (Number(item.weight) || 0) - (Number(item.stone_weight) || 0)), 0);
  const totalGrossWeightInStock = activeStock.reduce((acc, item) => acc + (Number(item.weight) || 0), 0);
  const totalPureWeightInStock = activeStock.reduce((acc, item) => {
    const gw = Number(item.weight) || 0;
    const sw = Number(item.stone_weight) || 0;
    const nw = Math.max(0, gw - sw);
    const purity = itemTypes.find(t => t.name === item.type)?.purity ?? 1.0;
    return acc + (nw * purity);
  }, 0);
  
  const todaySales = sales.filter(s => isToday(parseISO(s.date)));
  const totalSalesTodayItems = todaySales.length;
  
  // Note: Since price is not tracked per item, we show the total weight sold today as a proxy, 
  // or just count of items sold. The requirements asked for "Total Sales Today (AED)". 
  // We'll show N/A or calculate based on a mock gold rate if needed, but let's show items count for now.
  const totalItemsSold = sales.length;

  const typeWiseStock = activeStock.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = { count: 0, weight: 0 };
    acc[item.type].count += 1;
    acc[item.type].weight += Math.max(0, (Number(item.weight) || 0) - (Number(item.stone_weight) || 0));
    return acc;
  }, {} as Record<string, { count: number, weight: number }>);

  const modelWiseStock = activeStock.reduce((acc, item) => {
    if (!item.model) return acc;
    const model = item.model.trim();
    if (!model) return acc;
    if (!acc[model]) acc[model] = { count: 0, weight: 0 };
    acc[model].count += 1;
    acc[model].weight += Math.max(0, (Number(item.weight) || 0) - (Number(item.stone_weight) || 0));
    return acc;
  }, {} as Record<string, { count: number, weight: number }>);

  const topStockModels = Object.entries(modelWiseStock)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  const typeWiseSales = sales.reduce((acc, sale) => {
    if (!acc[sale.type]) acc[sale.type] = { count: 0, weight: 0 };
    acc[sale.type].count += 1;
    acc[sale.type].weight += Math.max(0, (Number(sale.weight) || 0) - (Number(sale.stone_weight) || 0));
    return acc;
  }, {} as Record<string, { count: number, weight: number }>);

  const modelWiseSales = sales.reduce((acc, sale) => {
    if (!sale.model) return acc;
    const model = sale.model.trim();
    if (!model) return acc;
    if (!acc[model]) acc[model] = { count: 0, weight: 0 };
    acc[model].count += 1;
    acc[model].weight += Math.max(0, (Number(sale.weight) || 0) - (Number(sale.stone_weight) || 0));
    return acc;
  }, {} as Record<string, { count: number, weight: number }>);

  const topModels = Object.entries(modelWiseSales)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  const totalSalesNetWeight = sales.reduce((acc, sale) => acc + Math.max(0, (Number(sale.weight) || 0) - (Number(sale.stone_weight) || 0)), 0);
  const todaySalesNetWeight = todaySales.reduce((acc, sale) => acc + Math.max(0, (Number(sale.weight) || 0) - (Number(sale.stone_weight) || 0)), 0);

  const inventoryStats = [
    { label: 'Items In Stock', value: totalItemsInStock, icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Gross Weight (g)', value: totalGrossWeightInStock.toFixed(2), icon: Scale, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Net Weight (g)', value: totalWeightInStock.toFixed(2), icon: Scale, color: 'text-gold-500', bg: 'bg-gold-500/10' },
    { label: 'Pure Weight (g)', value: totalPureWeightInStock.toFixed(2), icon: Diamond, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  const salesStats = [
    { label: 'Sales Today (Items)', value: totalSalesTodayItems, icon: TrendingUp, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { label: 'Today Sales Weight (g)', value: todaySalesNetWeight.toFixed(2), icon: Scale, color: 'text-teal-500', bg: 'bg-teal-500/10' },
    { label: 'Total Items Sold', value: totalItemsSold, icon: ShoppingBag, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Total Sales Weight (g)', value: totalSalesNetWeight.toFixed(2), icon: Scale, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  ];

  const StatCard = ({ stat }: { stat: any }) => {
    const Icon = stat.icon;
    return (
      <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent rounded-full blur-2xl group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors"></div>
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{stat.label}</p>
            <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</h3>
          </div>
          <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out space-y-10 pb-10">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-gold-500" />
          Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Comprehensive overview of your jewelry inventory and sales performance.</p>
      </header>

      {/* INVENTORY SECTION */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Package className="w-5 h-5 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Inventory Overview</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {inventoryStats.map((stat, idx) => <StatCard key={`inv-${idx}`} stat={stat} />)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stock by Type */}
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Diamond className="w-4 h-4 text-gold-500" />
              Stock by Type
            </h3>
            {Object.keys(typeWiseStock).length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-sm py-4">No items in stock.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(typeWiseStock).map(([type, data]) => (
                  <div key={type} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{type}</span>
                    <div className="text-right flex flex-col items-end">
                      <span className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold px-2 py-0.5 rounded text-xs mb-1">{data.count} items</span>
                      <span className="text-gold-600 dark:text-gold-500 font-bold text-sm">{data.weight.toFixed(2)}g</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stock by Model */}
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-indigo-500" />
              Stock by Model
            </h3>
            {topStockModels.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-sm py-4">No model stock recorded.</p>
            ) : (
              <div className="space-y-3">
                {topStockModels.map(([model, data], index) => (
                  <div key={model} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{model}</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold px-2 py-0.5 rounded text-xs mb-1">{data.count} items</span>
                      <span className="text-indigo-600 dark:text-indigo-500 font-bold text-sm">{data.weight.toFixed(2)}g</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* SALES SECTION */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Sales Overview</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {salesStats.map((stat, idx) => <StatCard key={`sale-${idx}`} stat={stat} />)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sales by Type */}
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Diamond className="w-4 h-4 text-emerald-500" />
              Sales by Type
            </h3>
            {Object.keys(typeWiseSales).length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-sm py-4">No sales recorded.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(typeWiseSales).map(([type, data]) => (
                  <div key={type} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{type}</span>
                    <div className="text-right flex flex-col items-end">
                      <span className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold px-2 py-0.5 rounded text-xs mb-1">{data.count} sold</span>
                      <span className="text-emerald-600 dark:text-emerald-500 font-bold text-sm">{data.weight.toFixed(2)}g</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Selling Models */}
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Top Selling Models
            </h3>
            {topModels.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-sm py-4">No model sales recorded.</p>
            ) : (
              <div className="space-y-3">
                {topModels.map(([model, data], index) => (
                  <div key={model} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{model}</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold px-2 py-0.5 rounded text-xs mb-1">{data.count} sold</span>
                      <span className="text-amber-600 dark:text-amber-500 font-bold text-sm">{data.weight.toFixed(2)}g</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick overview of recent activity */}
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            Recent Sales Activity
          </h3>
          {sales.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">No sales recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
                    <th className="pb-3 font-medium">Item Type</th>
                    <th className="pb-3 font-medium">Model</th>
                    <th className="pb-3 font-medium">Barcode</th>
                    <th className="pb-3 font-medium">Net Weight</th>
                    <th className="pb-3 font-medium">Buyer</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {sales.slice(-5).reverse().map((sale) => (
                    <tr key={sale.id} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <td className="py-3 text-slate-800 dark:text-slate-200 font-medium">{sale.type}</td>
                      <td className="py-3 text-slate-600 dark:text-slate-400">{sale.model || '-'}</td>
                      <td className="py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">{sale.barcode}</td>
                      <td className="py-3 text-gold-600 dark:text-gold-500 font-medium">
                        {(Number(sale.weight) - Number(sale.stone_weight || 0)).toFixed(2)}g
                      </td>
                      <td className="py-3 text-slate-700 dark:text-slate-300">{sale.buyer_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
