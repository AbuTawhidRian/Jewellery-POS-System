import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, CreditCard, Plus, Edit2, Trash2, ShieldAlert, Building2, X, Lock, Building, Search, ChevronDown } from 'lucide-react';
import Dialog from '../components/Dialog';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { BranchesTab } from '../components/settings/BranchesTab';
import Spinner from '../components/Spinner';

const CURRENCIES = [
  { value: "AED", label: "AED (UAE Dirham)" },
  { value: "USD", label: "USD (US Dollar)" },
  { value: "EUR", label: "EUR (Euro)" },
  { value: "GBP", label: "GBP (British Pound)" },
  { value: "INR", label: "INR (Indian Rupee)" },
  { value: "BDT", label: "BDT (Bangladeshi Taka)" },
  { value: "AMD", label: "AMD (Armenian Dram)" },
];

const CurrencySelect = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = CURRENCIES.filter(c => c.label.toLowerCase().includes(searchTerm.toLowerCase()));
  const selectedLabel = CURRENCIES.find(c => c.value === value)?.label || value;

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-slate-900 dark:text-white cursor-pointer flex justify-between items-center focus:outline-none focus:border-gold-500"
        onClick={() => { setIsOpen(!isOpen); setSearchTerm(''); }}
      >
        <span>{selectedLabel || 'Select Currency'}</span>
        <ChevronDown className="w-5 h-5 text-slate-400" />
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input 
              type="text" 
              autoFocus
              className="w-full p-2 bg-transparent outline-none dark:text-white text-sm"
              placeholder="Search currency..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(c => (
              <div 
                key={c.value} 
                className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-200 transition-colors ${c.value === value ? 'bg-gold-50 dark:bg-gold-500/10 text-gold-600 dark:text-gold-400 font-medium' : ''}`}
                onClick={() => {
                  onChange(c.value);
                  setIsOpen(false);
                }}
              >
                {c.label}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-sm text-slate-500">No currency found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface ShopUser {
  id: number;
  name: string;
  email: string;
  role: string;
  customRole?: string;
  accessibleBranches?: string[];
  createdAt: string;
}

const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'company' | 'staff' | 'subscription' | 'security' | 'branches'>('company');
  
  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      toast.success(message, {
        style: {
          background: 'rgb(2, 6, 23)',
          color: '#fff',
          border: '1px solid rgb(30, 41, 59)'
        }
      });
    } else {
      toast.error(message, {
        style: {
          background: 'rgb(2, 6, 23)',
          color: '#fff',
          border: '1px solid rgb(30, 41, 59)'
        }
      });
    }
  }, []);
  
  // Staff State
  const [staff, setStaff] = useState<ShopUser[]>([]);
  const [branches, setBranches] = useState<{id: string, name: string, isMain: boolean}[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState<{name: string, email: string, password: string, role: string, customRole: string, accessibleBranches: string[]}>({ name: '', email: '', password: '', role: 'STAFF', customRole: '', accessibleBranches: [] });
  const [editingStaff, setEditingStaff] = useState<ShopUser | null>(null);
  const [editingStaffPassword, setEditingStaffPassword] = useState('');
  
  // Sub State
  const [subscription, setSubscription] = useState<any>(null);
  const [voucherNumber, setVoucherNumber] = useState('');
  const [submittingVoucher, setSubmittingVoucher] = useState(false);
  
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean; 
    type: 'alert' | 'confirm' | 'prompt'; 
    title: string; 
    message: string;
    onConfirm?: (inputValue?: string) => void;
  }>({ isOpen: false, type: 'alert', title: '', message: '' });

  // Company State
  const [shopInfo, setShopInfo] = useState({ name: '', trn: '', address: '', email: '', phone: '', slogan: '', logoUrl: '', currency: 'AED' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loadingShop, setLoadingShop] = useState(true);
  const [savingShop, setSavingShop] = useState(false);

  // Security State
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user?.role === 'OWNER') {
      fetchStaff();
      fetchBranches();
      fetchSubscription();
      fetchShopInfo();
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

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data);
    } catch (err) {
      console.error(err);
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

  const fetchShopInfo = async () => {
    try {
      const res = await api.get('/shop');
      setShopInfo({
        name: res.data.name || '',
        trn: res.data.trn || '',
        address: res.data.address || '',
        email: res.data.email || '',
        phone: res.data.phone || '',
        slogan: res.data.slogan || '',
        logoUrl: res.data.logoUrl || '',
        currency: res.data.currency || 'AED'
      });
    } catch (err) {
      console.error('Failed to fetch shop info', err);
    } finally {
      setLoadingShop(false);
    }
  };

  const handleUpdateShopInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingShop(true);
    try {
      await api.put('/shop', shopInfo);
      
      updateUser({
        shopName: shopInfo.name,
        shopSlogan: shopInfo.slogan,
        shopEmail: shopInfo.email,
        shopPhone: shopInfo.phone,
        shopCurrency: shopInfo.currency
      });

      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        const res = await api.post('/shop/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setLogoFile(null);
        await fetchShopInfo();
        if (res.data.logoUrl) {
          updateUser({ shopLogo: res.data.logoUrl });
        }
      }

      showNotification('success', 'Company information updated successfully!');
    } catch (err) {
      showNotification('error', 'Failed to update company information');
    } finally {
      setSavingShop(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      setSavingShop(true);
      await api.delete('/shop/logo');
      setLogoFile(null);
      setShopInfo({ ...shopInfo, logoUrl: '' });
      updateUser({ shopLogo: undefined });
      showNotification('success', 'Logo removed successfully!');
      fetchShopInfo();
    } catch (err) {
      showNotification('error', 'Failed to remove logo');
    } finally {
      setSavingShop(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification('error', 'New passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      showNotification('success', 'Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.customRole) {
      showNotification('error', 'Please enter a Role Name');
      return;
    }
    try {
      await api.post('/users', newStaff);
      showNotification('success', 'Staff member added successfully!');
      setNewStaff({ name: '', email: '', password: '', role: 'STAFF', customRole: '', accessibleBranches: [] });
      setShowAddStaff(false);
      fetchStaff();
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || 'Failed to add staff');
    }
  };

  const handleEditStaffSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    try {
      const payload: any = {
        name: editingStaff.name,
        role: editingStaff.role,
        customRole: editingStaff.customRole,
        accessibleBranches: editingStaff.accessibleBranches || []
      };
      if (editingStaffPassword.trim()) {
        if (editingStaffPassword.length < 6) {
          showNotification('error', 'Password must be at least 6 characters');
          return;
        }
        payload.password = editingStaffPassword;
      }
      
      await api.patch(`/users/${editingStaff.id}`, payload);
      showNotification('success', 'Staff member updated successfully!');
      setEditingStaff(null);
      setEditingStaffPassword('');
      fetchStaff();
    } catch (err: any) {
      showNotification('error', 'Failed to update staff member');
    }
  };


  const handleDeleteStaff = (id: number) => {
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Remove Staff',
      message: 'Are you sure you want to remove this staff member?',
      onConfirm: async () => {
        try {
          await api.delete(`/users/${id}`);
          fetchStaff();
          showNotification('success', 'Staff member removed');
        } catch (err: any) {
          showNotification('error', err.response?.data?.error || 'Failed to delete staff');
        }
      }
    });
  };

  const handleSubmitVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingVoucher(true);
    try {
      await api.post('/subscription/voucher-number', { voucherNumber });
      showNotification('success', 'Voucher submitted successfully. Waiting for admin approval.');
      fetchSubscription();
      setVoucherNumber('');
    } catch (err: any) {
      showNotification('error', 'Failed to submit voucher');
    } finally {
      setSubmittingVoucher(false);
    }
  };

  if (user?.role !== 'OWNER') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-600 dark:text-slate-400">
        <ShieldAlert className="w-16 h-16 text-slate-600 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Restricted</h2>
        <p>Only the shop owner can access settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Manage your shop, staff, and billing</p>
      </div>

      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('company')}
          className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'company' ? 'bg-gold-500/10 text-gold-500' : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800/50'}`}
        >
          <Building2 className="w-5 h-5" />
          Company Profile
        </button>
        <button 
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'staff' ? 'bg-gold-500/10 text-gold-500' : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800/50'}`}
        >
          <Users className="w-5 h-5" />
          Staff Management
        </button>
        <button
          onClick={() => setActiveTab('branches')}
          className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'branches' ? 'bg-gold-500/10 text-gold-500' : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800/50'}`}
        >
          <Building className="w-4 h-4" />
          <span className="hidden sm:inline">Branches</span>
        </button>
        <button 
          onClick={() => setActiveTab('subscription')}
          className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'subscription' ? 'bg-gold-500/10 text-gold-500' : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800/50'}`}
        >
          <CreditCard className="w-5 h-5" />
          Subscription & Billing
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'security' ? 'bg-gold-500/10 text-gold-500' : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800/50'}`}
        >
          <Lock className="w-5 h-5" />
          Security
        </button>
      </div>

      {activeTab === 'company' && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl max-w-3xl">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Company Profile</h3>
          {loadingShop ? (
            <p className="text-slate-600 dark:text-slate-400">Loading company information...</p>
          ) : (
            <form onSubmit={handleUpdateShopInfo} className="space-y-6">
              
              {/* Branding & Identity */}
              <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gold-500" /> Branding & Identity
                </h4>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Company Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="relative group">
                        {shopInfo.logoUrl && !logoFile ? (
                          <img src={shopInfo.logoUrl} alt="Shop Logo" className="w-20 h-20 object-contain border-2 border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-white dark:bg-slate-900 shadow-sm" onError={(e) => e.currentTarget.style.display = 'none'} />
                        ) : logoFile ? (
                          <img src={URL.createObjectURL(logoFile)} alt="New Logo" className="w-20 h-20 object-contain border-2 border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-white dark:bg-slate-900 shadow-sm" />
                        ) : (
                          <div className="w-20 h-20 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-900/50 text-slate-400 text-xs text-center p-2">
                            No Logo
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-1">
                        <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm self-start">
                          <span>Choose new image</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 2 * 1024 * 1024) {
                                  showNotification('error', 'Image size must be less than 2MB');
                                  e.target.value = ''; // Reset input
                                  return;
                                }
                                setLogoFile(file);
                              }
                            }} 
                          />
                        </label>
                        {(shopInfo.logoUrl || logoFile) && (
                          <button type="button" onClick={logoFile ? () => setLogoFile(null) : handleRemoveLogo} disabled={savingShop} className="text-xs text-red-500 hover:text-red-600 font-medium self-start px-1">
                            {logoFile ? 'Cancel selection' : 'Remove current logo'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company / Barcode Print Name</label>
                      <select required value={shopInfo.name} onChange={(e) => setShopInfo({...shopInfo, name: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-shadow">
                        <option value="" disabled>Select a branch name...</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Slogan</label>
                      <input type="text" value={shopInfo.slogan} onChange={(e) => setShopInfo({...shopInfo, slogan: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-shadow" placeholder="e.g. Wholesale & Retail Trading" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Settings */}
              <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gold-500" /> Business Settings
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">TRN / Tax Number</label>
                    <input type="text" value={shopInfo.trn} onChange={(e) => setShopInfo({...shopInfo, trn: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-shadow font-mono text-sm" placeholder="e.g. 100000000000003" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Base Currency</label>
                    <CurrencySelect 
                      value={shopInfo.currency} 
                      onChange={(val) => setShopInfo({...shopInfo, currency: val})} 
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-gold-500" /> Contact Information
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                    <input type="email" value={shopInfo.email} onChange={(e) => setShopInfo({...shopInfo, email: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-shadow" placeholder="contact@myjewellery.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                    <input type="tel" value={shopInfo.phone} onChange={(e) => setShopInfo({...shopInfo, phone: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-shadow" placeholder="+971 50 123 4567" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Address</label>
                  <textarea rows={3} value={shopInfo.address} onChange={(e) => setShopInfo({...shopInfo, address: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-shadow resize-none" placeholder="Shop 12, Gold Souq, Dubai, UAE" />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" disabled={savingShop} className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 disabled:opacity-70 text-slate-950 px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-gold-500/20 w-full sm:w-auto">
                  {savingShop ? 'Saving Changes...' : 'Save Company Profile'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl max-w-xl">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Change Password</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Current Password</label>
              <input required type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">New Password</label>
              <input required minLength={6} type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Confirm New Password</label>
              <input required minLength={6} type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-gold-500" />
            </div>
            <div className="pt-4 mt-6 border-t border-slate-200 dark:border-slate-800">
              <button type="submit" disabled={savingPassword} className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-slate-950 px-6 py-3 rounded-lg font-bold transition-colors w-full sm:w-auto">
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}


      {activeTab === 'staff' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Staff Members</h3>
            <button 
              onClick={() => setShowAddStaff(!showAddStaff)}
              className="flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-slate-950 px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              {showAddStaff ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showAddStaff ? 'Cancel' : 'Add Staff'}
            </button>
          </div>

          {showAddStaff && (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl mb-8">
              <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Add New Staff Member</h4>
              <form onSubmit={handleAddStaff} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Name</label>
                    <input required type="text" value={newStaff.name} onChange={(e) => setNewStaff({...newStaff, name: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-gold-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Email</label>
                    <input required type="email" value={newStaff.email} onChange={(e) => setNewStaff({...newStaff, email: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-gold-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Password</label>
                    <input required type="password" value={newStaff.password} onChange={(e) => setNewStaff({...newStaff, password: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-gold-500" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Role Name (e.g. Accountant, Salesman)</label>
                  <input required type="text" value={newStaff.customRole} onChange={(e) => setNewStaff({...newStaff, customRole: e.target.value})} placeholder="e.g. Accountant" className="w-full md:w-1/3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-gold-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Accessible Branches</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {branches.map(b => (
                      <label key={b.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-gold-500 focus:ring-gold-500 focus:ring-offset-slate-900 bg-slate-50 dark:bg-slate-900"
                          checked={newStaff.accessibleBranches.includes(b.id)}
                          onChange={(e) => {
                            if (e.target.checked) setNewStaff({...newStaff, accessibleBranches: [...newStaff.accessibleBranches, b.id]});
                            else setNewStaff({...newStaff, accessibleBranches: newStaff.accessibleBranches.filter(id => id !== b.id)});
                          }}
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {b.name} {b.isMain && <span className="text-xs text-gold-500 ml-1">(Main)</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 dark:text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                    Save Staff
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Staff Modal */}
          {editingStaff && createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Staff Permissions</h3>
                  <button onClick={() => setEditingStaff(null)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <form onSubmit={handleEditStaffSave} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Name</label>
                      <input required type="text" value={editingStaff.name} onChange={(e) => setEditingStaff({...editingStaff, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-gold-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Role Name</label>
                      <input required type="text" value={editingStaff.customRole || ''} onChange={(e) => setEditingStaff({...editingStaff, customRole: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-gold-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">New Password (Optional)</label>
                      <input type="password" placeholder="Leave blank to keep current" value={editingStaffPassword} onChange={(e) => setEditingStaffPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-gold-500 placeholder:text-xs" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Accessible Branches</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {branches.map(b => (
                        <label key={b.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-gold-500 focus:ring-gold-500 focus:ring-offset-slate-900 bg-white dark:bg-slate-950"
                            checked={(editingStaff.accessibleBranches || []).includes(b.id)}
                            onChange={(e) => {
                              const perms = editingStaff.accessibleBranches || [];
                              if (e.target.checked) setEditingStaff({...editingStaff, accessibleBranches: [...perms, b.id]});
                              else setEditingStaff({...editingStaff, accessibleBranches: perms.filter(id => id !== b.id)});
                            }}
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {b.name} {b.isMain && <span className="text-xs text-gold-500 ml-1">(Main)</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <button type="button" onClick={() => setEditingStaff(null)} className="px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" className="px-6 py-2 rounded-lg bg-gold-500 hover:bg-gold-600 text-slate-950 font-bold transition-colors">
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white dark:bg-slate-950/50">
                  <th className="p-4 text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">Name</th>
                  <th className="p-4 text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">Email</th>
                  <th className="p-4 text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">Role</th>
                  <th className="p-4 text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">Branches</th>
                  <th className="p-4 text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingStaff ? (
                  <tr><td colSpan={4} className="p-8 text-center"><Spinner /></td></tr>
                ) : (
                  staff.map((s) => (
                    <tr key={s.id} className="border-b border-slate-200 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <td className="p-4 text-slate-900 dark:text-white font-medium">{s.name}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{s.email}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.role === 'OWNER' ? 'bg-gold-500/10 text-gold-400 border-gold-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                          {s.role === 'OWNER' ? 'Owner' : s.customRole || s.role}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 text-sm">
                        {s.role === 'OWNER' ? 'All Branches' : s.accessibleBranches?.length ? `${s.accessibleBranches.length} Branch(es)` : 'None'}
                      </td>
                      <td className="p-4 text-right">
                        {s.role !== 'OWNER' && (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setEditingStaff(s)} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-gold-500/20 hover:text-gold-400 rounded-lg transition-colors" title="Edit Permissions"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteStaff(s.id)} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors" title="Remove Staff"><Trash2 className="w-4 h-4" /></button>
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
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Current Plan</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Status</span>
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
                <div className="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Trial Ends</span>
                  <span className="text-slate-900 dark:text-white font-medium">{new Date(subscription.trialEndsAt).toLocaleDateString()}</span>
                </div>
              )}

              {subscription.status === 'ACTIVE' && subscription.endsAt && (
                <div className="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Next Renewal</span>
                  <span className="text-slate-900 dark:text-white font-medium">{new Date(subscription.endsAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Card */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Upgrade / Renew</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">To upgrade or renew your subscription, please transfer the payment to the bank account below and submit your voucher number.</p>
            
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Account Holder:</span> <span className="text-slate-900 dark:text-white font-medium">MUHAMMAD ABU TAWHID RIAN MUHAMMAD</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Bank Name:</span> <span className="text-slate-900 dark:text-white font-medium">Mashreq Bank</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Account Number:</span> <span className="text-slate-900 dark:text-white font-medium">019101135322</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">IBAN:</span> <span className="text-slate-900 dark:text-white font-medium font-mono text-xs mt-1">AE310330000019101135322</span></div>
              </div>
            </div>

            <form onSubmit={handleSubmitVoucher} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Payment Voucher Number</label>
                <input 
                  required 
                  type="text" 
                  value={voucherNumber}
                  onChange={(e) => setVoucherNumber(e.target.value)}
                  placeholder="e.g. TRN-123456789"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-gold-500" 
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

      {activeTab === 'branches' && (
        <BranchesTab />
      )}
      
      <Dialog 
        isOpen={dialogConfig.isOpen}
        type={dialogConfig.type as any}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onConfirm={(val) => {
          if (dialogConfig.onConfirm) dialogConfig.onConfirm(val);
          setDialogConfig({ ...dialogConfig, isOpen: false });
        }}
        onCancel={() => setDialogConfig({ ...dialogConfig, isOpen: false })}
      />
    </div>
  );
};

export default Settings;
