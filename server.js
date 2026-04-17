const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const STORE_ID   = process.env.SSL_STORE_ID    || 'testbox';
const STORE_PASS = process.env.SSL_STORE_PASS  || 'qwerty';
const IS_LIVE    = process.env.SSL_IS_LIVE === 'true';
const SSL_URL    = IS_LIVE
  ? 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'
  : 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php';
const BASE_URL   = process.env.BASE_URL || `http://localhost:${PORT}`;
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin1234';

const ORDERS_PATH = path.join(__dirname, 'data', 'orders.json');

// token -> expiry (ms timestamp)
const sessions = new Map();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── helpers ────────────────────────────────────────────────────────────────

function getOrders() {
  try { return JSON.parse(fs.readFileSync(ORDERS_PATH, 'utf8')).orders || []; }
  catch { return []; }
}

function saveOrders(orders) {
  fs.writeFileSync(ORDERS_PATH, JSON.stringify({ orders }, null, 2));
}

function makeOrderId() {
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return `DRD-${ds}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function authMiddleware(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const expiry = sessions.get(token);
  if (!expiry || Date.now() > expiry) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expired' });
  }
  next();
}

// ── admin auth ─────────────────────────────────────────────────────────────

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Invalid password' });
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + 24 * 60 * 60 * 1000);
  res.json({ token });
});

// ── order creation + SSLCommerz initiation ─────────────────────────────────

app.post('/api/order/create', async (req, res) => {
  const { product, quantity, unitPrice, weight, subtotal, deliveryCharge, total, customer } = req.body;

  const orderId = makeOrderId();
  const tranId  = `${orderId}-${Date.now()}`;

  const order = {
    id: orderId, tranId,
    product, quantity: +quantity,
    unitPrice: +unitPrice, weight,
    subtotal: +subtotal, deliveryCharge: +deliveryCharge, total: +total,
    customer,
    payment: { method: 'sslcommerz', transactionId: null, status: 'pending', paidAt: null },
    status: 'pending',
    orderDate: new Date().toISOString()
  };

  const orders = getOrders();
  orders.push(order);
  saveOrders(orders);

  try {
    const params = new URLSearchParams({
      store_id: STORE_ID, store_passwd: STORE_PASS,
      total_amount: total, currency: 'BDT', tran_id: tranId,
      success_url: `${BASE_URL}/api/payment/success`,
      fail_url:    `${BASE_URL}/api/payment/fail`,
      cancel_url:  `${BASE_URL}/api/payment/cancel`,
      ipn_url:     `${BASE_URL}/api/payment/ipn`,
      product_name: product, product_category: 'Food', product_profile: 'general',
      cus_name: customer.name, cus_phone: customer.phone,
      cus_add1: customer.address, cus_city: 'Dhaka', cus_country: 'Bangladesh',
      ship_name: customer.name, ship_add1: customer.address,
      ship_city: 'Dhaka', ship_country: 'Bangladesh',
      shipping_method: 'Courier', num_of_item: quantity
    });

    const { data } = await axios.post(SSL_URL, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (data.status === 'SUCCESS') {
      res.json({ success: true, orderId, gatewayUrl: data.GatewayPageURL });
    } else {
      res.status(400).json({ success: false, error: 'Gateway error: ' + (data.failedreason || 'unknown') });
    }
  } catch (err) {
    console.error('SSLCommerz error:', err.message);
    res.status(500).json({ success: false, error: 'Payment initiation failed' });
  }
});

// ── payment callbacks ──────────────────────────────────────────────────────

app.post('/api/payment/success', (req, res) => {
  const { tran_id, val_id, bank_tran_id } = req.body;
  const orders = getOrders();
  const order = orders.find(o => o.tranId === tran_id);
  if (order) {
    order.payment.status = 'paid';
    order.payment.transactionId = val_id || bank_tran_id || null;
    order.payment.paidAt = new Date().toISOString();
    order.status = 'processing';
    saveOrders(orders);
  }
  res.redirect(`/payment-success.html?id=${encodeURIComponent(order?.id || '')}`);
});

app.post('/api/payment/fail', (req, res) => {
  const { tran_id } = req.body;
  const orders = getOrders();
  const order = orders.find(o => o.tranId === tran_id);
  if (order) { order.payment.status = 'failed'; order.status = 'cancelled'; saveOrders(orders); }
  res.redirect('/payment-fail.html?reason=failed');
});

app.post('/api/payment/cancel', (req, res) => {
  const { tran_id } = req.body;
  const orders = getOrders();
  const order = orders.find(o => o.tranId === tran_id);
  if (order) { order.payment.status = 'cancelled'; order.status = 'cancelled'; saveOrders(orders); }
  res.redirect('/payment-fail.html?reason=cancelled');
});

// IPN — SSLCommerz calls this to verify payment on their side
app.post('/api/payment/ipn', (req, res) => {
  const { tran_id, status, val_id } = req.body;
  if (status === 'VALID') {
    const orders = getOrders();
    const order = orders.find(o => o.tranId === tran_id);
    if (order && order.payment.status !== 'paid') {
      order.payment.status = 'paid';
      order.payment.transactionId = val_id || null;
      order.payment.paidAt = new Date().toISOString();
      order.status = 'processing';
      saveOrders(orders);
    }
  }
  res.sendStatus(200);
});

// ── admin order APIs ───────────────────────────────────────────────────────

app.get('/api/admin/orders', authMiddleware, (req, res) => {
  const orders = getOrders().reverse();
  res.json({ orders });
});

app.patch('/api/admin/orders/:id', authMiddleware, (req, res) => {
  const { status } = req.body;
  const valid = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const orders = getOrders();
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.status = status;
  saveOrders(orders);
  res.json({ success: true, order });
});

// ── static files (must be last) ────────────────────────────────────────────

app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`\n  Dried Depot server → http://localhost:${PORT}`);
  console.log(`  Admin dashboard   → http://localhost:${PORT}/admin-orders.html`);
  console.log(`  Admin password    : ${ADMIN_PASS}`);
  console.log(`  SSLCommerz mode   : ${IS_LIVE ? 'LIVE' : 'SANDBOX (testbox)'}\n`);
});
