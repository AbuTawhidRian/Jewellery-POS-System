import React, { createContext, useContext, useEffect, useState } from 'react';

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
}

export interface InvoiceData {
  buyerName: string;
  items: { barcode: string; type: string; weight: number; stone_weight: number }[];
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
  addBuyer: (name: string) => Promise<Buyer | null>;
  deleteBuyer: (id: string) => Promise<boolean>;
  addItemType: (name: string) => Promise<ItemType | null>;
  deleteItemType: (id: string) => Promise<boolean>;
  processBulkSale: (barcodes: string[], buyerId: string) => Promise<{ success: boolean; message: string }>;
  printItem: Item | null;
  setPrintItem: (item: Item | null) => void;
  printInvoiceData: InvoiceData | null;
  setPrintInvoiceData: (data: InvoiceData | null) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// API Base URL - empty means relative to current domain (since backend serves static files)
const API_URL = '/api';

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [printItem, setPrintItem] = useState<Item | null>(null);
  const [printInvoiceData, setPrintInvoiceData] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [itemsRes, buyersRes, salesRes, typesRes] = await Promise.all([
          fetch(`${API_URL}/items`).then(res => res.json()),
          fetch(`${API_URL}/buyers`).then(res => res.json()),
          fetch(`${API_URL}/sales`).then(res => res.json()),
          fetch(`${API_URL}/item_types`).then(res => res.json())
        ]);

        if (itemsRes.data) setItems(itemsRes.data);
        if (buyersRes.data) setBuyers(buyersRes.data);
        if (salesRes.data) setSales(salesRes.data);
        if (typesRes.data) setItemTypes(typesRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const addItem = async (itemData: Partial<Pick<Item, 'barcode'>> & Omit<Item, 'id' | 'status' | 'dateAdded' | 'date_added' | 'barcode'>) => {
    try {
      const res = await fetch(`${API_URL}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });
      const result = await res.json();
      
      if (res.ok && result.data) {
        setItems(prev => [...prev, result.data]);
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error || 'Failed to add item' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const addBuyer = async (name: string) => {
    try {
      const res = await fetch(`${API_URL}/buyers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const result = await res.json();
      
      if (res.ok && result.data) {
        setBuyers(prev => [...prev, result.data]);
        return result.data;
      }
      return null;
    } catch (error) {
      console.error("Error adding buyer:", error);
      return null;
    }
  };

  const deleteBuyer = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/buyers/${id}`, { method: 'DELETE' });
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
      const res = await fetch(`${API_URL}/item_types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const result = await res.json();
      
      if (res.ok && result.data) {
        setItemTypes(prev => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)));
        return result.data;
      }
      return null;
    } catch (error) {
      console.error("Error adding item type:", error);
      return null;
    }
  };

  const deleteItemType = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/item_types/${id}`, { method: 'DELETE' });
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

  const processBulkSale = async (barcodes: string[], buyerId: string) => {
    const buyer = buyers.find(b => b.id === buyerId);
    if (!buyer) return { success: false, message: 'Buyer not found.' };

    try {
      const res = await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcodes, buyerId })
      });
      
      const result = await res.json();
      
      if (res.ok && result.success) {
        // Update local state
        setItems(prevItems => prevItems.map(item => 
          barcodes.includes(item.barcode) ? { ...item, status: 'Sold' } : item
        ));

        if (result.data) {
          setSales(prev => [...result.data, ...prev]);
        }
        return { success: true, message: result.message };
      }
      
      return { success: false, message: result.message || 'Failed to process sale' };
    } catch (error: any) {
      console.error("Error processing bulk sale:", error);
      return { success: false, message: error.message || "Failed to process sale" };
    }
  };

  return (
    <InventoryContext.Provider value={{ items, buyers, sales, itemTypes, isLoading, addItem, addBuyer, deleteBuyer, addItemType, deleteItemType, processBulkSale, printItem, setPrintItem, printInvoiceData, setPrintInvoiceData }}>
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
