import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, AlertCircle, Save } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const BranchSettlement: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fromBranchId: '',
    toBranchId: '',
    weight: '',
    notes: ''
  });

  useEffect(() => {
    fetchBranches();
    fetchTransfers();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gold_transfers');
      setTransfers(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load settlement history');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fromBranchId || !formData.toBranchId || !formData.weight) {
      return toast.error('Please fill in all required fields');
    }
    
    if (formData.fromBranchId === formData.toBranchId) {
      return toast.error('Source and Destination branches cannot be the same');
    }

    setSubmitting(true);
    try {
      await api.post('/gold_transfers', formData);
      toast.success('Gold transfer recorded successfully');
      setFormData({ ...formData, weight: '', notes: '' });
      fetchTransfers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to record transfer');
    } finally {
      setSubmitting(false);
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

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
          <ArrowRightLeft className="w-8 h-8 mr-3 text-[#C28C46]" />
          Branch Gold Settlement
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 shadow rounded-xl p-6 border border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">New Gold Transfer</h2>
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

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes / Description</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-[#C28C46] focus:border-[#C28C46]"
                  rows={3}
                  placeholder="Optional details..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#C28C46] hover:bg-[#a67638] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C28C46] disabled:opacity-50 transition-colors"
              >
                <Save className="w-5 h-5 mr-2" />
                {submitting ? 'Recording...' : 'Record Transfer'}
              </button>
            </form>
          </div>
        </div>

        {/* History Section */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 shadow rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settlement History</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">From</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">To</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Weight (g)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading history...</td>
                    </tr>
                  ) : transfers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No transfers recorded yet.</td>
                    </tr>
                  ) : (
                    transfers.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                          {new Date(t.date).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                          {t.fromBranch?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                          {t.toBranch?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-[#C28C46]">
                          {Number(t.weight).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                          {t.notes || '-'}
                        </td>
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
