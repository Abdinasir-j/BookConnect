const router = require('express').Router();
const { q, one, exec } = require('../db');
const { requireRole } = require('../auth');
const { hydrate, hydrateOne, addEvent } = require('../orders');
const { notifyUser, notifyRole } = require('../notify');
const { HttpError, wrap } = require('../util');

const ACTIVE = ['Assigned', 'Picked Up', 'Out for Delivery'];
const AGENT_STATUSES = ['Picked Up', 'Out for Delivery', 'Delivered'];
router.use(requireRole('agent'));

router.get('/orders', wrap(async (req, res) => res.json(await hydrate(await q('SELECT * FROM orders WHERE agent_id = ? AND status IN (?) ORDER BY id DESC', [req.user.id, ACTIVE])))));
router.get('/history', wrap(async (req, res) => res.json(await hydrate(await q("SELECT * FROM orders WHERE agent_id = ? AND status = 'Delivered' ORDER BY delivered_at DESC", [req.user.id])))));
router.get('/stats', wrap(async (req, res) => {
  const rows = await q('SELECT status FROM orders WHERE agent_id = ?', [req.user.id]);
  res.json({
    total_assigned: rows.length,
    in_progress: rows.filter((o) => ['Picked Up', 'Out for Delivery'].includes(o.status)).length,
    delivered: rows.filter((o) => o.status === 'Delivered').length,
    pending_pickup: rows.filter((o) => o.status === 'Assigned').length,
  });
}));

const mine = async (req) => {
  const o = await one('SELECT * FROM orders WHERE id = ? AND agent_id = ?', [req.params.id, req.user.id]);
  if (!o) throw new HttpError(404, 'Order not found');
  return o;
};
router.get('/orders/:id', wrap(async (req, res) => res.json(await hydrateOne(await mine(req)))));

router.patch('/orders/:id/status', wrap(async (req, res) => {
  const o = await mine(req);
  const { status, note, lat, lng } = req.body;
  if (['Delivered', 'Cancelled'].includes(o.status)) throw new HttpError(400, `Order is already ${o.status.toLowerCase()}`);
  if (status !== o.status && !AGENT_STATUSES.includes(status)) throw new HttpError(400, `Status must be one of: ${AGENT_STATUSES.join(', ')}`);
  if (typeof lat === 'number' && typeof lng === 'number') await exec('UPDATE orders SET agent_lat = ?, agent_lng = ? WHERE id = ?', [lat, lng, o.id]);
  if (status !== o.status) {
    await exec('UPDATE orders SET status = ? WHERE id = ?', [status, o.id]);
    if (status === 'Delivered') {
      await exec('UPDATE orders SET delivered_at = NOW() WHERE id = ?', [o.id]);
      if (o.payment_method === 'cod') { await exec("UPDATE orders SET payment_status='Paid' WHERE id=?", [o.id]); await exec("UPDATE payments SET status='Completed' WHERE order_id=?", [o.id]); }
    }
    await addEvent(o.id, status, note || `Updated by ${req.user.name}`);
    await notifyUser(o.customer_id, 'order_update', `Order ${o.code}: ${status}`, status === 'Delivered' ? 'Your books have been delivered. Enjoy your read!' : `Your order is now "${status}".`, `/tracking?order=${o.id}`);
    if (status === 'Delivered') await notifyRole('admin', 'delivered', `Order ${o.code} delivered`, `Delivered by ${req.user.name}.`, '/admin/delivery');
  }
  res.json(await hydrateOne(await one('SELECT * FROM orders WHERE id = ?', [o.id])));
}));

module.exports = router;
