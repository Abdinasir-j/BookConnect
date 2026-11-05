const router = require('express').Router();
const { q, one, exec } = require('../db');
const { requireRole } = require('../auth');
const { notifyRole } = require('../notify');
const { HttpError, wrap, str, int, num, bookRow, iso } = require('../util');

const CATEGORIES = ['Fiction', 'Academic', 'Business', 'Technology', "Children's", 'Religion'];
const SELECT = `SELECT b.*, (SELECT AVG(rating) FROM reviews r WHERE r.book_id = b.id) AS rating,
                (SELECT COUNT(*) FROM reviews r WHERE r.book_id = b.id) AS reviews FROM books b`;

function parseBook(body) {
  return {
    title: str(body.title, 'title', 1, 200), author: str(body.author, 'author', 1, 160), category: str(body.category, 'category', 1, 60),
    price: num(body.price, 'price', 0.01), stock: int(body.stock ?? 0, 'stock', 0), emoji: String(body.emoji || '📘').slice(0, 8),
    cover_url: body.cover_url || null, description: String(body.description || ''),
  };
}
const getBook = async (id) => { const b = await one(`${SELECT} WHERE b.id = ?`, [id]); if (!b) throw new HttpError(404, 'Book not found'); return bookRow(b); };

router.get('/categories', wrap(async (_req, res) => {
  const used = (await q('SELECT DISTINCT category FROM books')).map((r) => r.category);
  res.json([...new Set([...CATEGORIES, ...used])].sort());
}));

router.get('/', wrap(async (req, res) => {
  const { search, category } = req.query;
  const sort = ['popularity', 'low', 'high', 'newest'].includes(req.query.sort) ? req.query.sort : 'popularity';
  const where = [], params = [];
  if (search) { where.push('(LOWER(b.title) LIKE ? OR LOWER(b.author) LIKE ?)'); params.push(`%${String(search).toLowerCase()}%`, `%${String(search).toLowerCase()}%`); }
  if (category && category !== 'All Books') { where.push('b.category = ?'); params.push(category); }
  const order = { low: 'b.price ASC', high: 'b.price DESC', newest: 'b.id DESC', popularity: 'reviews DESC, rating DESC' }[sort];
  const rows = await q(`${SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order}`, params);
  res.json(rows.map(bookRow));
}));

router.get('/:id(\\d+)', wrap(async (req, res) => res.json(await getBook(req.params.id))));

router.get('/:id(\\d+)/reviews', wrap(async (req, res) => {
  await getBook(req.params.id);
  const rows = await q('SELECT r.*, u.name FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.book_id = ? ORDER BY r.id DESC', [req.params.id]);
  const total = rows.length;
  const distribution = {};
  for (const n of [5, 4, 3, 2, 1]) distribution[n] = total ? Math.round((100 * rows.filter((r) => r.rating === n).length) / total) : 0;
  res.json({ reviews: rows.map((r) => ({ id: r.id, name: r.name, rating: r.rating, text: r.text, created_at: iso(r.created_at) })), total, distribution });
}));

router.post('/:id(\\d+)/reviews', requireRole('customer'), wrap(async (req, res) => {
  await getBook(req.params.id);
  const rating = int(req.body.rating, 'rating', 1, 5);
  const text = str(req.body.text, 'text', 2, 1000);
  const r = await exec('INSERT INTO reviews (book_id, user_id, rating, text) VALUES (?,?,?,?)', [req.params.id, req.user.id, rating, text]);
  const row = await one('SELECT * FROM reviews WHERE id = ?', [r.insertId]);
  res.status(201).json({ id: row.id, name: req.user.name, rating, text, created_at: iso(row.created_at) });
}));

// ---------- admin ----------
router.post('/', requireRole('admin'), wrap(async (req, res) => {
  const b = parseBook(req.body);
  const r = await exec('INSERT INTO books (title,author,category,price,stock,emoji,cover_url,description) VALUES (?,?,?,?,?,?,?,?)',
    [b.title, b.author, b.category, b.price, b.stock, b.emoji, b.cover_url, b.description]);
  // 🔔 tell every customer about the new book
  await notifyRole('customer', 'new_book', 'New book added 📚', `"${b.title}" by ${b.author} is now available.`, `/book/${r.insertId}`);
  res.status(201).json(await getBook(r.insertId));
}));

router.put('/:id(\\d+)', requireRole('admin'), wrap(async (req, res) => {
  await getBook(req.params.id);
  const b = parseBook(req.body);
  await exec('UPDATE books SET title=?, author=?, category=?, price=?, stock=?, emoji=?, cover_url=?, description=? WHERE id=?',
    [b.title, b.author, b.category, b.price, b.stock, b.emoji, b.cover_url, b.description, req.params.id]);
  res.json(await getBook(req.params.id));
}));

router.patch('/:id(\\d+)/stock', requireRole('admin'), wrap(async (req, res) => {
  await getBook(req.params.id);
  await exec('UPDATE books SET stock = ? WHERE id = ?', [int(req.query.stock, 'stock', 0), req.params.id]);
  res.json(await getBook(req.params.id));
}));

router.delete('/:id(\\d+)', requireRole('admin'), wrap(async (req, res) => {
  await getBook(req.params.id);
  await exec('DELETE FROM books WHERE id = ?', [req.params.id]);
  res.status(204).end();
}));

module.exports = router;
