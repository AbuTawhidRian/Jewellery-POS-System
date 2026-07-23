import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export type ItemStatus = 'In Stock' | 'Sold';

export interface Item {
  id: string;
  barcode: string;
  type: string;
  model?: string;
  weight: number;
  stone_weight: number;
  status: ItemStatus;
  date_added?: string;
}

export interface ItemType {
  id: string;
  name: string;
  purity?: number;
}

export interface ItemModel {
  id: string;
  shopId: string;
  name: string;
}

export interface Buyer {
  id: string;
  name: string;
}

export interface Sale {
  id: string;
  item_id: string;
  barcode: string;
  buyer_id: string;
  buyer_name: string;
  date: string;
  weight: number;
  stone_weight: number;
  type: string;
  model: string;
  makingCharge: number;
}

export interface Payment {
  id: string;
  buyerId: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface MetalReceipt {
  id: string;
  buyerId: string;
  date: string;
  weight: number;
  purity: number;
  notes?: string;
  buyer?: Buyer;
}


export interface InvoiceData {
  buyerName: string;
  items: { barcode?: string; type: string; model?: string; weight: number; stone_weight: number }[];
  date: string;
  totalWeight: number;
  totalMakingCharge?: number;
}

export interface StatementData {
  buyerName: string;
  transactions: { date: string, type: 'Sale' | 'Return', totalItems: number, grossWeight: number, stoneWeight: number, netWeight: number, pureWeight: number, items: Sale[], makingCharge?: number }[];
  dateRange: string;
  totalNetWeight: number;
  totalPureWeight: number;
  payments: Payment[];
  metalReceipts: MetalReceipt[];
}

interface InventoryContextType {
  buyers: Buyer[];
  sales: Sale[];
  payments: Payment[];
  metalReceipts: MetalReceipt[];
  itemTypes: ItemType[];
  isLoading: boolean;
  addItem: (item: Partial<Pick<Item, 'barcode'>> & Omit<Item, 'id' | 'status' | 'dateAdded' | 'date_added' | 'barcode'>) => Promise<{ success: boolean, data?: Item, error?: string }>;
  editItem: (id: string, updatedData: Partial<Item>) => Promise<{ success: boolean, data?: Item, error?: string }>;
  deleteItem: (id: string) => Promise<boolean>;
  addBuyer: (name: string) => Promise<Buyer | null>;
  editBuyer: (id: string, name: string) => Promise<boolean>;
  deleteBuyer: (id: string) => Promise<boolean>;
  addItemType: (name: string, purity?: number) => Promise<ItemType | null>;
  editItemType: (id: string, name: string, purity?: number) => Promise<boolean>;
  deleteItemType: (id: string) => Promise<boolean>;
  models: ItemModel[];
  addModel: (name: string) => Promise<ItemModel | null>;
  editModel: (id: string, name: string) => Promise<boolean>;
  deleteModel: (id: string) => Promise<boolean>;
  processBulkSale: (barcodes: string[], buyerId: string, totalMakingCharge?: number) => Promise<{ success: boolean; message: string }>;
  voidTransaction: (buyerId: string, date: string) => Promise<{ success: boolean; message: string }>;
  returnItems: (barcodes: string[]) => Promise<{ success: boolean; message: string }>;
  addPayment: (buyerId: string, amount: number, notes?: string) => Promise<boolean>;
  editPayment: (id: string, buyerId: string, amount: number, notes?: string) => Promise<boolean>;
  deletePayment: (id: string) => Promise<boolean>;
  addMetalReceipt: (buyerId: string, weight: number, purity: number, notes?: string) => Promise<boolean>;
  editMetalReceipt: (id: string, buyerId: string, weight: number, purity: number, notes?: string) => Promise<boolean>;
  deleteMetalReceipt: (id: string) => Promise<boolean>;
  printItem: Item | null;
  setPrintItem: (item: Item | null) => void;
  printInvoiceData: InvoiceData | null;
  setPrintInvoiceData: (data: InvoiceData | null) => void;
  printStatementData: StatementData | null;
  setPrintStatementData: (data: StatementData | null) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const API_URL = '/api';

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [metalReceipts, setMetalReceipts] = useState<MetalReceipt[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [models, setModels] = useState<ItemModel[]>([]);
  const [printItem, setPrintItem] = useState<Item | null>(null);
  const [printInvoiceData, setPrintInvoiceData] = useState<InvoiceData | null>(null);
  const [printStatementData, setPrintStatementData] = useState<StatementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    // Default to application/json if no Content-Type is provided and we have a body
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    
    const activeBranchId = localStorage.getItem('activeBranchId');
    if (activeBranchId) {
      headers.set('X-Branch-Id', activeBranchId);
    }

    return fetch(url, { cache: 'no-store', ...options, headers });
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [buyersRes, salesRes, typesRes, descRes, paymentsRes, metalRes] = await Promise.all([
          authFetch(`${API_URL}/buyers`).then(res => res.json()),
          authFetch(`${API_URL}/sales`).then(res => res.json()),
          authFetch(`${API_URL}/item_types`).then(res => res.ok ? res.json() : []),
          authFetch(`${API_URL}/models`).then(res => res.ok ? res.json() : []),
          authFetch(`${API_URL}/payments`).then(res => res.ok ? res.json() : []),
          authFetch(`${API_URL}/metal_receipts`).then(res => res.ok ? res.json() : [])
        ]);

        if (Array.isArray(buyersRes)) setBuyers(buyersRes);
        if (Array.isArray(salesRes)) setSales(salesRes);
        if (Array.isArray(typesRes)) setItemTypes(typesRes);
        if (Array.isArray(descRes)) setModels(descRes);
        if (Array.isArray(paymentsRes)) setPayments(paymentsRes);
        if (Array.isArray(metalRes)) setMetalReceipts(metalRes);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated, token]);

  const addItem = async (itemData: Partial<Pick<Item, 'barcode'>> & Omit<Item, 'id' | 'status' | 'dateAdded' | 'date_added' | 'barcode'>) => {
    try {
      const res = await authFetch(`${API_URL}/inventory`, {
        method: 'POST',
        body: JSON.stringify(itemData)
      });
      const result = await res.json();
      
      if (res.ok) {
        toast.success('Item added successfully');
        return { success: true, data: result };
      }
      toast.error(result.error || 'Failed to add item');
      return { success: false, error: result.error || 'Failed to add item' };
    } catch (error: any) {
      toast.error(error.message);
      return { success: false, error: error.message };
    }
  };

  const editItem = async (id: string, updatedData: Partial<Item>) => {
    try {
      const res = await authFetch(`${API_URL}/inventory/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData)
      });
      const result = await res.json();
      
      if (res.ok) {
        toast.success('Item updated successfully');
        return { success: true, data: result };
      }
      toast.error(result.error || 'Failed to update item');
      return { success: false, error: result.error || 'Failed to update item' };
    } catch (error: any) {
      toast.error(error.message);
      return { success: false, error: error.message };
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const res = await authFetch(`${API_URL}/inventory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Item deleted successfully');
        return true;
      }
      toast.error('Failed to delete item');
      return false;
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error('Failed to delete item');
      return false;
    }
  };

  const addBuyer = async (name: string) => {
    try {
      const res = await authFetch(`${API_URL}/buyers`, {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      const result = await res.json();
      
      if (res.ok) {
        setBuyers(prev => [...prev, result]);
        toast.success('Buyer added successfully');
        return result;
      }
      toast.error(result.error || 'Failed to add buyer');
      return null;
    } catch (error) {
      console.error("Error adding buyer:", error);
      toast.error('Failed to add buyer');
      return null;
    }
  };

  const editBuyer = async (id: string, name: string) => {
    try {
      const res = await authFetch(`${API_URL}/buyers/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name })
      });
      const result = await res.json();
      if (res.ok) {
        setBuyers(prev => prev.map(b => b.id === id ? result : b));
        setSales(prev => prev.map(s => s.buyer_id === id ? { ...s, buyer_name: name } : s));
        toast.success('Buyer updated successfully');
        return true;
      }
      toast.error('Failed to update buyer');
      return false;
    } catch (error) {
      console.error("Error editing buyer:", error);
      toast.error('Failed to update buyer');
      return false;
    }
  };

  const deleteBuyer = async (id: string) => {
    try {
      const res = await authFetch(`${API_URL}/buyers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBuyers(prev => prev.filter(b => b.id !== id));
        toast.success('Buyer deleted successfully');
        return true;
      }
      toast.error('Failed to delete buyer');
      return false;
    } catch (error) {
      console.error("Error deleting buyer:", error);
      toast.error('Failed to delete buyer');
      return false;
    }
  };

  const addItemType = async (name: string, purity?: number) => {
    try {
      const res = await authFetch(`${API_URL}/item_types`, {
        method: 'POST',
        body: JSON.stringify({ name, purity })
      });
      const result = await res.json();
      
      if (res.ok) {
        setItemTypes(prev => [...prev, result].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success('Item type added successfully');
        return result;
      }
      toast.error('Failed to add item type');
      return null;
    } catch (error) {
      console.error("Error adding item type:", error);
      toast.error('Failed to add item type');
      return null;
    }
  };

  const editItemType = async (id: string, name: string, purity?: number) => {
    try {
      const oldTypeObj = itemTypes.find(t => t.id === id);
      const res = await authFetch(`${API_URL}/item_types/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, purity })
      });
      const result = await res.json();
      if (res.ok) {
        setItemTypes(prev => prev.map(t => t.id === id ? result : t).sort((a, b) => a.name.localeCompare(b.name)));
        if (oldTypeObj) {
          setSales(prev => prev.map(s => s.type === oldTypeObj.name ? { ...s, type: name } : s));
        }
        toast.success('Item type updated');
        return true;
      }
      toast.error('Failed to update item type');
      return false;
    } catch (error) {
      console.error("Error editing item type:", error);
      toast.error('Failed to update item type');
      return false;
    }
  };

  const deleteItemType = async (id: string) => {
    try {
      const res = await authFetch(`${API_URL}/item_types/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItemTypes(prev => prev.filter(t => t.id !== id));
        toast.success('Item type deleted');
        return true;
      }
      toast.error('Failed to delete item type');
      return false;
    } catch (error) {
      console.error("Error deleting item type:", error);
      toast.error('Failed to delete item type');
      return false;
    }
  };

  const addModel = async (name: string) => {
    try {
      const res = await authFetch(`${API_URL}/models`, {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      const result = await res.json();
      
      if (res.ok) {
        setModels(prev => [...prev, result].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success('Model added successfully');
        return result;
      }
      toast.error('Failed to add model');
      return null;
    } catch (error) {
      console.error("Error adding model:", error);
      toast.error('Failed to add model');
      return null;
    }
  };

  const editModel = async (id: string, name: string) => {
    try {

      const res = await authFetch(`${API_URL}/models/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name })
      });
      const result = await res.json();
      if (res.ok) {
        setModels(prev => prev.map(d => d.id === id ? result : d).sort((a, b) => a.name.localeCompare(b.name)));

        return true;
      }
      return false;
    } catch (error) {
      console.error("Error editing model:", error);
      return false;
    }
  };

  const deleteModel = async (id: string) => {
    try {
      const res = await authFetch(`${API_URL}/models/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setModels(prev => prev.filter(d => d.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting model:", error);
      return false;
    }
  };

  const processBulkSale = async (barcodes: string[], buyerId: string, totalMakingCharge: number = 0) => {
    const buyer = buyers.find(b => b.id === buyerId);
    if (!buyer) return { success: false, message: 'Buyer not found.' };

    try {
      const res = await authFetch(`${API_URL}/sales/bulk`, {
        method: 'POST',
        body: JSON.stringify({ barcodes, buyerId, totalMakingCharge })
      });
      
      const result = await res.json();
      
      if (res.ok && result.success) {
        
        // Refetch sales since bulk endpoint doesn't return full objects in our backend right now
        authFetch(`${API_URL}/sales`).then(res => res.json()).then(data => {
            if(Array.isArray(data)) setSales(data);
        });
        
        return { success: true, message: result.message };
      }
      
      toast.error(result.message || 'Failed to process sale');
      return { success: false, message: result.message || 'Failed to process sale' };
    } catch (error: any) {
      console.error("Error processing bulk sale:", error);
      toast.error(error.message || "Failed to process sale");
      return { success: false, message: error.message || "Failed to process sale" };
    }
  };

  const voidTransaction = async (buyerId: string, date: string) => {
    try {
      const res = await authFetch(`${API_URL}/sales/void`, {
        method: 'POST',
        body: JSON.stringify({ buyerId, date })
      });
      const result = await res.json();
      
      if (res.ok && result.success) {
        setSales(prev => prev.filter(s => !(s.buyer_id === buyerId && s.date === date)));
        toast.success(result.message || 'Transaction voided');
        return { success: true, message: result.message };
      }
      toast.error(result.message || 'Failed to void transaction');
      return { success: false, message: result.message || 'Failed to void transaction' };
    } catch (error: any) {
      console.error("Error voiding transaction:", error);
      toast.error(error.message);
      return { success: false, message: error.message };
    }
  };

  const returnItems = async (barcodes: string[]) => {
    try {
      const res = await authFetch(`${API_URL}/sales/return`, {
        method: 'POST',
        body: JSON.stringify({ barcodes })
      });
      const result = await res.json();
      
      if (res.ok && result.success) {
        
        authFetch(`${API_URL}/sales`).then(res => res.json()).then(data => {
            if(Array.isArray(data)) setSales(data);
        });
        toast.success(result.message || 'Items returned');
        return { success: true, message: result.message };
      }
      toast.error(result.message || 'Failed to return items');
      return { success: false, message: result.message || 'Failed to return items' };
    } catch (error: any) {
      console.error("Error returning items:", error);
      toast.error(error.message);
      return { success: false, message: error.message };
    }
  };

  const addPayment = async (buyerId: string, amount: number, notes?: string) => {
    try {
      const res = await authFetch(`${API_URL}/payments`, {
        method: 'POST',
        body: JSON.stringify({ buyerId, amount, notes })
      });
      const result = await res.json();
      if (res.ok) {
        setPayments(prev => [result, ...prev]);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error adding payment:", error);
      return false;
    }
  };

  const editPayment = async (id: string, buyerId: string, amount: number, notes?: string) => {
    try {
      const res = await authFetch(`${API_URL}/payments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ buyerId, amount, notes })
      });
      const result = await res.json();
      if (res.ok) {
        setPayments(prev => prev.map(p => p.id === id ? result : p));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error editing payment:", error);
      return false;
    }
  };

  const deletePayment = async (id: string) => {
    try {
      const res = await authFetch(`${API_URL}/payments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPayments(prev => prev.filter(p => p.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting payment:", error);
      return false;
    }
  };

  const addMetalReceipt = async (buyerId: string, weight: number, purity: number, notes?: string) => {
    try {
      const res = await authFetch(`${API_URL}/metal_receipts`, {
        method: 'POST',
        body: JSON.stringify({ buyerId, weight, purity, notes })
      });
      const result = await res.json();
      if (res.ok) {
        setMetalReceipts(prev => [result, ...prev]);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error adding metal receipt:", error);
      return false;
    }
  };

  const editMetalReceipt = async (id: string, buyerId: string, weight: number, purity: number, notes?: string) => {
    try {
      const res = await authFetch(`${API_URL}/metal_receipts/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ buyerId, weight, purity, notes })
      });
      const result = await res.json();
      if (res.ok) {
        setMetalReceipts(prev => prev.map(m => m.id === id ? result : m));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error editing metal receipt:", error);
      return false;
    }
  };

  const deleteMetalReceipt = async (id: string) => {
    try {
      const res = await authFetch(`${API_URL}/metal_receipts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMetalReceipts(prev => prev.filter(m => m.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting metal receipt:", error);
      return false;
    }
  };

  return (
    <InventoryContext.Provider value={{ buyers, sales, payments, metalReceipts, itemTypes, models, isLoading, addItem, editItem, deleteItem, addBuyer, editBuyer, deleteBuyer, addItemType, editItemType, deleteItemType, addModel, editModel, deleteModel, processBulkSale, voidTransaction, returnItems, addPayment, editPayment, deletePayment, addMetalReceipt, editMetalReceipt, deleteMetalReceipt, printItem, setPrintItem, printInvoiceData, setPrintInvoiceData, printStatementData, setPrintStatementData }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
