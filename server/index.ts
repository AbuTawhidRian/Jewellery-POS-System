import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_123';

app.use(cors());
app.use(express.json());

// --- Authentication Middleware ---
interface AuthRequest extends Request {
  user?: { id: string; shopId: string; email: string };
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied, token missing' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// --- Auth Routes ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { shopName, userName, email, password } = req.body;
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);

    const newShop = await prisma.shop.create({
      data: {
        name: shopName,
        users: {
          create: {
            name: userName,
            email,
            passwordHash,
          }
        }
      },
      include: { users: true }
    });

    const user = newShop.users[0];
    const token = jwt.sign({ id: user.id, shopId: newShop.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, shopId: newShop.id, shopName: newShop.name } });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email }, include: { shop: true } });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, shopId: user.shopId, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, shopId: user.shopId, shopName: user.shop.name } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user!.id },
      include: { shop: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ id: user.id, name: user.name, email: user.email, shopId: user.shopId, shopName: user.shop.name });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Protected API Routes ---

app.get('/api/inventory', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const items = await prisma.item.findMany({
      where: { shopId: req.user!.shopId },
      orderBy: { dateAdded: 'asc' }
    });
    res.json(items);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/inventory', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { barcode, type, description, weight, stone_weight } = req.body;
    const shopId = req.user!.shopId;
    
    const existing = await prisma.item.findUnique({ 
      where: { barcode_shopId: { barcode, shopId } } 
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Barcode already exists in your shop' });
    }

    const newItem = await prisma.item.create({
      data: {
        shopId,
        barcode,
        type,
        description,
        weight: parseFloat(weight),
        stone_weight: stone_weight ? parseFloat(stone_weight) : null,
        status: 'In Stock',
      }
    });
    
    res.json(newItem);
  } catch (error) {
    console.error("Error adding inventory:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/buyers', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const buyers = await prisma.buyer.findMany({
      where: { shopId: req.user!.shopId }
    });
    res.json(buyers);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/sales', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const sales = await prisma.sale.findMany({
      where: { shopId: req.user!.shopId },
      orderBy: { date: 'desc' },
      include: {
        item: true,
        buyer: true
      }
    });
    
    const flatSales = sales.map(s => ({
      id: s.id,
      itemId: s.itemId,
      barcode: s.item.barcode,
      buyerId: s.buyerId,
      buyerName: s.buyer.name,
      date: s.date,
      weight: s.weight,
      type: s.item.type,
      stone_weight: s.item.stone_weight,
      description: s.item.description,
    }));
    
    res.json(flatSales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/sales/bulk', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { barcodes, buyerId } = req.body;
    const shopId = req.user!.shopId;
    
    let actualBuyerId = buyerId;
    
    // Validate buyer or create if they sent a name but no ID (assuming UI might do this)
    if (buyerId) {
      const buyer = await prisma.buyer.findUnique({ where: { id: buyerId } });
      if (!buyer || buyer.shopId !== shopId) return res.status(400).json({ error: 'Buyer not found in your shop' });
    } else {
       return res.status(400).json({ error: 'Buyer is required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const itemsToSell = await tx.item.findMany({
        where: {
          shopId,
          barcode: { in: barcodes },
          status: 'In Stock'
        }
      });

      if (itemsToSell.length === 0) {
        throw new Error('No valid items found to sell');
      }

      await tx.item.updateMany({
        where: { id: { in: itemsToSell.map(i => i.id) } },
        data: { status: 'Sold' }
      });

      const saleData = itemsToSell.map(item => ({
        shopId,
        itemId: item.id,
        buyerId: actualBuyerId,
        weight: item.weight
      }));

      await tx.sale.createMany({ data: saleData });

      return itemsToSell.length;
    });

    res.json({ success: true, count: result, message: `Successfully processed ${result} items` });
  } catch (error: any) {
    console.error("Bulk sale error:", error);
    res.status(500).json({ error: error.message || 'Failed to process sale' });
  }
});

app.listen(port, () => {
  console.log(`API Server running on http://localhost:${port}`);
});
