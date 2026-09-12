async function dispenseRequest(label) {
  const res = await fetch('http://localhost:5000/api/dispense', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId: 2, quantity: 1 }) // A-Positive, only 1 unit exists
  });
  const data = await res.json();
  console.log(`[${label}] Status: ${res.status} —`, data);
}

async function runRace() {
  console.log('Firing two concurrent dispense requests for A-Positive (1 unit in stock)...\n');
  await Promise.all([
    dispenseRequest('Request A'),
    dispenseRequest('Request B')
  ]);
}

runRace();