class HttpError extends Error {
  constructor(status, detail) { super(detail); this.status = status; this.detail = detail; }
}
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const norm = (p) => { if (!p) return null; const d = String(p).replace(/\D/g, ''); return d.length >= 9 ? d.slice(-9) : d || null; };
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ''));
const iso = (d) => (d ? new Date(d).toISOString() : null);

// tiny validators — throw 422 like the old API did
function need(cond, msg) { if (!cond) throw new HttpError(422, msg); }
const str = (v, name, min = 1, max = 255) => { const s = String(v ?? '').trim(); need(s.length >= min && s.length <= max, `${name}: must be ${min}-${max} characters`); return s; };
const int = (v, name, min = -Infinity, max = Infinity) => { const n = Number(v); need(Number.isInteger(n) && n >= min && n <= max, `${name}: invalid number`); return n; };
const num = (v, name, min = -Infinity) => { const n = Number(v); need(Number.isFinite(n) && n >= min, `${name}: invalid number`); return n; };

const userOut = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, is_active: !!u.is_active, created_at: iso(u.created_at) });
const bookRow = (b) => ({ id: b.id, title: b.title, author: b.author, category: b.category, price: b.price, stock: b.stock, emoji: b.emoji, cover_url: b.cover_url, description: b.description || '', rating: b.rating ? Math.round(b.rating * 10) / 10 : 0, reviews: Number(b.reviews || 0) });

module.exports = { HttpError, wrap, norm, isEmail, iso, need, str, int, num, userOut, bookRow };
