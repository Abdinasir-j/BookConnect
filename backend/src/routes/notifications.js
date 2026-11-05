const router = require('express').Router();
const { q, one, exec } = require('../db');
const { requireAuth } = require('../auth');
const { wrap, iso } = require('../util');

router.use(requireAuth);
const out = (n) => ({ id: n.id, type: n.type, title: n.title, message: n.message, link: n.link, is_read: !!n.is_read, created_at: iso(n.created_at) });

// list + unread count (the navbar bell polls this)
router.get('/', wrap(async (req, res) => {
  const rows = await q('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50', [req.user.id]);
  const { c } = await one('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id]);
  res.json({ unread: Number(c), notifications: rows.map(out) });
}));
router.post('/read-all', wrap(async (req, res) => { await exec('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]); res.json({ ok: true }); }));
router.post('/:id(\\d+)/read', wrap(async (req, res) => { await exec('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]); res.json({ ok: true }); }));
router.delete('/:id(\\d+)', wrap(async (req, res) => { await exec('DELETE FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]); res.json({ ok: true }); }));

module.exports = router;
