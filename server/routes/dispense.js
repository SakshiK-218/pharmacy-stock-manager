const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/', async (req, res) => {
  const { itemId, quantity } = req.body;

  if (!itemId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'itemId and a positive quantity are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: batches } = await client.query(
      `SELECT * FROM batches 
       WHERE item_id = $1 AND quantity > 0 AND expiry_date >= CURRENT_DATE
       ORDER BY expiry_date ASC
       FOR UPDATE`,
      [itemId]
    );

    let remaining = quantity;
    const used = [];

    for (const batch of batches) {
      if (remaining <= 0) break;
      const take = Math.min(batch.quantity, remaining);

      await client.query(
        `UPDATE batches SET quantity = quantity - $1 WHERE id = $2`,
        [take, batch.id]
      );
      await client.query(
        `INSERT INTO dispense_log (item_id, batch_id, quantity) VALUES ($1, $2, $3)`,
        [itemId, batch.id, take]
      );

      used.push({ batchId: batch.id, taken: take, expiry: batch.expiry_date });
      remaining -= take;
    }

    if (remaining > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, reason: 'Insufficient stock' });
    }

    await client.query('COMMIT');
    res.json({ success: true, usedBatches: used });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;