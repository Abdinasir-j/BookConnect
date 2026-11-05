const router = require('express').Router();
const { q, one, exec } = require('../db');
const { requireAuth } = require('../auth');
const { HttpError, wrap, str, bookRow } = require('../util');

router.use(requireAuth);

router.get('/wishlist', wrap(async (req, res) => {
  const rows = await q(`SELECT b.*, (SELECT AVG(rating) FROM reviews r WHERE r.book_id=b.id) AS rating,
    (SELECT COUNT(*) FROM reviews r WHERE r.book_id=b.id) AS reviews
    FROM wishlist w JOIN books b ON b.id = w.book_id WHERE w.user_id = ?`, [req.user.id]);
  res.json(rows.map(bookRow));
}));
router.post('/wishlist/:bookId', wrap(async (req, res) => {
  if (!(await one('SELECT id FROM books WHERE id = ?', [req.params.bookId]))) throw new HttpError(404, 'Book not found');
  await exec('INSERT IGNORE INTO wishlist (user_id, book_id) VALUES (?,?)', [req.user.id, req.params.bookId]);
  res.status(201).json({ ok: true });
}));
router.delete('/wishlist/:bookId', wrap(async (req, res) => {
  await exec('DELETE FROM wishlist WHERE user_id = ? AND book_id = ?', [req.user.id, req.params.bookId]);
  res.json({ ok: true });
}));

router.get('/addresses', wrap(async (req, res) => res.json(await q('SELECT id, line, city FROM addresses WHERE user_id = ?', [req.user.id]))));
router.post('/addresses', wrap(async (req, res) => {
  const line = str(req.body.line, 'line', 3, 200);
  const city = String(req.body.city || 'Nairobi').slice(0, 80);
  const r = await exec('INSERT INTO addresses (user_id, line, city) VALUES (?,?,?)', [req.user.id, line, city]);
  res.status(201).json({ id: r.insertId, line, city });
}));
router.delete('/addresses/:id', wrap(async (req, res) => {
  const r = await exec('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Address not found');
  res.json({ ok: true });
}));

module.exports = router;
