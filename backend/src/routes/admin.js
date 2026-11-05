const router = require('express').Router();
const { q, one, exec } = require('../db');
const { requireRole } = require('../auth');
const { hydrate, hydrateOne, addEvent } = require('../orders');
const { notifyUser } = require('../notify');
const { HttpError, wrap, int, userOut, bookRow, iso } = require('../util');

const STATUSES = ['Pending', 'Processing', 'Assigned', 'Picked Up', 'Out for Delivery', 'Delivered', 'Cancelled'];
const LOW_STOCK = 10;
router.use(requireRole('admin'));

router.get('/stats', wrap(async (_req, res) => {
  const orders = await q('SELECT * FROM orders ORDER BY id DESC');
  const valid = orders.filter((o) => o.status !== 'Cancelled');
  const revenue = valid.reduce((s, o) => s + o.total, 0);
  // last 6 months
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date(), months = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)); months.push({ y: d.getUTCFullYear(), m: d.getUTCMonth() }); }
  const monthly = months.map(({ y, m }) => ({
    month: names[m],
    sales: Math.round(valid.filter((o) => { const d = new Date(o.created_at); return d.getUTCFullYear() === y && d.getUTCMonth() === m; }).reduce((s, o) => s + o.total, 0) * 100) / 100,
  }));
  const top = await q(`SELECT title, SUM(quantity) AS quantity, SUM(quantity*price) AS revenue FROM order_items GROUP BY title ORDER BY quantity DESC LIMIT 5`);
  res.json({
    total_books: (await one('SELECT COUNT(*) c FROM books')).c,
    total_orders: orders.length,
    total_customers: (await one("SELECT COUNT(*) c FROM users WHERE role='customer'")).c,
    total_revenue: Math.round(revenue * 100) / 100,
    avg_order_value: valid.length ? Math.round((revenue / valid.length) * 100) / 100 : 0,
    monthly_sales: monthly,
    recent_orders: await hydrate(orders.slice(0, 5)),
    top_books: top.map((t) => ({ title: t.title, quantity: Number(t.quantity), revenue: Number(t.revenue) })),
    low_stock: (await one('SELECT COUNT(*) c FROM books WHERE stock <= ?', [LOW_STOCK])).c,
  });
}));

router.get('/orders', wrap(async (req, res) => {
  const rows = req.query.status ? await q('SELECT * FROM orders WHERE status = ? ORDER BY id DESC', [req.query.status]) : await q('SELECT * FROM orders ORDER BY id DESC');
  res.json(await hydrate(rows));
}));

router.patch('/orders/:id/status', wrap(async (req, res) => {
  const o = await one('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!o) throw new HttpError(404, 'Order not found');
  const status = req.body.status;
  if (!STATUSES.includes(status)) throw new HttpError(400, 'Invalid status');
  await exec('UPDATE orders SET status = ? WHERE id = ?', [status, o.id]);
  if (status === 'Delivered') {
    await exec('UPDATE orders SET delivered_at = NOW() WHERE id = ?', [o.id]);
    if (o.payment_method === 'cod') { await exec("UPDATE orders SET payment_status='Paid' WHERE id=?", [o.id]); await exec("UPDATE payments SET status='Completed' WHERE order_id=?", [o.id]); }
  }
  await addEvent(o.id, status, req.body.note || 'Updated by admin');
  await notifyUser(o.customer_id, 'order_update', `Order ${o.code}: ${status}`, `Your order is now "${status}".`, `/tracking?order=${o.id}`);
  res.json(await hydrateOne(await one('SELECT * FROM orders WHERE id = ?', [o.id])));
}));

router.post('/orders/:id/assign', wrap(async (req, res) => {
  const o = await one('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  const agent = await one("SELECT * FROM users WHERE id = ? AND role = 'agent' AND is_active = 1", [Number(req.body.agent_id)]);
  if (!o) throw new HttpError(404, 'Order not found');
  if (!agent) throw new HttpError(400, 'Choose a valid delivery agent');
  if (['Delivered', 'Cancelled'].includes(o.status)) throw new HttpError(400, `Cannot assign a ${o.status.toLowerCase()} order`);
  const status = ['Pending', 'Processing'].includes(o.status) ? 'Assigned' : o.status;
  await exec('UPDATE orders SET agent_id = ?, status = ? WHERE id = ?', [agent.id, status, o.id]);
  await addEvent(o.id, status, `Assigned to ${agent.name}`);
  await notifyUser(agent.id, 'assignment', 'New delivery assigned', `Order ${o.code} to ${o.ship_address}`, `/agent/order/${o.id}`);
  await notifyUser(o.customer_id, 'order_update', `Order ${o.code}: agent assigned`, `${agent.name} will deliver your order.`, `/tracking?order=${o.id}`);
  res.json(await hydrateOne(await one('SELECT * FROM orders WHERE id = ?', [o.id])));
}));

router.get('/agents', wrap(async (_req, res) => res.json((await q("SELECT * FROM users WHERE role = 'agent'")).map(userOut))));

router.get('/customers', wrap(async (_req, res) => {
  const users = await q("SELECT u.*, (SELECT COUNT(*) FROM orders o WHERE o.customer_id = u.id) AS orders FROM users u WHERE role = 'customer' ORDER BY id DESC");
  res.json(users.map((u) => ({ ...userOut(u), orders: Number(u.orders) })));
}));
router.patch('/customers/:id/active', wrap(async (req, res) => {
  const u = await one("SELECT * FROM users WHERE id = ? AND role = 'customer'", [req.params.id]);
  if (!u) throw new HttpError(404, 'Customer not found');
  await exec('UPDATE users SET is_active = ? WHERE id = ?', [u.is_active ? 0 : 1, u.id]);
  res.json({ id: u.id, is_active: !u.is_active });
}));

router.get('/payments', wrap(async (_req, res) => {
  const rows = await q('SELECT p.*, o.code AS order_code FROM payments p JOIN orders o ON o.id = p.order_id ORDER BY p.id DESC');
  res.json(rows.map((p) => ({ id: p.id, order_id: p.order_id, method: p.method, amount: p.amount, status: p.status, reference: p.reference, phone: p.phone, created_at: iso(p.created_at), order_code: p.order_code })));
}));

router.get('/inventory', wrap(async (_req, res) => {
  const rows = await q(`SELECT b.*, (SELECT AVG(rating) FROM reviews r WHERE r.book_id=b.id) AS rating, (SELECT COUNT(*) FROM reviews r WHERE r.book_id=b.id) AS reviews FROM books b ORDER BY stock ASC`);
  res.json(rows.map(bookRow));
}));

module.exports = router;
