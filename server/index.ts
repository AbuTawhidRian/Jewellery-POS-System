import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient, Role, SubStatus } from '@prisma/client';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path from 'path';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 80;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in .env');
  process.exit(1);
}
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'abutawhidrian@gmail.com';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;
if (!SUPERADMIN_PASSWORD) {
  console.error('FATAL ERROR: SUPERADMIN_PASSWORD is not defined in .env');
  process.exit(1);
}

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// --- Authentication & Authorization Middleware ---
export interface AuthRequest extends Request {
  user?: {
    id?: string;
    shopId?: string | null;
    email: string;
    role: Role | 'SUPERADMIN';
    customRole?: string | null;
    permissions?: string[];
  };
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

const requireRole = (...allowedRoles: (Role | 'SUPERADMIN')[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role' });
    }
    next();
  };
};

const requireAccess = (allowedRoles: (Role | 'SUPERADMIN')[], allowedPermissions: string[] = []) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role === 'OWNER' || req.user.role === 'SUPERADMIN') return next();
    if (allowedRoles.includes(req.user.role)) return next();
    if (req.user.permissions && req.user.permissions.some(p => allowedPermissions.includes(p))) return next();
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
  };
};

const requireSuperAdmin = requireRole('SUPERADMIN');

const requireActiveOrTrial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role === 'SUPERADMIN') return next();
  if (!req.user.shopId) return res.status(403).json({ error: 'No shop associated' });

  try {
    const sub = await prisma.subscription.findUnique({ where: { shopId: req.user.shopId } });
    
    // Auto-create trial for existing shops that don't have a subscription
    if (!sub) {
      await prisma.subscription.create({
        data: { shopId: req.user.shopId, status: SubStatus.TRIAL }
      });
      return next();
    }

    if (sub.status === SubStatus.ACTIVE) return next();
    if (sub.status === SubStatus.TRIAL && new Date() <= sub.trialEndsAt) return next();

    return res.status(403).json({ error: 'Trial expired or subscription inactive. Please contact admin.' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// --- Auth Routes ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again after 15 minutes' }
});

const registerSchema = z.object({
  shopName: z.string().min(2).max(100),
  userName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(72)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(72)
});

const userSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  role: z.string(),
  customRole: z.string().nullable().optional(),
  permissions: z.array(z.string()).optional()
});
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input data' });
    const { shopName, userName, email, password } = parsed.data;
    
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
            role: Role.OWNER
          }
        },
        subscription: {
          create: {
            status: SubStatus.TRIAL
            // trialEndsAt defaults to 14 days from now in Prisma schema
          }
        }
      },
      include: { users: true }
    });

    const user = newShop.users[0];
    const token = jwt.sign({ id: user.id, shopId: newShop.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, shopId: newShop.id, shopName: newShop.name, role: user.role } });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid email or password format' });
    const { email, password } = parsed.data;
    
    const user = await prisma.user.findUnique({ where: { email }, include: { shop: true } });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, shopId: user.shopId, email: user.email, role: user.role, customRole: user.customRole, permissions: user.permissions }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, shopId: user.shopId, shopName: user.shop?.name, shopEmail: user.shop?.email, shopPhone: user.shop?.phone, role: user.role, customRole: user.customRole, permissions: user.permissions } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/auth/superadmin', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (email === SUPERADMIN_EMAIL && password === SUPERADMIN_PASSWORD) {
      const token = jwt.sign({ email, role: 'SUPERADMIN' }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { name: 'Super Admin', email, role: 'SUPERADMIN' } });
    }
    return res.status(400).json({ error: 'Invalid super admin credentials' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role === 'SUPERADMIN') {
      return res.json({ name: 'Super Admin', email: req.user.email, role: 'SUPERADMIN' });
    }
    
    const user = await prisma.user.findUnique({ 
      where: { id: req.user!.id! },
      include: { shop: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ id: user.id, name: user.name, email: user.email, shopId: user.shopId, shopName: user.shop?.name, shopEmail: user.shop?.email, shopPhone: user.shop?.phone, role: user.role, customRole: user.customRole, permissions: user.permissions });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.put('/api/auth/change-password', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // SuperAdmin bypass (they shouldn't change password here, but just in case)
    if (req.user?.role === 'SUPERADMIN') {
      return res.status(403).json({ error: 'Super Admin password cannot be changed here' });
    }
    
    const user = await prisma.user.findUnique({ where: { id: req.user!.id! } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) return res.status(400).json({ error: 'Incorrect current password' });
    
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash }
    });
    
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Owner Staff Management Routes ---

app.get('/api/users', authenticateToken, requireRole(Role.OWNER), async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { shopId: req.user!.shopId! },
      select: { id: true, name: true, email: true, role: true, customRole: true, permissions: true, createdAt: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

  app.post('/api/users', authenticateToken, requireRole(Role.OWNER), async (req: AuthRequest, res) => {
    try {
      const parsed = userSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid user data format' });
      const { name, email, password, role, customRole, permissions } = parsed.data;
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return res.status(400).json({ error: 'Email already exists' });
  
      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: role as Role,
          customRole,
          permissions,
          shopId: req.user!.shopId!
        },
        select: { id: true, name: true, email: true, role: true, customRole: true, permissions: true, createdAt: true }
      });
      res.json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

  app.patch('/api/users/:id', authenticateToken, requireRole(Role.OWNER), async (req: AuthRequest, res) => {
    try {
      const { name, role, customRole, permissions, password } = req.body;
      const userId = String(req.params.id);
      // Don't allow modifying other shop's users
      const existing = await prisma.user.findUnique({ where: { id: userId } });
      if (!existing || existing.shopId !== req.user!.shopId) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const updateData: any = { name, role: role as Role };
      if (customRole !== undefined) updateData.customRole = customRole;
      if (permissions !== undefined) updateData.permissions = permissions;
      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }
      
      const updated = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: { id: true, name: true, email: true, role: true, customRole: true, permissions: true, createdAt: true }
      });
      res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/users/:id', authenticateToken, requireRole(Role.OWNER), async (req: AuthRequest, res) => {
  try {
    const userId = String(req.params.id);
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing || existing.shopId !== req.user!.shopId) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (existing.id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    await prisma.user.delete({ where: { id: userId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Shop Routes ---
app.get('/api/shop', authenticateToken, requireRole(Role.OWNER), async (req: AuthRequest, res) => {
  try {
    const shop = await prisma.shop.findUnique({ where: { id: req.user!.shopId! } });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    res.json(shop);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/shop', authenticateToken, requireRole(Role.OWNER), async (req: AuthRequest, res) => {
  try {
    const { name, trn, address, email, phone } = req.body;
    const shop = await prisma.shop.update({
      where: { id: req.user!.shopId! },
      data: { name, trn, address, email, phone }
    });
    res.json(shop);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Subscription Routes ---

app.get('/api/subscription', authenticateToken, requireRole(Role.OWNER), async (req: AuthRequest, res) => {
  try {
    const sub = await prisma.subscription.findUnique({ where: { shopId: req.user!.shopId! } });
    res.json(sub);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/subscription/voucher-number', authenticateToken, requireRole(Role.OWNER), async (req: AuthRequest, res) => {
  try {
    const { voucherNumber } = req.body;
    const sub = await prisma.subscription.update({
      where: { shopId: req.user!.shopId! },
      data: {
        voucherNumber,
        status: SubStatus.PENDING
      }
    });
    res.json(sub);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Super-Admin Routes ---

app.get('/api/admin/shops', authenticateToken, requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const shops = await prisma.shop.findMany({
      include: {
        subscription: true,
        users: {
          where: { role: Role.OWNER },
          select: { name: true, email: true }
        }
      }
    });
    res.json(shops);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.patch('/api/admin/subscriptions/:shopId', authenticateToken, requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const shopId = String(req.params.shopId);
    const { status, voucherNumber, endsAt } = req.body;
    
    const updateData: any = { status: status as SubStatus };
    if (voucherNumber !== undefined) updateData.voucherNumber = voucherNumber;
    if (endsAt !== undefined) updateData.endsAt = new Date(endsAt);
    if (status === SubStatus.ACTIVE) {
      updateData.startedAt = new Date();
    }

    const sub = await prisma.subscription.update({
      where: { shopId },
      data: updateData
    });
    res.json(sub);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Protected API Routes (Requires Active/Trial) ---

// --- Item Types Routes ---
app.get('/api/item_types', authenticateToken, requireActiveOrTrial, async (req: AuthRequest, res) => {
  try {
    const itemTypes = await prisma.itemType.findMany({
      where: { shopId: req.user!.shopId! },
      orderBy: { name: 'asc' }
    });
    res.json(itemTypes);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/item_types', authenticateToken, requireActiveOrTrial, requireAccess([Role.OWNER, Role.MANAGER], ['view_vault', 'edit_vault', 'manage_buyers']), async (req: AuthRequest, res) => {
  try {
    const { name, purity } = req.body;
    const itemType = await prisma.itemType.create({
      data: { 
        name, 
        shopId: req.user!.shopId!,
        purity: purity !== undefined ? parseFloat(purity) : 1.0
      }
    });
    res.json(itemType);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/item_types/:id', authenticateToken, requireActiveOrTrial, requireAccess([Role.OWNER, Role.MANAGER], ['view_vault', 'edit_vault', 'manage_buyers']), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const { name, purity } = req.body;
    const existing = await prisma.itemType.findUnique({ where: { id } });
    if (!existing || existing.shopId !== req.user!.shopId) return res.status(404).json({ error: 'Not found' });

    if (name !== undefined && name !== existing.name) {
      // Update cascade manually since type is stored as a string
      await prisma.item.updateMany({
        where: { shopId: req.user!.shopId, type: existing.name },
        data: { type: name }
      });
      // We don't have type in sales in the new schema, or wait, do we? Let's check if sale has type.
      // Wait, let's just try to update items first, or I need to check schema.
    }

    const itemType = await prisma.itemType.update({
      where: { id },
      data: { 
        name: name !== undefined ? name : undefined,
        purity: purity !== undefined ? parseFloat(purity) : undefined
      }
    });
    res.json(itemType);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/item_types/:id', authenticateToken, requireActiveOrTrial, requireAccess([Role.OWNER, Role.MANAGER], ['view_vault', 'edit_vault', 'manage_buyers']), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.itemType.findUnique({ where: { id } });
    if (!existing || existing.shopId !== req.user!.shopId) return res.status(404).json({ error: 'Not found' });

    await prisma.itemType.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Models Routes ---
app.get('/api/models', authenticateToken, requireActiveOrTrial, async (req: AuthRequest, res) => {
  try {
    const models = await prisma.itemModel.findMany({
      where: { shopId: req.user!.shopId! },
      orderBy: { name: 'asc' }
    });
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/models', authenticateToken, requireActiveOrTrial, requireAccess([Role.OWNER, Role.MANAGER], ['view_vault', 'edit_vault', 'manage_buyers']), async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;
    const itemModel = await prisma.itemModel.create({
      data: { name, shopId: req.user!.shopId! }
    });
    res.json(itemModel);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/models/:id', authenticateToken, requireActiveOrTrial, requireAccess([Role.OWNER, Role.MANAGER], ['view_vault', 'edit_vault', 'manage_buyers']), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const { name } = req.body;
    const existing = await prisma.itemModel.findUnique({ where: { id } });
    if (!existing || existing.shopId !== req.user!.shopId) return res.status(404).json({ error: 'Not found' });

    if (name !== undefined && name !== existing.name) {
      await prisma.item.updateMany({
        where: { shopId: req.user!.shopId, model: existing.name },
        data: { model: name }
      });
    }

    const itemModel = await prisma.itemModel.update({
      where: { id },
      data: { name }
    });
    res.json(itemModel);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/models/:id', authenticateToken, requireActiveOrTrial, requireAccess([Role.OWNER, Role.MANAGER], ['view_vault', 'edit_vault', 'manage_buyers']), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.itemModel.findUnique({ where: { id } });
    if (!existing || existing.shopId !== req.user!.shopId) return res.status(404).json({ error: 'Not found' });

    await prisma.itemModel.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/inventory', authenticateToken, requireActiveOrTrial, async (req: AuthRequest, res) => {
  try {
    const items = await prisma.item.findMany({
      where: { shopId: req.user!.shopId! },
      orderBy: { dateAdded: 'asc' }
    });
    res.json(items);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/inventory', authenticateToken, requireActiveOrTrial, requireAccess([Role.OWNER, Role.MANAGER], ['view_vault', 'edit_vault', 'manage_buyers']), async (req: AuthRequest, res) => {
  try {
    let { barcode, type, model, weight, stone_weight } = req.body;
    const shopId = req.user!.shopId!;
    
    if (!barcode) {
      let prefix = 'XX';
      const shop = await prisma.shop.findUnique({ where: { id: shopId } });
      if (shop && shop.name) {
        const words = shop.name.trim().split(/\s+/).filter(w => w.length > 0);
        if (words.length >= 2) {
          prefix = (words[0][0] + words[1][0]).toUpperCase();
        } else if (words.length === 1) {
          prefix = words[0].substring(0, 2).toUpperCase();
        }
      }
      barcode = `${prefix}${Math.floor(100000000 + Math.random() * 900000000)}`;
    }

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
        model,
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

app.put('/api/inventory/:id', authenticateToken, requireActiveOrTrial, requireAccess([Role.OWNER, Role.MANAGER], ['view_vault', 'edit_vault', 'manage_buyers']), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const shopId = req.user!.shopId!;
    const { barcode, type, model, weight, stone_weight } = req.body;
    
    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing || existing.shopId !== shopId) return res.status(404).json({ error: 'Not found' });
    
    if (barcode && barcode !== existing.barcode) {
      const barcodeExists = await prisma.item.findUnique({
        where: { barcode_shopId: { barcode, shopId } }
      });
      if (barcodeExists) return res.status(400).json({ error: 'Barcode already exists' });
    }

    const updatedItem = await prisma.item.update({
      where: { id },
      data: {
        barcode: barcode !== undefined ? barcode : undefined,
        type: type !== undefined ? type : undefined,
        model: model !== undefined ? model : undefined,
        weight: weight !== undefined ? parseFloat(weight) : undefined,
        stone_weight: stone_weight !== undefined ? (stone_weight ? parseFloat(stone_weight) : null) : undefined,
      }
    });
    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/inventory/:id', authenticateToken, requireActiveOrTrial, requireAccess([Role.OWNER, Role.MANAGER], ['view_vault', 'edit_vault', 'manage_buyers']), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const shopId = req.user!.shopId!;
    
    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing || existing.shopId !== shopId) return res.status(404).json({ error: 'Not found' });
    
    await prisma.item.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/buyers', authenticateToken, requireActiveOrTrial, async (req: AuthRequest, res) => {
  try {
    const buyers = await prisma.buyer.findMany({
      where: { shopId: req.user!.shopId! }
    });
    res.json(buyers);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/buyers', authenticateToken, requireActiveOrTrial, async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;
    const shopId = req.user!.shopId!;
    const newBuyer = await prisma.buyer.create({
      data: { name, shopId }
    });
    res.json(newBuyer);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/buyers/:id', authenticateToken, requireActiveOrTrial, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const { name } = req.body;
    const shopId = req.user!.shopId!;
    const existing = await prisma.buyer.findUnique({ where: { id } });
    if (!existing || existing.shopId !== shopId) return res.status(404).json({ error: 'Not found' });
    
    const updated = await prisma.buyer.update({
      where: { id },
      data: { name }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/buyers/:id', authenticateToken, requireActiveOrTrial, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const shopId = req.user!.shopId!;
    const existing = await prisma.buyer.findUnique({ where: { id } });
    if (!existing || existing.shopId !== shopId) return res.status(404).json({ error: 'Not found' });
    
    await prisma.buyer.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/sales', authenticateToken, requireActiveOrTrial, async (req: AuthRequest, res) => {
  try {
    const sales = await prisma.sale.findMany({
      where: { shopId: req.user!.shopId! },
      orderBy: { date: 'desc' },
      include: {
        item: true,
        buyer: true
      }
    });
    
    const flatSales = sales.map(s => ({
      id: s.id,
      item_id: s.itemId,
      barcode: s.item.barcode,
      buyer_id: s.buyerId,
      buyer_name: s.buyer.name,
      date: s.date,
      weight: s.weight,
      type: s.item.type,
      stone_weight: s.item.stone_weight,
      model: s.item.model,
      makingCharge: s.makingCharge,
    }));
    
    res.json(flatSales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/sales/bulk', authenticateToken, requireActiveOrTrial, requireAccess([Role.OWNER, Role.MANAGER, Role.CASHIER], ['access_pos', 'delete_sale']), async (req: AuthRequest, res) => {
  try {
    const { barcodes, buyerId, totalMakingCharge = 0 } = req.body;
    const shopId = req.user!.shopId!;
    
    let actualBuyerId = buyerId;
    
    // Validate buyer or create if they sent a name but no ID
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

      const makingChargePerItem = itemsToSell.length > 0 ? (Number(totalMakingCharge) || 0) / itemsToSell.length : 0;

      const saleData = itemsToSell.map(item => ({
        shopId,
        itemId: item.id,
        buyerId: actualBuyerId,
        weight: item.weight,
        makingCharge: makingChargePerItem
      }));

      await tx.sale.createMany({ data: saleData });

      return itemsToSell.length;
    });

    res.json({ success: true, count: result, message: `Successfully processed ${result} items` });
  } catch (error: any) {
    console.error("Bulk sale error:", error);
    res.status(500).json({ error: 'Failed to process sale' });
  }
});

app.get('/api/payments', authenticateToken, requireActiveOrTrial, async (req: AuthRequest, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { shopId: req.user!.shopId! },
      orderBy: { date: 'desc' },
      include: { buyer: true }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/payments', authenticateToken, requireActiveOrTrial, requireAccess([Role.OWNER, Role.MANAGER, Role.CASHIER], ['manage_buyers', 'take_payment']), async (req: AuthRequest, res) => {
  try {
    const { buyerId, amount, notes } = req.body;
    const shopId = req.user!.shopId!;
    const payment = await prisma.payment.create({
      data: { shopId, buyerId, amount: Number(amount), notes }
    });
    const paymentWithBuyer = await prisma.payment.findUnique({
      where: { id: payment.id },
      include: { buyer: true }
    });
    res.json(paymentWithBuyer);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/payments/:id', authenticateToken, requireActiveOrTrial, requireAccess([Role.OWNER, Role.MANAGER], ['manage_buyers']), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const shopId = req.user!.shopId!;
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing || existing.shopId !== shopId) return res.status(404).json({ error: 'Not found' });
    
    await prisma.payment.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/payments/:id', authenticateToken, requireActiveOrTrial, requireAccess([Role.OWNER, Role.MANAGER, Role.CASHIER], ['manage_buyers']), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const shopId = req.user!.shopId!;
    const { buyerId, amount, notes } = req.body;
    
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing || existing.shopId !== shopId) return res.status(404).json({ error: 'Not found' });

    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: {
        buyerId: buyerId !== undefined ? buyerId : undefined,
        amount: amount !== undefined ? Number(amount) : undefined,
        notes: notes !== undefined ? notes : undefined
      }
    });
    
    const paymentWithBuyer = await prisma.payment.findUnique({
      where: { id: updatedPayment.id },
      include: { buyer: true }
    });
    res.json(paymentWithBuyer);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Metal Receipts Routes ---

app.get('/api/metal_receipts', authenticateToken, requireActiveOrTrial, async (req: AuthRequest, res) => {
  try {
    const receipts = await prisma.metalReceipt.findMany({
      where: { shopId: req.user!.shopId! },
      orderBy: { date: 'desc' },
      include: { buyer: true }
    });
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/metal_receipts', authenticateToken, requireActiveOrTrial, requireAccess([Role.OWNER, Role.MANAGER, Role.CASHIER], ['manage_buyers', 'receive_gold']), async (req: AuthRequest, res) => {
  try {
    const { buyerId, weight, purity, notes } = req.body;
    const shopId = req.user!.shopId!;
    const receipt = await prisma.metalReceipt.create({
      data: { shopId, buyerId, weight: Number(weight), purity: Number(purity) || 0.995, notes }
    });
    const receiptWithBuyer = await prisma.metalReceipt.findUnique({
      where: { id: receipt.id },
      include: { buyer: true }
    });
    res.json(receiptWithBuyer);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/metal_receipts/:id', authenticateToken, requireActiveOrTrial, requireAccess([Role.OWNER, Role.MANAGER, Role.CASHIER], ['manage_buyers']), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const shopId = req.user!.shopId!;
    const { buyerId, weight, purity, notes } = req.body;
    
    const existing = await prisma.metalReceipt.findUnique({ where: { id } });
    if (!existing || existing.shopId !== shopId) return res.status(404).json({ error: 'Not found' });

    const updated = await prisma.metalReceipt.update({
      where: { id },
      data: {
        buyerId: buyerId !== undefined ? buyerId : undefined,
        weight: weight !== undefined ? Number(weight) : undefined,
        purity: purity !== undefined ? Number(purity) : undefined,
        notes: notes !== undefined ? notes : undefined
      }
    });
    
    const receiptWithBuyer = await prisma.metalReceipt.findUnique({
      where: { id: updated.id },
      include: { buyer: true }
    });
    res.json(receiptWithBuyer);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/metal_receipts/:id', authenticateToken, requireActiveOrTrial, requireAccess([Role.OWNER, Role.MANAGER], ['manage_buyers']), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const shopId = req.user!.shopId!;
    const existing = await prisma.metalReceipt.findUnique({ where: { id } });
    if (!existing || existing.shopId !== shopId) return res.status(404).json({ error: 'Not found' });
    
    await prisma.metalReceipt.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/sales/wipe', authenticateToken, requireActiveOrTrial, requireAccess([Role.OWNER], []), async (req: AuthRequest, res) => {
  try {
    const shopId = req.user!.shopId!;
    const result = await prisma.$transaction(async (tx) => {
      const sales = await tx.sale.deleteMany({ where: { shopId } });
      const items = await tx.item.updateMany({
        where: { shopId },
        data: { status: 'In Stock' }
      });
      return { sales: sales.count, items: items.count };
    });
    res.json({ success: true, message: `Wiped ${result.sales} sales and reset ${result.items} items.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sales/void', authenticateToken, requireActiveOrTrial, requireAccess([Role.OWNER, Role.MANAGER, Role.CASHIER], ['access_pos', 'delete_sale']), async (req: AuthRequest, res) => {
  try {
    const { buyerId, date } = req.body;
    const shopId = req.user!.shopId!;

    if (!buyerId || !date) {
      return res.status(400).json({ error: 'buyerId and date are required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find the sales to void
      const salesToVoid = await tx.sale.findMany({
        where: {
          shopId,
          buyerId,
          date: new Date(date)
        }
      });

      if (salesToVoid.length === 0) {
        throw new Error('No transactions found to void');
      }

      const isVoidingReturn = salesToVoid.some(s => s.weight < 0);

      const itemIds = salesToVoid.map(s => s.itemId);

      if (isVoidingReturn) {
        // We are voiding a return. Delete the return records and mark items back to 'Sold'
        await tx.sale.deleteMany({
          where: { id: { in: salesToVoid.map(s => s.id) } }
        });
        await tx.item.updateMany({
          where: { id: { in: itemIds } },
          data: { status: 'Sold' }
        });
      } else {
        // Update items back to 'In Stock'
        await tx.item.updateMany({
          where: { id: { in: itemIds } },
          data: { status: 'In Stock' }
        });

        // Create return records with negative weight and negative making charge instead of deleting
        const returnSales = salesToVoid.filter(s => s.weight > 0).map(s => ({
          shopId: s.shopId,
          itemId: s.itemId,
          buyerId: s.buyerId,
          weight: -Math.abs(s.weight),
          makingCharge: -Math.abs(s.makingCharge || 0),
          date: new Date()
        }));

        if (returnSales.length > 0) {
          await tx.sale.createMany({ data: returnSales });
        }
      }

      return salesToVoid.length;
    });

    res.json({ success: true, count: result, message: `Successfully voided transaction and returned ${result} items to stock` });
  } catch (error: any) {
    console.error("Void sale error:", error);
    res.status(500).json({ error: 'Failed to void transaction' });
  }
});

app.post('/api/sales/return', authenticateToken, requireActiveOrTrial, requireAccess([Role.OWNER, Role.MANAGER, Role.CASHIER], ['access_pos', 'delete_sale']), async (req: AuthRequest, res) => {
  try {
    const { barcodes } = req.body;
    const shopId = req.user!.shopId!;

    if (!barcodes || !Array.isArray(barcodes) || barcodes.length === 0) {
      return res.status(400).json({ error: 'Barcodes array is required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find the items being returned
      const itemsToReturn = await tx.item.findMany({
        where: {
          shopId,
          barcode: { in: barcodes },
          status: 'Sold'
        }
      });

      if (itemsToReturn.length === 0) {
        throw new Error('No sold items found matching the scanned barcodes.');
      }

      const itemIds = itemsToReturn.map(i => i.id);

      // Find the latest sale records for these items to get the correct buyer and weight
      const latestSales = await tx.sale.findMany({
        where: {
          shopId,
          itemId: { in: itemIds }
        },
        orderBy: { date: 'desc' }
      });

      const returnSalesData = [];
      const processedItems = new Set();
      
      for (const sale of latestSales) {
        if (!processedItems.has(sale.itemId) && sale.weight > 0) {
          processedItems.add(sale.itemId);
          returnSalesData.push({
            shopId: sale.shopId,
            itemId: sale.itemId,
            buyerId: sale.buyerId,
            weight: -Math.abs(sale.weight),
            makingCharge: -Math.abs(sale.makingCharge || 0)
          });
        }
      }

      // Update items back to 'In Stock'
      await tx.item.updateMany({
        where: { id: { in: itemIds } },
        data: { status: 'In Stock' }
      });

      // Insert return sales
      if (returnSalesData.length > 0) {
        await tx.sale.createMany({
          data: returnSalesData
        });
      }

      return itemsToReturn.length;
    });

    res.json({ success: true, count: result, message: `Successfully returned ${result} items to stock` });
  } catch (error: any) {
    console.error("Return item error:", error);
    res.status(500).json({ error: 'Failed to return items' });
  }
});

// --- Serve React Frontend ---
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`API Server running on port ${port}`);
});
