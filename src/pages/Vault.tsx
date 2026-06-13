import React, { useState, useEffect, useRef } from 'react';
import { useInventory, type Item } from '../store/InventoryContext';
import { Plus, Printer, Search, RefreshCw, Settings, Trash2, XCircle } from 'lucide-react';
import Dialog from '../components/Dialog';

const generateBarcode = () => {
  return 'AG-' + Math.floor(100000 + Math.random() * 900000).toString();
};


const Vault: React.FC = () => {
  const { items, itemTypes, addItem, setPrintItem, addItemType, deleteItemType } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [barcode, setBarcode] = useState(generateBarcode());
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState('');
  const [stoneWeight, setStoneWeight] = useState('');

  // Manage Types Modal State
  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  // Dropdown State
  const [typeSearch, setTypeSearch] = useState('');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
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
  }, [itemTypes, type]);
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
    }, 100);
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

    // Reset form
    setDescription('');
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
                <input 
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                  placeholder="e.g. Laser Cut Bridal Ring"
                />
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
                            <button 
                              onClick={() => handlePrint(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 text-slate-300 hover:bg-gold-500 hover:text-slate-950 transition-colors text-xs font-semibold"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Print Tag
                            </button>
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
                      <span className="text-slate-200 font-medium">{t.name}</span>
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
