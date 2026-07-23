import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useInventory, type Item } from '../store/InventoryContext';
import { Plus, Search, XCircle, Trash2, Printer, Settings, CheckCircle, MoreVertical, Edit2, Lock, Download, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import Dialog from '../components/Dialog';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const Vault: React.FC = () => {
  const { hasPermission, activeBranchId } = useAuth();
  const { itemTypes, models, addItem, editItem, deleteItem, addItemType, editItemType, deleteItemType, addModel, editModel, deleteModel, setPrintInvoiceData, setPrintStatementData, setPrintItem } = useInventory();
  
  const [vaultItems, setVaultItems] = useState<Item[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const ITEMS_PER_PAGE = 7;

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);

  useEffect(() => {
    api.get('/branches')
      .then(res => setBranches(res.data))
      .catch(console.error)
      .finally(() => setLoadingBranches(false));
  }, []);

  const isRetailBranch = Boolean(activeBranchId && branches.length > 0 && branches.find(b => b.id === activeBranchId)?.isMain === false);
  const canEditVault = hasPermission('edit_vault');
  
  // Form State
  const [type, setType] = useState('');
  const [model, setModel] = useState('');
  const [weight, setWeight] = useState('');
  const [stoneWeight, setStoneWeight] = useState('');

  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypePurity, setNewTypePurity] = useState('1.0');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [editingTypePurity, setEditingTypePurity] = useState('1.0');

  const [isManageDescOpen, setIsManageDescOpen] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [editingModelName, setEditingModelName] = useState('');

  // Edit Item Modal State
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; type: string; model: string; weight: string; stone_weight: string } | null>(null);

  // Table Actions Menu State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Dropdown State
  const [typeSearch, setTypeSearch] = useState('');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  const [modelSearch, setModelSearch] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const descDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
      if (descDropdownRef.current && !descDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dialog State
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: 'alert', title: '', message: '' });

  useEffect(() => {
    if (itemTypes.length > 0 && !type) {
      setType(itemTypes[0].name);
      setTypeSearch(itemTypes[0].name);
    }
    if (models.length > 0 && !model) {
      setModel(models[0].name);
      setModelSearch(models[0].name);
    }
  }, [itemTypes, models, type, model]);
  const [printImmediately, setPrintImmediately] = useState(false);

  const fetchVaultData = useCallback(async () => {
    setIsFetching(true);
    try {
      let dateQuery = '';
      if (filterDateRange !== 'all') {
        const now = new Date();
        let start = new Date(0);
        let end = new Date();
        end.setHours(23, 59, 59, 999);
        if (filterDateRange === 'today') {
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (filterDateRange === 'week') {
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (filterDateRange === 'month') {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (filterDateRange === 'custom') {
          start = customStartDate ? new Date(customStartDate) : new Date(0);
          end = customEndDate ? new Date(customEndDate) : end;
          if (customEndDate) {
            end.setHours(23, 59, 59, 999);
          }
        }
        dateQuery = `&startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
      }

      const res = await api.get(`/inventory?page=${currentPage}&limit=${ITEMS_PER_PAGE}&search=${searchTerm}&status=In Stock${dateQuery}`);
      if (res.data.data) {
        setVaultItems(res.data.data);
        setTotalItems(res.data.total);
        setTotalPages(res.data.totalPages);
      } else {
        const filtered = res.data.filter((i: any) => i.status === 'In Stock');
        setVaultItems(filtered);
        setTotalItems(filtered.length);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching vault items:", error);
    } finally {
      setIsFetching(false);
    }
  }, [currentPage, searchTerm, filterDateRange, customStartDate, customEndDate]);

  useEffect(() => {
    fetchVaultData();
  }, [fetchVaultData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handlePrint = (item: Item) => {
    setPrintInvoiceData(null); // Clear any pending invoice
    setPrintStatementData(null); // Clear any pending statement
    setPrintItem(item);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const [isExporting, setIsExporting] = useState(false);

  const exportVaultToCSV = async () => {
    setIsExporting(true);
    try {
      let dateQuery = '';
      if (filterDateRange !== 'all') {
        const now = new Date();
        let start = new Date(0);
        let end = new Date();
        end.setHours(23, 59, 59, 999);
        if (filterDateRange === 'today') {
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (filterDateRange === 'week') {
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (filterDateRange === 'month') {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (filterDateRange === 'custom') {
          start = customStartDate ? new Date(customStartDate) : new Date(0);
          end = customEndDate ? new Date(customEndDate) : end;
          if (customEndDate) end.setHours(23, 59, 59, 999);
        }
        dateQuery = `&startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
      }

      // Fetch all items from the server
      const res = await api.get(`/inventory?page=1&limit=999999&status=In Stock${dateQuery}`);
      const itemsToExport = res.data.data || res.data;
      
      if (!itemsToExport || itemsToExport.length === 0) {
        setDialogConfig({ isOpen: true, type: 'alert', title: 'Export Failed', message: "No active stock available to export." });
        return;
      }

      const headers = ['Barcode', 'Item Type', 'Model', 'Gross Wt (g)', 'Stone Wt (g)', 'Net Wt (g)'];
      const rows = itemsToExport.map((item: any) => {
        const sw = Number(item.stone_weight) || 0;
        const gw = Number(item.weight) || 0;
        const nw = Math.max(0, gw - sw);
        return [
          item.barcode,
          item.type,
          `"${item.model || ''}"`,
          gw.toFixed(2),
          sw.toFixed(2),
          nw.toFixed(2)
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map((row: any) => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Total_Stock_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      setDialogConfig({ isOpen: true, type: 'alert', title: 'Export Error', message: "Failed to export stock list." });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !weight) return;

    const sw = stoneWeight ? parseFloat(stoneWeight) : 0;
    const gw = parseFloat(weight);

    if (sw > gw) {
      setDialogConfig({ isOpen: true, type: 'alert', title: 'Error', message: 'Stone weight cannot be greater than gross weight!' });
      return;
    }

    const result = await addItem({
      type,
      model,
      weight: gw,
      stone_weight: sw
    });

    if (!result.success) {
      setDialogConfig({ isOpen: true, type: 'alert', title: 'Error', message: "Error adding item: " + result.error });
      return;
    }

    fetchVaultData(); // Refresh list after adding

    if (printImmediately && result.data) {
      handlePrint(result.data);
    }

    // Reset form for rapid entry - KEEP Type and Model!
    setWeight('');
    setStoneWeight('');
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <Lock className="w-8 h-8 text-gold-500" />
          The Vault
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm">Manage your active jewelry inventory.</p>
      </div>

      <div className={`grid grid-cols-1 gap-8 ${canEditVault && !loadingBranches && !isRetailBranch ? 'xl:grid-cols-3' : ''}`}>
        {/* Entry Form */}
        {canEditVault && !loadingBranches && !isRetailBranch && (
          <div className="xl:col-span-1">
            <div className="bg-white dark:bg-slate-950 p-4 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-gold-500" />
              Add New Item
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Item Type</label>
                <div className="flex gap-2">
                  <div className="relative flex-1" ref={typeDropdownRef}>
                    <input
                      type="text"
                      value={isTypeDropdownOpen ? typeSearch : type}
                      onChange={(e) => {
                        setTypeSearch(e.target.value);
                        setIsTypeDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setTypeSearch('');
                        setIsTypeDropdownOpen(true);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                      placeholder="Search or select type..."
                    />
                    {isTypeDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {itemTypes.filter(t => t.name.toLowerCase().includes(typeSearch.toLowerCase())).length === 0 ? (
                          <div className="p-3 text-slate-500 dark:text-slate-400 text-sm text-center">No matching types.</div>
                        ) : (
                          itemTypes
                            .filter(t => t.name.toLowerCase().includes(typeSearch.toLowerCase()))
                            .map(t => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  setType(t.name);
                                  setTypeSearch(t.name);
                                  setIsTypeDropdownOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-200 dark:border-slate-800/50 last:border-0"
                              >
                                {t.name}
                              </button>
                            ))
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsManageTypesOpen(true)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-gold-500 text-slate-600 dark:text-slate-400 hover:text-gold-500 rounded-lg px-3 flex items-center justify-center transition-colors"
                    title="Manage Item Types"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Model</label>
                <div className="flex gap-2">
                  <div className="relative flex-1" ref={descDropdownRef}>
                    <input
                      type="text"
                      value={isModelDropdownOpen ? modelSearch : model}
                      onChange={(e) => {
                        setModelSearch(e.target.value);
                        setIsModelDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setModelSearch('');
                        setIsModelDropdownOpen(true);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                      placeholder="Search or select model..."
                    />
                    {isModelDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {models.filter(d => d.name.toLowerCase().includes(modelSearch.toLowerCase())).length === 0 ? (
                          <div className="p-3 text-slate-500 dark:text-slate-400 text-sm text-center">No matching models.</div>
                        ) : (
                          models
                            .filter(d => d.name.toLowerCase().includes(modelSearch.toLowerCase()))
                            .map(d => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => {
                                  setModel(d.name);
                                  setModelSearch(d.name);
                                  setIsModelDropdownOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-200 dark:border-slate-800/50 last:border-0"
                              >
                                {d.name}
                              </button>
                            ))
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsManageDescOpen(true)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-gold-500 text-slate-600 dark:text-slate-400 hover:text-gold-500 rounded-lg px-3 flex items-center justify-center transition-colors"
                    title="Manage Models"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Gross Wt (g)</label>
                  <input 
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Stone Wt (g)</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    value={stoneWeight}
                    onChange={(e) => setStoneWeight(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="printTag" 
                  checked={printImmediately}
                  onChange={(e) => setPrintImmediately(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-gold-500 focus:ring-gold-500 focus:ring-offset-white dark:ring-offset-slate-950 bg-slate-50 dark:bg-slate-900"
                />
                <label htmlFor="printTag" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                  Print tag immediately
                </label>
              </div>

              <button 
                type="submit"
                className="w-full mt-6 bg-gold-500 hover:bg-gold-400 text-slate-950 font-bold py-3 px-4 rounded-lg transition-colors shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_20px_rgba(212,175,55,0.5)]"
              >
                Save Item to Vault
              </button>
            </form>
          </div>
        </div>
        )}

        {/* Inventory List */}
        <div className={canEditVault && !isRetailBranch ? "xl:col-span-2" : ""}>
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg flex-1 overflow-hidden flex flex-col">
            <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Active Stock 
                {isFetching ? (
                  <div className="w-4 h-4 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>({totalItems})</span>
                )}
              </h2>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                
                <div className="relative" ref={dateRef}>
                  <button
                    onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
                    className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-800 dark:text-slate-200 hover:border-gold-500 transition-colors focus:outline-none focus:border-gold-500 min-w-[180px] w-full sm:w-auto"
                  >
                    <Calendar className="w-4 h-4 text-gold-500" />
                    <span className="flex-1 text-left truncate">
                      {filterDateRange === 'all' ? 'All Dates' :
                       filterDateRange === 'today' ? 'Today' :
                       filterDateRange === 'week' ? 'Last 7 Days' :
                       filterDateRange === 'month' ? 'This Month' :
                       filterDateRange === 'custom' && customStartDate && customEndDate ? `${customStartDate} to ${customEndDate}` :
                       'Custom Range'}
                    </span>
                    {dateDropdownOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {dateDropdownOpen && (
                    <div className="absolute z-50 w-full sm:w-64 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl right-0 overflow-hidden">
                      <div className="p-2 border-b border-slate-100 dark:border-slate-800/50 space-y-1">
                        {[
                          { id: 'all', label: 'All Dates' },
                          { id: 'today', label: 'Today' },
                          { id: 'week', label: 'Last 7 Days' },
                          { id: 'month', label: 'This Month' },
                          { id: 'custom', label: 'Custom Range...' }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setFilterDateRange(opt.id);
                              if (opt.id !== 'custom') setDateDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${filterDateRange === opt.id ? 'bg-gold-50 dark:bg-gold-500/10 text-gold-600 dark:text-gold-400 font-medium' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {filterDateRange === 'custom' && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Start Date</label>
                            <input 
                              type="date" 
                              value={customStartDate} 
                              onChange={e => setCustomStartDate(e.target.value)} 
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-gold-500" 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">End Date</label>
                            <input 
                              type="date" 
                              value={customEndDate} 
                              onChange={e => setCustomEndDate(e.target.value)} 
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-gold-500" 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search barcode or type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-gold-500 transition-colors"
                  />
                </div>
                <button 
                  onClick={exportVaultToCSV}
                  disabled={isExporting}
                  className="inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors shadow-sm disabled:opacity-50"
                  title="Export total stock to CSV"
                >
                  <Download className="w-4 h-4 text-gold-500" />
                  <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'CSV'}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-0 md:p-6">
              <div className="overflow-x-auto min-h-[300px] pb-16">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400">
                      <th className="pb-3 px-4 font-medium">Barcode</th>
                      <th className="pb-3 px-4 font-medium">Type</th>
                      <th className="pb-3 px-4 font-medium hidden md:table-cell">Model</th>
                      <th className="pb-3 px-4 font-medium">Gr. Wt</th>
                      <th className="pb-3 px-4 font-medium">St. Wt</th>
                      <th className="pb-3 px-4 font-medium">Net Wt</th>
                      <th className="pb-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {vaultItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                          {isFetching ? 'Loading items...' : 'No items found in active stock.'}
                        </td>
                      </tr>
                    ) : (
                      vaultItems.map((item) => {
                        const sw = Number(item.stone_weight) || 0;
                        const gw = Number(item.weight) || 0;
                        const nw = Math.max(0, gw - sw);
                        return (
                        <tr key={item.id} className="border-b border-slate-200 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                          <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">{item.barcode}</td>
                          <td className="py-3 px-4 text-slate-800 dark:text-slate-200">{item.type}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 hidden md:table-cell truncate max-w-[200px]">{item.model || '-'}</td>
                          <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">{gw.toFixed(2)}g</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{sw > 0 ? sw.toFixed(2) + 'g' : '-'}</td>
                          <td className="py-3 px-4 font-medium text-gold-400">{nw.toFixed(2)}g</td>
                          <td className="py-3 px-4 text-right relative">
                            <div className="flex gap-2 justify-end items-center">
                              <button 
                                onClick={() => handlePrint(item)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gold-500 hover:text-slate-950 transition-colors text-xs font-semibold"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                Print Tag
                              </button>
                              
                              <div className="relative">
                                <button
                                  onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                                  className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white transition-colors border border-slate-300 dark:border-slate-700"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {activeMenuId === item.id && canEditVault && !isRetailBranch && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-40" 
                                      onClick={() => setActiveMenuId(null)}
                                    ></div>
                                    <div className="absolute right-0 top-full mt-1 w-32 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                      <button 
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          setEditingItem({
                                            id: item.id,
                                            type: item.type,
                                            model: item.model || '',
                                            weight: item.weight.toString(),
                                            stone_weight: item.stone_weight ? item.stone_weight.toString() : ''
                                          });
                                          setIsEditItemModalOpen(true);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        Edit
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          setDialogConfig({
                                            isOpen: true,
                                            type: 'confirm',
                                            title: 'Delete Item',
                                            message: `Are you sure you want to delete barcode ${item.barcode}?`,
                                            onConfirm: async () => {
                                              await deleteItem(item.id);
                                              fetchVaultData(); // Refresh list after deleting
                                              setDialogConfig(prev => ({ ...prev, isOpen: false }));
                                            }
                                          });
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border-t border-slate-300 dark:border-slate-700"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <div className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems} items
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || isFetching}
                      className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Previous
                    </button>
                    <div className="text-sm text-slate-500 dark:text-slate-400 sm:hidden flex items-center">
                      {currentPage} / {totalPages}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || isFetching}
                      className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Manage Types Modal */}
      {isManageTypesOpen && (
        <div className="fixed inset-0 bg-white dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950/50 shrink-0">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Settings className="w-6 h-6 text-gold-500" />
                Manage Item Types
              </h3>
              <button 
                onClick={() => setIsManageTypesOpen(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto overflow-x-hidden flex-1">
              <div className="space-y-2 mb-6">
                {itemTypes.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-4">No item types found.</p>
                ) : (
                  itemTypes.map(t => (
                    <div key={t.id} className="flex justify-between items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                      {editingTypeId === t.id ? (
                        <div className="flex flex-1 flex-col sm:flex-row gap-2 mr-2 min-w-0">
                          <input
                            type="text"
                            value={editingTypeName}
                            onChange={(e) => setEditingTypeName(e.target.value)}
                            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-gold-500 rounded px-2 py-1 text-slate-900 dark:text-slate-100 text-sm focus:outline-none min-w-0"
                            autoFocus
                            placeholder="Type Name"
                          />
                          <input
                            type="number"
                            step="0.001"
                            value={editingTypePurity}
                            onChange={(e) => setEditingTypePurity(e.target.value)}
                            className="w-full sm:w-24 bg-slate-50 dark:bg-slate-900 border border-gold-500 rounded px-2 py-1 text-slate-900 dark:text-slate-100 text-sm focus:outline-none"
                            placeholder="Purity"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-1 justify-between items-center mr-4 min-w-0 gap-2">
                          <span className="text-slate-800 dark:text-slate-200 font-medium truncate">{t.name}</span>
                          <span className="text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap shrink-0">Purity: {t.purity ?? 1.0}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center shrink-0">
                        {editingTypeId === t.id ? (
                          <>
                            <button
                              onClick={async () => {
                                if (!editingTypeName.trim() || (editingTypeName === t.name && parseFloat(editingTypePurity) === (t.purity ?? 1.0))) {
                                  setEditingTypeId(null);
                                  return;
                                }
                                const success = await editItemType(t.id, editingTypeName.trim(), parseFloat(editingTypePurity) || 1.0);
                                if (success && type === t.name) {
                                  setType(editingTypeName.trim());
                                  setTypeSearch(editingTypeName.trim());
                                }
                                setEditingTypeId(null);
                              }}
                              className="p-2 text-gold-500 hover:text-gold-400 hover:bg-gold-500/10 rounded-lg transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingTypeId(null)}
                              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingTypeId(t.id);
                                setEditingTypeName(t.name);
                                setEditingTypePurity((t.purity ?? 1.0).toString());
                              }}
                              className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                              title="Edit type"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (vaultItems.some(i => i.type === t.name)) {
                                  setDialogConfig({
                                    isOpen: true,
                                    type: 'alert',
                                    title: 'Cannot Delete',
                                    message: `Cannot delete '${t.name}' because it is currently used by items in active stock.`
                                  });
                                  return;
                                }
                                setDialogConfig({
                                  isOpen: true,
                                  type: 'confirm',
                                  title: 'Delete Type',
                                  message: `Are you sure you want to delete '${t.name}'?`,
                                  onConfirm: async () => {
                                    const success = await deleteItemType(t.id);
                                    if (success && type === t.name) {
                                      const newType = itemTypes.find(typeObj => typeObj.id !== t.id)?.name || '';
                                      setType(newType);
                                      setTypeSearch(newType);
                                    }
                                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                                  }
                                });
                              }}
                              className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Delete type"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mt-4">
                <label className="block text-sm font-bold tracking-wide text-slate-700 dark:text-slate-300 uppercase mb-3">
                  Add New Type
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    className="flex-1 min-w-0 bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 focus:border-gold-500 rounded-xl px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none transition-colors"
                    placeholder="e.g. 21k Gold Bar"
                  />
                  <input 
                    type="number"
                    step="0.001"
                    value={newTypePurity}
                    onChange={(e) => setNewTypePurity(e.target.value)}
                    className="w-full sm:w-32 bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 focus:border-gold-500 rounded-xl px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none transition-colors"
                    placeholder="Purity (0.75)"
                  />
                  <button
                    onClick={async () => {
                      if (!newTypeName.trim()) return;
                      const added = await addItemType(newTypeName.trim(), parseFloat(newTypePurity) || 1.0);
                      if (added) {
                        setNewTypeName('');
                        setNewTypePurity('1.0');
                        setType(added.name);
                        setTypeSearch(added.name);
                      }
                    }}
                    disabled={!newTypeName.trim()}
                    className="bg-gold-500 hover:bg-gold-400 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-slate-950 font-bold px-4 py-2 rounded-xl transition-colors shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Desc Modal */}
      {isManageDescOpen && (
        <div className="fixed inset-0 bg-white dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950/50 shrink-0">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Settings className="w-6 h-6 text-gold-500" />
                Manage Models
              </h3>
              <button 
                onClick={() => setIsManageDescOpen(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto overflow-x-hidden flex-1">
              <div className="space-y-2 mb-6">
                {models.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-4">No models found.</p>
                ) : (
                  models.map(d => (
                    <div key={d.id} className="flex justify-between items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                      {editingDescId === d.id ? (
                        <input
                          type="text"
                          value={editingModelName}
                          onChange={(e) => setEditingModelName(e.target.value)}
                          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-gold-500 rounded px-2 py-1 text-slate-900 dark:text-slate-100 text-sm focus:outline-none mr-2"
                          autoFocus
                        />
                      ) : (
                        <span className="text-slate-800 dark:text-slate-200 font-medium">{d.name}</span>
                      )}
                      
                      <div className="flex items-center">
                        {editingDescId === d.id ? (
                          <>
                            <button
                              onClick={async () => {
                                if (!editingModelName.trim() || editingModelName === d.name) {
                                  setEditingDescId(null);
                                  return;
                                }
                                const success = await editModel(d.id, editingModelName.trim());
                                if (success && model === d.name) {
                                  setModel(editingModelName.trim());
                                  setModelSearch(editingModelName.trim());
                                }
                                setEditingDescId(null);
                              }}
                              className="p-2 text-gold-500 hover:text-gold-400 hover:bg-gold-500/10 rounded-lg transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingDescId(null)}
                              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingDescId(d.id);
                                setEditingModelName(d.name);
                              }}
                              className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                              title="Edit model"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (vaultItems.some(i => i.model === d.name)) {
                                  setDialogConfig({
                                    isOpen: true,
                                    type: 'alert',
                                    title: 'Cannot Delete',
                                    message: `Cannot delete '${d.name}' because it is currently used by items in active stock.`
                                  });
                                  return;
                                }
                                setDialogConfig({
                                  isOpen: true,
                                  type: 'confirm',
                                  title: 'Delete Model',
                                  message: `Are you sure you want to delete '${d.name}'?`,
                                  onConfirm: async () => {
                                    const success = await deleteModel(d.id);
                                    if (success && model === d.name) {
                                      const newDesc = models.find(descObj => descObj.id !== d.id)?.name || '';
                                      setModel(newDesc);
                                      setModelSearch(newDesc);
                                    }
                                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                                  }
                                });
                              }}
                              className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Delete model"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mt-4">
                <label className="block text-sm font-bold tracking-wide text-slate-700 dark:text-slate-300 uppercase mb-3">
                  Add New Model
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    className="flex-1 min-w-0 bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 focus:border-gold-500 rounded-xl px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none transition-colors"
                    placeholder="e.g. Laser Cut Bridal Ring"
                  />
                  <button
                    onClick={async () => {
                      if (!newModelName.trim()) return;
                      const added = await addModel(newModelName.trim());
                      if (added) {
                        setNewModelName('');
                        setModel(added.name);
                        setModelSearch(added.name);
                      }
                    }}
                    disabled={!newModelName.trim()}
                    className="bg-gold-500 hover:bg-gold-400 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 dark:text-slate-400 text-slate-950 font-bold px-4 rounded-xl transition-colors shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {isEditItemModalOpen && editingItem && (
        <div className="fixed inset-0 bg-white dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950/50">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Settings className="w-6 h-6 text-gold-500" />
                Edit Item
              </h3>
              <button 
                onClick={() => setIsEditItemModalOpen(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Item Type</label>
                <select
                  value={editingItem.type}
                  onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                >
                  {itemTypes.map(t => (
                    <option key={t.id} value={t.name} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Model</label>
                <select
                  value={editingItem.model}
                  onChange={(e) => setEditingItem({ ...editingItem, model: e.target.value })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                >
                  {models.map(d => (
                    <option key={d.id} value={d.name} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Gross Wt. (g)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={editingItem.weight}
                    onChange={(e) => setEditingItem({ ...editingItem, weight: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Stone Wt. (g)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={editingItem.stone_weight}
                    onChange={(e) => setEditingItem({ ...editingItem, stone_weight: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={async () => {
                    const res = await editItem(editingItem.id, {
                      type: editingItem.type,
                      model: editingItem.model,
                      weight: parseFloat(editingItem.weight as string) || 0,
                      stone_weight: editingItem.stone_weight ? parseFloat(editingItem.stone_weight as string) : 0
                    });
                    if (res.success) {
                      setIsEditItemModalOpen(false);
                      fetchVaultData(); // Refresh list after edit
                    }
                  }}
                  className="w-full bg-gold-500 hover:bg-gold-400 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] text-sm flex justify-center items-center gap-2"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog
        isOpen={dialogConfig.isOpen}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onConfirm={() => {
          if (dialogConfig.onConfirm) {
            dialogConfig.onConfirm();
          } else {
            setDialogConfig({ ...dialogConfig, isOpen: false });
          }
        }}
        onCancel={() => setDialogConfig({ ...dialogConfig, isOpen: false })}
        confirmText={dialogConfig.type === 'confirm' ? 'Delete' : 'OK'}
      />
    </div>
  );
};

export default Vault;
