"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const port = process.env.PORT || 80;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_123';
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'abutawhidrian@gmail.com';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || '*Rian*143#';
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token)
        return res.status(401).json({ error: 'Access denied, token missing' });
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, user) => {
        if (err)
            return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient role' });
        }
        next();
    };
};
const requireAccess = (allowedRoles, allowedPermissions = []) => {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        if (req.user.role === 'OWNER' || req.user.role === 'SUPERADMIN')
            return next();
        if (allowedRoles.includes(req.user.role))
            return next();
        if (req.user.permissions && req.user.permissions.some(p => allowedPermissions.includes(p)))
            return next();
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    };
};
const requireSuperAdmin = requireRole('SUPERADMIN');
const requireActiveOrTrial = async (req, res, next) => {
    if (!req.user)
        return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role === 'SUPERADMIN')
        return next();
    if (!req.user.shopId)
        return res.status(403).json({ error: 'No shop associated' });
    try {
        const sub = await prisma.subscription.findUnique({ where: { shopId: req.user.shopId } });
        // Auto-create trial for existing shops that don't have a subscription
        if (!sub) {
            await prisma.subscription.create({
                data: { shopId: req.user.shopId, status: client_1.SubStatus.TRIAL }
            });
            return next();
        }
        if (sub.status === client_1.SubStatus.ACTIVE)
            return next();
        if (sub.status === client_1.SubStatus.TRIAL && new Date() <= sub.trialEndsAt)
            return next();
        return res.status(403).json({ error: 'Trial expired or subscription inactive. Please contact admin.' });
    }
    catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { shopName, userName, email, password } = req.body;
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser)
            return res.status(400).json({ error: 'Email already exists' });
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        const newShop = await prisma.shop.create({
            data: {
                name: shopName,
                users: {
                    create: {
                        name: userName,
                        email,
                        passwordHash,
                        role: client_1.Role.OWNER
                    }
                },
                subscription: {
                    create: {
                        status: client_1.SubStatus.TRIAL
                        // trialEndsAt defaults to 14 days from now in Prisma schema
                    }
                }
            },
            include: { users: true }
        });
        const user = newShop.users[0];
        const token = jsonwebtoken_1.default.sign({ id: user.id, shopId: newShop.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, shopId: newShop.id, shopName: newShop.name, role: user.role } });
    }
    catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email }, include: { shop: true } });
        if (!user)
            return res.status(400).json({ error: 'Invalid email or password' });
        const validPassword = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!validPassword)
            return res.status(400).json({ error: 'Invalid email or password' });
        const token = jsonwebtoken_1.default.sign({ id: user.id, shopId: user.shopId, email: user.email, role: user.role, customRole: user.customRole, permissions: user.permissions }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, shopId: user.shopId, shopName: user.shop?.name, role: user.role, customRole: user.customRole, permissions: user.permissions } });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/auth/superadmin', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (email === SUPERADMIN_EMAIL && password === SUPERADMIN_PASSWORD) {
            const token = jsonwebtoken_1.default.sign({ email, role: 'SUPERADMIN' }, JWT_SECRET, { expiresIn: '7d' });
            return res.json({ token, user: { name: 'Super Admin', email, role: 'SUPERADMIN' } });
        }
        return res.status(400).json({ error: 'Invalid super admin credentials' });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        if (req.user?.role === 'SUPERADMIN') {
            return res.json({ name: 'Super Admin', email: req.user.email, role: 'SUPERADMIN' });
        }
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { shop: true }
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        res.json({ id: user.id, name: user.name, email: user.email, shopId: user.shopId, shopName: user.shop?.name, role: user.role, customRole: user.customRole, permissions: user.permissions });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// --- Owner Staff Management Routes ---
app.get('/api/users', authenticateToken, requireRole(client_1.Role.OWNER), async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { shopId: req.user.shopId },
            select: { id: true, name: true, email: true, role: true, customRole: true, permissions: true, createdAt: true }
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/users', authenticateToken, requireRole(client_1.Role.OWNER), async (req, res) => {
    try {
        const { name, email, password, role, customRole, permissions } = req.body;
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser)
            return res.status(400).json({ error: 'Email already exists' });
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role: role,
                customRole,
                permissions,
                shopId: req.user.shopId
            },
            select: { id: true, name: true, email: true, role: true, customRole: true, permissions: true, createdAt: true }
        });
        res.json(newUser);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.patch('/api/users/:id', authenticateToken, requireRole(client_1.Role.OWNER), async (req, res) => {
    try {
        const { name, role, customRole, permissions } = req.body;
        const userId = String(req.params.id);
        // Don't allow modifying other shop's users
        const existing = await prisma.user.findUnique({ where: { id: userId } });
        if (!existing || existing.shopId !== req.user.shopId) {
            return res.status(404).json({ error: 'User not found' });
        }
        const updateData = { name, role: role };
        if (customRole !== undefined)
            updateData.customRole = customRole;
        if (permissions !== undefined)
            updateData.permissions = permissions;
        const updated = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, name: true, email: true, role: true, customRole: true, permissions: true, createdAt: true }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.delete('/api/users/:id', authenticateToken, requireRole(client_1.Role.OWNER), async (req, res) => {
    try {
        const userId = String(req.params.id);
        const existing = await prisma.user.findUnique({ where: { id: userId } });
        if (!existing || existing.shopId !== req.user.shopId) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (existing.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }
        await prisma.user.delete({ where: { id: userId } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// --- Shop Routes ---
app.get('/api/shop', authenticateToken, requireRole(client_1.Role.OWNER), async (req, res) => {
    try {
        const shop = await prisma.shop.findUnique({ where: { id: req.user.shopId } });
        if (!shop)
            return res.status(404).json({ error: 'Shop not found' });
        res.json(shop);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.put('/api/shop', authenticateToken, requireRole(client_1.Role.OWNER), async (req, res) => {
    try {
        const { name, trn, address, email, phone } = req.body;
        const shop = await prisma.shop.update({
            where: { id: req.user.shopId },
            data: { name, trn, address, email, phone }
        });
        res.json(shop);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// --- Subscription Routes ---
app.get('/api/subscription', authenticateToken, requireRole(client_1.Role.OWNER), async (req, res) => {
    try {
        const sub = await prisma.subscription.findUnique({ where: { shopId: req.user.shopId } });
        res.json(sub);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/subscription/voucher-number', authenticateToken, requireRole(client_1.Role.OWNER), async (req, res) => {
    try {
        const { voucherNumber } = req.body;
        const sub = await prisma.subscription.update({
            where: { shopId: req.user.shopId },
            data: {
                voucherNumber,
                status: client_1.SubStatus.PENDING
            }
        });
        res.json(sub);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// --- Super-Admin Routes ---
app.get('/api/admin/shops', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const shops = await prisma.shop.findMany({
            include: {
                subscription: true,
                users: {
                    where: { role: client_1.Role.OWNER },
                    select: { name: true, email: true }
                }
            }
        });
        res.json(shops);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.patch('/api/admin/subscriptions/:shopId', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const shopId = String(req.params.shopId);
        const { status, voucherNumber, endsAt } = req.body;
        const updateData = { status: status };
        if (voucherNumber !== undefined)
            updateData.voucherNumber = voucherNumber;
        if (endsAt !== undefined)
            updateData.endsAt = new Date(endsAt);
        if (status === client_1.SubStatus.ACTIVE) {
            updateData.startedAt = new Date();
        }
        const sub = await prisma.subscription.update({
            where: { shopId },
            data: updateData
        });
        res.json(sub);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// --- Protected API Routes (Requires Active/Trial) ---
// --- Item Types Routes ---
app.get('/api/item_types', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const itemTypes = await prisma.itemType.findMany({
            where: { shopId: req.user.shopId },
            orderBy: { name: 'asc' }
        });
        res.json(itemTypes);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/item_types', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER], ['view_vault', 'edit_vault', 'manage_buyers']), async (req, res) => {
    try {
        const { name, purity } = req.body;
        const itemType = await prisma.itemType.create({
            data: {
                name,
                shopId: req.user.shopId,
                purity: purity !== undefined ? parseFloat(purity) : 1.0
            }
        });
        res.json(itemType);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.put('/api/item_types/:id', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER], ['view_vault', 'edit_vault', 'manage_buyers']), async (req, res) => {
    try {
        const id = String(req.params.id);
        const { name, purity } = req.body;
        const existing = await prisma.itemType.findUnique({ where: { id } });
        if (!existing || existing.shopId !== req.user.shopId)
            return res.status(404).json({ error: 'Not found' });
        const itemType = await prisma.itemType.update({
            where: { id },
            data: {
                name: name !== undefined ? name : undefined,
                purity: purity !== undefined ? parseFloat(purity) : undefined
            }
        });
        res.json(itemType);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.delete('/api/item_types/:id', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER], ['view_vault', 'edit_vault', 'manage_buyers']), async (req, res) => {
    try {
        const id = String(req.params.id);
        const existing = await prisma.itemType.findUnique({ where: { id } });
        if (!existing || existing.shopId !== req.user.shopId)
            return res.status(404).json({ error: 'Not found' });
        await prisma.itemType.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// --- Models Routes ---
app.get('/api/models', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const models = await prisma.itemModel.findMany({
            where: { shopId: req.user.shopId },
            orderBy: { name: 'asc' }
        });
        res.json(models);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/models', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER], ['view_vault', 'edit_vault', 'manage_buyers']), async (req, res) => {
    try {
        const { name } = req.body;
        const itemModel = await prisma.itemModel.create({
            data: { name, shopId: req.user.shopId }
        });
        res.json(itemModel);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.put('/api/models/:id', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER], ['view_vault', 'edit_vault', 'manage_buyers']), async (req, res) => {
    try {
        const id = String(req.params.id);
        const { name } = req.body;
        const existing = await prisma.itemModel.findUnique({ where: { id } });
        if (!existing || existing.shopId !== req.user.shopId)
            return res.status(404).json({ error: 'Not found' });
        const itemModel = await prisma.itemModel.update({
            where: { id },
            data: { name }
        });
        res.json(itemModel);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.delete('/api/models/:id', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER], ['view_vault', 'edit_vault', 'manage_buyers']), async (req, res) => {
    try {
        const id = String(req.params.id);
        const existing = await prisma.itemModel.findUnique({ where: { id } });
        if (!existing || existing.shopId !== req.user.shopId)
            return res.status(404).json({ error: 'Not found' });
        await prisma.itemModel.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/api/inventory', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const items = await prisma.item.findMany({
            where: { shopId: req.user.shopId },
            orderBy: { dateAdded: 'asc' }
        });
        res.json(items);
    }
    catch (error) {
        console.error("Error fetching inventory:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/inventory', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER], ['view_vault', 'edit_vault', 'manage_buyers']), async (req, res) => {
    try {
        let { barcode, type, model, weight, stone_weight } = req.body;
        const shopId = req.user.shopId;
        if (!barcode) {
            let prefix = 'XX';
            const shop = await prisma.shop.findUnique({ where: { id: shopId } });
            if (shop && shop.name) {
                const words = shop.name.trim().split(/\s+/).filter(w => w.length > 0);
                if (words.length >= 2) {
                    prefix = (words[0][0] + words[1][0]).toUpperCase();
                }
                else if (words.length === 1) {
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
    }
    catch (error) {
        console.error("Error adding inventory:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.put('/api/inventory/:id', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER], ['view_vault', 'edit_vault', 'manage_buyers']), async (req, res) => {
    try {
        const id = String(req.params.id);
        const shopId = req.user.shopId;
        const { barcode, type, model, weight, stone_weight } = req.body;
        const existing = await prisma.item.findUnique({ where: { id } });
        if (!existing || existing.shopId !== shopId)
            return res.status(404).json({ error: 'Not found' });
        if (barcode && barcode !== existing.barcode) {
            const barcodeExists = await prisma.item.findUnique({
                where: { barcode_shopId: { barcode, shopId } }
            });
            if (barcodeExists)
                return res.status(400).json({ error: 'Barcode already exists' });
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
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.delete('/api/inventory/:id', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER], ['view_vault', 'edit_vault', 'manage_buyers']), async (req, res) => {
    try {
        const id = String(req.params.id);
        const shopId = req.user.shopId;
        const existing = await prisma.item.findUnique({ where: { id } });
        if (!existing || existing.shopId !== shopId)
            return res.status(404).json({ error: 'Not found' });
        await prisma.item.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/api/buyers', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const buyers = await prisma.buyer.findMany({
            where: { shopId: req.user.shopId }
        });
        res.json(buyers);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/buyers', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const { name } = req.body;
        const shopId = req.user.shopId;
        const newBuyer = await prisma.buyer.create({
            data: { name, shopId }
        });
        res.json(newBuyer);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.put('/api/buyers/:id', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const id = String(req.params.id);
        const { name } = req.body;
        const shopId = req.user.shopId;
        const existing = await prisma.buyer.findUnique({ where: { id } });
        if (!existing || existing.shopId !== shopId)
            return res.status(404).json({ error: 'Not found' });
        const updated = await prisma.buyer.update({
            where: { id },
            data: { name }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.delete('/api/buyers/:id', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const id = String(req.params.id);
        const shopId = req.user.shopId;
        const existing = await prisma.buyer.findUnique({ where: { id } });
        if (!existing || existing.shopId !== shopId)
            return res.status(404).json({ error: 'Not found' });
        await prisma.buyer.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/api/sales', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const sales = await prisma.sale.findMany({
            where: { shopId: req.user.shopId },
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
    }
    catch (error) {
        console.error("Error fetching sales:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/sales/bulk', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER, client_1.Role.CASHIER], ['access_pos', 'delete_sale']), async (req, res) => {
    try {
        const { barcodes, buyerId, totalMakingCharge = 0 } = req.body;
        const shopId = req.user.shopId;
        let actualBuyerId = buyerId;
        // Validate buyer or create if they sent a name but no ID
        if (buyerId) {
            const buyer = await prisma.buyer.findUnique({ where: { id: buyerId } });
            if (!buyer || buyer.shopId !== shopId)
                return res.status(400).json({ error: 'Buyer not found in your shop' });
        }
        else {
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
    }
    catch (error) {
        console.error("Bulk sale error:", error);
        res.status(500).json({ error: error.message || 'Failed to process sale' });
    }
});
app.get('/api/payments', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const payments = await prisma.payment.findMany({
            where: { shopId: req.user.shopId },
            orderBy: { date: 'desc' },
            include: { buyer: true }
        });
        res.json(payments);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/payments', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER, client_1.Role.CASHIER], ['manage_buyers']), async (req, res) => {
    try {
        const { buyerId, amount, notes } = req.body;
        const shopId = req.user.shopId;
        const payment = await prisma.payment.create({
            data: { shopId, buyerId, amount: Number(amount), notes }
        });
        const paymentWithBuyer = await prisma.payment.findUnique({
            where: { id: payment.id },
            include: { buyer: true }
        });
        res.json(paymentWithBuyer);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.delete('/api/payments/:id', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER], ['manage_buyers']), async (req, res) => {
    try {
        const id = String(req.params.id);
        const shopId = req.user.shopId;
        const existing = await prisma.payment.findUnique({ where: { id } });
        if (!existing || existing.shopId !== shopId)
            return res.status(404).json({ error: 'Not found' });
        await prisma.payment.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.put('/api/payments/:id', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER, client_1.Role.CASHIER], ['manage_buyers']), async (req, res) => {
    try {
        const id = String(req.params.id);
        const shopId = req.user.shopId;
        const { buyerId, amount, notes } = req.body;
        const existing = await prisma.payment.findUnique({ where: { id } });
        if (!existing || existing.shopId !== shopId)
            return res.status(404).json({ error: 'Not found' });
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
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// --- Metal Receipts Routes ---
app.get('/api/metal_receipts', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const receipts = await prisma.metalReceipt.findMany({
            where: { shopId: req.user.shopId },
            orderBy: { date: 'desc' },
            include: { buyer: true }
        });
        res.json(receipts);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/metal_receipts', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER, client_1.Role.CASHIER], ['manage_buyers']), async (req, res) => {
    try {
        const { buyerId, weight, purity, notes } = req.body;
        const shopId = req.user.shopId;
        const receipt = await prisma.metalReceipt.create({
            data: { shopId, buyerId, weight: Number(weight), purity: Number(purity) || 0.995, notes }
        });
        const receiptWithBuyer = await prisma.metalReceipt.findUnique({
            where: { id: receipt.id },
            include: { buyer: true }
        });
        res.json(receiptWithBuyer);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.put('/api/metal_receipts/:id', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER, client_1.Role.CASHIER], ['manage_buyers']), async (req, res) => {
    try {
        const id = String(req.params.id);
        const shopId = req.user.shopId;
        const { buyerId, weight, purity, notes } = req.body;
        const existing = await prisma.metalReceipt.findUnique({ where: { id } });
        if (!existing || existing.shopId !== shopId)
            return res.status(404).json({ error: 'Not found' });
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
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.delete('/api/metal_receipts/:id', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER], ['manage_buyers']), async (req, res) => {
    try {
        const id = String(req.params.id);
        const shopId = req.user.shopId;
        const existing = await prisma.metalReceipt.findUnique({ where: { id } });
        if (!existing || existing.shopId !== shopId)
            return res.status(404).json({ error: 'Not found' });
        await prisma.metalReceipt.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/sales/wipe', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER], []), async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const result = await prisma.$transaction(async (tx) => {
            const sales = await tx.sale.deleteMany({ where: { shopId } });
            const items = await tx.item.updateMany({
                where: { shopId },
                data: { status: 'In Stock' }
            });
            return { sales: sales.count, items: items.count };
        });
        res.json({ success: true, message: `Wiped ${result.sales} sales and reset ${result.items} items.` });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/sales/void', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER, client_1.Role.CASHIER], ['access_pos', 'delete_sale']), async (req, res) => {
    try {
        const { buyerId, date } = req.body;
        const shopId = req.user.shopId;
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
            const itemIds = salesToVoid.map(s => s.itemId);
            // Update items back to 'In Stock'
            await tx.item.updateMany({
                where: { id: { in: itemIds } },
                data: { status: 'In Stock' }
            });
            // Create return records with negative weight instead of deleting
            const returnSales = salesToVoid.filter(s => s.weight > 0).map(s => ({
                shopId: s.shopId,
                itemId: s.itemId,
                buyerId: s.buyerId,
                weight: -Math.abs(s.weight)
            }));
            if (returnSales.length > 0) {
                await tx.sale.createMany({ data: returnSales });
            }
            return salesToVoid.length;
        });
        res.json({ success: true, count: result, message: `Successfully voided transaction and returned ${result} items to stock` });
    }
    catch (error) {
        console.error("Void sale error:", error);
        res.status(500).json({ error: error.message || 'Failed to void transaction' });
    }
});
app.post('/api/sales/return', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER, client_1.Role.CASHIER], ['access_pos', 'delete_sale']), async (req, res) => {
    try {
        const { barcodes } = req.body;
        const shopId = req.user.shopId;
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
                        weight: -Math.abs(sale.weight)
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
    }
    catch (error) {
        console.error("Return item error:", error);
        res.status(500).json({ error: error.message || 'Failed to return items' });
    }
});
// --- Serve React Frontend ---
const distPath = path_1.default.join(process.cwd(), 'dist');
app.use(express_1.default.static(distPath));
app.use((req, res) => {
    res.sendFile(path_1.default.join(distPath, 'index.html'));
});
app.listen(port, () => {
    console.log(`API Server running on port ${port}`);
});
