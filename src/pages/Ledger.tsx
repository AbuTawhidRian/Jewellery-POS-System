import React, { useState, useMemo } from 'react';
import { useInventory, type Sale } from '../store/InventoryContext';
import { Download, FileText, Filter, Printer, ChevronDown, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Dialog from '../components/Dialog';

const Ledger: React.FC = () => {
  const { sales, buyers, setPrintInvoiceData } = useInventory();
  const [filterBuyerId, setFilterBuyerId] = useState<string>('all');
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  
  const [dialogConfig, setDialogConfig] = useState<{isOpen: boolean, message: string}>({ isOpen: false, message: '' });

  const filteredSales = filterBuyerId === 'all' 
    ? sales 
    : sales.filter(s => s.buyer_id === filterBuyerId);

  const exportToCSV = () => {
    if (filteredSales.length === 0) {
      setDialogConfig({ isOpen: true, message: "No sales data to export for this filter." });
      return;
    }

    const headers = ['Date/Time Sold', 'Barcode', 'Item Type', 'Model', 'Gross Wt (g)', 'Stone Wt (g)', 'Net Wt (g)', 'Buyer Company'];
    const rows = filteredSales.map(sale => {
      const sw = Number(sale.stone_weight) || 0;
      const gw = Number(sale.weight) || 0;
      const nw = Math.max(0, gw - sw);
      return [
        format(parseISO(sale.date), 'yyyy-MM-dd HH:mm:ss'),
        sale.barcode,
        sale.type,
        `"${sale.description}"`,
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

  const transactions = useMemo(() => {
    const txMap = new Map<string, { date: string, buyerId: string, buyerName: string, items: Sale[], totalItems: number, totalNet: number, totalGross: number }>();
    
    filteredSales.forEach(sale => {
      // Use date as transaction ID since they are grouped in the same millisecond during checkout
      const key = sale.date;
      
      if (!txMap.has(key)) {
        txMap.set(key, {
          date: sale.date,
          buyerId: sale.buyer_id,
          buyerName: sale.buyer_name,
          items: [],
          totalItems: 0,
          totalNet: 0,
          totalGross: 0
        });
      }
      
      const tx = txMap.get(key)!;
      tx.items.push(sale);
      tx.totalItems++;
      const sw = Number(sale.stone_weight) || 0;
      const gw = Number(sale.weight) || 0;
      tx.totalGross += gw;
      tx.totalNet += Math.max(0, gw - sw);
    });
    
    return Array.from(txMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredSales]);

  const printTransactionInvoice = (tx: any, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent expanding the accordion
    setPrintInvoiceData({
      buyerName: tx.buyerName,
      items: tx.items,
      date: tx.date,
      totalWeight: tx.totalNet
    });
    setTimeout(() => window.print(), 100);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out h-full flex flex-col">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <FileText className="w-8 h-8 text-gold-500" />
            Sales Ledger
          </h1>
          <p className="text-slate-400 mt-1">Complete history of all checkout transactions.</p>
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
                <th className="pb-3 px-4 font-medium w-10"></th>
                <th className="pb-3 px-4 font-medium">Date/Time Sold</th>
                <th className="pb-3 px-4 font-medium">Buyer Company</th>
                <th className="pb-3 px-4 font-medium text-center">Total Items</th>
                <th className="pb-3 px-4 font-medium text-right">Total Net Wt</th>
                <th className="pb-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No transactions recorded for this filter.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isExpanded = expandedTx === tx.date;
                  return (
                    <React.Fragment key={tx.date}>
                      <tr 
                        onClick={() => setExpandedTx(isExpanded ? null : tx.date)}
                        className="border-b border-slate-800/50 hover:bg-slate-900/50 cursor-pointer transition-colors"
                      >
                        <td className="py-4 px-4 text-slate-500">
                          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </td>
                        <td className="py-4 px-4 text-slate-300">
                          {format(parseISO(tx.date), 'MMM dd, yyyy')} <br/>
                          <span className="text-xs text-slate-500">{format(parseISO(tx.date), 'hh:mm:ss a')}</span>
                        </td>
                        <td className="py-4 px-4 text-slate-200 font-bold">{tx.buyerName}</td>
                        <td className="py-4 px-4 font-medium text-slate-300 text-center">{tx.totalItems}</td>
                        <td className="py-4 px-4 font-medium text-gold-400 text-right">{tx.totalNet.toFixed(2)}g</td>
                        <td className="py-4 px-4 text-right">
                          <button 
                            onClick={(e) => printTransactionInvoice(tx, e)}
                            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-700 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5 text-gold-500" />
                            Print Invoice
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-900/20 border-b border-slate-800/50">
                          <td colSpan={6} className="p-0">
                            <div className="p-4 pl-14 bg-slate-900/30">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-slate-800 text-slate-500">
                                    <th className="pb-2 px-2 font-medium">Barcode</th>
                                    <th className="pb-2 px-2 font-medium">Model</th>
                                    <th className="pb-2 px-2 font-medium">Type</th>
                                    <th className="pb-2 px-2 font-medium text-right">Gr. Wt</th>
                                    <th className="pb-2 px-2 font-medium text-right">St. Wt</th>
                                    <th className="pb-2 px-2 font-medium text-right">Net Wt</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tx.items.map(item => {
                                    const sw = Number(item.stone_weight) || 0;
                                    const gw = Number(item.weight) || 0;
                                    const nw = Math.max(0, gw - sw);
                                    return (
                                      <tr key={item.id} className="border-b border-slate-800/30">
                                        <td className="py-2 px-2 font-mono text-slate-400">{item.barcode}</td>
                                        <td className="py-2 px-2 text-slate-300">{item.description}</td>
                                        <td className="py-2 px-2 text-slate-400">{item.type}</td>
                                        <td className="py-2 px-2 text-right text-slate-400">{gw.toFixed(2)}g</td>
                                        <td className="py-2 px-2 text-right text-slate-500">{sw > 0 ? sw.toFixed(2) + 'g' : '-'}</td>
                                        <td className="py-2 px-2 text-right font-medium text-slate-300">{nw.toFixed(2)}g</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
        
        <div className="bg-slate-900 border-t border-slate-800 p-4 flex justify-between items-center text-sm">
          <span className="text-slate-400">Total Transactions: <strong className="text-slate-200">{transactions.length}</strong></span>
          <span className="text-slate-400">Total Net Weight Sold: <strong className="text-gold-500">{transactions.reduce((acc, tx) => acc + tx.totalNet, 0).toFixed(2)}g</strong></span>
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
