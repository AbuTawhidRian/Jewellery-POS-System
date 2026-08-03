import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, AlertCircle, Save, CheckCircle, XCircle, ChevronLeft, ChevronRight, Download, FileText, Banknote, Scale, Calendar, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const BranchSettlement: React.FC = () => {
  const { user, hasPermission, activeBranchId } = useAuth();
  const [activeTab, setActiveTab] = useState<'cash' | 'gold'>('cash');
  const [branches, setBranches] = useState<any[]>([]);
  const [cashTransfers, setCashTransfers] = useState<any[]>([]);
  const [goldTransfers, setGoldTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilterType, setDateFilterType] = useState<'all' | 'today' | '7days' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const itemsPerPage = 7;

  useEffect(() => {
    setIsFiltering(true);
    setCurrentPage(1);
    const timer = setTimeout(() => setIsFiltering(false), 300);
    return () => clearTimeout(timer);
  }, [dateFilterType, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
    setDateFilterType('all');
    setStartDate('');
    setEndDate('');
  }, [activeTab]);

  const [formData, setFormData] = useState({
    fromBranchId: '',
    toBranchId: '',
    amount: '',
    weight: '',
    notes: ''
  });

  useEffect(() => {
    fetchBranches();
    fetchCashTransfers();
    fetchGoldTransfers();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCashTransfers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/cash_transfers');
      setCashTransfers(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load cash settlement history');
    } finally {
      setLoading(false);
    }
  };

  const fetchGoldTransfers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gold_transfers');
      setGoldTransfers(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load gold settlement history');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fromBranchId || !formData.toBranchId) {
      return toast.error('Please select both branches');
    }
    
    if (activeTab === 'cash' && !formData.amount) return toast.error('Please enter cash amount');
    if (activeTab === 'gold' && !formData.weight) return toast.error('Please enter gold weight');

    if (formData.fromBranchId === formData.toBranchId) {
      return toast.error('Source and Destination branches cannot be the same');
    }

    setSubmitting(true);
    try {
      if (activeTab === 'cash') {
        await api.post('/cash_transfers', {
          fromBranchId: formData.fromBranchId,
          toBranchId: formData.toBranchId,
          amount: formData.amount,
          notes: formData.notes
        });
        toast.success('Cash payment recorded successfully');
        fetchCashTransfers();
      } else {
        await api.post('/gold_transfers', {
          fromBranchId: formData.fromBranchId,
          toBranchId: formData.toBranchId,
          weight: formData.weight,
          notes: formData.notes
        });
        toast.success('Gold transfer recorded successfully');
        fetchGoldTransfers();
      }
      setFormData({ ...formData, amount: '', weight: '', notes: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Failed to record ${activeTab} transfer`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, type: 'cash' | 'gold', status: 'ACCEPTED' | 'REJECTED') => {
    try {
      await api.put(`/${type}_transfers/${id}/status`, { status });
      toast.success(`${type === 'cash' ? 'Payment' : 'Transfer'} ${status.toLowerCase()} successfully`);
      if (type === 'cash') fetchCashTransfers();
      else fetchGoldTransfers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  const isOwner = user?.role === 'OWNER';
  const hasAuth = isOwner || hasPermission('view_vault');
  const showActionsColumn = isOwner || !!activeBranchId;

  if (!hasAuth) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Access Denied</h2>
        <p className="text-gray-600 dark:text-gray-400">You don't have permission to manage branch settlements.</p>
      </div>
    );
  }

    const activeTransfers = activeTab === 'cash' ? cashTransfers : goldTransfers;

  const filteredTransfers = activeTransfers.filter((t) => {
    const tDate = new Date(t.date);
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

  const totalPages = Math.ceil(filteredTransfers.length / itemsPerPage);
  const paginatedTransfers = filteredTransfers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
      Date: new Date(t.date).toLocaleString(),
      From: t.fromBranch?.name || 'Unknown',
      To: t.toBranch?.name || 'Unknown',
      [activeTab === 'cash' ? 'Amount' : 'Weight (g)']: activeTab === 'cash' ? Number(t.amount).toFixed(2) : Number(t.weight).toFixed(2),
      Status: t.status,
      Notes: t.notes || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Settlements");
    XLSX.writeFile(wb, `${activeTab}_settlements${getDateSuffix()}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`${activeTab === 'cash' ? 'Cash' : 'Gold'} Settlement History ${getDateHeader()}`, 14, 15);
    
    const tableColumn = ["Date", "From", "To", activeTab === 'cash' ? "Amount" : "Weight (g)", "Status", "Notes"];
    const tableRows = filteredTransfers.map(t => [
      new Date(t.date).toLocaleString(),
      t.fromBranch?.name || 'Unknown',
      t.toBranch?.name || 'Unknown',
      activeTab === 'cash' ? Number(t.amount).toFixed(2) : Number(t.weight).toFixed(2),
      t.status,
      t.notes || ''
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] }
    });
    
    doc.save(`${activeTab}_settlements${getDateSuffix()}.pdf`);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out space-y-6 pb-10">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
            <ArrowRightLeft className="w-8 h-8 mr-3 text-emerald-500" />
            Branch Settlements
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Manage cash payments and pure gold transfers between branches.</p>
        </div>
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('cash')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'cash'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Cash Settlement
          </button>
          <button
            onClick={() => setActiveTab('gold')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'gold'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Gold Settlement
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-slate-900 shadow rounded-xl p-6 border border-slate-200 dark:border-slate-800 transition-all duration-300">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
              New {activeTab === 'cash' ? 'Cash Payment' : 'Gold Transfer'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Transfer From</label>
                  <select
                    value={formData.fromBranchId}
                    onChange={(e) => setFormData({ ...formData, fromBranchId: e.target.value })}
                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-[#C28C46] focus:border-[#C28C46]"
                  >
                    <option value="">Select Branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-none pt-6 flex justify-center text-slate-400">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Transfer To</label>
                  <select
                    value={formData.toBranchId}
                    onChange={(e) => setFormData({ ...formData, toBranchId: e.target.value })}
                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-[#C28C46] focus:border-[#C28C46]"
                  >
                    <option value="">Select Branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {activeTab === 'cash' ? (
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Transfer Amount (Cash)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Banknote className="h-6 w-6 text-emerald-500" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-0 focus:border-emerald-500 pl-12 pr-4 py-3 text-2xl font-bold transition-colors shadow-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Transfer Weight (Gold)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Scale className="h-6 w-6 text-gold-500" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-0 focus:border-gold-500 pl-12 pr-12 py-3 text-2xl font-bold transition-colors shadow-sm"
                      placeholder="0.00"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-bold text-xl">g</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes / Description</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-[#C28C46] focus:border-[#C28C46] resize-none"
                  rows={3}
                  placeholder={activeTab === 'cash' ? "e.g. Handed to Boss..." : "e.g. Wholesale 995 pure gold..."}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full flex justify-center items-center mt-2 py-4 px-4 rounded-xl shadow-lg text-lg font-bold text-white transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${
                  activeTab === 'cash' 
                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                    : 'bg-gold-500 hover:bg-gold-600 shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                }`}
              >
                <Save className="w-6 h-6 mr-2" />
                {submitting ? 'Processing...' : `Confirm ${activeTab === 'cash' ? 'Cash Payment' : 'Gold Transfer'}`}
              </button>
            </form>
          </div>
        </div>

        {/* History Section */}
        <div className="xl:col-span-2">
          <div className="bg-white dark:bg-slate-900 shadow rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {activeTab === 'cash' ? 'Cash Payment History' : 'Gold Transfer History'}
              </h2>
            </div>

            {/* Filter and Export Bar */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg text-sm font-medium transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Excel
                </button>
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">From</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">To</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {activeTab === 'cash' ? 'Amount' : 'Weight (g)'}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    {showActionsColumn && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                  {loading || isFiltering ? (
                    <tr>
                      <td colSpan={showActionsColumn ? 6 : 5} className="px-6 py-8 text-center text-slate-500">Loading history...</td>
                    </tr>
                  ) : filteredTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={showActionsColumn ? 6 : 5} className="px-6 py-8 text-center text-slate-500">No {activeTab} transfers recorded yet.</td>
                    </tr>
                  ) : (
                    paginatedTransfers.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                          {new Date(t.date).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                          {t.fromBranch?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                          {t.toBranch?.name || 'Unknown'}
                          <div className="text-xs text-slate-500 font-normal mt-1 max-w-[200px] truncate" title={t.notes}>{t.notes}</div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${activeTab === 'cash' ? 'text-emerald-600 dark:text-emerald-500' : 'text-[#C28C46]'}`}>
                          {activeTab === 'cash' 
                            ? Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : `${Number(t.weight).toFixed(2)}g`
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {t.status === 'PENDING' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                              Pending
                            </span>
                          ) : t.status === 'ACCEPTED' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Accepted
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              Rejected

                            </span>
                          )}
                        </td>
                        {showActionsColumn && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {t.status === 'PENDING' && (isOwner || activeBranchId === t.toBranchId) && (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleUpdateStatus(t.id, activeTab, 'ACCEPTED')}
                                  className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 p-1.5 rounded-lg transition-colors"
                                  title="Accept"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(t.id, activeTab, 'REJECTED')}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 p-1.5 rounded-lg transition-colors"
                                  title="Reject"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTransfers.length)} of {filteredTransfers.length} entries
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchSettlement;
