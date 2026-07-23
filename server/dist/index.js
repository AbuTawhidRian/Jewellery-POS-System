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
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = require("express-rate-limit");
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
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
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
}));
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '1mb' }));
// Setup file uploads
const uploadsDir = path_1.default.resolve(__dirname, '../../public/uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express_1.default.static(uploadsDir));
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `logo-${uniqueSuffix}${ext}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/'))
            cb(null, true);
        else
            cb(new Error('Only image files are allowed!'));
    }
});
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const requestedBranchId = req.headers['x-branch-id'];
    if (!token)
        return res.status(401).json({ error: 'Access denied, token missing' });
    jsonwebtoken_1.default.verify(token, JWT_SECRET, async (err, user) => {
        if (err)
            return res.status(403).json({ error: 'Invalid token' });
        // Ensure the user actually still exists in the database
        try {
            const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, role: true } });
            if (!dbUser) {
                return res.status(401).json({ error: 'User no longer exists' });
            }
        }
        catch (dbErr) {
            return res.status(500).json({ error: 'Database error while verifying user' });
        }
        // Allow switching branches via header
        if (requestedBranchId && typeof requestedBranchId === 'string') {
            if (user.role === 'OWNER' || user.role === 'SUPERADMIN') {
                // Global owner logic
                if (user.branchId !== requestedBranchId) {
                    if (!user.branchId) {
                        try {
                            const branch = await prisma.branch.findUnique({ where: { id: requestedBranchId }, select: { isMain: true } });
                            if (!branch?.isMain)
                                user.isReadOnly = true;
                        }
                        catch (e) {
                            user.isReadOnly = true;
                        }
                    }
                    else {
                        user.isReadOnly = true;
                    }
                }
                user.branchId = requestedBranchId;
            }
            else {
                // Staff logic
                const accessible = user.accessibleBranches || [];
                if (!accessible.includes(requestedBranchId)) {
                    return res.status(403).json({ error: 'Access denied to this branch' });
                }
                user.branchId = requestedBranchId;
            }
        }
        // Global operations that should never be blocked by read-only mode
        const isGlobalRoute = req.path === '/api/branches' || req.path.startsWith('/api/shop');
        if (user.isReadOnly && !isGlobalRoute && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
            return res.status(403).json({ error: 'Read-only mode: You cannot edit data in other branches.' });
        }
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
const requireAccess = (allowedRoles, requiredPermissions = []) => {
    return async (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        if (req.user.role === 'OWNER' || req.user.role === 'SUPERADMIN')
            return next();
        if (allowedRoles.length === 1 && allowedRoles[0] === 'OWNER') {
            return res.status(403).json({ error: 'Forbidden: Owner only' });
        }
        return next();
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
const authLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts, please try again after 15 minutes' }
});
const registerSchema = zod_1.z.object({
    shopName: zod_1.z.string().min(2, "Shop name must be at least 2 characters").max(100),
    userName: zod_1.z.string().min(2, "Name must be at least 2 characters").max(100),
    email: zod_1.z.string().email("Invalid email address"),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters").max(72)
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email address"),
    password: zod_1.z.string().min(1, "Password is required").max(72)
});
const userSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name must be at least 2 characters").max(100),
    email: zod_1.z.string().email("Invalid email address"),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters").max(72),
    role: zod_1.z.string(),
    customRole: zod_1.z.string().nullable().optional(),
    accessibleBranches: zod_1.z.array(zod_1.z.string()).optional()
});
app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: parsed.error.issues[0].message });
        const { shopName, userName, email, password } = parsed.data;
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
                },
                branches: {
                    create: {
                        name: shopName,
                        isMain: true
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
app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: parsed.error.issues[0].message });
        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email }, include: { shop: true } });
        if (!user)
            return res.status(400).json({ error: 'Invalid email or password' });
        const validPassword = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!validPassword)
            return res.status(400).json({ error: 'Invalid email or password' });
        // Fetch main branches for this shop to include in payload
        const mainBranches = await prisma.branch.findMany({
            where: { shopId: user.shopId, isMain: true },
            select: { id: true }
        });
        const mainBranchIds = mainBranches.map(b => b.id);
        const token = jsonwebtoken_1.default.sign({ id: user.id, shopId: user.shopId, accessibleBranches: user.accessibleBranches, email: user.email, role: user.role, customRole: user.customRole }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, shopId: user.shopId, accessibleBranches: user.accessibleBranches, mainBranches: mainBranchIds, shopName: user.shop?.name, shopEmail: user.shop?.email, shopPhone: user.shop?.phone, shopSlogan: user.shop?.slogan, shopLogo: user.shop?.logoUrl, shopCurrency: user.shop?.currency, role: user.role, customRole: user.customRole } });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/auth/superadmin', authLimiter, async (req, res) => {
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
        // Use the active branch from the request header
        const targetBranchId = req.user?.branchId || null;
        res.json({ id: user.id, name: user.name, email: user.email, shopId: user.shopId, branchId: targetBranchId, shopName: user.shop?.name, shopEmail: user.shop?.email, shopPhone: user.shop?.phone, shopSlogan: user.shop?.slogan, shopLogo: user.shop?.logoUrl, shopCurrency: user.shop?.currency, role: user.role, customRole: user.customRole, isReadOnly: req.user?.isReadOnly });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.put('/api/auth/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        // SuperAdmin bypass (they shouldn't change password here, but just in case)
        if (req.user?.role === 'SUPERADMIN') {
            return res.status(403).json({ error: 'Super Admin password cannot be changed here' });
        }
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const validPassword = await bcrypt_1.default.compare(currentPassword, user.passwordHash);
        if (!validPassword)
            return res.status(400).json({ error: 'Incorrect current password' });
        const newPasswordHash = await bcrypt_1.default.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newPasswordHash }
        });
        res.json({ success: true, message: 'Password updated successfully' });
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
            select: { id: true, name: true, email: true, role: true, customRole: true, accessibleBranches: true, createdAt: true }
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/users', authenticateToken, requireRole(client_1.Role.OWNER), async (req, res) => {
    try {
        const parsed = userSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: parsed.error.issues[0].message });
        const { name, email, password, role, customRole, accessibleBranches } = parsed.data;
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
                accessibleBranches: accessibleBranches || [],
                shopId: req.user.shopId
            },
            select: { id: true, name: true, email: true, role: true, customRole: true, accessibleBranches: true, createdAt: true }
        });
        res.json(newUser);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.patch('/api/users/:id', authenticateToken, requireRole(client_1.Role.OWNER), async (req, res) => {
    try {
        const { name, role, customRole, password, accessibleBranches } = req.body;
        const userId = String(req.params.id);
        // Don't allow modifying other shop's users
        const existing = await prisma.user.findUnique({ where: { id: userId } });
        if (!existing || existing.shopId !== req.user.shopId) {
            return res.status(404).json({ error: 'User not found' });
        }
        const updateData = { name, role: role };
        if (customRole !== undefined)
            updateData.customRole = customRole;
        if (accessibleBranches)
            updateData.accessibleBranches = accessibleBranches;
        if (password) {
            updateData.passwordHash = await bcrypt_1.default.hash(password, 10);
        }
        const updated = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, name: true, email: true, role: true, customRole: true, accessibleBranches: true, createdAt: true }
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
        const { name, trn, address, email, phone, slogan, currency } = req.body;
        const shop = await prisma.shop.update({
            where: { id: req.user.shopId },
            data: { name, trn, address, email, phone, slogan, currency }
        });
        res.json(shop);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/shop/logo', authenticateToken, requireRole(client_1.Role.OWNER), upload.single('logo'), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: 'No file uploaded' });
        const currentShop = await prisma.shop.findUnique({ where: { id: req.user.shopId } });
        if (currentShop?.logoUrl) {
            const oldFilePath = path_1.default.join(uploadsDir, path_1.default.basename(currentShop.logoUrl));
            if (fs_1.default.existsSync(oldFilePath))
                fs_1.default.unlinkSync(oldFilePath);
        }
        const logoUrl = `/uploads/${req.file.filename}`;
        const shop = await prisma.shop.update({
            where: { id: req.user.shopId },
            data: { logoUrl }
        });
        res.json({ logoUrl: shop.logoUrl });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
app.delete('/api/shop/logo', authenticateToken, requireRole(client_1.Role.OWNER), async (req, res) => {
    try {
        const currentShop = await prisma.shop.findUnique({ where: { id: req.user.shopId } });
        if (currentShop?.logoUrl) {
            const oldFilePath = path_1.default.join(uploadsDir, path_1.default.basename(currentShop.logoUrl));
            if (fs_1.default.existsSync(oldFilePath))
                fs_1.default.unlinkSync(oldFilePath);
            await prisma.shop.update({
                where: { id: req.user.shopId },
                data: { logoUrl: null }
            });
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
// --- Branches Routes ---
app.get('/api/branches', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const branches = await prisma.branch.findMany({
            where: { shopId: req.user.shopId },
            orderBy: { createdAt: 'asc' }
        });
        // Auto-create Main Shop branch if none exists
        let mainBranchId;
        if (branches.length === 0) {
            const mainBranch = await prisma.branch.create({
                data: {
                    shopId: req.user.shopId,
                    name: 'Main Shop',
                    isMain: true
                }
            });
            mainBranchId = mainBranch.id;
            branches.push(mainBranch);
        }
        else {
            const mainBranch = branches.find(b => b.isMain);
            if (mainBranch)
                mainBranchId = mainBranch.id;
            else
                mainBranchId = branches[0].id;
        }
        // Auto-migrate any legacy data without a branchId to the main branch
        // We execute these asynchronously without blocking the response
        Promise.all([
            prisma.item.updateMany({ where: { shopId: req.user.shopId, branchId: null }, data: { branchId: mainBranchId } }),
            prisma.sale.updateMany({ where: { shopId: req.user.shopId, branchId: null }, data: { branchId: mainBranchId } }),
            prisma.payment.updateMany({ where: { shopId: req.user.shopId, branchId: null }, data: { branchId: mainBranchId } }),
            prisma.metalReceipt.updateMany({ where: { shopId: req.user.shopId, branchId: null }, data: { branchId: mainBranchId } })
        ]).catch(console.error);
        return res.json(branches);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
app.post('/api/branches', authenticateToken, requireRole(client_1.Role.OWNER), async (req, res) => {
    try {
        const { name, isMain } = req.body;
        if (!name)
            return res.status(400).json({ error: 'Branch name is required' });
        if (isMain) {
            // Unset other main branches
            await prisma.branch.updateMany({
                where: { shopId: req.user.shopId, isMain: true },
                data: { isMain: false }
            });
        }
        const branch = await prisma.branch.create({
            data: {
                shopId: req.user.shopId,
                name,
                isMain: isMain || false
            }
        });
        res.json(branch);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
app.put('/api/branches/:id', authenticateToken, requireRole(client_1.Role.OWNER), async (req, res) => {
    try {
        const { name, isMain } = req.body;
        const branchId = req.params.id;
        if (isMain) {
            // Unset other main branches
            await prisma.branch.updateMany({
                where: { shopId: req.user.shopId, isMain: true, id: { not: branchId } },
                data: { isMain: false }
            });
        }
        const branch = await prisma.branch.update({
            where: { id: branchId, shopId: req.user.shopId },
            data: { name, isMain }
        });
        res.json(branch);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
app.delete('/api/branches/:id', authenticateToken, requireRole(client_1.Role.OWNER), async (req, res) => {
    try {
        const branchId = req.params.id;
        const branch = await prisma.branch.findUnique({ where: { id: branchId } });
        if (branch?.isMain) {
            return res.status(400).json({ error: 'Cannot delete the Main Shop branch' });
        }
        await prisma.branch.delete({
            where: { id: branchId, shopId: req.user.shopId }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
// --- Transfers Routes ---
app.get('/api/transfers', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const { status, type } = req.query; // type: 'in' | 'out'
        const branchId = req.user.branchId;
        let whereClause = { shopId: req.user.shopId };
        if (status)
            whereClause.status = status;
        if (branchId) {
            if (type === 'in') {
                whereClause.toBranchId = branchId;
            }
            else if (type === 'out') {
                whereClause.fromBranchId = branchId;
            }
            else {
                whereClause.OR = [
                    { fromBranchId: branchId },
                    { toBranchId: branchId }
                ];
            }
        }
        const transfers = await prisma.itemTransfer.findMany({
            where: whereClause,
            include: {
                item: true,
                fromBranch: true,
                toBranch: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(transfers);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
app.post('/api/transfers', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const { itemIds, toBranchId } = req.body;
        const fromBranchId = req.user.branchId;
        if (!fromBranchId)
            return res.status(400).json({ error: 'Please select your active branch first' });
        if (!toBranchId)
            return res.status(400).json({ error: 'Target branch is required' });
        if (fromBranchId === toBranchId)
            return res.status(400).json({ error: 'Cannot transfer to the same branch' });
        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0)
            return res.status(400).json({ error: 'No items selected' });
        const transfers = await prisma.$transaction(async (tx) => {
            const result = [];
            for (const itemId of itemIds) {
                const item = await tx.item.findUnique({ where: { id: itemId } });
                if (!item)
                    continue;
                if (item.shopId !== req.user.shopId)
                    continue;
                if (item.branchId && item.branchId !== fromBranchId)
                    continue;
                await tx.item.update({
                    where: { id: itemId },
                    data: { status: 'In Transit' }
                });
                const transfer = await tx.itemTransfer.create({
                    data: {
                        shopId: req.user.shopId,
                        itemId,
                        fromBranchId,
                        toBranchId,
                        status: 'PENDING'
                    }
                });
                result.push(transfer);
            }
            return result;
        });
        res.json(transfers);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
app.post('/api/transfers/receive', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const { barcode } = req.body;
        const branchId = req.user.branchId;
        if (!branchId)
            return res.status(400).json({ error: 'Please select a branch first' });
        if (!barcode)
            return res.status(400).json({ error: 'Barcode is required' });
        const item = await prisma.item.findUnique({
            where: { barcode_shopId: { barcode, shopId: req.user.shopId } }
        });
        if (!item)
            return res.status(404).json({ error: 'Item not found' });
        if (item.status !== 'In Transit')
            return res.status(400).json({ error: 'Item is not in transit' });
        const pendingTransfer = await prisma.itemTransfer.findFirst({
            where: {
                itemId: item.id,
                toBranchId: branchId,
                status: 'PENDING'
            }
        });
        if (!pendingTransfer) {
            return res.status(400).json({ error: 'This item was not transferred to your branch' });
        }
        await prisma.$transaction(async (tx) => {
            await tx.itemTransfer.update({
                where: { id: pendingTransfer.id },
                data: { status: 'RECEIVED' }
            });
            await tx.item.update({
                where: { id: item.id },
                data: {
                    status: 'In Stock',
                    branchId: branchId
                }
            });
        });
        res.json({ success: true, item });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
app.get('/api/transfers/pending/:barcode', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const barcode = req.params.barcode;
        const branchId = req.user.branchId;
        if (!branchId)
            return res.status(400).json({ error: 'Please select a branch first' });
        const item = await prisma.item.findUnique({
            where: { barcode_shopId: { barcode, shopId: req.user.shopId } }
        });
        if (!item)
            return res.status(404).json({ error: 'Item not found' });
        if (item.status !== 'In Transit')
            return res.status(400).json({ error: 'Item is not in transit' });
        const pendingTransfer = await prisma.itemTransfer.findFirst({
            where: { itemId: item.id, toBranchId: branchId, status: 'PENDING' },
            include: { fromBranch: true }
        });
        if (!pendingTransfer)
            return res.status(400).json({ error: 'This item was not transferred to your branch' });
        res.json({ item, transfer: pendingTransfer });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/transfers/receive/bulk', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const { barcodes } = req.body;
        const branchId = req.user.branchId;
        if (!branchId)
            return res.status(400).json({ error: 'Please select a branch first' });
        if (!barcodes || !Array.isArray(barcodes))
            return res.status(400).json({ error: 'Barcodes array is required' });
        const receivedItems = [];
        for (const barcode of barcodes) {
            const item = await prisma.item.findUnique({ where: { barcode_shopId: { barcode, shopId: req.user.shopId } } });
            if (!item || item.status !== 'In Transit')
                continue;
            const pendingTransfer = await prisma.itemTransfer.findFirst({
                where: { itemId: item.id, toBranchId: branchId, status: 'PENDING' }
            });
            if (!pendingTransfer)
                continue;
            await prisma.itemTransfer.update({ where: { id: pendingTransfer.id }, data: { status: 'RECEIVED' } });
            const updatedItem = await prisma.item.update({
                where: { id: item.id },
                data: { status: 'In Stock', branchId: branchId }
            });
            receivedItems.push(updatedItem);
        }
        res.json({ success: true, count: receivedItems.length, items: receivedItems });
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
// --- Dashboard Routes ---
app.get('/api/dashboard/stats', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const branchId = req.user.branchId;
        let whereClause = { shopId };
        if (branchId)
            whereClause.branchId = branchId;
        const [items, sales, itemTypes] = await Promise.all([
            prisma.item.findMany({ where: whereClause }),
            prisma.sale.findMany({ where: whereClause, include: { item: true, buyer: true } }),
            prisma.itemType.findMany({ where: { shopId } })
        ]);
        const activeStock = items.filter(i => i.status === 'In Stock');
        const totalItemsInStock = activeStock.length;
        const totalWeightInStock = activeStock.reduce((acc, item) => acc + Math.max(0, (Number(item.weight) || 0) - (Number(item.stone_weight) || 0)), 0);
        const totalGrossWeightInStock = activeStock.reduce((acc, item) => acc + (Number(item.weight) || 0), 0);
        const totalPureWeightInStock = activeStock.reduce((acc, item) => {
            const gw = Number(item.weight) || 0;
            const sw = Number(item.stone_weight) || 0;
            const nw = Math.max(0, gw - sw);
            const purity = itemTypes.find(t => t.name === item.type)?.purity ?? 1.0;
            return acc + (nw * purity);
        }, 0);
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const todaySales = sales.filter(s => {
            const saleDateStr = new Date(s.date).toISOString().split('T')[0];
            return saleDateStr === todayStr;
        });
        const totalSalesTodayItems = todaySales.length;
        const totalItemsSold = sales.length;
        const typeWiseStock = activeStock.reduce((acc, item) => {
            if (!acc[item.type])
                acc[item.type] = { count: 0, weight: 0 };
            acc[item.type].count += 1;
            acc[item.type].weight += Math.max(0, (Number(item.weight) || 0) - (Number(item.stone_weight) || 0));
            return acc;
        }, {});
        const modelWiseStock = activeStock.reduce((acc, item) => {
            if (!item.model)
                return acc;
            const model = item.model.trim();
            if (!model)
                return acc;
            if (!acc[model])
                acc[model] = { count: 0, weight: 0 };
            acc[model].count += 1;
            acc[model].weight += Math.max(0, (Number(item.weight) || 0) - (Number(item.stone_weight) || 0));
            return acc;
        }, {});
        const topStockModels = Object.entries(modelWiseStock)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5);
        const typeWiseSales = sales.reduce((acc, sale) => {
            const type = sale.item?.type || 'Unknown';
            if (!acc[type])
                acc[type] = { count: 0, weight: 0 };
            acc[type].count += 1;
            acc[type].weight += Math.max(0, (Number(sale.weight) || 0) - (Number(sale.item?.stone_weight) || 0));
            return acc;
        }, {});
        const modelWiseSales = sales.reduce((acc, sale) => {
            if (!sale.item?.model)
                return acc;
            const model = sale.item.model.trim();
            if (!model)
                return acc;
            if (!acc[model])
                acc[model] = { count: 0, weight: 0 };
            acc[model].count += 1;
            acc[model].weight += Math.max(0, (Number(sale.weight) || 0) - (Number(sale.item?.stone_weight) || 0));
            return acc;
        }, {});
        const topModels = Object.entries(modelWiseSales)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5);
        const totalSalesNetWeight = sales.reduce((acc, sale) => acc + Math.max(0, (Number(sale.weight) || 0) - (Number(sale.item?.stone_weight) || 0)), 0);
        const todaySalesNetWeight = todaySales.reduce((acc, sale) => acc + Math.max(0, (Number(sale.weight) || 0) - (Number(sale.item?.stone_weight) || 0)), 0);
        const recentSales = sales.slice(-5).reverse().map(s => ({
            id: s.id,
            type: s.item?.type || 'Unknown',
            model: s.item?.model || '',
            barcode: s.item?.barcode || '',
            weight: s.weight,
            stone_weight: s.item?.stone_weight,
            buyer_name: s.buyer?.name
        }));
        res.json({
            totalItemsInStock,
            totalWeightInStock,
            totalGrossWeightInStock,
            totalPureWeightInStock,
            totalSalesTodayItems,
            totalItemsSold,
            topStockModels,
            typeWiseStock,
            typeWiseSales,
            topModels,
            totalSalesNetWeight,
            todaySalesNetWeight,
            recentSales
        });
    }
    catch (error) {
        console.error("Error calculating dashboard stats:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
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
        if (name !== undefined && name !== existing.name) {
            // Update cascade manually since type is stored as a string
            await prisma.item.updateMany({
                where: { shopId: req.user.shopId, type: existing.name },
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
        if (name !== undefined && name !== existing.name) {
            await prisma.item.updateMany({
                where: { shopId: req.user.shopId, model: existing.name },
                data: { model: name }
            });
        }
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
        const { page, limit, search, status, startDate, endDate } = req.query;
        const whereClause = { shopId: req.user.shopId };
        if (req.user.branchId)
            whereClause.branchId = req.user.branchId;
        if (status)
            whereClause.status = status;
        if (search) {
            whereClause.OR = [
                { barcode: { contains: search, mode: 'insensitive' } },
                { type: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (startDate || endDate) {
            whereClause.dateAdded = {};
            if (startDate)
                whereClause.dateAdded.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                whereClause.dateAdded.lte = end;
            }
        }
        if (page && limit) {
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            const [items, total] = await Promise.all([
                prisma.item.findMany({
                    where: whereClause,
                    orderBy: { dateAdded: 'asc' },
                    skip,
                    take: limitNum
                }),
                prisma.item.count({ where: whereClause })
            ]);
            return res.json({
                data: items,
                total,
                page: pageNum,
                totalPages: Math.ceil(total / limitNum)
            });
        }
        const items = await prisma.item.findMany({
            where: whereClause,
            orderBy: { dateAdded: 'asc' }
        });
        res.json(items);
    }
    catch (error) {
        console.error("Error fetching inventory:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/api/inventory/barcode/:barcode', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const barcode = req.params.barcode;
        const shopId = req.user.shopId;
        const branchId = req.user.branchId;
        if (!branchId)
            return res.status(400).json({ error: 'Please select a branch first' });
        const item = await prisma.item.findUnique({
            where: { barcode_shopId: { barcode, shopId } }
        });
        if (!item)
            return res.status(404).json({ error: 'Item not found' });
        if (item.branchId !== branchId) {
            if (!item.branchId) {
                // Legacy item without branchId. Check if the current branch is Main.
                const branch = await prisma.branch.findUnique({ where: { id: branchId } });
                if (!branch?.isMain) {
                    return res.status(400).json({ error: 'Item belongs to main shop. Please switch to Main Shop.' });
                }
                // Auto-fix legacy item
                await prisma.item.update({ where: { id: item.id }, data: { branchId } });
            }
            else {
                return res.status(400).json({ error: 'Item is not in this branch' });
            }
        }
        if (item.status !== 'In Stock')
            return res.status(400).json({ error: `Item is ${item.status}` });
        res.json(item);
    }
    catch (error) {
        console.error("Error fetching item by barcode:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/inventory', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER], ['view_vault', 'edit_vault', 'manage_buyers']), async (req, res) => {
    try {
        let { barcode, type, model, weight, stone_weight } = req.body;
        const shopId = req.user.shopId;
        if (parseFloat(weight) < 0)
            return res.status(400).json({ error: 'Weight cannot be negative' });
        if (stone_weight && parseFloat(stone_weight) < 0)
            return res.status(400).json({ error: 'Stone weight cannot be negative' });
        if (!barcode) {
            let prefix = 'XX';
            const shop = await prisma.shop.findUnique({ where: { id: shopId } });
            if (shop && shop.name) {
                const words = shop.name.trim().split(/\s+/).filter((w) => w.length > 0);
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
        let targetBranchId = req.user.branchId;
        if (targetBranchId) {
            const branch = await prisma.branch.findUnique({ where: { id: targetBranchId } });
            if (!branch?.isMain) {
                return res.status(403).json({ error: 'New inventory can only be added to the main branch. Normal branches must receive items via transfer.' });
            }
        }
        else {
            const mainBranch = await prisma.branch.findFirst({ where: { shopId, isMain: true } });
            if (mainBranch) {
                targetBranchId = mainBranch.id;
            }
        }
        const newItem = await prisma.item.create({
            data: {
                barcode,
                type,
                model: model || null,
                weight: parseFloat(weight),
                stone_weight: parseFloat(stone_weight) || 0,
                status: 'In Stock',
                shopId,
                branchId: targetBranchId || undefined
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
        if (weight !== undefined && parseFloat(weight) < 0)
            return res.status(400).json({ error: 'Weight cannot be negative' });
        if (stone_weight !== undefined && stone_weight && parseFloat(stone_weight) < 0)
            return res.status(400).json({ error: 'Stone weight cannot be negative' });
        const existing = await prisma.item.findUnique({ where: { id } });
        if (!existing || existing.shopId !== shopId)
            return res.status(404).json({ error: 'Not found' });
        if (req.user.branchId && existing.branchId !== req.user.branchId)
            return res.status(403).json({ error: 'Item does not belong to your active branch' });
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
        if (req.user.branchId && existing.branchId !== req.user.branchId)
            return res.status(403).json({ error: 'Item does not belong to your active branch' });
        await prisma.item.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/api/buyers', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const whereClause = { shopId: req.user.shopId };
        if (req.user.branchId)
            whereClause.branchId = req.user.branchId;
        const buyers = await prisma.buyer.findMany({
            where: whereClause
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
            data: {
                name,
                shopId,
                branchId: req.user.branchId || undefined
            }
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
        const whereClause = { shopId: req.user.shopId };
        if (req.user.branchId)
            whereClause.branchId = req.user.branchId;
        const sales = await prisma.sale.findMany({
            where: whereClause,
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
        if (Number(totalMakingCharge) < 0)
            return res.status(400).json({ error: 'Making charge cannot be negative' });
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
            const itemsWhereClause = {
                shopId,
                barcode: { in: barcodes },
                status: 'In Stock'
            };
            if (req.user.branchId)
                itemsWhereClause.branchId = req.user.branchId;
            const itemsToSell = await tx.item.findMany({
                where: itemsWhereClause
            });
            if (itemsToSell.length === 0) {
                throw new Error('No valid items found to sell');
            }
            await tx.item.updateMany({
                where: { id: { in: itemsToSell.map((i) => i.id) } },
                data: { status: 'Sold' }
            });
            const makingChargePerItem = itemsToSell.length > 0 ? (Number(totalMakingCharge) || 0) / itemsToSell.length : 0;
            const saleData = itemsToSell.map((item) => ({
                shopId,
                itemId: item.id,
                buyerId: actualBuyerId,
                weight: item.weight,
                makingCharge: makingChargePerItem,
                branchId: req.user.branchId || undefined
            }));
            await tx.sale.createMany({ data: saleData });
            return itemsToSell.length;
        });
        res.json({ success: true, count: result, message: `Successfully processed ${result} items` });
    }
    catch (error) {
        console.error("Bulk sale error:", error);
        res.status(500).json({ error: 'Failed to process sale' });
    }
});
app.get('/api/payments', authenticateToken, requireActiveOrTrial, async (req, res) => {
    try {
        const whereClause = { shopId: req.user.shopId };
        if (req.user.branchId)
            whereClause.branchId = req.user.branchId;
        const payments = await prisma.payment.findMany({
            where: whereClause,
            orderBy: { date: 'desc' },
            include: { buyer: true }
        });
        res.json(payments);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/payments', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER, client_1.Role.CASHIER], ['manage_buyers', 'take_payment']), async (req, res) => {
    try {
        const { buyerId, amount, notes } = req.body;
        const shopId = req.user.shopId;
        if (Number(amount) < 0)
            return res.status(400).json({ error: 'Payment amount cannot be negative' });
        const payment = await prisma.payment.create({
            data: {
                shopId,
                buyerId,
                amount: Number(amount),
                notes,
                branchId: req.user.branchId || undefined
            }
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
        const whereClause = { shopId: req.user.shopId };
        if (req.user.branchId)
            whereClause.branchId = req.user.branchId;
        const receipts = await prisma.metalReceipt.findMany({
            where: whereClause,
            orderBy: { date: 'desc' },
            include: { buyer: true }
        });
        res.json(receipts);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/metal_receipts', authenticateToken, requireActiveOrTrial, requireAccess([client_1.Role.OWNER, client_1.Role.MANAGER, client_1.Role.CASHIER], ['manage_buyers', 'receive_gold']), async (req, res) => {
    try {
        const { buyerId, weight, purity, notes } = req.body;
        const shopId = req.user.shopId;
        const receipt = await prisma.metalReceipt.create({
            data: {
                shopId,
                buyerId,
                weight: Number(weight),
                purity: Number(purity) || 0.995,
                notes,
                branchId: req.user.branchId || undefined
            }
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
            }
            else {
                // We are voiding a regular sale. Delete the sale records and mark items back to 'In Stock'
                await tx.sale.deleteMany({
                    where: { id: { in: salesToVoid.map(s => s.id) } }
                });
                await tx.item.updateMany({
                    where: { id: { in: itemIds } },
                    data: { status: 'In Stock' }
                });
            }
            return salesToVoid.length;
        });
        res.json({ success: true, count: result, message: `Successfully voided transaction and returned ${result} items to stock` });
    }
    catch (error) {
        console.error("Void sale error:", error);
        res.status(500).json({ error: 'Failed to void transaction' });
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
    }
    catch (error) {
        console.error("Return item error:", error);
        res.status(500).json({ error: 'Failed to return items' });
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
