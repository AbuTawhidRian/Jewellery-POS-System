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
  const [descriptions, setDescriptions] = useState<Description[]>([]);
  const [printItem, setPrintItem] = useState<Item | null>(null);
  const [printInvoiceData, setPrintInvoiceData] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [itemsRes, buyersRes, salesRes, typesRes, descRes] = await Promise.all([
          fetch(`${API_URL}/items`).then(res => res.json()),
          fetch(`${API_URL}/buyers`).then(res => res.json()),
          fetch(`${API_URL}/sales`).then(res => res.json()),
          fetch(`${API_URL}/item_types`).then(res => res.json()),
          fetch(`${API_URL}/descriptions`).then(res => res.json())
        ]);

        if (itemsRes.data) setItems(itemsRes.data);
        if (buyersRes.data) setBuyers(buyersRes.data);
        if (salesRes.data) setSales(salesRes.data);
        if (typesRes.data) setItemTypes(typesRes.data);
        if (descRes.data) setDescriptions(descRes.data);
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

  const editItem = async (id: string, updatedData: Partial<Item>) => {
    try {
      const res = await fetch(`${API_URL}/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      const result = await res.json();
      
      if (res.ok && result.data) {
        setItems(prev => prev.map(item => item.id === id ? result.data : item));
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error || 'Failed to update item' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/items/${id}`, { method: 'DELETE' });
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

  const editBuyer = async (id: string, name: string) => {
    try {
      const res = await fetch(`${API_URL}/buyers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const result = await res.json();
      if (res.ok && result.data) {
        setBuyers(prev => prev.map(b => b.id === id ? result.data : b));
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

  const editItemType = async (id: string, name: string) => {
    try {
      const oldTypeObj = itemTypes.find(t => t.id === id);
      const res = await fetch(`${API_URL}/item_types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const result = await res.json();
      if (res.ok && result.data) {
        setItemTypes(prev => prev.map(t => t.id === id ? result.data : t).sort((a, b) => a.name.localeCompare(b.name)));
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

  const addDescription = async (name: string) => {
    try {
      const res = await fetch(`${API_URL}/descriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const result = await res.json();
      
      if (res.ok && result.data) {
        setDescriptions(prev => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)));
        return result.data;
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
      const res = await fetch(`${API_URL}/descriptions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const result = await res.json();
      if (res.ok && result.data) {
        setDescriptions(prev => prev.map(d => d.id === id ? result.data : d).sort((a, b) => a.name.localeCompare(b.name)));
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
      const res = await fetch(`${API_URL}/descriptions/${id}`, { method: 'DELETE' });
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
    <InventoryContext.Provider value={{ items, buyers, sales, itemTypes, descriptions, isLoading, addItem, editItem, deleteItem, addBuyer, editBuyer, deleteBuyer, addItemType, editItemType, deleteItemType, addDescription, editDescription, deleteDescription, processBulkSale, printItem, setPrintItem, printInvoiceData, setPrintInvoiceData }}>
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
