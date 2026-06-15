import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, CreditCard, Plus, Edit2, Trash2, Check, X, ShieldAlert } from 'lucide-react';
import api from '../lib/api';

interface ShopUser {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'staff' | 'subscription'>('staff');
  
  // Staff State
  const [staff, setStaff] = useState<ShopUser[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', role: 'CASHIER' });
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState('');
  
  // Sub State
  const [subscription, setSubscription] = useState<any>(null);
  const [voucherNumber, setVoucherNumber] = useState('');
  const [submittingVoucher, setSubmittingVoucher] = useState(false);

  useEffect(() => {
    if (user?.role === 'OWNER') {
      fetchStaff();
      fetchSubscription();
    }
  }, [user]);

  const fetchStaff = async () => {
    try {
      const res = await api.get('/users');
      setStaff(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const res = await api.get('/subscription');
      setSubscription(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', newStaff);
      setShowAddStaff(false);
      setNewStaff({ name: '', email: '', password: '', role: 'CASHIER' });
      fetchStaff();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add staff');
    }
  };

  const handleUpdateRole = async (id: number) => {
    try {
      await api.patch(`/users/${id}`, { role: editRole });
      setEditingStaffId(null);
      fetchStaff();
    } catch (err) {
      alert('Failed to update role');
    }
  };

  const handleDeleteStaff = async (id: number) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchStaff();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete staff');
    }
  };

  const handleSubmitVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingVoucher(true);
    try {
      await api.post('/subscription/voucher-number', { voucherNumber });
      alert('Voucher submitted successfully. Waiting for admin approval.');
      fetchSubscription();
      setVoucherNumber('');
    } catch (err: any) {
      alert('Failed to submit voucher');
    } finally {
      setSubmittingVoucher(false);
    }
  };

  if (user?.role !== 'OWNER') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <ShieldAlert className="w-16 h-16 text-slate-600 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
        <p>Only the shop owner can access settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white tracking-tight">Settings</h2>
        <p className="text-slate-400 mt-2">Manage your shop, staff, and billing</p>
      </div>

      <div className="flex gap-4 border-b border-slate-800 pb-4">
        <button 
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${activeTab === 'staff' ? 'bg-gold-500/10 text-gold-500' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
        >
          <Users className="w-5 h-5" />
          Staff Management
        </button>
        <button 
          onClick={() => setActiveTab('subscription')}
          className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${activeTab === 'subscription' ? 'bg-gold-500/10 text-gold-500' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
        >
          <CreditCard className="w-5 h-5" />
          Subscription & Billing
        </button>
      </div>

      {activeTab === 'staff' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">Staff Members</h3>
            <button 
              onClick={() => setShowAddStaff(!showAddStaff)}
              className="flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-slate-950 px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              {showAddStaff ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showAddStaff ? 'Cancel' : 'Add Staff'}
            </button>
          </div>

          {showAddStaff && (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <h4 className="text-lg font-medium text-white mb-4">Add New Staff Member</h4>
              <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Name</label>
                  <input required type="text" value={newStaff.name} onChange={(e) => setNewStaff({...newStaff, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gold-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                  <input required type="email" value={newStaff.email} onChange={(e) => setNewStaff({...newStaff, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gold-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                  <input required type="password" value={newStaff.password} onChange={(e) => setNewStaff({...newStaff, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gold-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Role</label>
                  <select value={newStaff.role} onChange={(e) => setNewStaff({...newStaff, role: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gold-500">
                    <option value="MANAGER">Manager</option>
                    <option value="CASHIER">Cashier</option>
                  </select>
                </div>
                <div className="md:col-span-4 flex justify-end mt-2">
                  <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                    Save Staff
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-950/50">
                  <th className="p-4 text-sm font-semibold text-slate-300 border-b border-slate-800">Name</th>
                  <th className="p-4 text-sm font-semibold text-slate-300 border-b border-slate-800">Email</th>
                  <th className="p-4 text-sm font-semibold text-slate-300 border-b border-slate-800">Role</th>
                  <th className="p-4 text-sm font-semibold text-slate-300 border-b border-slate-800 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingStaff ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading...</td></tr>
                ) : (
                  staff.map((s) => (
                    <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                      <td className="p-4 text-white font-medium">{s.name}</td>
                      <td className="p-4 text-slate-400">{s.email}</td>
                      <td className="p-4">
                        {editingStaffId === s.id ? (
                          <select 
                            value={editRole} 
                            onChange={(e) => setEditRole(e.target.value)}
                            className="bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 focus:outline-none focus:border-gold-500 text-sm"
                          >
                            <option value="MANAGER">MANAGER</option>
                            <option value="CASHIER">CASHIER</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.role === 'OWNER' ? 'bg-gold-500/10 text-gold-400 border-gold-500/20' : s.role === 'MANAGER' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                            {s.role}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {s.role !== 'OWNER' && (
                          <div className="flex items-center justify-end gap-2">
                            {editingStaffId === s.id ? (
                              <>
                                <button onClick={() => handleUpdateRole(s.id)} className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setEditingStaffId(null)} className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { setEditingStaffId(s.id); setEditRole(s.role); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteStaff(s.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'subscription' && subscription && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Card */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-xl font-semibold text-white mb-6">Current Plan</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-800">
                <span className="text-slate-400">Status</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${
                  subscription.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  subscription.status === 'TRIAL' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  subscription.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {subscription.status}
                </span>
              </div>
              
              {subscription.status === 'TRIAL' && (
                <div className="flex justify-between items-center py-3 border-b border-slate-800">
                  <span className="text-slate-400">Trial Ends</span>
                  <span className="text-white font-medium">{new Date(subscription.trialEndsAt).toLocaleDateString()}</span>
                </div>
              )}

              {subscription.status === 'ACTIVE' && subscription.endsAt && (
                <div className="flex justify-between items-center py-3 border-b border-slate-800">
                  <span className="text-slate-400">Next Renewal</span>
                  <span className="text-white font-medium">{new Date(subscription.endsAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Card */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-xl font-semibold text-white mb-2">Upgrade / Renew</h3>
            <p className="text-slate-400 text-sm mb-6">To upgrade or renew your subscription, please transfer the payment to the bank account below and submit your voucher number.</p>
            
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Account Holder:</span> <span className="text-white font-medium">MUHAMMAD ABU TAWHID RIAN MUHAMMAD</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Bank Name:</span> <span className="text-white font-medium">Mashreq Bank</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Account Number:</span> <span className="text-white font-medium">019101135322</span></div>
                <div className="flex justify-between"><span className="text-slate-500">IBAN:</span> <span className="text-white font-medium font-mono text-xs mt-1">AE310330000019101135322</span></div>
              </div>
            </div>

            <form onSubmit={handleSubmitVoucher} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Payment Voucher Number</label>
                <input 
                  required 
                  type="text" 
                  value={voucherNumber}
                  onChange={(e) => setVoucherNumber(e.target.value)}
                  placeholder="e.g. TRN-123456789"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold-500" 
                />
              </div>
              <button 
                type="submit" 
                disabled={submittingVoucher}
                className="w-full bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-slate-950 py-3 rounded-lg font-bold transition-colors"
              >
                {submittingVoucher ? 'Submitting...' : 'Submit Voucher for Approval'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
