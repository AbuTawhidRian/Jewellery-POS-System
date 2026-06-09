import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Fetch all inventory items
app.get('/api/inventory', async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      orderBy: { dateAdded: 'asc' }
    });
    res.json(items);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add new inventory item
app.post('/api/inventory', async (req, res) => {
  try {
    const { barcode, type, description, weight } = req.body;
    
    // Check if barcode exists
    const existing = await prisma.item.findUnique({ where: { barcode } });
    if (existing) {
      return res.status(400).json({ error: 'Barcode already exists' });
    }

    const newItem = await prisma.item.create({
      data: {
        barcode,
        type,
        description,
        weight: parseFloat(weight),
        status: 'In Stock',
      }
    });
    
    res.json(newItem);
  } catch (error) {
    console.error("Error adding inventory:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Fetch all buyers
app.get('/api/buyers', async (req, res) => {
  try {
    const buyers = await prisma.buyer.findMany();
    res.json(buyers);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Fetch all sales
app.get('/api/sales', async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      orderBy: { date: 'desc' },
      include: {
        item: true,
        buyer: true
      }
    });
    
    // Flatten output to match frontend expectations
    const flatSales = sales.map(s => ({
      id: s.id,
      itemId: s.itemId,
      barcode: s.item.barcode,
      buyerId: s.buyerId,
      buyerName: s.buyer.name,
      date: s.date,
      weight: s.weight,
      type: s.item.type,
    }));
    
    res.json(flatSales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Process a bulk sale (Checkout Cart)
app.post('/api/sales/bulk', async (req, res) => {
  try {
    const { barcodes, buyerId } = req.body;
    
    const buyer = await prisma.buyer.findUnique({ where: { id: buyerId } });
    if (!buyer) return res.status(400).json({ error: 'Buyer not found' });

    // We use a transaction to safely mark items as sold and create sales records
    const result = await prisma.$transaction(async (tx) => {
      const itemsToSell = await tx.item.findMany({
        where: {
          barcode: { in: barcodes },
          status: 'In Stock'
        }
      });

      if (itemsToSell.length === 0) {
        throw new Error('No valid items found to sell');
      }

      // Mark items as sold
      await tx.item.updateMany({
        where: { id: { in: itemsToSell.map(i => i.id) } },
        data: { status: 'Sold' }
      });

      // Create sale records
      const saleData = itemsToSell.map(item => ({
        itemId: item.id,
        buyerId: buyer.id,
        weight: item.weight
      }));

      await tx.sale.createMany({ data: saleData });

      return itemsToSell.length;
    });

    res.json({ success: true, count: result, message: `Successfully processed ${result} items for ${buyer.name}` });
  } catch (error: any) {
    console.error("Bulk sale error:", error);
    res.status(500).json({ error: error.message || 'Failed to process sale' });
  }
});

app.listen(port, () => {
  console.log(`API Server running on http://localhost:${port}`);
});
