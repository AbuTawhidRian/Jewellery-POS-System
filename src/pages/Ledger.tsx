import React, { useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Download, FileText, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Dialog from '../components/Dialog';

const Ledger: React.FC = () => {
  const { sales, buyers } = useInventory();
  const [filterBuyerId, setFilterBuyerId] = useState<string>('all');
  
  const [dialogConfig, setDialogConfig] = useState<{isOpen: boolean, message: string}>({ isOpen: false, message: '' });

  const filteredSales = filterBuyerId === 'all' 
    ? sales 
    : sales.filter(s => s.buyer_id === filterBuyerId);

  const exportToCSV = () => {
    if (filteredSales.length === 0) {
      setDialogConfig({ isOpen: true, message: "No sales data to export for this filter." });
      return;
    }

    const headers = ['Date/Time Sold', 'Barcode', 'Item Type', 'Gross Wt (g)', 'Stone Wt (g)', 'Net Wt (g)', 'Buyer Company'];
    const rows = filteredSales.map(sale => {
      const sw = Number(sale.stone_weight) || 0;
      const gw = Number(sale.weight) || 0;
      const nw = Math.max(0, gw - sw);
      return [
        format(parseISO(sale.date), 'yyyy-MM-dd HH:mm:ss'),
        sale.barcode,
        sale.type,
        gw.toFixed(2),
        sw.toFixed(2),
        nw.toFixed(2),
        `"${sale.buyer_name}"` // Handle commas in names
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AlexGold_SalesLedger_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out h-full flex flex-col">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <FileText className="w-8 h-8 text-gold-500" />
            Sales Ledger
          </h1>
          <p className="text-slate-400 mt-1">Complete history of all sold inventory.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={filterBuyerId}
              onChange={(e) => setFilterBuyerId(e.target.value)}
              className="bg-transparent text-sm text-slate-200 focus:outline-none appearance-none cursor-pointer pr-4"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Buyers Report</option>
              {buyers.map(b => (
                <option key={b.id} value={b.id} className="bg-slate-900 text-slate-200">{b.name}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={exportToCSV}
            className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold py-2 px-4 rounded-lg border border-slate-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-gold-500" />
            Export CSV
          </button>
        </div>
      </header>

      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-lg flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-0 md:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-slate-950 z-10">
              <tr className="border-b border-slate-800 text-sm text-slate-400">
                <th className="pb-3 px-4 font-medium">Date/Time Sold</th>
                <th className="pb-3 px-4 font-medium">Barcode</th>
                <th className="pb-3 px-4 font-medium">Item Type</th>
                <th className="pb-3 px-4 font-medium">Gr. Wt</th>
                <th className="pb-3 px-4 font-medium">St. Wt</th>
                <th className="pb-3 px-4 font-medium">Net Wt</th>
                <th className="pb-3 px-4 font-medium">Buyer Company</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No sales recorded for this filter.
                  </td>
                </tr>
              ) : (
                filteredSales.slice().reverse().map((sale) => {
                  const sw = Number(sale.stone_weight) || 0;
                  const gw = Number(sale.weight) || 0;
                  const nw = Math.max(0, gw - sw);
                  return (
                  <tr key={sale.id} className="border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors">
                    <td className="py-4 px-4 text-slate-300">
                      {format(parseISO(sale.date), 'MMM dd, yyyy')} <br/>
                      <span className="text-xs text-slate-500">{format(parseISO(sale.date), 'hh:mm:ss a')}</span>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-400">{sale.barcode}</td>
                    <td className="py-4 px-4 text-slate-200">{sale.type}</td>
                    <td className="py-4 px-4 font-medium text-slate-300">{gw.toFixed(2)}g</td>
                    <td className="py-4 px-4 text-slate-400">{sw > 0 ? sw.toFixed(2) + 'g' : '-'}</td>
                    <td className="py-4 px-4 font-medium text-gold-400">{nw.toFixed(2)}g</td>
                    <td className="py-4 px-4 text-slate-300">{sale.buyer_name}</td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
        
        <div className="bg-slate-900 border-t border-slate-800 p-4 flex justify-between items-center text-sm">
          <span className="text-slate-400">Total Records: <strong className="text-slate-200">{filteredSales.length}</strong></span>
          <span className="text-slate-400">Total Weight Sold: <strong className="text-gold-500">{filteredSales.reduce((acc, s) => acc + s.weight, 0).toFixed(2)}g</strong></span>
        </div>
      </div>

      <Dialog 
        isOpen={dialogConfig.isOpen}
        type="alert"
        title="Export Failed"
        message={dialogConfig.message}
        onConfirm={() => setDialogConfig({ ...dialogConfig, isOpen: false })}
        onCancel={() => setDialogConfig({ ...dialogConfig, isOpen: false })}
      />
    </div>
  );
};

export default Ledger;
