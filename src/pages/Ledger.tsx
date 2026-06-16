import React, { useState, useMemo } from 'react';
import { useInventory, type Sale } from '../store/InventoryContext';
import { Download, FileText, Filter, Printer, ChevronDown, ChevronRight, Calendar, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Dialog from '../components/Dialog';

const Ledger: React.FC = () => {
  const { sales, buyers, setPrintInvoiceData, setPrintItem, voidTransaction } = useInventory();
  const [filterBuyerId, setFilterBuyerId] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean; 
    type: 'alert' | 'confirm'; 
    title: string; 
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: 'alert', title: '', message: '' });

  const filteredSales = useMemo(() => {
    let result = sales;
    if (filterBuyerId !== 'all') {
      result = result.filter(s => s.buyer_id === filterBuyerId);
    }
    
    if (filterDateRange !== 'all') {
      const now = new Date();
      result = result.filter(s => {
        const saleDate = parseISO(s.date);
        if (filterDateRange === 'today') {
          return saleDate.toDateString() === now.toDateString();
        } else if (filterDateRange === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return saleDate >= weekAgo;
        } else if (filterDateRange === 'month') {
          return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
        } else if (filterDateRange === 'custom') {
          const start = customStartDate ? new Date(customStartDate) : new Date(0);
          const end = customEndDate ? new Date(customEndDate) : new Date();
          end.setHours(23, 59, 59, 999);
          return saleDate >= start && saleDate <= end;
        }
        return true;
      });
    }
    return result;
  }, [sales, filterBuyerId, filterDateRange, customStartDate, customEndDate]);

  const exportToCSV = () => {
    if (filteredSales.length === 0) {
      setDialogConfig({ isOpen: true, type: 'alert', title: 'Export Failed', message: "No sales data to export for this filter." });
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
        `"${sale.model}"`,
        gw.toFixed(2),
        sw.toFixed(2),
        nw.toFixed(2),
        `"${sale.buyer_name}"`
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
    e.stopPropagation();
    setPrintItem(null); // Clear any pending barcode
    setPrintInvoiceData({
      buyerName: tx.buyerName,
      items: tx.items,
      date: tx.date,
      totalWeight: tx.totalNet
    });
    setTimeout(() => window.print(), 100);
  };

  const handleDeleteTransaction = (tx: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Delete Transaction',
      message: `Are you sure you want to delete this transaction from ${format(parseISO(tx.date), 'MMM dd, yyyy')}? This will delete the sale and return ${tx.totalItems} items back to In Stock.`,
      onConfirm: async () => {
        const result = await voidTransaction(tx.buyerId, tx.date);
        if (!result.success) {
          setDialogConfig({
            isOpen: true,
            type: 'alert',
            title: 'Delete Failed',
            message: result.message
          });
        }
      }
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out h-full flex flex-col">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <FileText className="w-8 h-8 text-gold-500" />
            Sales Ledger
          </h1>
          <p className="text-slate-400 mt-1">Complete history of all checkout transactions.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap md:flex-nowrap">
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

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select 
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value)}
              className="bg-transparent text-sm text-slate-200 focus:outline-none appearance-none cursor-pointer pr-4"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Time</option>
              <option value="today" className="bg-slate-900 text-slate-200">Today</option>
              <option value="week" className="bg-slate-900 text-slate-200">Last 7 Days</option>
              <option value="month" className="bg-slate-900 text-slate-200">This Month</option>
              <option value="custom" className="bg-slate-900 text-slate-200">Custom Range</option>
            </select>
          </div>
          
          {filterDateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold-500"
              />
              <span className="text-slate-500">-</span>
              <input 
                type="date" 
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold-500"
              />
            </div>
          )}
          
          <button 
            onClick={exportToCSV}
            className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold py-2 px-4 rounded-lg border border-slate-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-gold-500" />
            <span className="hidden sm:inline">Export CSV</span>
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
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={(e) => printTransactionInvoice(tx, e)}
                              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-700 transition-colors"
                              title="Print Invoice"
                            >
                              <Printer className="w-3.5 h-3.5 text-gold-500" />
                              <span className="hidden sm:inline">Print</span>
                            </button>
                            <button 
                              onClick={(e) => handleDeleteTransaction(tx, e)}
                              className="inline-flex items-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs font-semibold py-1.5 px-3 rounded-lg border border-red-900/50 transition-colors"
                              title="Delete Transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-900/20 border-b border-slate-800/50">
                          <td colSpan={6} className="p-0">
                            <div className="p-4 pl-14 bg-slate-900/30">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-slate-800 text-slate-500">
                                    <th className="pb-2 px-2 font-medium text-center w-12">Qty</th>
                                    <th className="pb-2 px-2 font-medium">Model</th>
                                    <th className="pb-2 px-2 font-medium">Type</th>
                                    <th className="pb-2 px-2 font-medium text-right">Gr. Wt</th>
                                    <th className="pb-2 px-2 font-medium text-right">St. Wt</th>
                                    <th className="pb-2 px-2 font-medium text-right">Net Wt</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.values(tx.items.reduce((acc: any, item: any) => {
                                    const key = `${item.model || 'Unknown'}-${item.type}`;
                                    if (!acc[key]) {
                                      acc[key] = {
                                        model: item.model || 'Unknown',
                                        type: item.type,
                                        qty: 0,
                                        weight: 0,
                                        stone_weight: 0,
                                      };
                                    }
                                    acc[key].qty += 1;
                                    acc[key].weight += Number(item.weight) || 0;
                                    acc[key].stone_weight += Number(item.stone_weight) || 0;
                                    return acc;
                                  }, {})).map((group: any) => {
                                    const sw = group.stone_weight;
                                    const gw = group.weight;
                                    const nw = Math.max(0, gw - sw);
                                    return (
                                      <tr key={`${group.model}-${group.type}`} className="border-b border-slate-800/30">
                                        <td className="py-2 px-2 font-medium text-slate-300 text-center">{group.qty}</td>
                                        <td className="py-2 px-2 text-slate-300">{group.model}</td>
                                        <td className="py-2 px-2 text-slate-400">{group.type}</td>
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
        type={dialogConfig.type as any}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onConfirm={() => {
          if (dialogConfig.onConfirm) dialogConfig.onConfirm();
          setDialogConfig({ ...dialogConfig, isOpen: false });
        }}
        onCancel={() => setDialogConfig({ ...dialogConfig, isOpen: false })}
      />
    </div>
  );
};

export default Ledger;
