const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

let orders_initial = [
  { id: 1, items: [{ name: 'Item 1', status: 'pending' }, { name: 'Item 2', status: 'pending' }, { name: 'Item 3', status: 'pending' }] },
  { id: 2, items: [{ name: 'Item 4', status: 'pending' }, { name: 'Item 5', status: 'pending' }] },
  { id: 3, items: [{ name: 'Item 7', status: 'pending' }, { name: 'Item 8', status: 'pending' }, { name: 'Item 9', status: 'pending' }] },
  { id: 4, items: [{ name: 'Item 10', status: 'pending' }, { name: 'Item 11', status: 'pending' }, { name: 'Item 12', status: 'pending' }, { name: 'Item 13', status: 'pending' }, { name: 'Item 14', status: 'pending' }, { name: 'Item 15', status: 'pending' }] },
  { id: 5, items: [{ name: 'Item 16', status: 'pending' }, { name: 'Item 17', status: 'pending' }, { name: 'Item 18', status: 'pending' }, { name: 'Item 19', status: 'pending' }, { name: 'Item 20', status: 'pending' }] },
  { id: 6, items: [{ name: 'Item 21', status: 'pending' }, { name: 'Item 22', status: 'pending' }, { name: 'Item 23', status: 'pending' }, { name: 'Item 24', status: 'pending' }, { name: 'Item 25', status: 'pending' }, { name: 'Item 26', status: 'pending' }, { name: 'Item 27', status: 'pending' }, { name: 'Item 28', status: 'pending' }, { name: 'Item 29', status: 'pending' }, { name: 'Item 30', status: 'pending' }] },
  { id: 7, items: [{ name: 'Item 31', status: 'pending' }] },
  { id: 8, items: [{ name: 'Item 41', status: 'pending' }, { name: 'Item 42', status: 'pending' }, { name: 'Item 43', status: 'pending' }, { name: 'Item 44', status: 'pending' }] },
  { id: 9, items: [{ name: 'Item 51', status: 'pending' }] },
  { id: 10, items: [{ name: 'Item 61', status: 'pending' }, { name: 'Item 62', status: 'pending' }, { name: 'Item 63', status: 'pending' }, { name: 'Item 64', status: 'pending' }, { name: 'Item 65', status: 'pending' }] },
  // Add more orders as needed
];
let orders = JSON.parse(JSON.stringify(orders_initial)); // Deep copy to avoid reference issues

// API endpoint to get orders
app.get('/api/orders', (req, res) => {
  res.json(orders);
});

// API endpoint to update item status
app.post('/api/orders/:orderId/items/:itemIndex/status', (req, res) => {
  const { orderId, itemIndex } = req.params;
  const { status } = req.body;

  const order = orders.find(order => order.id === parseInt(orderId));
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const item = order.items[parseInt(itemIndex)];
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  item.status = status;
  res.status(200).json({ message: 'Status updated successfully' });
});

// API endpoint to reset orders
app.post('/api/orders/reset', (req, res) => {
  orders = JSON.parse(JSON.stringify(orders_initial)); // Deep copy to reset orders
  res.status(200).json({ message: 'Orders reset successfully' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is healthy' });
});

// API endpoint to sync orders
app.post('/api/orders/sync', (req, res) => {
  orders = req.body.orders;
  res.status(200).json({ message: 'Orders synchronized successfully' });
});

// The "catchall" handler: for any request that doesn't match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});