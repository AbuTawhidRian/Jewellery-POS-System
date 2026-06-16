import React from 'react';
import { useInventory } from '../store/InventoryContext';
import { Package, Scale, TrendingUp, ShoppingBag, LayoutDashboard, Diamond } from 'lucide-react';
import { isToday, parseISO } from 'date-fns';

const Dashboard: React.FC = () => {
  const { items, sales } = useInventory();

  const activeStock = items.filter(i => i.status === 'In Stock');
  const totalItemsInStock = activeStock.length;
  const totalWeightInStock = activeStock.reduce((acc, item) => acc + Math.max(0, (Number(item.weight) || 0) - (Number(item.stone_weight) || 0)), 0);
  
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

  const typeWiseSales = sales.reduce((acc, sale) => {
    if (!acc[sale.type]) acc[sale.type] = { count: 0, weight: 0 };
    acc[sale.type].count += 1;
    acc[sale.type].weight += Math.max(0, (Number(sale.weight) || 0) - (Number(sale.stone_weight) || 0));
    return acc;
  }, {} as Record<string, { count: number, weight: number }>);

  const stats = [
    { label: 'Items In Stock', value: totalItemsInStock, icon: Package, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Gold Weight (g)', value: totalWeightInStock.toFixed(2), icon: Scale, color: 'text-gold-500', bg: 'bg-gold-500/10' },
    { label: 'Sales Today (Items)', value: totalSalesTodayItems, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Total Items Sold', value: totalItemsSold, icon: ShoppingBag, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-gold-500" />
          Dashboard
        </h1>
        <p className="text-slate-400 mt-2">Overview of your jewelry inventory and sales.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl group-hover:bg-white/10 transition-colors"></div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400 mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-bold text-slate-100">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Type-wise Stock */}
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 shadow-lg lg:col-span-1">
          <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Diamond className="w-5 h-5 text-gold-500" />
            Stock by Type
          </h2>
          {Object.keys(typeWiseStock).length === 0 ? (
            <p className="text-slate-500 text-sm py-4">No items in stock.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(typeWiseStock).map(([type, data]) => (
                <div key={type} className="flex justify-between items-center p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700 transition-colors">
                  <span className="text-slate-300 font-medium">{type}</span>
                  <div className="text-right flex flex-col items-end">
                    <span className="bg-slate-800 text-slate-200 font-bold px-2 py-0.5 rounded text-xs mb-1">{data.count} items</span>
                    <span className="text-gold-500 font-bold text-sm">{data.weight.toFixed(2)}g</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Type-wise Sales */}
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 shadow-lg lg:col-span-1">
          <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Sales by Type
          </h2>
          {Object.keys(typeWiseSales).length === 0 ? (
            <p className="text-slate-500 text-sm py-4">No sales recorded.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(typeWiseSales).map(([type, data]) => (
                <div key={type} className="flex justify-between items-center p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700 transition-colors">
                  <span className="text-slate-300 font-medium">{type}</span>
                  <div className="text-right flex flex-col items-end">
                    <span className="bg-slate-800 text-slate-200 font-bold px-2 py-0.5 rounded text-xs mb-1">{data.count} sold</span>
                    <span className="text-emerald-500 font-bold text-sm">{data.weight.toFixed(2)}g</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick overview of recent activity */}
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 shadow-lg lg:col-span-2">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Recent Sales</h2>
        {sales.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No sales recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-800 text-sm text-slate-400">
                  <th className="pb-3 font-medium">Item</th>
                  <th className="pb-3 font-medium">Barcode</th>
                  <th className="pb-3 font-medium">Weight</th>
                  <th className="pb-3 font-medium">Buyer</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {sales.slice(-5).reverse().map((sale) => (
                  <tr key={sale.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 text-slate-200">{sale.type}</td>
                    <td className="py-3 text-slate-400 font-mono">{sale.barcode}</td>
                    <td className="py-3 text-gold-400 font-medium">{Number(sale.weight).toFixed(2)}g</td>
                    <td className="py-3 text-slate-300">{sale.buyer_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Dashboard;
