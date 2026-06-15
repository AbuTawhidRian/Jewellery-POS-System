import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

dotenv.config({ path: path.join(process.cwd(), '../.env') });
// Fallback if running from server dir
if (!process.env.DATABASE_URL) {
  dotenv.config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-saas-key-12345';

pool.connect()
  .then(async (client) => {
    console.log('Connected to PostgreSQL successfully');
    client.release();
  })
  .catch(err => console.error('Failed to connect to PostgreSQL', err.stack));

// --- AUTHENTICATION ---

app.post('/api/auth/register', async (req, res) => {
  const { companyName, email, password } = req.body;
  if (!companyName || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create Company
    const companyRes = await client.query(
      'INSERT INTO companies (name) VALUES ($1) RETURNING *',
      [companyName]
    );
    const company = companyRes.rows[0];

    // Create User
    const hash = await bcrypt.hash(password, 10);
    const userRes = await client.query(
      'INSERT INTO users (company_id, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, role',
      [company.id, email, hash, 'admin']
    );
    const user = userRes.rows[0];

    await client.query('COMMIT');
    
    const token = jwt.sign({ userId: user.id, companyId: company.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user, company });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    
    const user = userRes.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const companyRes = await pool.query('SELECT * FROM companies WHERE id = $1', [user.company_id]);
    const company = companyRes.rows[0];

    const token = jwt.sign({ userId: user.id, companyId: company.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role }, company });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

app.use('/api', authenticateToken);

// --- ITEMS ---
app.get('/api/items', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items WHERE company_id = $1 ORDER BY date_added ASC', [req.user.companyId]);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/items', async (req, res) => {
  const { type, description, weight, stone_weight } = req.body;
  const maxRetries = 5;
  const sw = stone_weight ? parseFloat(stone_weight) : 0;
  const companyId = req.user.companyId;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const randomNum = Math.floor(10000000 + Math.random() * 90000000);
    const barcode = `AG-${randomNum}`;

    try {
      const result = await pool.query(
        'INSERT INTO items (company_id, barcode, type, description, weight, stone_weight, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [companyId, barcode, type, description, weight, sw, 'In Stock']
      );
      return res.json({ data: result.rows[0] });
    } catch (err) {
      if (err.code === '23505') { 
        if (attempt === maxRetries) {
          return res.status(500).json({ error: 'Failed to generate a unique barcode. Please try again.' });
        }
        continue;
      }
      return res.status(500).json({ error: err.message });
    }
  }
});

app.put('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  const { type, description, weight, stone_weight } = req.body;
  const sw = stone_weight ? parseFloat(stone_weight) : 0;
  const gw = parseFloat(weight);
  try {
    const result = await pool.query(
      'UPDATE items SET type = $1, description = $2, weight = $3, stone_weight = $4 WHERE id = $5 AND company_id = $6 RETURNING *',
      [type, description, gw, sw, id, req.user.companyId]
    );
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM items WHERE id = $1 AND company_id = $2', [id, req.user.companyId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- BUYERS ---
app.get('/api/buyers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM buyers WHERE company_id = $1', [req.user.companyId]);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/buyers', async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO buyers (company_id, name) VALUES ($1, $2) RETURNING *',
      [req.user.companyId, name]
    );
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/buyers/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('UPDATE buyers SET name = $1 WHERE id = $2 AND company_id = $3 RETURNING *', [name, id, req.user.companyId]);
    await client.query('UPDATE sales SET buyer_name = $1 WHERE buyer_id = $2 AND company_id = $3', [name, id, req.user.companyId]);
    await client.query('COMMIT');
    res.json({ data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete('/api/buyers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM buyers WHERE id = $1 AND company_id = $2', [id, req.user.companyId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ITEM TYPES ---
app.get('/api/item_types', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM item_types WHERE company_id = $1 ORDER BY name ASC', [req.user.companyId]);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/item_types', async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO item_types (company_id, name) VALUES ($1, $2) RETURNING *',
      [req.user.companyId, name]
    );
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/item_types/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const oldType = await client.query('SELECT name FROM item_types WHERE id = $1 AND company_id = $2', [id, req.user.companyId]);
    if (oldType.rows.length === 0) throw new Error("Type not found");
    const oldName = oldType.rows[0].name;
    const result = await client.query('UPDATE item_types SET name = $1 WHERE id = $2 AND company_id = $3 RETURNING *', [name, id, req.user.companyId]);
    await client.query('UPDATE items SET type = $1 WHERE type = $2 AND company_id = $3', [name, oldName, req.user.companyId]);
    await client.query('UPDATE sales SET type = $1 WHERE type = $2 AND company_id = $3', [name, oldName, req.user.companyId]);
    await client.query('COMMIT');
    res.json({ data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete('/api/item_types/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM item_types WHERE id = $1 AND company_id = $2', [id, req.user.companyId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DESCRIPTIONS ---
app.get('/api/descriptions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM descriptions WHERE company_id = $1 ORDER BY name ASC', [req.user.companyId]);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/descriptions', async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO descriptions (company_id, name) VALUES ($1, $2) RETURNING *',
      [req.user.companyId, name]
    );
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/descriptions/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const oldDesc = await client.query('SELECT name FROM descriptions WHERE id = $1 AND company_id = $2', [id, req.user.companyId]);
    if (oldDesc.rows.length === 0) throw new Error("Description not found");
    const oldName = oldDesc.rows[0].name;
    const result = await client.query('UPDATE descriptions SET name = $1 WHERE id = $2 AND company_id = $3 RETURNING *', [name, id, req.user.companyId]);
    await client.query('UPDATE items SET description = $1 WHERE description = $2 AND company_id = $3', [name, oldName, req.user.companyId]);
    await client.query('COMMIT');
    res.json({ data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete('/api/descriptions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM descriptions WHERE id = $1 AND company_id = $2', [id, req.user.companyId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SALES ---
app.get('/api/sales', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, i.description 
      FROM sales s 
      LEFT JOIN items i ON s.item_id = i.id AND i.company_id = s.company_id
      WHERE s.company_id = $1
      ORDER BY s.date DESC
    `, [req.user.companyId]);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sales', async (req, res) => {
  const { barcodes, buyerId } = req.body;
  
  if (!barcodes || barcodes.length === 0) {
    return res.status(400).json({ success: false, message: 'No barcodes provided' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const buyerRes = await client.query('SELECT * FROM buyers WHERE id = $1 AND company_id = $2', [buyerId, req.user.companyId]);
    if (buyerRes.rows.length === 0) throw new Error('Buyer not found');
    const buyer = buyerRes.rows[0];

    const placeholders = barcodes.map((_, i) => `$${i + 2}`).join(',');
    const itemsRes = await client.query(
      `SELECT * FROM items WHERE company_id = $1 AND barcode IN (${placeholders}) AND status = 'In Stock'`,
      [req.user.companyId, ...barcodes]
    );

    if (itemsRes.rows.length === 0) {
      throw new Error('No valid items found to process.');
    }
    const itemsToUpdate = itemsRes.rows;

    const itemIds = itemsToUpdate.map(i => i.id);
    const idPlaceholders = itemIds.map((_, i) => `$${i + 2}`).join(',');
    await client.query(
      `UPDATE items SET status = 'Sold' WHERE company_id = $1 AND id IN (${idPlaceholders})`,
      [req.user.companyId, ...itemIds]
    );

    const newSales = [];
    for (const item of itemsToUpdate) {
      const saleRes = await client.query(
        `INSERT INTO sales (company_id, item_id, barcode, buyer_id, buyer_name, weight, stone_weight, type) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [req.user.companyId, item.id, item.barcode, buyer.id, buyer.name, item.weight, item.stone_weight || 0, item.type]
      );
      const newSale = saleRes.rows[0];
      newSale.description = item.description;
      newSales.push(newSale);
    }

    await client.query('COMMIT');
    res.json({ 
      success: true, 
      message: `Successfully processed ${itemsToUpdate.length} items for ${buyer.name}.`,
      data: newSales
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message || 'Failed to process sale' });
  } finally {
    client.release();
  }
});

app.post('/api/sales/void', async (req, res) => {
  const { buyerId, date } = req.body;
  if (!buyerId || !date) {
    return res.status(400).json({ success: false, message: 'buyerId and date are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const salesRes = await client.query(
      'SELECT item_id FROM sales WHERE company_id = $1 AND buyer_id = $2 AND date = $3',
      [req.user.companyId, buyerId, date]
    );

    if (salesRes.rows.length === 0) {
      throw new Error('Transaction not found or already voided');
    }

    const itemIds = salesRes.rows.map(row => row.item_id);
    const idPlaceholders = itemIds.map((_, i) => `$${i + 2}`).join(',');

    await client.query(
      `UPDATE items SET status = 'In Stock' WHERE company_id = $1 AND id IN (${idPlaceholders})`,
      [req.user.companyId, ...itemIds]
    );

    await client.query(
      'DELETE FROM sales WHERE company_id = $1 AND buyer_id = $2 AND date = $3',
      [req.user.companyId, buyerId, date]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: `Successfully voided transaction with ${itemIds.length} items.` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message || 'Failed to void transaction' });
  } finally {
    client.release();
  }
});

const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
