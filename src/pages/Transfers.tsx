import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Download, Upload, ScanLine, Package, CheckCircle2, ChevronLeft, ChevronRight, FileText, Calendar, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../lib/api';
import toast from 'react-hot-toast';

const Transfers: React.FC = () => {
  const { activeBranchId, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'receive' | 'dispatch' | 'history'>('receive');

  useEffect(() => {
    if (user?.isReadOnly && activeTab !== 'history') {
      setActiveTab('history');
    }
  }, [user?.isReadOnly, activeTab]);
  
  // Receive State
  const [receiveBarcode, setReceiveBarcode] = useState('');
  const [receiveItems, setReceiveItems] = useState<any[]>([]);
  const [receiving, setReceiving] = useState(false);

  // Dispatch State
  const [branches, setBranches] = useState<any[]>([]);
  const [targetBranchId, setTargetBranchId] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [dispatchBarcode, setDispatchBarcode] = useState('');
  const [dispatchItems, setDispatchItems] = useState<any[]>([]);
  const [dispatching, setDispatching] = useState(false);

  // History State
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilterType, setDateFilterType] = useState<'all' | 'today' | '7days' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const itemsPerPage = 7;

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilterType]);

  useEffect(() => {
    fetchBranches();
    fetchHistory();
  }, [activeBranchId]);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/transfers');
      setTransfers(res.data);
    } catch (err) {
      toast.error('Failed to load transfers');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAddReceiveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveBarcode) return;
    
    if (receiveItems.find(i => i.barcode === receiveBarcode)) {
      toast.error('Item already added to receive list');
      return;
    }
    
    try {
      const res = await api.get(`/transfers/pending/${receiveBarcode}`);
      if (res.data && res.data.item) {
        setReceiveItems([...receiveItems, res.data.item]);
        setReceiveBarcode('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Item not found or not in transit to this branch');
    }
  };

  const handleConfirmReceive = async () => {
    if (receiveItems.length === 0) return toast.error('Add items to receive');
    setReceiving(true);
    try {
      const barcodes = receiveItems.map(i => i.barcode);
      const res = await api.post('/transfers/receive/bulk', { barcodes });
      toast.success(`Successfully received ${res.data.count} items`);
      setReceiveItems([]);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to receive items');
    } finally {
      setReceiving(false);
    }
  };

  const handleAddDispatchItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchBarcode) return;
    
    // In a real app, we might fetch the item details here first to confirm it exists and is in stock
    // For simplicity, we just add the barcode to the list
    if (dispatchItems.find(i => i.barcode === dispatchBarcode)) {
      toast.error('Item already added to dispatch list');
      return;
    }
    
    try {
      // Find item
      const res = await api.get(`/inventory/barcode/${dispatchBarcode}`); // Assuming this exists or we can just fetch all inventory and filter
      if (res.data) {
        setDispatchItems([...dispatchItems, res.data]);
        setSelectedItems([...selectedItems, res.data.id]);
        setDispatchBarcode('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Item not found or not in stock');
    }
  };

  const handleDispatch = async () => {
    if (!targetBranchId) return toast.error('Select a target branch');
    if (selectedItems.length === 0) return toast.error('Add items to dispatch');

    setDispatching(true);
    try {
      await api.post('/transfers', {
        toBranchId: targetBranchId,
        itemIds: selectedItems
      });
      toast.success('Items dispatched successfully!');
      setDispatchItems([]);
      setSelectedItems([]);
      setTargetBranchId('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to dispatch items');
    } finally {
      setDispatching(false);
    }
  };

  const successfulDispatches = transfers.filter(t => t.fromBranchId === activeBranchId && t.status === 'RECEIVED');
  const successfulReceives = transfers.filter(t => t.toBranchId === activeBranchId && t.status === 'RECEIVED');

  const transferStats = {
    dispatchCount: successfulDispatches.length,
    dispatchWeight: successfulDispatches.reduce((acc, t) => acc + (Number(t.item?.weight) || 0), 0),
    receiveCount: successfulReceives.length,
    receiveWeight: successfulReceives.reduce((acc, t) => acc + (Number(t.item?.weight) || 0), 0),
  };
  const filteredTransfers = transfers.filter((t) => {
    const tDate = new Date(t.createdAt);
    tDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilterType === 'today') {
      return tDate.getTime() === today.getTime();
    }
    if (dateFilterType === '7days') {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      return tDate >= sevenDaysAgo && tDate <= today;
    }
    if (dateFilterType === 'month') {
      return tDate.getMonth() === today.getMonth() && tDate.getFullYear() === today.getFullYear();
    }
    if (dateFilterType === 'custom') {
      if (startDate) {
        const sDate = new Date(startDate);
        sDate.setHours(0, 0, 0, 0);
        if (tDate < sDate) return false;
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(0, 0, 0, 0);
        if (tDate > eDate) return false;
      }
    }
    return true;
  });

  const sortedTransfers = [...filteredTransfers].sort((a, b) => {
    if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
    if (b.status === 'PENDING' && a.status !== 'PENDING') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const totalPages = Math.ceil(sortedTransfers.length / itemsPerPage) || 1;
  const paginatedTransfers = sortedTransfers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getDateSuffix = () => {
    if (dateFilterType === 'today') return '_today';
    if (dateFilterType === '7days') return '_last_7_days';
    if (dateFilterType === 'month') return '_this_month';
    if (dateFilterType === 'custom') {
      if (startDate && endDate) return `_${startDate}_to_${endDate}`;
      if (startDate) return `_from_${startDate}`;
      if (endDate) return `_until_${endDate}`;
    }
    return '_all_time';
  };

  const getDateHeader = () => {
    if (dateFilterType === 'today') return '(Today)';
    if (dateFilterType === '7days') return '(Last 7 Days)';
    if (dateFilterType === 'month') return '(This Month)';
    if (dateFilterType === 'custom') {
      if (startDate && endDate) return `(${startDate} to ${endDate})`;
      if (startDate) return `(From ${startDate})`;
      if (endDate) return `(Until ${endDate})`;
    }
    return '(All Time)';
  };

  const exportToExcel = () => {
    const data = filteredTransfers.map(t => ({
      Date: new Date(t.createdAt).toLocaleString(),
      Item_Type: t.item?.type || 'Unknown',
      Barcode: t.item?.barcode || 'N/A',
      'Weight (g)': Number(t.item?.weight || 0).toFixed(2),
      'Making Charge': Number(t.item?.makingCharge || 0).toFixed(2),
      From: t.fromBranch?.name || 'Unknown',
      To: t.toBranch?.name || 'Unknown',
      Status: t.status
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transfers");
    XLSX.writeFile(wb, `transfer_history${getDateSuffix()}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Branch Transfer History ${getDateHeader()}`, 14, 15);
    
    const tableColumn = ["Date", "Item", "Barcode", "Weight (g)", "Making", "From", "To", "Status"];
    const tableRows = filteredTransfers.map(t => [
      new Date(t.createdAt).toLocaleString(),
      t.item?.type || 'Unknown',
      t.item?.barcode || 'N/A',
      Number(t.item?.weight || 0).toFixed(2),
      Number(t.item?.makingCharge || 0).toFixed(2),
      t.fromBranch?.name || 'Unknown',
      t.toBranch?.name || 'Unknown',
      t.status
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] }
    });
    
    doc.save(`transfer_history${getDateSuffix()}.pdf`);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out space-y-6 pb-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <ArrowRightLeft className="w-8 h-8 text-[#C28C46]" />
          Branch Transfers
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Manage inventory movement between branches.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors"></div>
          <h3 className="text-sm font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">Total Successfully Dispatched</h3>
          <div className="flex items-baseline gap-3 relative z-10">
             <span className="text-3xl font-bold text-slate-900 dark:text-white">{transferStats.dispatchCount} <span className="text-base font-medium text-slate-500">items</span></span>
             <span className="text-xl font-bold text-[#C28C46]">{transferStats.dispatchWeight.toFixed(2)}g</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
          <h3 className="text-sm font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">Total Successfully Received</h3>
          <div className="flex items-baseline gap-3 relative z-10">
             <span className="text-3xl font-bold text-slate-900 dark:text-white">{transferStats.receiveCount} <span className="text-base font-medium text-slate-500">items</span></span>
             <span className="text-xl font-bold text-emerald-500">{transferStats.receiveWeight.toFixed(2)}g</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          {!user?.isReadOnly && (
            <>
              <button
                onClick={() => setActiveTab('receive')}
                className={`flex items-center gap-2 px-6 py-3 font-medium rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'receive'
                    ? 'bg-[#C28C46] text-white shadow-lg shadow-[#C28C46]/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Download className="w-5 h-5" />
                Receive Delivery
              </button>
              
              <button
                onClick={() => setActiveTab('dispatch')}
                className={`flex items-center gap-2 px-6 py-3 font-medium rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'dispatch'
                    ? 'bg-[#C28C46] text-white shadow-lg shadow-[#C28C46]/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Upload className="w-5 h-5" />
                Dispatch Items
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-3 font-medium rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-[#C28C46] text-white shadow-lg shadow-[#C28C46]/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Package className="w-5 h-5" />
            Transfer History
          </button>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          
          {activeTab === 'receive' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="col-span-1 border-r border-slate-200 dark:border-slate-800 pr-8">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Receive Details</h3>
                
                <div className="space-y-6">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800 grid gap-4">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Items Staged</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{receiveItems.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Weight (g)</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white">{receiveItems.reduce((s, i) => s + (Number(i.weight) || 0), 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Making</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white">{receiveItems.reduce((s, i) => s + (Number(i.makingCharge) || 0), 0).toFixed(2)}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmReceive}
                    disabled={receiving || receiveItems.length === 0}
                    className="w-full bg-[#C28C46] text-white px-6 py-4 rounded-xl font-bold hover:bg-[#8C622C] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    {receiving ? 'Receiving...' : 'Confirm Receive'}
                  </button>
                </div>
              </div>

              <div className="col-span-2">
                <form onSubmit={handleAddReceiveItem} className="mb-6">
                  <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden flex flex-col items-center">
                    <div className="w-full flex justify-between items-center mb-6">
                      <label className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase text-amber-500">
                        <ScanLine className="w-5 h-5" />
                        Scan Items to Receive
                      </label>
                    </div>
                    
                    <div className="w-full">
                      <input 
                        type="text"
                        value={receiveBarcode}
                        onChange={(e) => setReceiveBarcode(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border-b-4 border-slate-300 dark:border-slate-700 focus:border-amber-500 px-6 py-6 text-4xl text-center text-slate-900 dark:text-slate-100 font-mono focus:outline-none transition-colors rounded-t-xl"
                        placeholder="WAITING..."
                        autoComplete="off"
                        autoFocus
                      />
                      <p className="text-center text-slate-500 dark:text-slate-400 mt-4 text-sm font-medium">
                        Type or scan with a physical scanner, then press ENTER
                      </p>
                    </div>
                  </div>
                </form>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[300px]">
                  {receiveItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-slate-500">
                      <Package className="w-12 h-12 mb-4 opacity-20" />
                      <p>No items added yet</p>
                      <p className="text-sm">Scan items to add them to this receive batch</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800">
                          <th className="p-4 text-slate-500 font-medium">Barcode</th>
                          <th className="p-4 text-slate-500 font-medium">Type</th>
                          <th className="p-4 text-slate-500 font-medium text-right">Weight (g)</th>
                          <th className="p-4 text-slate-500 font-medium text-right">Making</th>
                          <th className="p-4 text-slate-500 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receiveItems.map((item, index) => (
                          <tr key={index} className="border-b border-slate-200 dark:border-slate-800 last:border-0">
                            <td className="p-4 font-mono font-medium">{item.barcode}</td>
                            <td className="p-4">{item.type}</td>
                            <td className="p-4 text-right">{item.weight}</td>
                            <td className="p-4 text-right">{(Number(item.makingCharge) || 0).toFixed(2)}</td>
                            <td className="p-4 text-right">
                              <button 
                                onClick={() => setReceiveItems(receiveItems.filter(i => i.barcode !== item.barcode))}
                                className="text-red-500 hover:text-red-600 font-medium"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dispatch' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="col-span-1 border-r border-slate-200 dark:border-slate-800 pr-8">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Dispatch Details</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Target Branch</label>
                    <select
                      value={targetBranchId}
                      onChange={e => setTargetBranchId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#C28C46]"
                    >
                      <option value="">Select a branch...</option>
                      {branches.filter(b => b.id !== activeBranchId).map(b => (
                        <option key={b.id} value={b.id}>{b.name} {b.isMain ? '(Main Shop)' : ''}</option>
                      ))}
                    </select>
                  </div>

                  {dispatchItems.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800 grid gap-4 mt-4">
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Items Staged</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{dispatchItems.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Weight (g)</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{dispatchItems.reduce((s, i) => s + (Number(i.weight) || 0), 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Making</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{dispatchItems.reduce((s, i) => s + (Number(i.makingCharge) || 0), 0).toFixed(2)}</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleDispatch}
                    disabled={dispatching || selectedItems.length === 0 || !targetBranchId}
                    className="w-full bg-[#C28C46] text-white px-6 py-4 rounded-xl font-bold hover:bg-[#8C622C] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    {dispatching ? 'Dispatching...' : 'Dispatch Items'}
                  </button>
                </div>
              </div>

              <div className="col-span-2">
                <form onSubmit={handleAddDispatchItem} className="mb-6">
                  <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden flex flex-col items-center">
                    <div className="w-full flex justify-between items-center mb-6">
                      <label className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase text-amber-500">
                        <ScanLine className="w-5 h-5" />
                        Scan Items to Dispatch
                      </label>
                    </div>
                    
                    <div className="w-full">
                      <input 
                        type="text"
                        value={dispatchBarcode}
                        onChange={(e) => setDispatchBarcode(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border-b-4 border-slate-300 dark:border-slate-700 focus:border-amber-500 px-6 py-6 text-4xl text-center text-slate-900 dark:text-slate-100 font-mono focus:outline-none transition-colors rounded-t-xl"
                        placeholder="WAITING..."
                        autoComplete="off"
                        autoFocus
                      />
                      <p className="text-center text-slate-500 dark:text-slate-400 mt-4 text-sm font-medium">
                        Type or scan with a physical scanner, then press ENTER
                      </p>
                    </div>
                  </div>
                </form>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[300px]">
                  {dispatchItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-slate-500">
                      <Package className="w-12 h-12 mb-4 opacity-20" />
                      <p>No items added yet</p>
                      <p className="text-sm">Scan items to add them to this dispatch</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800">
                          <th className="p-4 text-slate-500 font-medium">Barcode</th>
                          <th className="p-4 text-slate-500 font-medium">Type</th>
                          <th className="p-4 text-slate-500 font-medium text-right">Weight (g)</th>
                          <th className="p-4 text-slate-500 font-medium text-right">Making</th>
                          <th className="p-4 text-slate-500 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dispatchItems.map((item, index) => (
                          <tr key={index} className="border-b border-slate-200 dark:border-slate-800 last:border-0">
                            <td className="p-4 font-mono font-medium">{item.barcode}</td>
                            <td className="p-4">{item.type}</td>
                            <td className="p-4 text-right">{item.weight}</td>
                            <td className="p-4 text-right">{(Number(item.makingCharge) || 0).toFixed(2)}</td>
                            <td className="p-4 text-right">
                              <button 
                                onClick={() => {
                                  setDispatchItems(dispatchItems.filter(i => i.barcode !== item.barcode));
                                  setSelectedItems(selectedItems.filter(id => id !== item.id));
                                }}
                                className="text-red-500 hover:text-red-600 font-medium"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <select
                      value={dateFilterType}
                      onChange={(e) => setDateFilterType(e.target.value as any)}
                      className="appearance-none pl-10 pr-8 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white text-sm focus:ring-[#C28C46] focus:border-[#C28C46]"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="month">This Month</option>
                      <option value="custom">Custom Range</option>
                    </select>
                    <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <ChevronDown className="w-4 h-4 absolute right-3 top-2.5 text-slate-500 pointer-events-none" />
                  </div>
                  
                  {dateFilterType === 'custom' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                        className="text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white px-3 py-2 focus:ring-[#C28C46] focus:border-[#C28C46]"
                      />
                      <span className="text-slate-500 text-sm font-medium">to</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                        className="text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white px-3 py-2 focus:ring-[#C28C46] focus:border-[#C28C46]"
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportToExcel}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg text-sm font-medium transition-colors border border-emerald-200 dark:border-emerald-800"
                  >
                    <FileText className="w-4 h-4" />
                    Excel
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 rounded-lg text-sm font-medium transition-colors border border-rose-200 dark:border-rose-800"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                </div>
              </div>

              {loadingHistory ? (
                <div className="p-8 text-center text-slate-500">Loading history...</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="p-4 text-slate-500 font-medium">Date</th>
                        <th className="p-4 text-slate-500 font-medium">Item</th>
                        <th className="p-4 text-slate-500 font-medium">Wt/Making</th>
                        <th className="p-4 text-slate-500 font-medium">From</th>
                        <th className="p-4 text-slate-500 font-medium">To</th>
                        <th className="p-4 text-slate-500 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTransfers.map(transfer => (
                        <tr key={transfer.id} className="border-b border-slate-200 dark:border-slate-800">
                          <td className="p-4 text-slate-600 dark:text-slate-400">
                            {new Date(transfer.createdAt).toLocaleString()}
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-slate-900 dark:text-white">{transfer.item?.type || 'Unknown'}</div>
                            <div className="text-xs text-slate-500 font-mono">{transfer.item?.barcode || 'N/A'}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-slate-900 dark:text-white">{transfer.item?.weight || 0}g</div>
                            <div className="text-xs text-slate-500">Mkg: {(Number(transfer.item?.makingCharge) || 0).toFixed(2)}</div>
                          </td>
                          <td className="p-4">{transfer.fromBranch?.name || 'Unknown'}</td>
                          <td className="p-4">{transfer.toBranch?.name || 'Unknown'}</td>
                          <td className="p-4">
                            {transfer.status === 'RECEIVED' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Received
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                In Transit
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {paginatedTransfers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">
                            No transfer history found for this branch.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {activeTab === 'history' && filteredTransfers.length > 0 && !loadingHistory && (
                <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 rounded-b-xl">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Showing <span className="font-medium text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredTransfers.length)}</span> of <span className="font-medium text-slate-900 dark:text-white">{filteredTransfers.length}</span> results
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Transfers;
