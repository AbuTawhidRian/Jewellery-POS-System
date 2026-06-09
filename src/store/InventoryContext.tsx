import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export type ItemStatus = 'In Stock' | 'Sold';

export interface Item {
  id: string;
  barcode: string;
  type: string;
  description: string;
  weight: number;
  status: ItemStatus;
  date_added?: string; // Supabase uses snake_case usually if not specified otherwise
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
  type: string;
}

export interface InvoiceData {
  buyerName: string;
  items: { barcode: string; type: string; weight: number }[];
  date: string;
  totalWeight: number;
}

interface InventoryContextType {
  items: Item[];
  buyers: Buyer[];
  sales: Sale[];
  itemTypes: ItemType[];
  isLoading: boolean;
  addItem: (item: Omit<Item, 'id' | 'status' | 'dateAdded' | 'date_added'>) => Promise<{ success: boolean, data?: Item, error?: string }>;
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
          supabase.from('items').select('*').order('date_added', { ascending: true }),
          supabase.from('buyers').select('*'),
          supabase.from('sales').select('*').order('date', { ascending: false }),
          supabase.from('item_types').select('*').order('name', { ascending: true })
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

  const addItem = async (itemData: Omit<Item, 'id' | 'status' | 'dateAdded' | 'date_added'>) => {
    const { data, error } = await supabase
      .from('items')
      .insert([{
        barcode: itemData.barcode,
        type: itemData.type,
        description: itemData.description,
        weight: itemData.weight,
        status: 'In Stock'
      }])
      .select()
      .single();

    if (error) {
      console.error("Error adding item:", error);
      return { success: false, error: error.message };
    }

    if (data) {
      setItems(prev => [...prev, data]);
      return { success: true, data };
    }
    
    return { success: false, error: "Unknown error" };
  };

  const addBuyer = async (name: string) => {
    const { data, error } = await supabase
      .from('buyers')
      .insert([{ name }])
      .select()
      .single();

    if (error) {
      console.error("Error adding buyer:", error);
      return null;
    }
    if (data) {
      setBuyers(prev => [...prev, data]);
      return data;
    }
    return null;
  };

  const deleteBuyer = async (id: string) => {
    const { error } = await supabase
      .from('buyers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting buyer:", error);
      return false;
    }
    setBuyers(prev => prev.filter(b => b.id !== id));
    return true;
  };

  const addItemType = async (name: string) => {
    const { data, error } = await supabase
      .from('item_types')
      .insert([{ name }])
      .select()
      .single();

    if (error) {
      console.error("Error adding item type:", error);
      return null;
    }
    if (data) {
      setItemTypes(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    }
    return null;
  };

  const deleteItemType = async (id: string) => {
    const { error } = await supabase
      .from('item_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting item type:", error);
      return false;
    }
    setItemTypes(prev => prev.filter(t => t.id !== id));
    return true;
  };

  const processBulkSale = async (barcodes: string[], buyerId: string) => {
    const buyer = buyers.find(b => b.id === buyerId);
    if (!buyer) return { success: false, message: 'Buyer not found.' };

    const itemsToUpdate = items.filter(i => barcodes.includes(i.barcode) && i.status === 'In Stock');
    if (itemsToUpdate.length === 0) {
      return { success: false, message: 'No valid items found to process.' };
    }

    const saleRecords = itemsToUpdate.map(item => ({
      item_id: item.id,
      buyer_id: buyer.id,
      buyer_name: buyer.name,
      weight: item.weight,
      type: item.type,
      barcode: item.barcode
    }));

    try {
      // 1. Mark items as sold
      const { error: updateError } = await supabase
        .from('items')
        .update({ status: 'Sold' })
        .in('id', itemsToUpdate.map(i => i.id));
        
      if (updateError) throw updateError;

      // 2. Insert sales
      const { data: newSales, error: insertError } = await supabase
        .from('sales')
        .insert(saleRecords)
        .select();

      if (insertError) throw insertError;

      // Update local state
      setItems(prevItems => prevItems.map(item => 
        barcodes.includes(item.barcode) ? { ...item, status: 'Sold' } : item
      ));

      if (newSales) {
        setSales(prev => [...newSales, ...prev]);
      }

      return { success: true, message: `Successfully processed ${itemsToUpdate.length} items for ${buyer.name}.` };
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
