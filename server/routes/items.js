const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all items
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET stock for one item, grouped by batch (soonest expiry first)
router.get('/:id/stock', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT id AS batch_id, quantity, expiry_date, received_at
       FROM batches
       WHERE item_id = $1
       ORDER BY expiry_date ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;