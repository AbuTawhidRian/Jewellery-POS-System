import React, { useState, useEffect, useRef } from 'react';
import { useInventory, type Item } from '../store/InventoryContext';
import { Plus, Search, XCircle, Trash2, Printer, Settings, CheckCircle } from 'lucide-react';
import Dialog from '../components/Dialog';



const Vault: React.FC = () => {
  const { items, itemTypes, addItem, editItem, deleteItem, setPrintItem, addItemType, editItemType, deleteItemType, descriptions, addDescription, editDescription, deleteDescription } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState('');
  const [stoneWeight, setStoneWeight] = useState('');

  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState('');

  const [isManageDescOpen, setIsManageDescOpen] = useState(false);
  const [newDescName, setNewDescName] = useState('');
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [editingDescName, setEditingDescName] = useState('');

  // Edit Item Modal State
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; type: string; description: string; weight: string; stone_weight: string } | null>(null);

  // Dropdown State
  const [typeSearch, setTypeSearch] = useState('');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  const [descSearch, setDescSearch] = useState('');
  const [isDescDropdownOpen, setIsDescDropdownOpen] = useState(false);
  const descDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
      if (descDropdownRef.current && !descDropdownRef.current.contains(event.target as Node)) {
        setIsDescDropdownOpen(false);
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
    if (descriptions.length > 0 && !description) {
      setDescription(descriptions[0].name);
      setDescSearch(descriptions[0].name);
    }
  }, [itemTypes, descriptions, type, description]);
  const [printImmediately, setPrintImmediately] = useState(false);

  const activeStock = items.filter(i => i.status === 'In Stock');
  const filteredStock = activeStock.filter(i => 
    i.barcode.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = (item: Item) => {
    setPrintItem(item);
    setTimeout(() => {
      window.print();
    }, 500);
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
      description,
      weight: gw,
      stone_weight: sw
    });

    if (!result.success) {
      setDialogConfig({ isOpen: true, type: 'alert', title: 'Error', message: "Error adding item: " + result.error });
      return;
    }

    if (printImmediately && result.data) {
      handlePrint(result.data);
    }

    // Reset form for rapid entry - KEEP Type and Description!
    setWeight('');
    setStoneWeight('');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">The Vault</h1>
        <p className="text-slate-400 mt-1">Manage your active jewelry inventory.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Entry Form */}
        <div className="xl:col-span-1">
          <div className="bg-slate-950 p-4 md:p-8 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
            <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-gold-500" />
              Add New Item
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Item Type</label>
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                      placeholder="Search or select type..."
                    />
                    {isTypeDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {itemTypes.filter(t => t.name.toLowerCase().includes(typeSearch.toLowerCase())).length === 0 ? (
                          <div className="p-3 text-slate-500 text-sm text-center">No matching types.</div>
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
                                className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-800 transition-colors border-b border-slate-800/50 last:border-0"
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
                    className="bg-slate-900 border border-slate-700 hover:border-gold-500 text-slate-400 hover:text-gold-500 rounded-lg px-3 flex items-center justify-center transition-colors"
                    title="Manage Item Types"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                <div className="flex gap-2">
                  <div className="relative flex-1" ref={descDropdownRef}>
                    <input
                      type="text"
                      value={isDescDropdownOpen ? descSearch : description}
                      onChange={(e) => {
                        setDescSearch(e.target.value);
                        setIsDescDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setDescSearch('');
                        setIsDescDropdownOpen(true);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                      placeholder="Search or select description..."
                    />
                    {isDescDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {descriptions.filter(d => d.name.toLowerCase().includes(descSearch.toLowerCase())).length === 0 ? (
                          <div className="p-3 text-slate-500 text-sm text-center">No matching descriptions.</div>
                        ) : (
                          descriptions
                            .filter(d => d.name.toLowerCase().includes(descSearch.toLowerCase()))
                            .map(d => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => {
                                  setDescription(d.name);
                                  setDescSearch(d.name);
                                  setIsDescDropdownOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-800 transition-colors border-b border-slate-800/50 last:border-0"
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
                    className="bg-slate-900 border border-slate-700 hover:border-gold-500 text-slate-400 hover:text-gold-500 rounded-lg px-3 flex items-center justify-center transition-colors"
                    title="Manage Descriptions"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Gross Wt (g)</label>
                  <input 
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Stone Wt (g)</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    value={stoneWeight}
                    onChange={(e) => setStoneWeight(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
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
                  className="w-4 h-4 rounded border-slate-700 text-gold-500 focus:ring-gold-500 focus:ring-offset-slate-950 bg-slate-900"
                />
                <label htmlFor="printTag" className="text-sm text-slate-300 cursor-pointer">
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

        {/* Inventory Table */}
        <div className="xl:col-span-2">
          <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-lg flex-1 overflow-hidden flex flex-col">
            <div className="p-4 md:p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-bold text-slate-100">Active Stock ({activeStock.length})</h2>
              
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search barcode or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-0 md:p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-sm text-slate-400">
                      <th className="pb-3 px-4 font-medium">Barcode</th>
                      <th className="pb-3 px-4 font-medium">Type</th>
                      <th className="pb-3 px-4 font-medium hidden md:table-cell">Description</th>
                      <th className="pb-3 px-4 font-medium">Gr. Wt</th>
                      <th className="pb-3 px-4 font-medium">St. Wt</th>
                      <th className="pb-3 px-4 font-medium">Net Wt</th>
                      <th className="pb-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filteredStock.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No items found in active stock.
                        </td>
                      </tr>
                    ) : (
                      filteredStock.map((item) => {
                        const sw = Number(item.stone_weight) || 0;
                        const gw = Number(item.weight) || 0;
                        const nw = Math.max(0, gw - sw);
                        return (
                        <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors group">
                          <td className="py-3 px-4 font-mono text-slate-300">{item.barcode}</td>
                          <td className="py-3 px-4 text-slate-200">{item.type}</td>
                          <td className="py-3 px-4 text-slate-400 hidden md:table-cell truncate max-w-[200px]">{item.description || '-'}</td>
                          <td className="py-3 px-4 font-medium text-slate-300">{gw.toFixed(2)}g</td>
                          <td className="py-3 px-4 text-slate-400">{sw > 0 ? sw.toFixed(2) + 'g' : '-'}</td>
                          <td className="py-3 px-4 font-medium text-gold-400">{nw.toFixed(2)}g</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <button 
                                onClick={() => {
                                  setEditingItem({
                                    id: item.id,
                                    type: item.type,
                                    description: item.description || '',
                                    weight: item.weight.toString(),
                                    stone_weight: item.stone_weight ? item.stone_weight.toString() : ''
                                  });
                                  setIsEditItemModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors text-xs font-semibold"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => {
                                  setDialogConfig({
                                    isOpen: true,
                                    type: 'confirm',
                                    title: 'Delete Item',
                                    message: `Are you sure you want to delete barcode ${item.barcode}?`,
                                    onConfirm: async () => {
                                      await deleteItem(item.id);
                                      setDialogConfig(prev => ({ ...prev, isOpen: false }));
                                    }
                                  });
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-xs font-semibold"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handlePrint(item)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 text-slate-300 hover:bg-gold-500 hover:text-slate-950 transition-colors text-xs font-semibold"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                Print Tag
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Manage Types Modal */}
      {isManageTypesOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 shrink-0">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Settings className="w-6 h-6 text-gold-500" />
                Manage Item Types
              </h3>
              <button 
                onClick={() => setIsManageTypesOpen(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-2 mb-6">
                {itemTypes.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">No item types found.</p>
                ) : (
                  itemTypes.map(t => (
                    <div key={t.id} className="flex justify-between items-center bg-slate-950 border border-slate-800 rounded-lg p-3">
                      {editingTypeId === t.id ? (
                        <input
                          type="text"
                          value={editingTypeName}
                          onChange={(e) => setEditingTypeName(e.target.value)}
                          className="flex-1 bg-slate-900 border border-gold-500 rounded px-2 py-1 text-slate-100 text-sm focus:outline-none mr-2"
                          autoFocus
                        />
                      ) : (
                        <span className="text-slate-200 font-medium">{t.name}</span>
                      )}
                      
                      <div className="flex items-center">
                        {editingTypeId === t.id ? (
                          <>
                            <button
                              onClick={async () => {
                                if (!editingTypeName.trim() || editingTypeName === t.name) {
                                  setEditingTypeId(null);
                                  return;
                                }
                                const success = await editItemType(t.id, editingTypeName.trim());
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
                              className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
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
                              }}
                              className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                              title="Edit type"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (items.some(i => i.type === t.name)) {
                                  setDialogConfig({
                                    isOpen: true,
                                    type: 'alert',
                                    title: 'Cannot Delete',
                                    message: `Cannot delete '${t.name}' because it is currently used by items in stock or sales.`
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
                              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
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

              <div className="border-t border-slate-800 pt-6">
                <label className="block text-sm font-bold tracking-wide text-slate-400 uppercase mb-2">
                  Add New Type
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    className="flex-1 bg-slate-950 border-2 border-slate-700 focus:border-gold-500 rounded-xl px-4 py-2 text-slate-100 focus:outline-none transition-colors"
                    placeholder="e.g. 21k Gold Bar"
                  />
                  <button
                    onClick={async () => {
                      if (!newTypeName.trim()) return;
                      const added = await addItemType(newTypeName.trim());
                      if (added) {
                        setNewTypeName('');
                        setType(added.name);
                        setTypeSearch(added.name);
                      }
                    }}
                    disabled={!newTypeName.trim()}
                    className="bg-gold-500 hover:bg-gold-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold px-4 rounded-xl transition-colors shrink-0"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 shrink-0">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Settings className="w-6 h-6 text-gold-500" />
                Manage Descriptions
              </h3>
              <button 
                onClick={() => setIsManageDescOpen(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-2 mb-6">
                {descriptions.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">No descriptions found.</p>
                ) : (
                  descriptions.map(d => (
                    <div key={d.id} className="flex justify-between items-center bg-slate-950 border border-slate-800 rounded-lg p-3">
                      {editingDescId === d.id ? (
                        <input
                          type="text"
                          value={editingDescName}
                          onChange={(e) => setEditingDescName(e.target.value)}
                          className="flex-1 bg-slate-900 border border-gold-500 rounded px-2 py-1 text-slate-100 text-sm focus:outline-none mr-2"
                          autoFocus
                        />
                      ) : (
                        <span className="text-slate-200 font-medium">{d.name}</span>
                      )}
                      
                      <div className="flex items-center">
                        {editingDescId === d.id ? (
                          <>
                            <button
                              onClick={async () => {
                                if (!editingDescName.trim() || editingDescName === d.name) {
                                  setEditingDescId(null);
                                  return;
                                }
                                const success = await editDescription(d.id, editingDescName.trim());
                                if (success && description === d.name) {
                                  setDescription(editingDescName.trim());
                                  setDescSearch(editingDescName.trim());
                                }
                                setEditingDescId(null);
                              }}
                              className="p-2 text-gold-500 hover:text-gold-400 hover:bg-gold-500/10 rounded-lg transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingDescId(null)}
                              className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingDescId(d.id);
                                setEditingDescName(d.name);
                              }}
                              className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                              title="Edit description"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (items.some(i => i.description === d.name)) {
                                  setDialogConfig({
                                    isOpen: true,
                                    type: 'alert',
                                    title: 'Cannot Delete',
                                    message: `Cannot delete '${d.name}' because it is currently used by items in stock or sales.`
                                  });
                                  return;
                                }
                                setDialogConfig({
                                  isOpen: true,
                                  type: 'confirm',
                                  title: 'Delete Description',
                                  message: `Are you sure you want to delete '${d.name}'?`,
                                  onConfirm: async () => {
                                    const success = await deleteDescription(d.id);
                                    if (success && description === d.name) {
                                      const newDesc = descriptions.find(descObj => descObj.id !== d.id)?.name || '';
                                      setDescription(newDesc);
                                      setDescSearch(newDesc);
                                    }
                                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                                  }
                                });
                              }}
                              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Delete description"
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

              <div className="border-t border-slate-800 pt-6">
                <label className="block text-sm font-bold tracking-wide text-slate-400 uppercase mb-2">
                  Add New Description
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newDescName}
                    onChange={(e) => setNewDescName(e.target.value)}
                    className="flex-1 bg-slate-950 border-2 border-slate-700 focus:border-gold-500 rounded-xl px-4 py-2 text-slate-100 focus:outline-none transition-colors"
                    placeholder="e.g. Laser Cut Bridal Ring"
                  />
                  <button
                    onClick={async () => {
                      if (!newDescName.trim()) return;
                      const added = await addDescription(newDescName.trim());
                      if (added) {
                        setNewDescName('');
                        setDescription(added.name);
                        setDescSearch(added.name);
                      }
                    }}
                    disabled={!newDescName.trim()}
                    className="bg-gold-500 hover:bg-gold-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold px-4 rounded-xl transition-colors shrink-0"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Settings className="w-6 h-6 text-gold-500" />
                Edit Item
              </h3>
              <button 
                onClick={() => setIsEditItemModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Item Type</label>
                <select
                  value={editingItem.type}
                  onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                >
                  {itemTypes.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                <select
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                >
                  {descriptions.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Gross Wt. (g)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={editingItem.weight}
                    onChange={(e) => setEditingItem({ ...editingItem, weight: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Stone Wt. (g)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={editingItem.stone_weight}
                    onChange={(e) => setEditingItem({ ...editingItem, stone_weight: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={async () => {
                    const res = await editItem(editingItem.id, {
                      type: editingItem.type,
                      description: editingItem.description,
                      weight: editingItem.weight as unknown as number,
                      stone_weight: editingItem.stone_weight as unknown as number
                    });
                    if (res.success) {
                      setIsEditItemModalOpen(false);
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
