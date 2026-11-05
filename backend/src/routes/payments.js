const router = require('express').Router();
const { one, exec } = require('../db');
const { requireRole } = require('../auth');
const { addEvent } = require('../orders');
const { stkPush } = require('../mpesa');
const { HttpError, wrap, int, str } = require('../util');

async function markPaid(pay, reference) {
  await exec("UPDATE payments SET status='Completed', reference=? WHERE id=?", [reference, pay.id]);
  await exec("UPDATE orders SET payment_status='Paid' WHERE id=?", [pay.order_id]);
  const o = await one('SELECT status FROM orders WHERE id=?', [pay.order_id]);
  if (o.status === 'Pending') {
    await exec("UPDATE orders SET status='Processing' WHERE id=?", [pay.order_id]);
    await addEvent(pay.order_id, 'Processing', 'M-Pesa payment confirmed');
  }
}

router.post('/mpesa/stk-push', requireRole('customer'), wrap(async (req, res) => {
  const orderId = int(req.body.order_id, 'order_id', 1), phone = str(req.body.phone, 'phone', 5, 30);
  const order = await one('SELECT * FROM orders WHERE id = ? AND customer_id = ?', [orderId, req.user.id]);
  if (!order) throw new HttpError(404, 'Order not found');
  if (order.payment_status === 'Paid') return res.json({ ok: true, completed: true, message: 'Order already paid' });
  const pay = await one("SELECT * FROM payments WHERE order_id = ? AND method = 'mpesa'", [order.id]);
  if (!pay) throw new HttpError(400, 'This order was not placed with M-Pesa');
  let r;
  try { r = await stkPush(phone, order.total, order.code); } catch (e) { throw new HttpError(502, `M-Pesa request failed: ${e.message}`); }
  await exec('UPDATE payments SET phone = ?, checkout_request_id = ? WHERE id = ?', [phone, r.checkoutRequestId || null, pay.id]);
  if (r.ok && r.completed) await markPaid(pay, r.reference);
  else if (!r.ok) await exec("UPDATE payments SET status='Failed' WHERE id=?", [pay.id]);
  if (!r.ok) throw new HttpError(400, r.message);
  res.json({ ok: true, completed: r.completed, message: r.message });
}));

// Safaricom calls this with the payment result (live mode)
router.post('/mpesa/callback', wrap(async (req, res) => {
  const cb = req.body?.Body?.stkCallback || {};
  const pay = await one('SELECT * FROM payments WHERE checkout_request_id = ?', [cb.CheckoutRequestID]);
  if (pay) {
    if (cb.ResultCode === 0) {
      const items = Object.fromEntries((cb.CallbackMetadata?.Item || []).map((i) => [i.Name, i.Value]));
      await markPaid(pay, String(items.MpesaReceiptNumber));
    } else await exec("UPDATE payments SET status='Failed' WHERE id=?", [pay.id]);
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}));

module.exports = router;
