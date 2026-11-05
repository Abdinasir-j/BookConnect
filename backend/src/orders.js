const { q, exec } = require('./db');
const { iso } = require('./util');

// Turn order rows into the JSON the frontend expects (items, agent, customer, optional timeline)
async function hydrate(orders, { events = false } = {}) {
  if (!orders.length) return [];
  const ids = orders.map((o) => o.id);
  const items = await q('SELECT * FROM order_items WHERE order_id IN (?)', [ids]);
  const userIds = [...new Set(orders.flatMap((o) => [o.customer_id, o.agent_id]).filter(Boolean))];
  const users = Object.fromEntries((await q('SELECT id, name, email, phone FROM users WHERE id IN (?)', [userIds])).map((u) => [u.id, u]));
  const evs = events ? await q('SELECT * FROM tracking_events WHERE order_id IN (?) ORDER BY id', [ids]) : [];
  return orders.map((o) => {
    const out = {
      id: o.id, code: o.code, status: o.status, subtotal: o.subtotal, delivery_fee: o.delivery_fee, total: o.total,
      payment_method: o.payment_method, payment_status: o.payment_status,
      ship_name: o.ship_name, ship_phone: o.ship_phone, ship_address: o.ship_address, ship_city: o.ship_city,
      dest_lat: o.dest_lat, dest_lng: o.dest_lng, agent_lat: o.agent_lat, agent_lng: o.agent_lng,
      created_at: iso(o.created_at), delivered_at: iso(o.delivered_at),
      items: items.filter((i) => i.order_id === o.id).map((i) => ({ book_id: i.book_id, title: i.title, price: i.price, quantity: i.quantity })),
      agent: o.agent_id && users[o.agent_id] ? { id: o.agent_id, name: users[o.agent_id].name, phone: users[o.agent_id].phone } : null,
      customer_name: users[o.customer_id]?.name || null, customer_email: users[o.customer_id]?.email || null,
    };
    if (events) out.events = evs.filter((e) => e.order_id === o.id).map((e) => ({ status: e.status, note: e.note, created_at: iso(e.created_at) }));
    return out;
  });
}
const hydrateOne = async (o, opts) => (await hydrate([o], opts))[0];

const addEvent = (orderId, status, note = null, conn) => exec('INSERT INTO tracking_events (order_id, status, note) VALUES (?,?,?)', [orderId, status, note], conn);

module.exports = { hydrate, hydrateOne, addEvent };
