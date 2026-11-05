const router = require('express').Router();
const { q, one, exec, tx } = require('../db');
const { requireAuth, requireRole } = require('../auth');
const { hydrate, hydrateOne, addEvent } = require('../orders');
const { notifyRole } = require('../notify');
const { locate } = require('../geo');
const { DELIVERY_FEE } = require('../config');
const { HttpError, wrap, str, int, need } = require('../util');

async function loadFor(user, id) {
  const o = await one('SELECT * FROM orders WHERE id = ?', [id]);
  if (!o) throw new HttpError(404, 'Order not found');
  if (user.role === 'customer' && o.customer_id !== user.id) throw new HttpError(404, 'Order not found');
  if (user.role === 'agent' && o.agent_id !== user.id) throw new HttpError(403, 'This order is not assigned to you');
  return o;
}

router.post('/', requireRole('customer'), wrap(async (req, res) => {
  const b = req.body;
  need(Array.isArray(b.items) && b.items.length > 0, 'items: your cart is empty');
  const method = b.payment_method;
  need(['mpesa', 'card', 'cod'].includes(method), 'payment_method: must be mpesa, card or cod');
  const name = str(b.name, 'name', 1, 120), phone = str(b.phone, 'phone', 5, 30), address = str(b.address, 'address', 3, 250);
  const city = String(b.city || 'Nairobi').trim().slice(0, 80) || 'Nairobi';

  const wanted = new Map(); // merge duplicate lines
  for (const l of b.items) {
    const id = int(l.book_id, 'book_id', 1), qty = int(l.quantity, 'quantity', 1, 50);
    wanted.set(id, (wanted.get(id) || 0) + qty);
  }

  const orderId = await tx(async (conn) => {
    const books = await q('SELECT * FROM books WHERE id IN (?) FOR UPDATE', [[...wanted.keys()]], conn);
    const byId = Object.fromEntries(books.map((x) => [x.id, x]));
    for (const [id, qty] of wanted) {
      const bk = byId[id];
      if (!bk) throw new HttpError(400, `Book #${id} no longer exists`);
      if (bk.stock < qty) throw new HttpError(400, `Only ${bk.stock} copies of "${bk.title}" left in stock`);
    }
    // never trust prices from the browser
    const subtotal = Math.round([...wanted].reduce((s, [id, qty]) => s + byId[id].price * qty, 0) * 100) / 100;
    const total = subtotal + DELIVERY_FEE;
    const [lat, lng] = locate(address, city);
    const r = await exec(`INSERT INTO orders (code, customer_id, status, subtotal, delivery_fee, total, payment_method, ship_name, ship_phone, ship_address, ship_city, dest_lat, dest_lng)
      VALUES ('TMP', ?, 'Pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [req.user.id, subtotal, DELIVERY_FEE, total, method, name, phone, address, city, lat, lng], conn);
    const id = r.insertId, code = `BK-${1000 + id}`;
    await exec('UPDATE orders SET code = ? WHERE id = ?', [code, id], conn);
    for (const [bid, qty] of wanted) {
      await exec('UPDATE books SET stock = stock - ? WHERE id = ?', [qty, bid], conn);
      await exec('INSERT INTO order_items (order_id, book_id, title, price, quantity) VALUES (?,?,?,?,?)', [id, bid, byId[bid].title, byId[bid].price, qty], conn);
    }
    await exec('INSERT INTO payments (order_id, method, amount, phone, status) VALUES (?,?,?,?,?)', [id, method, total, phone, method === 'card' ? 'Completed' : 'Pending'], conn);
    await addEvent(id, 'Pending', 'Order placed', conn);
    if (method === 'card') { // card gateway is a demo: approved instantly
      await exec("UPDATE payments SET reference='CARD-SIM' WHERE order_id=?", [id], conn);
      await exec("UPDATE orders SET payment_status='Paid', status='Processing' WHERE id=?", [id], conn);
      await addEvent(id, 'Processing', 'Card payment confirmed', conn);
    } else if (method === 'cod') {
      await exec("UPDATE orders SET payment_status='Pay on delivery', status='Processing' WHERE id=?", [id], conn);
      await addEvent(id, 'Processing', 'Order confirmed, pay on delivery', conn);
    }
    await notifyRole('admin', 'new_order', 'New order received', `${code} from ${name} — KSh ${Math.round(total).toLocaleString('en-KE')}`, '/admin/orders', conn);
    return id;
  });
  res.status(201).json(await hydrateOne(await one('SELECT * FROM orders WHERE id = ?', [orderId])));
}));

router.get('/mine', requireRole('customer'), wrap(async (req, res) => {
  res.json(await hydrate(await q('SELECT * FROM orders WHERE customer_id = ? ORDER BY id DESC', [req.user.id])));
}));

router.get('/:id(\\d+)', requireAuth, wrap(async (req, res) => res.json(await hydrateOne(await loadFor(req.user, req.params.id)))));
router.get('/:id(\\d+)/tracking', requireAuth, wrap(async (req, res) => res.json(await hydrateOne(await loadFor(req.user, req.params.id), { events: true }))));

router.post('/:id(\\d+)/cancel', requireRole('customer'), wrap(async (req, res) => {
  const o = await loadFor(req.user, req.params.id);
  if (!['Pending', 'Processing'].includes(o.status)) throw new HttpError(400, 'This order can no longer be cancelled');
  await tx(async (conn) => {
    await exec('UPDATE books b JOIN order_items i ON i.book_id = b.id SET b.stock = b.stock + i.quantity WHERE i.order_id = ?', [o.id], conn);
    await exec("UPDATE orders SET status='Cancelled' WHERE id = ?", [o.id], conn);
    await addEvent(o.id, 'Cancelled', 'Cancelled by customer', conn);
  });
  res.json(await hydrateOne(await one('SELECT * FROM orders WHERE id = ?', [o.id])));
}));

module.exports = router;
