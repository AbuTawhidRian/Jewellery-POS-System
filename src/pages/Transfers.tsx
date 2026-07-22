import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Download, Upload, ScanLine, Search, Package, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const Transfers: React.FC = () => {
  const { activeBranchId } = useAuth();
  const [activeTab, setActiveTab] = useState<'receive' | 'dispatch' | 'history'>('receive');
  
  // Receive State
  const [barcode, setBarcode] = useState('');
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

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, activeBranchId]);

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

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode) return;
    setReceiving(true);
    try {
      const res = await api.post('/transfers/receive', { barcode });
      toast.success(`Successfully received ${res.data.item.type} (${res.data.item.weight}g)`);
      setBarcode('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to receive item');
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
    } catch (err) {
      toast.error('Item not found or not in stock');
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

  return (
    <div className="flex-1 overflow-x-hidden relative h-[calc(100vh-5rem)] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <ArrowRightLeft className="w-8 h-8 text-[#C28C46]" />
              Stock Transfers
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Manage inventory movement between branches
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
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
              <form onSubmit={handleReceive} className="w-full max-w-2xl mx-auto py-8">
                <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden flex flex-col items-center">
                  <div className="w-full flex justify-between items-center mb-6">
                    <label className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase text-amber-500">
                      <ScanLine className="w-5 h-5" />
                      Receive Item By Barcode
                    </label>
                  </div>
                  
                  <div className="w-full">
                    <input 
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border-b-4 border-slate-300 dark:border-slate-700 focus:border-amber-500 px-6 py-6 text-4xl text-center text-slate-900 dark:text-slate-100 font-mono focus:outline-none transition-colors rounded-t-xl"
                      placeholder="WAITING..."
                      autoComplete="off"
                      autoFocus
                      disabled={receiving}
                    />
                    <p className="text-center text-slate-500 dark:text-slate-400 mt-4 text-sm font-medium">
                      Type or scan with a physical scanner, then press ENTER
                    </p>
                  </div>
                </div>
              </form>
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
                          <th className="p-4 text-slate-500 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dispatchItems.map((item, index) => (
                          <tr key={index} className="border-b border-slate-200 dark:border-slate-800 last:border-0">
                            <td className="p-4 font-mono font-medium">{item.barcode}</td>
                            <td className="p-4">{item.type}</td>
                            <td className="p-4 text-right">{item.weight}</td>
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
            <div>
              {loadingHistory ? (
                <div className="p-8 text-center text-slate-500">Loading history...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="p-4 text-slate-500 font-medium">Date</th>
                        <th className="p-4 text-slate-500 font-medium">Item</th>
                        <th className="p-4 text-slate-500 font-medium">From</th>
                        <th className="p-4 text-slate-500 font-medium">To</th>
                        <th className="p-4 text-slate-500 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfers.map(transfer => (
                        <tr key={transfer.id} className="border-b border-slate-200 dark:border-slate-800">
                          <td className="p-4 text-slate-600 dark:text-slate-400">
                            {new Date(transfer.createdAt).toLocaleString()}
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-slate-900 dark:text-white">{transfer.item?.type || 'Unknown'}</div>
                            <div className="text-xs text-slate-500 font-mono">{transfer.item?.barcode || 'N/A'}</div>
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
                      {transfers.length === 0 && (
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
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Transfers;
