import { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'https://pharmacy-stock-manager.onrender.com/api';

function App() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [batches, setBatches] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/items`)
      .then(res => res.json())
      .then(setItems);
  }, []);

  const selectItem = async (item) => {
    setSelectedItem(item);
    setMessage(null);
    const res = await fetch(`${API_URL}/items/${item.id}/stock`);
    const data = await res.json();
    setBatches(data);
  };

  const refreshBatches = async () => {
    const res = await fetch(`${API_URL}/items/${selectedItem.id}/stock`);
    setBatches(await res.json());
  };

  const handleDispense = async () => {
    setMessage(null);
    const res = await fetch(`${API_URL}/dispense`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: selectedItem.id, quantity: Number(quantity) })
    });
    const data = await res.json();
    setMessage({ ok: res.ok, data });
    refreshBatches();
  };

  const handleRaceDemo = async () => {
    setMessage(null);
    const fire = () => fetch(`${API_URL}/dispense`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: selectedItem.id, quantity: 1 })
    }).then(res => res.json().then(data => ({ status: res.status, data })));

    const [a, b] = await Promise.all([fire(), fire()]);
    setMessage({ race: true, a, b });
    refreshBatches();
  };

  return (
    <div className="App">
      <h1>Pharmacy Stock Manager</h1>

      <div className="layout">
        <div className="items-panel">
          <h2>Items</h2>
          {items.map(item => (
            <button
              key={item.id}
              className={selectedItem?.id === item.id ? 'item-btn active' : 'item-btn'}
              onClick={() => selectItem(item)}
            >
              {item.name} <span className="tag">{item.category}</span>
            </button>
          ))}
        </div>

        {selectedItem && (
          <div className="detail-panel">
            <h2>{selectedItem.name} — Batches (sorted by expiry)</h2>
            <table>
              <thead>
                <tr><th>Batch ID</th><th>Quantity</th><th>Expiry Date</th></tr>
              </thead>
              <tbody>
                {batches.map(b => (
  <tr key={b.batch_id} style={{ opacity: b.quantity === 0 ? 0.4 : 1 }}>
    <td>{b.batch_id}</td>
    <td>{b.quantity}</td>
    <td>{new Date(b.expiry_date).toLocaleDateString()}</td>
  </tr>
))}
              </tbody>
            </table>

            <div className="actions">
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
              <button onClick={handleDispense}>Dispense</button>
              <button onClick={handleRaceDemo} className="race-btn">
                🏁 Fire Race Demo (2 concurrent requests, qty 1 each)
              </button>
            </div>

            {message && !message.race && (
              <div className={message.ok ? 'msg success' : 'msg error'}>
                {JSON.stringify(message.data, null, 2)}
              </div>
            )}

            {message?.race && (
              <div className="msg race-result">
                <p><strong>Request A:</strong> {message.a.status} — {JSON.stringify(message.a.data)}</p>
                <p><strong>Request B:</strong> {message.b.status} — {JSON.stringify(message.b.data)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;