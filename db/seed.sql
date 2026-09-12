-- Items
INSERT INTO items (name, category, unit) VALUES
  ('O-Negative Blood', 'blood', 'bag'),
  ('A-Positive Blood', 'blood', 'bag'),
  ('Paracetamol 500mg', 'medicine', 'strip'),
  ('Amoxicillin 250mg', 'medicine', 'bottle');

-- Batches — deliberately staggered expiry dates so FIFO is visibly testable
-- O-Negative (item_id = 1): three batches, different expiries
INSERT INTO batches (item_id, quantity, expiry_date) VALUES
  (1, 3, CURRENT_DATE + INTERVAL '5 days'),   -- expires soonest
  (1, 5, CURRENT_DATE + INTERVAL '20 days'),
  (1, 10, CURRENT_DATE + INTERVAL '40 days'); -- expires latest

-- A-Positive (item_id = 2): only 1 unit left — this is your race-condition batch
INSERT INTO batches (item_id, quantity, expiry_date) VALUES
  (2, 1, CURRENT_DATE + INTERVAL '15 days');

-- Paracetamol (item_id = 3): plenty of stock, two batches
INSERT INTO batches (item_id, quantity, expiry_date) VALUES
  (3, 50, CURRENT_DATE + INTERVAL '90 days'),
  (3, 30, CURRENT_DATE + INTERVAL '180 days');

-- Amoxicillin (item_id = 4): one batch already expired (to test that expired stock is excluded)
INSERT INTO batches (item_id, quantity, expiry_date) VALUES
  (4, 8, CURRENT_DATE - INTERVAL '2 days'),   -- expired, must NOT be dispensable
  (4, 12, CURRENT_DATE + INTERVAL '60 days');