import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useInventory, type Item } from '../store/InventoryContext';
import { ShoppingCart, CheckCircle, XCircle, ScanLine, Trash2, Camera, CameraOff, Building2, Settings } from 'lucide-react';
import clsx from 'clsx';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Dialog from '../components/Dialog';
import { useAuth } from '../contexts/AuthContext';

const POS: React.FC = () => {
  const { hasPermission } = useAuth();
  const { items, buyers, sales, processBulkSale, returnItems, addBuyer, editBuyer, deleteBuyer, addPayment, setPrintInvoiceData, setPrintItem } = useInventory();
  const [selectedBuyer, setSelectedBuyer] = useState('');
  const [barcode, setBarcode] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [cart, setCart] = useState<Item[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [totalMakingCharge, setTotalMakingCharge] = useState<number | ''>('');
  
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({ buyerId: '', type: 'received', amount: '', notes: '' });
  
  // New Buyer Modal State
  const [isBuyerModalOpen, setIsBuyerModalOpen] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState('');
  const [isAddingBuyer, setIsAddingBuyer] = useState(false);
  const [editingBuyerId, setEditingBuyerId] = useState<string | null>(null);
  const [editingBuyerName, setEditingBuyerName] = useState('');

  // Searchable Dropdown State
  const [buyerSearch, setBuyerSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dialog State
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, type: 'alert', title: '', message: '' });

  const inputRef = useRef<HTMLInputElement>(null);
  const newBuyerInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Keep input focused automatically
  useEffect(() => {
    const focusInput = () => {
      const activeTag = document.activeElement?.tagName;
      if (!isScanning && !isBuyerModalOpen && activeTag !== 'BUTTON' && activeTag !== 'INPUT' && inputRef.current) {
        // Only auto-focus if we aren't typing in the buyer search
        if (document.activeElement?.id !== 'buyer-search') {
          inputRef.current.focus();
        }
      }
    };
    focusInput();
    document.addEventListener('click', focusInput);
    return () => document.removeEventListener('click', focusInput);
  }, [isScanning, isBuyerModalOpen]);

  // Audio Beep Helper
  const playBeep = useCallback((type: 'success' | 'error') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.error('Audio beep failed', e);
    }
  }, []);

  // Handle outside click for searchable dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus modal input when opened
  useEffect(() => {
    if (isBuyerModalOpen && newBuyerInputRef.current) {
      newBuyerInputRef.current.focus();
    }
  }, [isBuyerModalOpen]);

  const showNotification = useCallback((type: 'success' | 'error', message: string, disableBeep: boolean = false) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
    if (!disableBeep) {
      playBeep(type);
    }
  }, [playBeep]);

  const processScannedCode = useCallback((code: string) => {
    if (!code) return;

    setCart(prev => {
      const item = items.find(i => i.barcode === code);
      
      if (!item) {
        showNotification('error', `Barcode ${code} not found in inventory.`);
        return prev;
      } else if (!isReturnMode && item.status === 'Sold') {
        showNotification('error', `Item ${code} is already sold!`);
        return prev;
      } else if (isReturnMode && item.status === 'In Stock') {
        showNotification('error', `Item ${code} is not sold, cannot return.`);
        return prev;
      } else if (prev.some(c => c.barcode === code)) {
        showNotification('error', `WARNING: Item ${code} is already in the cart!`);
        return prev;
      } else {
        showNotification('success', `Added ${item.type} (${item.weight}g) to cart.`);
        return [...prev, item];
      }
    });
  }, [items, isReturnMode, showNotification]);

  const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentBarcode = e.currentTarget.value.trim();
      if (!currentBarcode) {
        // If input is empty and we press enter, trigger checkout if cart has items
        if (cart.length > 0) {
          handleCheckout();
        }
        return;
      }
      processScannedCode(currentBarcode);
      setBarcode('');
    } else if (e.key === 'Backspace' && !barcode) {
      // Alternate undo shortcut: Backspace on empty input
      handleUndoScan();
    }
  };

  const handleUndoScan = useCallback(() => {
    setCart(prev => {
      if (prev.length === 0) return prev;
      const newCart = [...prev];
      const removed = newCart.pop();
      showNotification('error', `Undid scan: removed ${removed?.barcode} from cart.`, true);
      return newCart;
    });
  }, [showNotification]);

  // Global Keyboard listener for Ctrl+Z Undo
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndoScan();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleUndoScan]);

  // Setup Camera Scanner
  useEffect(() => {
    if (isScanning) {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 5, qrbox: { width: 250, height: 100 }, aspectRatio: 1.0 },
        /* verbose= */ false
      );
      
      let lastScannedCode = '';
      let lastScannedTime = 0;

      scannerRef.current.render(
        (decodedText) => {
          const now = Date.now();
          // Prevent double scanning the same code within 3 seconds
          if (decodedText === lastScannedCode && (now - lastScannedTime) < 3000) {
            return;
          }
          lastScannedCode = decodedText;
          lastScannedTime = now;
          
          processScannedCode(decodedText);
        },
        () => {
          // ignore background errors
        }
      );
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [isScanning, processScannedCode]);

  const removeFromCart = (barcodeToRemove: string) => {
    setCart(prev => prev.filter(c => c.barcode !== barcodeToRemove));
  };

  const handleCheckout = async () => {
    if (!isReturnMode && !selectedBuyer) {
      showNotification('error', 'Please select a Buyer Company first.');
      return;
    }
    
    if (cart.length === 0) {
      showNotification('error', 'Cart is empty.');
      return;
    }

    const completedCart = [...cart];
    const weight = totalWeight;

    if (isReturnMode) {
      setDialogConfig({
        isOpen: true,
        type: 'confirm',
        title: 'Confirm Return',
        message: `Are you sure you want to return ${completedCart.length} items back to In Stock?`,
        confirmText: 'Yes, Complete Return',
        cancelText: 'Cancel',
        onConfirm: async () => {
          setDialogConfig(prev => ({ ...prev, isOpen: false }));
          
          const barcodes = completedCart.map(c => c.barcode);
          const result = await returnItems(barcodes);
          
          if (result.success) {
            showNotification('success', 'Return completed successfully!');
            setCart([]);
          } else {
            showNotification('error', result.message);
          }
          setTimeout(() => inputRef.current?.focus(), 10);
        },
        onCancel: () => {
          setDialogConfig(prev => ({ ...prev, isOpen: false }));
          setTimeout(() => inputRef.current?.focus(), 10);
        }
      });
    } else {
      const buyerName = buyers.find(b => b.id === selectedBuyer)?.name || 'Unknown Buyer';
      setDialogConfig({
        isOpen: true,
        type: 'confirm',
        title: 'Confirm Sale',
        message: `Are you sure you want to complete this sale of ${completedCart.length} items to ${buyerName}?`,
        confirmText: 'Yes, Complete Sale',
        cancelText: 'Cancel',
        onConfirm: async () => {
          setDialogConfig(prev => ({ ...prev, isOpen: false }));
          
          const barcodes = completedCart.map(c => c.barcode);
          const result = await processBulkSale(barcodes, selectedBuyer, Number(totalMakingCharge) || 0);
          
          if (result.success) {
            setPrintItem(null); // Clear any pending barcode
            setPrintInvoiceData({
              buyerName,
              items: completedCart,
              date: new Date().toISOString(),
              totalWeight: weight
            });
            showNotification('success', 'Sale completed successfully!');
            setTimeout(() => window.print(), 100);
            setCart([]);
            setSelectedBuyer('');
            setBuyerSearch('');
            setTotalMakingCharge('');
          } else {
            showNotification('error', result.message);
          }
          setTimeout(() => inputRef.current?.focus(), 10);
        },
        onCancel: () => {
          setDialogConfig(prev => ({ ...prev, isOpen: false }));
          setTimeout(() => inputRef.current?.focus(), 10);
        }
      });
    }
  };

  const totalWeight = cart.reduce((acc, item) => acc + Math.max(0, (Number(item.weight) || 0) - (Number(item.stone_weight) || 0)), 0);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentFormData.buyerId || !paymentFormData.amount) return;
    
    const amountNum = Number(paymentFormData.amount);
    const finalAmount = paymentFormData.type === 'received' ? amountNum : -amountNum;
    
    const result = await addPayment(paymentFormData.buyerId, finalAmount, paymentFormData.notes);
    if (result.success) {
      showNotification('success', 'Payment recorded successfully!');
      setIsPaymentModalOpen(false);
      setPaymentFormData({ buyerId: '', type: 'received', amount: '', notes: '' });
    } else {
      showNotification('error', result.message || 'Failed to record payment');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out h-full flex flex-col relative">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <ShoppingCart className={clsx("w-8 h-8", isReturnMode ? "text-orange-500" : "text-gold-500")} />
            Point of Sale
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Scan items into the cart and review before completing the transaction.</p>
        </div>
        
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl w-max">
          <button 
            onClick={() => { setIsReturnMode(false); setCart([]); setTotalMakingCharge(''); }}
            className={clsx(
              "px-6 py-2.5 rounded-lg text-sm font-bold transition-all", 
              !isReturnMode && !isPaymentModalOpen ? "bg-white dark:bg-slate-950 text-gold-500 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            Sale Mode
          </button>
          <button 
            onClick={() => { setIsReturnMode(true); setCart([]); setTotalMakingCharge(''); }}
            className={clsx(
              "px-6 py-2.5 rounded-lg text-sm font-bold transition-all border-r border-slate-300 dark:border-slate-700 rounded-r-none", 
              isReturnMode && !isPaymentModalOpen ? "bg-white dark:bg-slate-950 text-orange-500 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            Return Mode
          </button>
          <button 
            onClick={() => { setIsPaymentModalOpen(true); }}
            className={clsx(
              "px-6 py-2.5 rounded-lg text-sm font-bold transition-all rounded-l-none", 
              "text-emerald-600 hover:bg-white/50 dark:hover:bg-slate-950/50"
            )}
          >
            Cash
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0 pb-8">
        
        {/* Left Column: Scanner and Buyer */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {!isReturnMode && (
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
            <label className="block text-sm font-bold tracking-wide text-slate-600 dark:text-slate-400 uppercase mb-3">
              1. Select Buyer Company
            </label>
            <div className="flex gap-2 relative">
              <div ref={dropdownRef} className="flex-1 relative">
                <input 
                  id="buyer-search"
                  type="text"
                  value={buyerSearch}
                  onChange={(e) => {
                    setBuyerSearch(e.target.value);
                    setIsDropdownOpen(true);
                    setSelectedBuyer(''); // Clear selection if user types
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-5 py-4 text-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-gold-500 transition-colors"
                  placeholder="-- Search or Select a Buyer --"
                  autoComplete="off"
                />
                
                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                    {buyers.filter(b => b.name.toLowerCase().includes(buyerSearch.toLowerCase())).length === 0 ? (
                      <div className="px-5 py-4 text-slate-600 dark:text-slate-400 text-sm text-center">No buyers found. Click "+ New" to add one.</div>
                    ) : (
                      buyers
                        .filter(b => b.name.toLowerCase().includes(buyerSearch.toLowerCase()))
                        .map(b => (
                          <div 
                            key={b.id} 
                            onClick={() => {
                              setSelectedBuyer(b.id);
                              setBuyerSearch(b.name);
                              setIsDropdownOpen(false);
                              setTimeout(() => inputRef.current?.focus(), 10);
                            }}
                            className={clsx(
                              "px-5 py-4 cursor-pointer transition-colors border-b border-slate-300 dark:border-slate-700/50 last:border-0",
                              selectedBuyer === b.id ? "bg-gold-500/20 text-gold-500 font-bold" : "text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-white"
                            )}
                          >
                            {b.name}
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>
              {hasPermission('manage_buyers') && (
                <button
                  onClick={() => setIsBuyerModalOpen(true)}
                  className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 hover:border-gold-500 text-gold-500 rounded-xl px-4 flex flex-col items-center justify-center transition-all"
                  title="Manage Buyers"
                >
                  <Building2 className="w-6 h-6" />
                  <span className="text-[10px] font-bold uppercase mt-1">Manage</span>
                </button>
              )}
            </div>
          </div>
          )}

          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-6">
              <label className={clsx("flex items-center gap-2 text-sm font-bold tracking-widest uppercase", isReturnMode ? "text-orange-500" : "text-gold-500")}>
                <ScanLine className="w-5 h-5" />
                {isReturnMode ? "Scan Barcode to Return" : "2. Scan Barcode"}
              </label>
              
              <button
                onClick={() => setIsScanning(!isScanning)}
                className={clsx(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors",
                  isScanning ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-gold-500/20 text-gold-500 hover:bg-gold-500/30"
                )}
              >
                {isScanning ? (
                  <><CameraOff className="w-4 h-4" /> Stop Camera</>
                ) : (
                  <><Camera className="w-4 h-4" /> Use Camera</>
                )}
              </button>
            </div>
            
            {isScanning ? (
              <div className="w-full h-auto overflow-hidden rounded-xl border-2 border-gold-500/50 bg-slate-50 dark:bg-slate-900">
                <div id="reader" className="w-full"></div>
              </div>
            ) : (
              <div className="w-full">
                <input 
                  ref={inputRef}
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={handleScan}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-b-4 border-slate-300 dark:border-slate-700 focus:border-gold-500 px-6 py-6 text-4xl text-center text-slate-900 dark:text-slate-100 font-mono focus:outline-none transition-colors rounded-t-xl"
                  placeholder="WAITING..."
                  autoComplete="off"
                />
                <p className="text-center text-slate-500 mt-4 text-sm font-medium">
                  Type or scan with a physical scanner, then press ENTER
                </p>
              </div>
            )}
          </div>

          {/* Notification Area */}
          <div className="h-20 mt-2">
            {notification && (
              <div className={clsx(
                "p-4 rounded-xl border flex items-center justify-center gap-3 text-sm font-bold animate-in slide-in-from-top-2 fade-in duration-300",
                notification.type === 'success' 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              )}>
                {notification.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
                <span className="truncate">{notification.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Cart */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col h-[600px] lg:h-auto overflow-hidden relative">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Shopping Cart</h2>
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm font-semibold">
              {cart.length} Items
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-0 md:p-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 p-4">
                <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-center">Scan items to add them to the cart.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                <thead className="sticky top-0 bg-white dark:bg-slate-950 z-10 shadow-sm">
                  <tr className="text-sm text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 font-medium">Barcode</th>
                    <th className="py-3 px-4 font-medium">Type</th>
                    <th className="py-3 px-4 font-medium text-right">Gr. Wt</th>
                    <th className="py-3 px-4 font-medium text-right">St. Wt</th>
                    <th className="py-3 px-4 font-medium text-right">Net Wt</th>
                    <th className="py-3 px-4 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                    {cart.map((item) => {
                      const sw = Number(item.stone_weight) || 0;
                      const gw = Number(item.weight) || 0;
                      const nw = Math.max(0, gw - sw);
                      return (
                      <tr key={item.id} className="border-b border-slate-200 dark:border-slate-800/50 hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">{item.barcode}</td>
                        <td className="py-3 px-4 text-slate-800 dark:text-slate-200">{item.type}</td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium text-right">{gw.toFixed(2)}g</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-right">{sw > 0 ? sw.toFixed(2) + 'g' : '-'}</td>
                        <td className="py-3 px-4 text-gold-400 font-medium text-right">{nw.toFixed(2)}g</td>
                        <td className="py-3 px-4 text-center">
                          <button 
                            onClick={() => removeFromCart(item.barcode)}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-auto shrink-0">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-600 dark:text-slate-400 font-medium text-lg">Total Net Weight</span>
              <span className="text-3xl font-bold text-gold-500">{totalWeight.toFixed(2)}<span className="text-xl ml-1">g</span></span>
            </div>
            
            {!isReturnMode && (
              <div className="flex justify-between items-center mb-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400 font-medium text-lg">Total Making Charge (AED)</span>
                <input
                  type="number"
                  value={totalMakingCharge}
                  onChange={(e) => setTotalMakingCharge(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-32 bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-xl font-bold text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:border-gold-500 transition-colors"
                  min="0"
                  step="0.01"
                />
              </div>
            )}
            
            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className={clsx(
                "w-full disabled:bg-slate-100 dark:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold py-4 px-4 rounded-xl transition-all disabled:shadow-none text-lg flex justify-center items-center gap-2",
                isReturnMode ? "bg-orange-500 hover:bg-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)]" : "bg-gold-500 hover:bg-gold-400 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
              )}
            >
              <CheckCircle className="w-6 h-6" />
              {isReturnMode ? 'Complete Return' : 'Complete Sale'}
            </button>
          </div>
        </div>

      </div>

      {/* Manage Buyers Modal */}
      {isBuyerModalOpen && (
        <div className="fixed inset-0 bg-white dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950/50 shrink-0">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-gold-500" />
                Manage Buyers
              </h3>
              <button 
                onClick={() => setIsBuyerModalOpen(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-300 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-2 mb-6">
                {buyers.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">No buyers found.</p>
                ) : (
                  buyers.map(b => (
                    <div key={b.id} className="flex justify-between items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                      {editingBuyerId === b.id ? (
                        <input
                          type="text"
                          value={editingBuyerName}
                          onChange={(e) => setEditingBuyerName(e.target.value)}
                          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-gold-500 rounded px-2 py-1 text-slate-900 dark:text-slate-100 text-sm focus:outline-none mr-2"
                          autoFocus
                        />
                      ) : (
                        <span className="text-slate-800 dark:text-slate-200 font-medium">{b.name}</span>
                      )}
                      
                      <div className="flex items-center">
                        {editingBuyerId === b.id ? (
                          <>
                            <button
                              onClick={async () => {
                                if (!editingBuyerName.trim() || editingBuyerName === b.name) {
                                  setEditingBuyerId(null);
                                  return;
                                }
                                const success = await editBuyer(b.id, editingBuyerName.trim());
                                if (success && selectedBuyer === b.id) {
                                  setBuyerSearch(editingBuyerName.trim());
                                }
                                setEditingBuyerId(null);
                              }}
                              className="p-2 text-gold-500 hover:text-gold-400 hover:bg-gold-500/10 rounded-lg transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingBuyerId(null)}
                              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingBuyerId(b.id);
                                setEditingBuyerName(b.name);
                              }}
                              className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                              title="Edit buyer"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (sales.some(s => s.buyer_id === b.id)) {
                                  setDialogConfig({
                                    isOpen: true,
                                    type: 'alert',
                                    title: 'Cannot Delete',
                                    message: `Cannot delete '${b.name}' because there are sales recorded for this buyer.`
                                  });
                                  return;
                                }
                                setDialogConfig({
                                  isOpen: true,
                                  type: 'confirm',
                                  title: 'Delete Buyer',
                                  message: `Are you sure you want to delete '${b.name}'?`,
                                  onConfirm: async () => {
                                    const success = await deleteBuyer(b.id);
                                    if (success && selectedBuyer === b.id) {
                                      setSelectedBuyer('');
                                      setBuyerSearch('');
                                    }
                                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                                  }
                                });
                              }}
                              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Delete buyer"
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

              <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                <label className="block text-sm font-bold tracking-wide text-slate-600 dark:text-slate-400 uppercase mb-2">
                  Add New Buyer
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newBuyerName}
                    onChange={(e) => setNewBuyerName(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 focus:border-gold-500 rounded-xl px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none transition-colors"
                    placeholder="e.g. Al Futtaim Jewelry"
                  />
                  <button
                    onClick={async () => {
                      if (!newBuyerName.trim()) return;
                      setIsAddingBuyer(true);
                      const added = await addBuyer(newBuyerName.trim());
                      setIsAddingBuyer(false);
                      if (added) {
                        setNewBuyerName('');
                        setSelectedBuyer(added.id);
                        setBuyerSearch(added.name);
                      }
                    }}
                    disabled={isAddingBuyer || !newBuyerName.trim()}
                    className="bg-gold-500 hover:bg-gold-400 disabled:bg-slate-100 dark:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold px-4 rounded-xl transition-colors shrink-0"
                  >
                    {isAddingBuyer ? '...' : 'Add'}
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
        onCancel={() => {
          if (dialogConfig.onCancel) {
            dialogConfig.onCancel();
          } else {
            setDialogConfig({ ...dialogConfig, isOpen: false });
          }
        }}
        confirmText={dialogConfig.confirmText || (dialogConfig.type === 'confirm' ? 'Delete' : 'OK')}
        cancelText={dialogConfig.cancelText || 'Cancel'}
      />
      {/* POS Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-white dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950/50">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="text-emerald-500">💰</span>
                Record Cash/Payment
              </h3>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Account (Buyer)</label>
                  <select
                    required
                    value={paymentFormData.buyerId}
                    onChange={(e) => setPaymentFormData({...paymentFormData, buyerId: e.target.value})}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  >
                    <option value="">Select an account...</option>
                    {buyers.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Transaction Type</label>
                  <select
                    required
                    value={paymentFormData.type}
                    onChange={(e) => setPaymentFormData({...paymentFormData, type: e.target.value})}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  >
                    <option value="received">Payment Received from Client (+)</option>
                    <option value="paid">Payment Paid to Client (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (AED)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData({...paymentFormData, amount: e.target.value})}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description / Notes</label>
                  <input
                    type="text"
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({...paymentFormData, notes: e.target.value})}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                    placeholder="e.g. Cash, Transfer, Adjustment..."
                  />
                </div>
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    Save Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default POS;
