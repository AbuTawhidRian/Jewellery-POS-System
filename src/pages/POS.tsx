import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useInventory, type Item } from '../store/InventoryContext';
import { ShoppingCart, CheckCircle, XCircle, ScanLine, Trash2, Camera, CameraOff, Building2, Settings } from 'lucide-react';
import clsx from 'clsx';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Dialog from '../components/Dialog';
import { useAuth } from '../contexts/AuthContext';

const POS: React.FC = () => {
  const { hasPermission } = useAuth();
  const { items, buyers, sales, payments, metalReceipts, processBulkSale, returnItems, addBuyer, editBuyer, deleteBuyer, addPayment, editPayment, deletePayment, addMetalReceipt, editMetalReceipt, deleteMetalReceipt, setPrintInvoiceData, setPrintItem, setPrintStatementData } = useInventory();
  const [selectedBuyer, setSelectedBuyer] = useState('');
  const [barcode, setBarcode] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [cart, setCart] = useState<Item[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [isCashMode, setIsCashMode] = useState(false);
  const [totalMakingCharge, setTotalMakingCharge] = useState<number | ''>('');
  const [makingChargesPerModel, setMakingChargesPerModel] = useState<Record<string, number | ''>>({});
  
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({ buyerId: '', type: 'received', amount: '', notes: '' });
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [cashFilterBuyerId, setCashFilterBuyerId] = useState<string>('all');
  
  // Metal Modal State
  const [isGoldMode, setIsGoldMode] = useState(false);
  const [isMetalModalOpen, setIsMetalModalOpen] = useState(false);
  const [metalFormData, setMetalFormData] = useState({ buyerId: '', weight: '', purity: '995', notes: '' });
  const [editingMetalId, setEditingMetalId] = useState<string | null>(null);
  const [metalFilterBuyerId, setMetalFilterBuyerId] = useState<string>('all');
  
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

  const [paymentBuyerSearch, setPaymentBuyerSearch] = useState('');
  const [isPaymentBuyerDropdownOpen, setIsPaymentBuyerDropdownOpen] = useState(false);
  const paymentBuyerRef = useRef<HTMLDivElement>(null);

  const [metalBuyerSearch, setMetalBuyerSearch] = useState('');
  const [isMetalBuyerDropdownOpen, setIsMetalBuyerDropdownOpen] = useState(false);
  const metalBuyerRef = useRef<HTMLDivElement>(null);

  const [cashFilterSearch, setCashFilterSearch] = useState('');
  const [isCashFilterOpen, setIsCashFilterOpen] = useState(false);
  const cashFilterRef = useRef<HTMLDivElement>(null);

  const [metalFilterSearch, setMetalFilterSearch] = useState('');
  const [isMetalFilterOpen, setIsMetalFilterOpen] = useState(false);
  const metalFilterRef = useRef<HTMLDivElement>(null);

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
      if (!isScanning && !isBuyerModalOpen && !isPaymentModalOpen && !isMetalModalOpen && activeTag !== 'BUTTON' && activeTag !== 'INPUT' && activeTag !== 'SELECT' && activeTag !== 'TEXTAREA' && inputRef.current) {
        // Only auto-focus if we aren't typing in the buyer search
        if (document.activeElement?.id !== 'buyer-search') {
          inputRef.current.focus();
        }
      }
    };
    focusInput();
    document.addEventListener('click', focusInput);
    return () => document.removeEventListener('click', focusInput);
  }, [isScanning, isBuyerModalOpen, isPaymentModalOpen, isMetalModalOpen]);

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
      if (paymentBuyerRef.current && !paymentBuyerRef.current.contains(event.target as Node)) {
        setIsPaymentBuyerDropdownOpen(false);
      }
      if (metalBuyerRef.current && !metalBuyerRef.current.contains(event.target as Node)) {
        setIsMetalBuyerDropdownOpen(false);
      }
      if (cashFilterRef.current && !cashFilterRef.current.contains(event.target as Node)) {
        setIsCashFilterOpen(false);
      }
      if (metalFilterRef.current && !metalFilterRef.current.contains(event.target as Node)) {
        setIsMetalFilterOpen(false);
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
            setPrintStatementData(null); // Clear any pending statement
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

  const uniqueModels = Array.from(new Set(cart.map(item => item.model || 'Unknown Model')));

  useEffect(() => {
    let calculatedTotal = 0;
    let anyCalculated = false;
    
    cart.forEach(item => {
      const model = item.model || 'Unknown Model';
      const rate = makingChargesPerModel[model];
      if (typeof rate === 'number') {
        const gw = Number(item.weight) || 0;
        const sw = Number(item.stone_weight) || 0;
        const nw = Math.max(0, gw - sw);
        calculatedTotal += nw * rate;
        anyCalculated = true;
      }
    });

    if (anyCalculated) {
      setTotalMakingCharge(Number(calculatedTotal.toFixed(2)));
    }
  }, [makingChargesPerModel, cart]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentFormData.buyerId || !paymentFormData.amount) return;
    
    const amountNum = Number(paymentFormData.amount);
    const finalAmount = paymentFormData.type === 'received' ? amountNum : -amountNum;
    
    let success = false;
    if (editingPaymentId) {
      success = await editPayment(editingPaymentId, paymentFormData.buyerId, finalAmount, paymentFormData.notes);
    } else {
      success = await addPayment(paymentFormData.buyerId, finalAmount, paymentFormData.notes);
    }

    if (success) {
      showNotification('success', editingPaymentId ? 'Payment updated successfully!' : 'Payment recorded successfully!');
      setIsPaymentModalOpen(false);
      setPaymentFormData({ buyerId: '', type: 'received', amount: '', notes: '' });
      setEditingPaymentId(null);
    } else {
      showNotification('error', editingPaymentId ? 'Failed to update payment' : 'Failed to record payment');
    }
  };

  const handleRecordMetalReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metalFormData.buyerId || !metalFormData.weight || !metalFormData.purity) return;
    
    let purityVal = Number(metalFormData.purity);
    if (purityVal > 1) {
      purityVal = purityVal / 1000;
    }

    let success = false;
    if (editingMetalId) {
      success = await editMetalReceipt(editingMetalId, metalFormData.buyerId, Number(metalFormData.weight), purityVal, metalFormData.notes);
    } else {
      success = await addMetalReceipt(metalFormData.buyerId, Number(metalFormData.weight), purityVal, metalFormData.notes);
    }

    if (success) {
      showNotification('success', editingMetalId ? 'Metal receipt updated!' : 'Metal receipt recorded!');
      setIsMetalModalOpen(false);
      setMetalFormData({ buyerId: '', weight: '', purity: '995', notes: '' });
      setEditingMetalId(null);
    } else {
      showNotification('error', editingMetalId ? 'Failed to update receipt' : 'Failed to record receipt');
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
            onClick={() => { setIsReturnMode(false); setIsCashMode(false); setIsGoldMode(false); setCart([]); setTotalMakingCharge(''); }}
            className={clsx(
              "px-6 py-2.5 rounded-lg text-sm font-bold transition-all", 
              !isReturnMode && !isCashMode && !isGoldMode ? "bg-white dark:bg-slate-950 text-gold-500 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            Sale Mode
          </button>
          <button 
            onClick={() => { setIsReturnMode(true); setIsCashMode(false); setIsGoldMode(false); setCart([]); setTotalMakingCharge(''); }}
            className={clsx(
              "px-6 py-2.5 rounded-lg text-sm font-bold transition-all border-r border-slate-300 dark:border-slate-700 rounded-r-none", 
              isReturnMode && !isCashMode && !isGoldMode ? "bg-white dark:bg-slate-950 text-orange-500 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            Return Mode
          </button>
          <button 
            onClick={() => { setIsCashMode(true); setIsGoldMode(false); }}
            className={clsx(
              "px-6 py-2.5 rounded-lg text-sm font-bold transition-all border-r border-slate-300 dark:border-slate-700 rounded-none", 
              isCashMode ? "bg-white dark:bg-slate-950 text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            Cash
          </button>
          <button 
            onClick={() => { setIsGoldMode(true); setIsCashMode(false); }}
            className={clsx(
              "px-6 py-2.5 rounded-lg text-sm font-bold transition-all rounded-l-none", 
              isGoldMode ? "bg-white dark:bg-slate-950 text-amber-500 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            Receive Gold
          </button>
        </div>
      </header>

      {!isCashMode && !isGoldMode ? (
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
                      <tr key={item.id} className="border-b border-slate-200 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
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
              <div className="flex flex-col gap-4 mb-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                {uniqueModels.length > 0 && uniqueModels.map(model => (
                  <div key={model} className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400 font-medium text-lg">{model} - Making Charge / Gram</span>
                    <input
                      type="number"
                      value={makingChargesPerModel[model] ?? ''}
                      onChange={(e) => setMakingChargesPerModel(prev => ({...prev, [model]: e.target.value === '' ? '' : Number(e.target.value)}))}
                      placeholder="Auto-calc"
                      className="w-32 bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-xl font-bold text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:border-gold-500 transition-colors"
                      min="0"
                      step="0.01"
                    />
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400 font-bold text-xl">Total Making Charge (AED)</span>
                <input
                  type="number"
                  value={totalMakingCharge}
                  onChange={(e) => {
                    setTotalMakingCharge(e.target.value === '' ? '' : Number(e.target.value));
                    setMakingChargesPerModel({});
                  }}
                  placeholder="0"
                  className="w-32 bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-xl font-bold text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:border-gold-500 transition-colors"
                  min="0"
                  step="0.01"
                />
                </div>
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
      ) : isCashMode ? (
        <div className="flex-1 flex flex-col min-h-0 pb-8 gap-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg flex-1 flex flex-col min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span className="text-emerald-500">💰</span> Cash Ledger
              </h2>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-full sm:w-64" ref={cashFilterRef}>
                  <input
                    type="text"
                    value={isCashFilterOpen ? cashFilterSearch : (cashFilterBuyerId === 'all' ? 'All Accounts' : buyers.find(b => b.id === cashFilterBuyerId)?.name || '')}
                    onChange={(e) => {
                      setCashFilterSearch(e.target.value);
                      setIsCashFilterOpen(true);
                    }}
                    onFocus={() => {
                      setCashFilterSearch('');
                      setIsCashFilterOpen(true);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    placeholder="Search account..."
                  />
                  {isCashFilterOpen && (
                    <div className="absolute top-full right-0 mt-1 w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
                      <div className="max-h-48 overflow-y-auto py-1">
                        <button
                          type="button"
                          onClick={() => { setCashFilterBuyerId('all'); setIsCashFilterOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${cashFilterBuyerId === 'all' ? 'bg-emerald-500/10 text-emerald-500 font-bold border-l-2 border-emerald-500' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border-l-2 border-transparent'}`}
                        >
                          All Accounts
                        </button>
                        {buyers.filter(b => b.name.toLowerCase().includes(cashFilterSearch.toLowerCase())).map(b => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => { setCashFilterBuyerId(b.id); setIsCashFilterOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${cashFilterBuyerId === b.id ? 'bg-emerald-500/10 text-emerald-500 font-bold border-l-2 border-emerald-500' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border-l-2 border-transparent'}`}
                          >
                            {b.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setEditingPaymentId(null);
                    setPaymentFormData({ buyerId: cashFilterBuyerId !== 'all' ? cashFilterBuyerId : '', type: 'received', amount: '', notes: '' });
                    setIsPaymentModalOpen(true);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                >
                  Record Payment
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800/80 backdrop-blur-md shadow-sm z-10">
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm tracking-wider uppercase">
                    <th className="py-4 px-4 font-bold">Date</th>
                    <th className="py-4 px-4 font-bold">Account (Buyer)</th>
                    <th className="py-4 px-4 font-bold">Type</th>
                    <th className="py-4 px-4 font-bold">Description / Notes</th>
                    <th className="py-4 px-4 font-bold text-right">Amount (AED)</th>
                    <th className="py-4 px-4 font-bold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-slate-700 dark:text-slate-300">
                  {(() => {
                    const filteredPayments = payments.filter(p => cashFilterBuyerId === 'all' || p.buyerId === cashFilterBuyerId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    
                    if (filteredPayments.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-500 bg-white dark:bg-slate-950">
                            No cash transactions found.
                          </td>
                        </tr>
                      );
                    }
                    
                    return filteredPayments.map(p => {
                      const buyer = buyers.find(b => b.id === p.buyerId);
                      const isReceived = p.amount >= 0;
                      return (
                        <tr key={p.id} className="border-b border-slate-200 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            {new Date(p.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 font-medium">{buyer?.name || 'Unknown'}</td>
                          <td className="py-3 px-4">
                            <span className={clsx("px-2 py-1 rounded text-xs font-bold", isReceived ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400")}>
                              {isReceived ? 'Received (+)' : 'Paid (-)'}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-[200px] truncate">{p.notes || '-'}</td>
                          <td className={clsx("py-3 px-4 font-bold text-right", isReceived ? "text-emerald-600" : "text-orange-500")}>
                            {Math.abs(p.amount).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingPaymentId(p.id);
                                  setPaymentFormData({
                                    buyerId: p.buyerId,
                                    type: isReceived ? 'received' : 'paid',
                                    amount: Math.abs(p.amount).toString(),
                                    notes: p.notes || ''
                                  });
                                  setIsPaymentModalOpen(true);
                                }}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded transition-colors"
                                title="Edit Payment"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                              </button>
                              <button
                                onClick={() => {
                                  setDialogConfig({
                                    isOpen: true,
                                    type: 'confirm',
                                    title: 'Delete Payment',
                                    message: 'Are you sure you want to delete this payment record? This action cannot be undone.',
                                    onConfirm: async () => {
                                      const success = await deletePayment(p.id);
                                      if (success) {
                                        showNotification('success', 'Payment deleted successfully');
                                      } else {
                                        showNotification('error', 'Failed to delete payment');
                                      }
                                      setDialogConfig(prev => ({...prev, isOpen: false}));
                                    }
                                  });
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                                title="Delete Payment"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : isGoldMode ? (
        <div className="flex-1 flex flex-col min-h-0 pb-8 gap-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg flex-1 flex flex-col min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span className="text-amber-500">🪙</span> Pure Gold Ledger
              </h2>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-full sm:w-64" ref={metalFilterRef}>
                  <input
                    type="text"
                    value={isMetalFilterOpen ? metalFilterSearch : (metalFilterBuyerId === 'all' ? 'All Accounts' : buyers.find(b => b.id === metalFilterBuyerId)?.name || '')}
                    onChange={(e) => {
                      setMetalFilterSearch(e.target.value);
                      setIsMetalFilterOpen(true);
                    }}
                    onFocus={() => {
                      setMetalFilterSearch('');
                      setIsMetalFilterOpen(true);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    placeholder="Search account..."
                  />
                  {isMetalFilterOpen && (
                    <div className="absolute top-full right-0 mt-1 w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
                      <div className="max-h-48 overflow-y-auto py-1">
                        <button
                          type="button"
                          onClick={() => { setMetalFilterBuyerId('all'); setIsMetalFilterOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${metalFilterBuyerId === 'all' ? 'bg-amber-500/10 text-amber-500 font-bold border-l-2 border-amber-500' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border-l-2 border-transparent'}`}
                        >
                          All Accounts
                        </button>
                        {buyers.filter(b => b.name.toLowerCase().includes(metalFilterSearch.toLowerCase())).map(b => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => { setMetalFilterBuyerId(b.id); setIsMetalFilterOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${metalFilterBuyerId === b.id ? 'bg-amber-500/10 text-amber-500 font-bold border-l-2 border-amber-500' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border-l-2 border-transparent'}`}
                          >
                            {b.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setEditingMetalId(null);
                    setMetalFormData({ buyerId: metalFilterBuyerId !== 'all' ? metalFilterBuyerId : '', weight: '', purity: '995', notes: '' });
                    setIsMetalModalOpen(true);
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-amber-500/20"
                >
                  Receive Gold
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800/80 backdrop-blur-md shadow-sm z-10">
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm tracking-wider uppercase">
                    <th className="py-4 px-4 font-bold">Date</th>
                    <th className="py-4 px-4 font-bold">Account (Buyer)</th>
                    <th className="py-4 px-4 font-bold text-right">Weight (g)</th>
                    <th className="py-4 px-4 font-bold text-right">Purity</th>
                    <th className="py-4 px-4 font-bold text-right">Pure Weight (g)</th>
                    <th className="py-4 px-4 font-bold">Notes</th>
                    <th className="py-4 px-4 font-bold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-slate-700 dark:text-slate-300">
                  {(() => {
                    const filteredReceipts = metalReceipts.filter(m => metalFilterBuyerId === 'all' || m.buyerId === metalFilterBuyerId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    
                    if (filteredReceipts.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-500 bg-white dark:bg-slate-950">
                            No metal receipts found.
                          </td>
                        </tr>
                      );
                    }
                    
                    return filteredReceipts.map(m => {
                      const buyer = buyers.find(b => b.id === m.buyerId);
                      return (
                        <tr key={m.id} className="border-b border-slate-200 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            {new Date(m.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 font-medium">{buyer?.name || 'Unknown'}</td>
                          <td className="py-3 px-4 text-right">{m.weight.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-slate-500">{(m.purity * 1000).toFixed(0)}</td>
                          <td className="py-3 px-4 text-right font-bold text-amber-500">{(m.weight * m.purity).toFixed(3)}</td>
                          <td className="py-3 px-4 max-w-[150px] truncate">{m.notes || '-'}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingMetalId(m.id);
                                  setMetalFormData({
                                    buyerId: m.buyerId,
                                    weight: m.weight.toString(),
                                    purity: (m.purity >= 1 ? m.purity : m.purity * 1000).toString(),
                                    notes: m.notes || ''
                                  });
                                  setIsMetalModalOpen(true);
                                }}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded transition-colors"
                                title="Edit Receipt"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                              </button>
                              <button
                                onClick={() => {
                                  setDialogConfig({
                                    isOpen: true,
                                    type: 'confirm',
                                    title: 'Delete Metal Receipt',
                                    message: 'Are you sure you want to delete this metal receipt? This action cannot be undone.',
                                    onConfirm: async () => {
                                      const success = await deleteMetalReceipt(m.id);
                                      if (success) {
                                        showNotification('success', 'Receipt deleted successfully');
                                      } else {
                                        showNotification('error', 'Failed to delete receipt');
                                      }
                                      setDialogConfig(prev => ({...prev, isOpen: false}));
                                    }
                                  });
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                                title="Delete Receipt"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

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
                  <div className="relative" ref={paymentBuyerRef}>
                    <input
                      type="text"
                      required={!paymentFormData.buyerId}
                      value={isPaymentBuyerDropdownOpen ? paymentBuyerSearch : (buyers.find(b => b.id === paymentFormData.buyerId)?.name || '')}
                      onChange={(e) => {
                        setPaymentBuyerSearch(e.target.value);
                        setIsPaymentBuyerDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setPaymentBuyerSearch('');
                        setIsPaymentBuyerDropdownOpen(true);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      placeholder="Search or select account..."
                    />
                    {isPaymentBuyerDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
                        <div className="max-h-48 overflow-y-auto py-1">
                          {buyers.filter(b => b.name.toLowerCase().includes(paymentBuyerSearch.toLowerCase())).length === 0 ? (
                            <div className="p-3 text-slate-500 text-sm text-center">No matching accounts.</div>
                          ) : (
                            buyers.filter(b => b.name.toLowerCase().includes(paymentBuyerSearch.toLowerCase())).map(b => (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => { 
                                  setPaymentFormData({...paymentFormData, buyerId: b.id}); 
                                  setIsPaymentBuyerDropdownOpen(false); 
                                  setPaymentBuyerSearch(''); 
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${paymentFormData.buyerId === b.id ? 'bg-emerald-500/10 text-emerald-500 font-bold border-l-2 border-emerald-500' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border-l-2 border-transparent'}`}
                              >
                                {b.name}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
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

      {/* POS Metal Receipt Modal */}
      {isMetalModalOpen && (
        <div className="fixed inset-0 bg-white dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950/50">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="text-amber-500">🪙</span>
                Record Metal Receipt
              </h3>
              <button 
                onClick={() => setIsMetalModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleRecordMetalReceipt} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Account (Buyer)</label>
                  <div className="relative" ref={metalBuyerRef}>
                    <input
                      type="text"
                      required={!metalFormData.buyerId}
                      value={isMetalBuyerDropdownOpen ? metalBuyerSearch : (buyers.find(b => b.id === metalFormData.buyerId)?.name || '')}
                      onChange={(e) => {
                        setMetalBuyerSearch(e.target.value);
                        setIsMetalBuyerDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setMetalBuyerSearch('');
                        setIsMetalBuyerDropdownOpen(true);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                      placeholder="Search or select account..."
                    />
                    {isMetalBuyerDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
                        <div className="max-h-48 overflow-y-auto py-1">
                          {buyers.filter(b => b.name.toLowerCase().includes(metalBuyerSearch.toLowerCase())).length === 0 ? (
                            <div className="p-3 text-slate-500 text-sm text-center">No matching accounts.</div>
                          ) : (
                            buyers.filter(b => b.name.toLowerCase().includes(metalBuyerSearch.toLowerCase())).map(b => (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => { 
                                  setMetalFormData({...metalFormData, buyerId: b.id}); 
                                  setIsMetalBuyerDropdownOpen(false); 
                                  setMetalBuyerSearch(''); 
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${metalFormData.buyerId === b.id ? 'bg-amber-500/10 text-amber-500 font-bold border-l-2 border-amber-500' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border-l-2 border-transparent'}`}
                              >
                                {b.name}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Weight (g)</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      value={metalFormData.weight}
                      onChange={(e) => setMetalFormData({...metalFormData, weight: e.target.value})}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                      placeholder="e.g. 100.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Purity (e.g. 0.995, 0.875)</label>
                    <input
                      type="number"
                      required
                      step="0.001"
                      min="0.001"
                      max="1.0"
                      value={metalFormData.purity}
                      onChange={(e) => setMetalFormData({...metalFormData, purity: e.target.value})}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                      placeholder="0.995"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description / Notes</label>
                  <input
                    type="text"
                    value={metalFormData.notes}
                    onChange={(e) => setMetalFormData({...metalFormData, notes: e.target.value})}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                    placeholder="e.g. Fine gold bar, Scrap gold..."
                  />
                </div>
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsMetalModalOpen(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-colors shadow-lg shadow-amber-500/20"
                  >
                    Save Receipt
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
