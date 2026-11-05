// Integration test against a REAL MySQL. Uses a separate database (bookconnect_test).
process.env.DB_NAME = process.env.DB_NAME_TEST || 'bookconnect_test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const app = require('../src/app');

let server, base;
before(async () => {
  await db.init();
  await db.exec('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of ['notifications', 'tracking_events', 'payments', 'order_items', 'orders', 'wishlist', 'addresses', 'reviews', 'books', 'users']) await db.exec(`TRUNCATE TABLE ${t}`);
  await db.exec('SET FOREIGN_KEY_CHECKS = 1');
  await require('../src/seed').seedIfEmpty();
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => { server.close(); await db.getPool().end(); });

async function call(method, path, { token, body } = {}) {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
  const data = r.status === 204 ? null : await r.json();
  return { status: r.status, data };
}
const login = (identifier, password, role) => call('POST', '/auth/login', { body: { identifier, password, role } });

test('login requires the matching role', async () => {
  assert.equal((await login('customer@bookconnect.com', 'wrong', 'customer')).status, 401);
  assert.equal((await login('customer@bookconnect.com', 'Customer@123', 'admin')).status, 403);
  assert.equal((await login('admin@bookconnect.com', 'Admin@123', 'customer')).status, 403);
  assert.equal((await login('agent@bookconnect.com', 'Agent@123', 'agent')).status, 200);
  const r = await login('0725333939', 'Customer@123', 'customer'); // phone login
  assert.equal(r.status, 200);
  assert.equal(r.data.user.role, 'customer');
  assert.equal((await call('GET', '/auth/me')).status, 401);
});

test('register creates customers only', async () => {
  const r = await call('POST', '/auth/register', { body: { name: 'New User', email: 'new@x.com', phone: '0711000000', password: 'secret1', role: 'admin' } });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.role, 'customer');
  assert.equal((await call('POST', '/auth/register', { body: { name: 'New User', email: 'new@x.com', phone: '0711000001', password: 'secret1' } })).status, 409);
});

test('admin adds a book -> every customer is notified', async () => {
  const admin = (await login('admin@bookconnect.com', 'Admin@123', 'admin')).data.access_token;
  const cust = (await login('customer@bookconnect.com', 'Customer@123', 'customer')).data.access_token;
  const mary = (await login('mary@example.com', 'Customer@123', 'customer')).data.access_token;
  const before = (await call('GET', '/notifications', { token: cust })).data.unread;

  assert.equal((await call('POST', '/books', { token: cust, body: { title: 'X', author: 'Y', category: 'Fiction', price: 100, stock: 1 } })).status, 403);
  const r = await call('POST', '/books', { token: admin, body: { title: 'Born a Crime', author: 'Trevor Noah', category: 'Academic', price: 1700, stock: 10 } });
  assert.equal(r.status, 201);

  for (const t of [cust, mary]) {
    const n = (await call('GET', '/notifications', { token: t })).data;
    assert.equal(n.unread, (t === cust ? before : n.unread) + (t === cust ? 1 : 0));
    assert.equal(n.notifications[0].type, 'new_book');
    assert.match(n.notifications[0].message, /Born a Crime/);
    assert.equal(n.notifications[0].link, `/book/${r.data.id}`);
  }
  // agents/admins do not get book notifications
  const agent = (await login('agent@bookconnect.com', 'Agent@123', 'agent')).data.access_token;
  assert.ok(!(await call('GET', '/notifications', { token: agent })).data.notifications.some((x) => x.type === 'new_book'));

  const id = (await call('GET', '/notifications', { token: cust })).data.notifications[0].id;
  await call('POST', `/notifications/${id}/read`, { token: cust });
  assert.equal((await call('GET', '/notifications', { token: cust })).data.unread, before);
  await call('POST', '/notifications/read-all', { token: cust });
  assert.equal((await call('GET', '/notifications', { token: cust })).data.unread, 0);
});

test('books: search, filter, sort', async () => {
  assert.equal((await call('GET', '/books?search=dune')).data[0].title, 'Dune');
  assert.ok((await call('GET', '/books?category=Fiction')).data.every((b) => b.category === 'Fiction'));
  const p = (await call('GET', '/books?sort=low')).data.map((b) => b.price);
  assert.deepEqual(p, [...p].sort((a, b) => a - b));
});

test('order -> pay -> assign -> deliver -> track', async () => {
  const cust = (await login('customer@bookconnect.com', 'Customer@123', 'customer')).data.access_token;
  const dune = (await call('GET', '/books?search=dune')).data[0];
  const bad = await call('POST', '/orders', { token: cust, body: { items: [{ book_id: dune.id, quantity: 30 }], name: 'J', phone: '0725333939', address: 'Westlands', payment_method: 'mpesa' } });
  assert.equal(bad.status, 400);
  const o = await call('POST', '/orders', { token: cust, body: { items: [{ book_id: dune.id, quantity: 2 }], name: 'J', phone: '0725333939', address: 'Westlands', payment_method: 'mpesa' } });
  assert.equal(o.status, 201, JSON.stringify(o.data));
  assert.equal(o.data.total, dune.price * 2 + 300);
  assert.equal((await call('GET', `/books/${dune.id}`)).data.stock, dune.stock - 2);
  const pay = await call('POST', '/payments/mpesa/stk-push', { token: cust, body: { order_id: o.data.id, phone: '0725333939' } });
  assert.equal(pay.data.completed, true);
  assert.equal((await call('GET', `/orders/${o.data.id}`, { token: cust })).data.status, 'Processing');

  const mary = (await login('mary@example.com', 'Customer@123', 'customer')).data.access_token;
  assert.equal((await call('GET', `/orders/${o.data.id}`, { token: mary })).status, 404);

  const admin = (await login('admin@bookconnect.com', 'Admin@123', 'admin')).data.access_token;
  assert.equal((await call('GET', '/admin/stats', { token: cust })).status, 403);
  const agents = (await call('GET', '/admin/agents', { token: admin })).data;
  const as = await call('POST', `/admin/orders/${o.data.id}/assign`, { token: admin, body: { agent_id: agents[0].id } });
  assert.equal(as.data.status, 'Assigned');

  const agent = (await login('agent@bookconnect.com', 'Agent@123', 'agent')).data.access_token;
  const up = await call('PATCH', `/agent/orders/${o.data.id}/status`, { token: agent, body: { status: 'Out for Delivery', lat: -1.27, lng: 36.81 } });
  assert.equal(up.data.agent_lat, -1.27);
  const tr = (await call('GET', `/orders/${o.data.id}/tracking`, { token: cust })).data;
  assert.ok(tr.agent.name && tr.events.length >= 3);
  assert.equal((await call('PATCH', `/agent/orders/${o.data.id}/status`, { token: agent, body: { status: 'Delivered' } })).data.status, 'Delivered');
  assert.equal((await call('PATCH', `/agent/orders/${o.data.id}/status`, { token: agent, body: { status: 'Out for Delivery' } })).status, 400);

  // customer got order notifications; agent got assignment; admin got new-order
  const cn = (await call('GET', '/notifications', { token: cust })).data.notifications.map((n) => n.type);
  assert.ok(cn.includes('order_update'));
  assert.ok((await call('GET', '/notifications', { token: agent })).data.notifications.some((n) => n.type === 'assignment'));
  assert.ok((await call('GET', '/notifications', { token: admin })).data.notifications.some((n) => n.type === 'new_order'));
  const st = (await call('GET', '/admin/stats', { token: admin })).data;
  assert.ok(st.total_orders >= 5 && st.monthly_sales.length === 6);
});

test('reviews, wishlist, addresses, cancel', async () => {
  const cust = (await login('customer@bookconnect.com', 'Customer@123', 'customer')).data.access_token;
  const dune = (await call('GET', '/books?search=dune')).data[0];
  assert.equal((await call('POST', `/books/${dune.id}/reviews`, { token: cust, body: { rating: 5, text: 'Great' } })).status, 201);
  assert.ok((await call('GET', `/books/${dune.id}/reviews`)).data.total >= 1);
  assert.equal((await call('POST', `/me/wishlist/${dune.id}`, { token: cust })).status, 201);
  assert.equal((await call('GET', '/me/wishlist', { token: cust })).data.length, 1);
  assert.equal((await call('POST', '/me/addresses', { token: cust, body: { line: 'Kilimani Road', city: 'Nairobi' } })).status, 201);
  const o = await call('POST', '/orders', { token: cust, body: { items: [{ book_id: dune.id, quantity: 1 }], name: 'J', phone: '0725333939', address: 'x street', payment_method: 'cod' } });
  const stock = (await call('GET', `/books/${dune.id}`)).data.stock;
  assert.equal((await call('POST', `/orders/${o.data.id}/cancel`, { token: cust })).data.status, 'Cancelled');
  assert.equal((await call('GET', `/books/${dune.id}`)).data.stock, stock + 1);
});
