# Pharmacy / Blood Bank Stock Management with Expiry-Based FIFO Dispensing

A backend-first inventory system for a pharmacy or blood bank that guarantees two invariants under real concurrent load:

1. **No overselling** — even if two requests hit the last unit of stock at the exact same millisecond, only one succeeds.
2. **Expiry-based FIFO dispensing** — stock is always drawn from the soonest-expiring batch first, spilling into the next batch only when the current one is exhausted.

Built to demonstrate transactional integrity (row-level locking, isolation) alongside deterministic, greedy batch-selection logic — two different engineering skills in one small, fully working system.

**Live demo:** pharmacy-stock-manager-6e1em1m5z-sakshi-47ab.vercel.app
**Backend API:** https://pharmacy-stock-manager.onrender.com

> Note: the backend is hosted on Render's free tier, which spins down after inactivity. The first request after a period of inactivity may take 30–60 seconds to respond while it wakes up.

---

## The problem

Pharmacies and blood banks receive stock in batches, each with its own expiry date. Two things can go wrong if the system isn't built carefully:

- **Overselling**: two staff members (or two automated requests) try to dispense the last unit of a scarce item at the same time. Without proper locking, both could succeed, leaving the system thinking it has -1 units.
- **Wasted or expired stock**: if the system doesn't enforce drawing from the soonest-expiring batch first, fresher stock gets used while older stock quietly expires on the shelf — a real waste and safety problem in pharma/blood banking.

This project solves both, and proves it under real concurrency, not just sequential testing.

---

## Proof: no overselling under concurrent load

Two simultaneous requests fired at an item with exactly **1 unit** in stock:

![Race condition demo](screenshots/race-demo.png)

Request A and Request B fire at the exact same instant via `Promise.all`. One gets `200 OK` and the unit; the other gets `409 Conflict` with `"Insufficient stock"` — and no partial deduction occurs. Which request wins is not deterministic; that exactly one wins, every time, is the actual guarantee.

This is enforced with `SELECT ... FOR UPDATE` inside a database transaction: the second request's read is blocked until the first request's transaction commits or rolls back, so the two requests can never both see "1 unit available" at once.

---

## Proof: expiry-based FIFO dispensing

Dispensing 4 units from an item with three batches (3 / 5 / 10 units, staggered expiry dates):

![FIFO spillover demo](screenshots/fifo-demo.png)

The soonest-expiring batch (3 units) is drained completely first. The remaining 1 unit needed is pulled from the next batch by expiry date. The third, latest-expiring batch is left untouched — even though it had plenty of stock — because it wasn't needed yet.

---

## Architecture

```
┌─────────────┐      HTTP       ┌──────────────┐      SQL       ┌─────────────┐
│   React     │ ───────────────▶│   Express    │ ──────────────▶│  PostgreSQL │
│  (Vercel)   │                 │   (Render)   │                 │   (Neon)    │
└─────────────┘                 └──────────────┘                 └─────────────┘
```

- **Frontend**: React — item list, batch viewer, dispense form, and a one-click race-condition demo
- **Backend**: Node.js + Express — REST API, transactional dispense logic
- **Database**: PostgreSQL (hosted on Neon) — relational schema, row-level locking via `FOR UPDATE`

### Schema

```sql
items (id, name, category, unit)
batches (id, item_id, quantity, expiry_date, received_at)
dispense_log (id, item_id, batch_id, quantity, dispensed_at)
```

### Core dispense transaction

```js
await client.query('BEGIN');

const { rows: batches } = await client.query(
  `SELECT * FROM batches
   WHERE item_id = $1 AND quantity > 0 AND expiry_date >= CURRENT_DATE
   ORDER BY expiry_date ASC
   FOR UPDATE`,
  [itemId]
);

// Deduct from soonest-expiring batches first, spilling into
// the next batch only when the current one is exhausted.
// If total available stock can't satisfy the request, ROLLBACK.

await client.query('COMMIT');
```

`FOR UPDATE` locks exactly the rows being read, so a concurrent request for the same item is forced to wait until this transaction finishes — this is what makes the "no overselling" guarantee hold under real concurrency, not just in sequential tests.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Create React App) |
| Backend | Node.js, Express |
| Database | PostgreSQL (Neon) |
| Deployment | Vercel (frontend), Render (backend) |

---

## Running locally

**Prerequisites:** Node.js 18+, PostgreSQL installed locally (or a connection string to any Postgres instance)

```bash
git clone https://github.com/SakshiK-218/pharmacy-stock-manager.git
cd pharmacy-stock-manager
```

**1. Set up the database:**
```bash
psql -U postgres -c "CREATE DATABASE pharmacy_db;"
psql -U postgres -d pharmacy_db -f db/schema.sql
psql -U postgres -d pharmacy_db -f db/seed.sql
```

**2. Configure and run the backend:**
```bash
cd server
npm install
```
Create a `.env` file in `server/`:
```
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/pharmacy_db
```
```bash
npm run dev
```
Server runs on `http://localhost:5000`.

**3. Run the frontend:**
```bash
cd ../client
npm install
npm start
```
Opens on `http://localhost:3000`.

**4. Try the race-condition demo directly from the terminal (optional):**
```bash
cd ../scripts
node race-demo.js
```

**Reset the database to seed state at any time:**
```bash
cd server
npm run reset-db
```

---

## API reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check + DB connectivity |
| `GET` | `/api/items` | List all items |
| `GET` | `/api/items/:id/stock` | Batches for an item, sorted by expiry |
| `POST` | `/api/dispense` | Dispense stock — `{ itemId, quantity }` |

---

## Why these two invariants

This project pairs a **systems/concurrency problem** (preventing overselling under race conditions) with an **algorithmic problem** (deterministic, greedy expiry-based selection) in one small, demonstrable codebase — covering both database transaction design and correctness-focused logic in a way that's easy to verify live rather than just explain.
