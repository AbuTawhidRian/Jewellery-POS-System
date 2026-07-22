import React, { useState, useEffect } from 'react';
import { Store, Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export const BranchesTab: React.FC = () => {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editBranchId, setEditBranchId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [isMain, setIsMain] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data);
    } catch (err) {
      toast.error('Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleSave = async () => {
    if (!name) return toast.error('Branch name is required');
    setSaving(true);
    try {
      if (editBranchId) {
        await api.put(`/branches/${editBranchId}`, { name, isMain });
        toast.success('Branch updated successfully');
      } else {
        await api.post('/branches', { name, isMain });
        toast.success('Branch created successfully');
      }
      setShowAdd(false);
      setEditBranchId(null);
      setName('');
      setIsMain(false);
      fetchBranches();
      
      // Reload page to refresh context if main branch changed
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save branch');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this branch?')) return;
    try {
      await api.delete(`/branches/${id}`);
      toast.success('Branch deleted');
      fetchBranches();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete branch');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading branches...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Shop Branches</h2>
          <p className="text-sm text-slate-500">Manage multiple locations and transfers</p>
        </div>
        <button
          onClick={() => {
            setShowAdd(true);
            setEditBranchId(null);
            setName('');
            setIsMain(false);
          }}
          className="flex items-center gap-2 bg-[#C28C46] text-white px-4 py-2 rounded-lg hover:bg-[#8C622C] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Branch
        </button>
      </div>

      {showAdd && (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          <h3 className="text-md font-bold text-slate-900 dark:text-white mb-4">
            {editBranchId ? 'Edit Branch' : 'New Branch'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Branch Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white"
                placeholder="e.g. Retail Shop 1"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMain}
                  onChange={e => setIsMain(e.target.checked)}
                  className="w-4 h-4 text-[#C28C46] rounded border-slate-300 focus:ring-[#C28C46]"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Set as Main Shop (HQ)</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowAdd(false); setEditBranchId(null); }}
              className="px-4 py-2 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#C28C46] text-white rounded-lg hover:bg-[#8C622C] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Branch'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-500">
              <th className="p-4">Name</th>
              <th className="p-4">Status</th>
              <th className="p-4">Created</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {branches.map(branch => (
              <tr key={branch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#C28C46]/10 flex items-center justify-center shrink-0">
                      <Store className="w-5 h-5 text-[#C28C46]" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{branch.name}</p>
                      <p className="text-xs text-slate-500">ID: {branch.id.slice(0, 8)}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  {branch.isMain ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#C28C46]/10 text-[#C28C46]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Main Shop (HQ)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Retail Branch
                    </span>
                  )}
                </td>
                <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                  {new Date(branch.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditBranchId(branch.id);
                        setName(branch.name);
                        setIsMain(branch.isMain);
                        setShowAdd(true);
                      }}
                      className="p-2 text-slate-400 hover:text-[#C28C46] transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!branch.isMain && (
                      <button
                        onClick={() => handleDelete(branch.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {branches.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  No branches found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
