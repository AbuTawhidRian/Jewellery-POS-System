import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export type ItemStatus = 'In Stock' | 'Sold';

export interface Item {
  id: string;
  barcode: string;
  type: string;
  description: string;
  weight: number;
  stone_weight: number;
  status: ItemStatus;
  date_added?: string;
}

export interface ItemType {
  id: string;
  name: string;
}

export interface Description {
  id: string;
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
  description: string;
}

export interface InvoiceData {
  buyerName: string;
  items: { barcode?: string; type: string; description?: string; weight: number; stone_weight: number }[];
  date: string;
  totalWeight: number;
}

interface InventoryContextType {
  items: Item[];
  buyers: Buyer[];
  sales: Sale[];
  itemTypes: ItemType[];
  isLoading: boolean;
  addItem: (item: Partial<Pick<Item, 'barcode'>> & Omit<Item, 'id' | 'status' | 'dateAdded' | 'date_added' | 'barcode'>) => Promise<{ success: boolean, data?: Item, error?: string }>;
  editItem: (id: string, updatedData: Partial<Item>) => Promise<{ success: boolean, data?: Item, error?: string }>;
  deleteItem: (id: string) => Promise<boolean>;
  addBuyer: (name: string) => Promise<Buyer | null>;
  editBuyer: (id: string, name: string) => Promise<boolean>;
  deleteBuyer: (id: string) => Promise<boolean>;
  addItemType: (name: string) => Promise<ItemType | null>;
  editItemType: (id: string, name: string) => Promise<boolean>;
  deleteItemType: (id: string) => Promise<boolean>;
  descriptions: Description[];
  addDescription: (name: string) => Promise<Description | null>;
  editDescription: (id: string, name: string) => Promise<boolean>;
  deleteDescription: (id: string) => Promise<boolean>;
  processBulkSale: (barcodes: string[], buyerId: string) => Promise<{ success: boolean; message: string }>;
  voidTransaction: (buyerId: string, date: string) => Promise<{ success: boolean; message: string }>;
  printItem: Item | null;
  setPrintItem: (item: Item | null) => void;
  printInvoiceData: InvoiceData | null;
  setPrintInvoiceData: (data: InvoiceData | null) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const API_URL = 'http://localhost:3001/api';

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [descriptions, setDescriptions] = useState<Description[]>([]);
  const [printItem, setPrintItem] = useState<Item | null>(null);
  const [printInvoiceData, setPrintInvoiceData] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    // Default to application/json if no Content-Type is provided and we have a body
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(url, { ...options, headers });
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [itemsRes, buyersRes, salesRes, typesRes, descRes] = await Promise.all([
          authFetch(`${API_URL}/inventory`).then(res => res.json()),
          authFetch(`${API_URL}/buyers`).then(res => res.json()),
          authFetch(`${API_URL}/sales`).then(res => res.json()),
          // The backend might not have item_types and descriptions endpoints right now,
          // but we will keep them as is and handle errors gracefully
          authFetch(`${API_URL}/item_types`).then(res => res.ok ? res.json() : []),
          authFetch(`${API_URL}/descriptions`).then(res => res.ok ? res.json() : [])
        ]);

        if (Array.isArray(itemsRes)) setItems(itemsRes);
        if (Array.isArray(buyersRes)) setBuyers(buyersRes);
        if (Array.isArray(salesRes)) setSales(salesRes);
        if (Array.isArray(typesRes)) setItemTypes(typesRes);
        if (Array.isArray(descRes)) setDescriptions(descRes);
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
        setItems(prev => [...prev, result]);
        return { success: true, data: result };
      }
      return { success: false, error: result.error || 'Failed to add item' };
    } catch (error: any) {
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
        setItems(prev => prev.map(item => item.id === id ? result : item));
        return { success: true, data: result };
      }
      return { success: false, error: result.error || 'Failed to update item' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const res = await authFetch(`${API_URL}/inventory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting item:", error);
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
        return result;
      }
      return null;
    } catch (error) {
      console.error("Error adding buyer:", error);
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
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error editing buyer:", error);
      return false;
    }
  };

  const deleteBuyer = async (id: string) => {
    try {
      const res = await authFetch(`${API_URL}/buyers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBuyers(prev => prev.filter(b => b.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting buyer:", error);
      return false;
    }
  };

  const addItemType = async (name: string) => {
    try {
      const res = await authFetch(`${API_URL}/item_types`, {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      const result = await res.json();
      
      if (res.ok) {
        setItemTypes(prev => [...prev, result].sort((a, b) => a.name.localeCompare(b.name)));
        return result;
      }
      return null;
    } catch (error) {
      console.error("Error adding item type:", error);
      return null;
    }
  };

  const editItemType = async (id: string, name: string) => {
    try {
      const oldTypeObj = itemTypes.find(t => t.id === id);
      const res = await authFetch(`${API_URL}/item_types/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name })
      });
      const result = await res.json();
      if (res.ok) {
        setItemTypes(prev => prev.map(t => t.id === id ? result : t).sort((a, b) => a.name.localeCompare(b.name)));
        if (oldTypeObj) {
          setItems(prev => prev.map(i => i.type === oldTypeObj.name ? { ...i, type: name } : i));
          setSales(prev => prev.map(s => s.type === oldTypeObj.name ? { ...s, type: name } : s));
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error editing item type:", error);
      return false;
    }
  };

  const deleteItemType = async (id: string) => {
    try {
      const res = await authFetch(`${API_URL}/item_types/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItemTypes(prev => prev.filter(t => t.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting item type:", error);
      return false;
    }
  };

  const addDescription = async (name: string) => {
    try {
      const res = await authFetch(`${API_URL}/descriptions`, {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      const result = await res.json();
      
      if (res.ok) {
        setDescriptions(prev => [...prev, result].sort((a, b) => a.name.localeCompare(b.name)));
        return result;
      }
      return null;
    } catch (error) {
      console.error("Error adding description:", error);
      return null;
    }
  };

  const editDescription = async (id: string, name: string) => {
    try {
      const oldDescObj = descriptions.find(d => d.id === id);
      const res = await authFetch(`${API_URL}/descriptions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name })
      });
      const result = await res.json();
      if (res.ok) {
        setDescriptions(prev => prev.map(d => d.id === id ? result : d).sort((a, b) => a.name.localeCompare(b.name)));
        if (oldDescObj) {
          setItems(prev => prev.map(i => i.description === oldDescObj.name ? { ...i, description: name } : i));
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error editing description:", error);
      return false;
    }
  };

  const deleteDescription = async (id: string) => {
    try {
      const res = await authFetch(`${API_URL}/descriptions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDescriptions(prev => prev.filter(d => d.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting description:", error);
      return false;
    }
  };

  const processBulkSale = async (barcodes: string[], buyerId: string) => {
    const buyer = buyers.find(b => b.id === buyerId);
    if (!buyer) return { success: false, message: 'Buyer not found.' };

    try {
      const res = await authFetch(`${API_URL}/sales/bulk`, {
        method: 'POST',
        body: JSON.stringify({ barcodes, buyerId })
      });
      
      const result = await res.json();
      
      if (res.ok && result.success) {
        setItems(prevItems => prevItems.map(item => 
          barcodes.includes(item.barcode) ? { ...item, status: 'Sold' } : item
        ));
        
        // Refetch sales since bulk endpoint doesn't return full objects in our backend right now
        authFetch(`${API_URL}/sales`).then(res => res.json()).then(data => {
            if(Array.isArray(data)) setSales(data);
        });
        
        return { success: true, message: result.message };
      }
      
      return { success: false, message: result.message || 'Failed to process sale' };
    } catch (error: any) {
      console.error("Error processing bulk sale:", error);
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
        authFetch(`${API_URL}/inventory`).then(res => res.json()).then(data => {
          if (Array.isArray(data)) setItems(data);
        });
        return { success: true, message: result.message };
      }
      return { success: false, message: result.message || 'Failed to void transaction' };
    } catch (error: any) {
      console.error("Error voiding transaction:", error);
      return { success: false, message: error.message };
    }
  };

  return (
    <InventoryContext.Provider value={{ items, buyers, sales, itemTypes, descriptions, isLoading, addItem, editItem, deleteItem, addBuyer, editBuyer, deleteBuyer, addItemType, editItemType, deleteItemType, addDescription, editDescription, deleteDescription, processBulkSale, voidTransaction, printItem, setPrintItem, printInvoiceData, setPrintInvoiceData }}>
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
