import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, AlertCircle, Save, CheckCircle, XCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const BranchSettlement: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'cash' | 'gold'>('cash');
  const [branches, setBranches] = useState<any[]>([]);
  const [cashTransfers, setCashTransfers] = useState<any[]>([]);
  const [goldTransfers, setGoldTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
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
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-slate-900 shadow rounded-xl p-6 border border-slate-200 dark:border-slate-800 transition-all duration-300">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
              New {activeTab === 'cash' ? 'Cash Payment' : 'Gold Transfer'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">From Branch</label>
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

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">To Branch</label>
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

              {activeTab === 'cash' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (Cash)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-[#C28C46] focus:border-[#C28C46]"
                    placeholder="0.00"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Weight (g)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-[#C28C46] focus:border-[#C28C46]"
                    placeholder="0.00"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes / Description</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-[#C28C46] focus:border-[#C28C46]"
                  rows={3}
                  placeholder={activeTab === 'cash' ? "e.g. Handed to Boss..." : "e.g. Wholesale 995 pure gold..."}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
              >
                <Save className="w-5 h-5 mr-2" />
                {submitting ? 'Recording...' : `Record ${activeTab === 'cash' ? 'Payment' : 'Transfer'}`}
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
                    {isOwner && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={isOwner ? 6 : 5} className="px-6 py-8 text-center text-slate-500">Loading history...</td>
                    </tr>
                  ) : activeTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={isOwner ? 6 : 5} className="px-6 py-8 text-center text-slate-500">No {activeTab} transfers recorded yet.</td>
                    </tr>
                  ) : (
                    activeTransfers.map((t) => (
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
                        {isOwner && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {t.status === 'PENDING' && (
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchSettlement;
