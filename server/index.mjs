import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect()
  .then(async (client) => {
    console.log('Connected to PostgreSQL successfully');
    try {
      await client.query('ALTER TABLE items ADD COLUMN IF NOT EXISTS stone_weight DECIMAL(10, 2) DEFAULT 0');
      await client.query('ALTER TABLE sales ADD COLUMN IF NOT EXISTS stone_weight DECIMAL(10, 2) DEFAULT 0');
      console.log('Schema migration complete.');
    } catch (e) {
      console.error('Schema migration failed:', e);
    } finally {
      client.release();
    }
  })
  .catch(err => console.error('Failed to connect to PostgreSQL', err.stack));

// API Routes

// --- ITEMS ---
app.get('/api/items', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items ORDER BY date_added ASC');
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/items', async (req, res) => {
  const { type, description, weight, stone_weight } = req.body;
  const maxRetries = 5;
  const sw = stone_weight ? parseFloat(stone_weight) : 0;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Generate 8-digit barcode: AG-XXXXXXXX
    const randomNum = Math.floor(10000000 + Math.random() * 90000000);
    const barcode = `AG-${randomNum}`;

    try {
      const result = await pool.query(
        'INSERT INTO items (barcode, type, description, weight, stone_weight, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [barcode, type, description, weight, sw, 'In Stock']
      );
      return res.json({ data: result.rows[0] });
    } catch (err) {
      if (err.code === '23505') { // Unique constraint violation
        if (attempt === maxRetries) {
          return res.status(500).json({ error: 'Failed to generate a unique barcode. Please try again.' });
        }
        continue; // Retry with a new barcode
      }
      return res.status(500).json({ error: err.message });
    }
  }
});

// --- BUYERS ---
app.get('/api/buyers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM buyers');
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/buyers', async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO buyers (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/buyers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM buyers WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ITEM TYPES ---
app.get('/api/item_types', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM item_types ORDER BY name ASC');
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/item_types', async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO item_types (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/item_types/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM item_types WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SALES ---
app.get('/api/sales', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sales ORDER BY date DESC');
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

    // Get buyer info
    const buyerRes = await client.query('SELECT * FROM buyers WHERE id = $1', [buyerId]);
    if (buyerRes.rows.length === 0) throw new Error('Buyer not found');
    const buyer = buyerRes.rows[0];

    // Get items to sell
    const placeholders = barcodes.map((_, i) => `$${i + 1}`).join(',');
    const itemsRes = await client.query(
      `SELECT * FROM items WHERE barcode IN (${placeholders}) AND status = 'In Stock'`,
      barcodes
    );

    if (itemsRes.rows.length === 0) {
      throw new Error('No valid items found to process.');
    }
    const itemsToUpdate = itemsRes.rows;

    // Mark items as Sold
    const itemIds = itemsToUpdate.map(i => i.id);
    const idPlaceholders = itemIds.map((_, i) => `$${i + 1}`).join(',');
    await client.query(
      `UPDATE items SET status = 'Sold' WHERE id IN (${idPlaceholders})`,
      itemIds
    );

    // Insert sales
    const newSales = [];
    for (const item of itemsToUpdate) {
      const saleRes = await client.query(
        `INSERT INTO sales (item_id, barcode, buyer_id, buyer_name, weight, stone_weight, type) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [item.id, item.barcode, buyer.id, buyer.name, item.weight, item.stone_weight || 0, item.type]
      );
      newSales.push(saleRes.rows[0]);
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

const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
