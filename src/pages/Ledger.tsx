import React, { useState, useMemo } from 'react';
import { useInventory, type Sale } from '../store/InventoryContext';
import { Download, FileText, Filter, Printer, ChevronDown, ChevronRight, Calendar, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Dialog from '../components/Dialog';
import { useAuth } from '../contexts/AuthContext';

const Ledger: React.FC = () => {
  const { hasPermission } = useAuth();
  const { sales, buyers, itemTypes, payments, metalReceipts, setPrintInvoiceData, setPrintStatementData, setPrintItem, voidTransaction } = useInventory();
  const [filterBuyerId, setFilterBuyerId] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  const [buyerDropdownOpen, setBuyerDropdownOpen] = useState(false);
  const [buyerSearch, setBuyerSearch] = useState('');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

  const buyerRef = React.useRef<HTMLDivElement>(null);
  const dateRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (buyerRef.current && !buyerRef.current.contains(e.target as Node)) setBuyerDropdownOpen(false);
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
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
      const nw = gw > 0 ? Math.max(0, gw - sw) : Math.min(0, gw + sw);
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
    const txMap = new Map<string, { date: string, buyerId: string, buyerName: string, items: Sale[], totalItems: number, totalStone: number, totalNet: number, totalGross: number, totalPure: number, totalMakingCharge: number }>();
    
    filteredSales.forEach(sale => {
      const key = sale.date;
      
      if (!txMap.has(key)) {
        txMap.set(key, {
          date: sale.date,
          buyerId: sale.buyer_id,
          buyerName: sale.buyer_name,
          items: [],
          totalItems: 0,
          totalStone: 0,
          totalNet: 0,
          totalGross: 0,
          totalPure: 0,
          totalMakingCharge: 0
        });
      }
      
      const tx = txMap.get(key)!;
      tx.items.push(sale);
      tx.totalItems++;
      const sw = Number(sale.stone_weight) || 0;
      const gw = Number(sale.weight) || 0;
      const nw = gw > 0 ? Math.max(0, gw - sw) : Math.min(0, gw + sw);
      
      const purity = itemTypes.find(t => t.name === sale.type)?.purity ?? 1.0;
      const pureWeight = nw * purity;
      
      tx.totalStone += sw;
      tx.totalGross += gw;
      tx.totalNet += nw;
      tx.totalPure += pureWeight;
      tx.totalMakingCharge += Number(sale.makingCharge) || 0;
    });
    
    return Array.from(txMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredSales, itemTypes]);

  const printTransactionInvoice = (tx: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrintItem(null); // Clear any pending barcode
    setPrintStatementData(null); // Clear any pending statement
    setPrintInvoiceData({
      buyerName: tx.buyerName,
      items: tx.items,
      date: tx.date,
      totalWeight: Math.abs(tx.totalNet)
    });
    setTimeout(() => window.print(), 100);
  };

  const handlePrintStatement = () => {
    if (filterBuyerId === 'all') {
      setDialogConfig({ isOpen: true, type: 'alert', title: 'Cannot Print', message: 'Please select a specific Buyer Company to print a statement.' });
      return;
    }
    
    if (filteredSales.length === 0) {
      setDialogConfig({ isOpen: true, type: 'alert', title: 'Cannot Print', message: 'No transactions found for this period.' });
      return;
    }

    const buyerName = buyers.find(b => b.id === filterBuyerId)?.name || 'Unknown';
    
    const statementTx = transactions.map(tx => ({
      date: tx.date,
      type: tx.totalNet < 0 ? 'Return' as const : 'Sale' as const,
      totalItems: tx.totalItems,
      grossWeight: tx.totalGross,
      stoneWeight: tx.totalStone,
      netWeight: tx.totalNet,
      pureWeight: tx.totalPure,
      makingCharge: tx.totalMakingCharge,
      items: tx.items
    }));

    const dateRangeStr = filterDateRange === 'all' ? 'All Time' : 
                         filterDateRange === 'today' ? 'Today' : 
                         filterDateRange === 'week' ? 'Past 7 Days' : 
                         filterDateRange === 'month' ? 'This Month' : 
                         `${format(new Date(customStartDate || 0), 'MMM d, yyyy')} - ${format(new Date(customEndDate || Date.now()), 'MMM d, yyyy')}`;

    const statementPayments = payments.filter(p => p.buyerId === filterBuyerId);
    const statementMetalReceipts = metalReceipts.filter(m => m.buyerId === filterBuyerId);

    setPrintItem(null);
    setPrintInvoiceData(null);
    setPrintStatementData({
      buyerName,
      dateRange: dateRangeStr,
      transactions: statementTx,
      totalNetWeight: statementTx.reduce((acc, t) => acc + t.netWeight, 0),
      totalPureWeight: statementTx.reduce((acc, t) => acc + t.pureWeight, 0) - statementMetalReceipts.reduce((acc, m) => acc + (m.weight * m.purity), 0),
      payments: statementPayments,
      metalReceipts: statementMetalReceipts
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <FileText className="w-8 h-8 text-gold-500" />
            Sales Ledger
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Complete history of all checkout transactions.</p>
        </div>
        
          <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gold-500" />
            <div className="relative w-full sm:w-64" ref={buyerRef}>
              <input
                type="text"
                value={buyerDropdownOpen ? buyerSearch : (filterBuyerId === 'all' ? 'All Buyers Report' : buyers.find(b => b.id === filterBuyerId)?.name || '')}
                onChange={(e) => {
                  setBuyerSearch(e.target.value);
                  setBuyerDropdownOpen(true);
                }}
                onFocus={() => {
                  setBuyerSearch('');
                  setBuyerDropdownOpen(true);
                }}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                placeholder="Search buyer..."
              />
              {buyerDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full sm:w-64 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                  <button
                    onClick={() => { setFilterBuyerId('all'); setBuyerDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${filterBuyerId === 'all' ? 'bg-gold-500/10 text-gold-500 font-bold border-l-2 border-gold-500' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border-l-2 border-transparent'}`}
                  >
                    All Buyers Report
                  </button>
                  {buyers.filter(b => b.name.toLowerCase().includes(buyerSearch.toLowerCase())).map(b => (
                    <button
                      key={b.id}
                      onClick={() => { setFilterBuyerId(b.id); setBuyerDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${filterBuyerId === b.id ? 'bg-gold-500/10 text-gold-500 font-bold border-l-2 border-gold-500' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border-l-2 border-transparent'}`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Custom Date Dropdown */}
          <div className="relative" ref={dateRef}>
            <button 
              onClick={() => { setDateDropdownOpen(!dateDropdownOpen); setBuyerDropdownOpen(false); }}
              className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 transition-colors w-full sm:w-48 text-left"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
                <span className="text-sm text-slate-800 dark:text-slate-200 truncate font-medium">
                  {filterDateRange === 'all' ? 'All Time' :
                   filterDateRange === 'today' ? 'Today' :
                   filterDateRange === 'week' ? 'Last 7 Days' :
                   filterDateRange === 'month' ? 'This Month' : 'Custom Range'}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            </button>
            
            {dateDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-full sm:w-48 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 py-1">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: 'week', label: 'Last 7 Days' },
                  { id: 'month', label: 'This Month' },
                  { id: 'custom', label: 'Custom Range' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setFilterDateRange(opt.id); setDateDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${filterDateRange === opt.id ? 'bg-gold-500/10 text-gold-500 font-bold border-l-2 border-gold-500' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:text-white border-l-2 border-transparent'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {filterDateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-gold-500"
              />
              <span className="text-slate-500 dark:text-slate-400">-</span>
              <input 
                type="date" 
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-gold-500"
              />
            </div>
          )}
          
          <button 
            onClick={exportToCSV}
            className="inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-gold-500" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          
          <button 
            onClick={handlePrintStatement}
            disabled={filterBuyerId === 'all'}
            className={`inline-flex items-center justify-center gap-2 font-semibold py-2 px-4 rounded-lg border transition-colors shadow-sm ${filterBuyerId === 'all' ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700'}`}
          >
            <Printer className="w-4 h-4 text-gold-500" />
            <span className="hidden sm:inline">Print Statement</span>
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-0 md:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-white dark:bg-slate-950 z-10">
              <tr className="border-b border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400">
                <th className="pb-3 px-4 font-medium w-10"></th>
                <th className="pb-3 px-4 font-medium">Date/Time Sold</th>
                <th className="pb-3 px-4 font-medium">Buyer Company</th>
                <th className="pb-3 px-4 font-medium text-center">Total Items</th>
                <th className="pb-3 px-4 font-medium text-right">Total Gross Wt</th>
                <th className="pb-3 px-4 font-medium text-right">Total Net Wt</th>
                <th className="pb-3 px-4 font-medium text-right">Total Pure Wt</th>
                <th className="pb-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    No transactions recorded for this filter.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isExpanded = expandedTx === tx.date;
                  const isReturn = tx.totalNet < 0;
                  return (
                    <React.Fragment key={tx.date}>
                      <tr 
                        onClick={() => setExpandedTx(isExpanded ? null : tx.date)}
                        className={`border-b border-slate-200 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${isReturn ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}
                      >
                        <td className="py-4 px-4 text-slate-500 dark:text-slate-400">
                          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </td>
                        <td className="py-4 px-4 text-slate-700 dark:text-slate-300">
                          {format(parseISO(tx.date), 'MMM dd, yyyy')} <br/>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{format(parseISO(tx.date), 'hh:mm:ss a')}</span>
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-800 dark:text-slate-200">
                          {tx.buyerName} {isReturn && <span className="ml-2 text-[10px] font-bold text-red-500 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30">RETURN</span>}
                        </td>
                        <td className="py-4 px-4 font-medium text-slate-700 dark:text-slate-300 text-center">{tx.totalItems}</td>
                        <td className={`py-4 px-4 font-bold text-right ${isReturn ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>{tx.totalGross.toFixed(2)}g</td>
                        <td className={`py-4 px-4 font-bold text-right ${isReturn ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>{tx.totalNet.toFixed(2)}g</td>
                        <td className={`py-4 px-4 font-bold text-right ${isReturn ? 'text-red-500' : 'text-gold-400'}`}>{tx.totalPure.toFixed(2)}g</td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={(e) => printTransactionInvoice(tx, e)}
                              className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors"
                              title="Print Invoice"
                            >
                              <Printer className="w-3.5 h-3.5 text-gold-500" />
                              <span className="hidden sm:inline">Print</span>
                            </button>
                            {hasPermission('delete_sale') && (
                              <button 
                                onClick={(e) => handleDeleteTransaction(tx, e)}
                                className="inline-flex items-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs font-semibold py-1.5 px-3 rounded-lg border border-red-900/50 transition-colors"
                                title="Delete Transaction"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50 dark:bg-slate-900/30">
                          <td colSpan={7} className="p-0 border-b-4 border-slate-100 dark:border-slate-900">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 animate-in slide-in-from-top-2 duration-200">
                              <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isReturn ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                {isReturn ? 'Returned Items' : 'Transaction Details'}
                              </h4>
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                                    <th className="pb-2 px-2 font-medium text-center w-12">Qty</th>
                                    <th className="pb-2 px-2 font-medium">Model</th>
                                    <th className="pb-2 px-2 font-medium">Type</th>
                                    <th className="pb-2 px-2 font-medium text-right">Gr. Wt</th>
                                    <th className="pb-2 px-2 font-medium text-right">St. Wt</th>
                                    <th className="pb-2 px-2 font-medium text-right">Net Wt</th>
                                    <th className="pb-2 px-2 font-medium text-right">Pure Wt</th>
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
                                        pure_weight: 0,
                                      };
                                    }
                                    acc[key].qty += 1;
                                    const itemGw = Number(item.weight) || 0;
                                    const itemSw = Number(item.stone_weight) || 0;
                                    acc[key].weight += itemGw;
                                    acc[key].stone_weight += itemSw;
                                    const purity = itemTypes.find(t => t.name === item.type)?.purity ?? 1.0;
                                    const itemNw = itemGw > 0 ? Math.max(0, itemGw - itemSw) : Math.min(0, itemGw + itemSw);
                                    acc[key].pure_weight += itemNw * purity;
                                    return acc;
                                  }, {})).map((group: any) => {
                                    const sw = Math.abs(group.stone_weight);
                                    const gw = Math.abs(group.weight);
                                    const nw = Math.max(0, gw - sw);
                                    return (
                                      <tr key={`${group.model}-${group.type}`} className="border-b border-slate-200 dark:border-slate-800/30">
                                        <td className="py-2 px-2 font-medium text-slate-700 dark:text-slate-300 text-center">{group.qty}</td>
                                        <td className="py-2 px-2 text-slate-700 dark:text-slate-300">{group.model}</td>
                                        <td className="py-2 px-2 text-slate-600 dark:text-slate-400">{group.type}</td>
                                        <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">{gw.toFixed(2)}g</td>
                                        <td className="py-2 px-2 text-right text-slate-500 dark:text-slate-400">{sw > 0 ? sw.toFixed(2) + 'g' : '-'}</td>
                                        <td className="py-2 px-2 text-right font-medium text-slate-700 dark:text-slate-300">{nw.toFixed(2)}g</td>
                                        <td className="py-2 px-2 text-right font-medium text-gold-500">{group.pure_weight.toFixed(2)}g</td>
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
        
        <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400 flex justify-between">
          <span>Total Transactions: <strong className="text-slate-700 dark:text-slate-300">{transactions.length}</strong></span>
          <div className="flex gap-4">
            <span>Total Net Weight Sold: <strong className="text-slate-700 dark:text-slate-300">{transactions.reduce((acc, tx) => acc + (tx.totalNet > 0 ? tx.totalNet : 0), 0).toFixed(2)}g</strong></span>
            <span>Total Pure Weight Sold: <strong className="text-gold-500">{transactions.reduce((acc, tx) => acc + (tx.totalPure > 0 ? tx.totalPure : 0), 0).toFixed(2)}g</strong></span>
          </div>
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
