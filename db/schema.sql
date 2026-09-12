CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('blood', 'medicine')),
  unit VARCHAR(20) NOT NULL DEFAULT 'unit'  -- e.g. 'bag', 'strip', 'bottle'
);

CREATE TABLE batches (
  id SERIAL PRIMARY KEY,
  item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity >= 0),
  expiry_date DATE NOT NULL,
  received_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dispense_log (
  id SERIAL PRIMARY KEY,
  item_id INT NOT NULL REFERENCES items(id),
  batch_id INT NOT NULL REFERENCES batches(id),
  quantity INT NOT NULL,
  dispensed_at TIMESTAMP DEFAULT NOW()
);

-- Speeds up the FOR UPDATE ... ORDER BY expiry_date query
CREATE INDEX idx_batches_item_expiry ON batches (item_id, expiry_date);