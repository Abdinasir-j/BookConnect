const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('./config');
const { one } = require('./db');
const { HttpError, wrap } = require('./util');

const sign = (user) => jwt.sign({ sub: String(user.id), role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const requireAuth = wrap(async (req, _res, next) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) throw new HttpError(401, 'Not authenticated');
  let payload;
  try { payload = jwt.verify(h.slice(7), JWT_SECRET); } catch { throw new HttpError(401, 'Session expired, please log in again'); }
  const user = await one('SELECT * FROM users WHERE id = ?', [Number(payload.sub)]);
  if (!user || !user.is_active) throw new HttpError(401, 'Account not found or disabled');
  req.user = user;
  next();
});

// requireRole('admin')  → must be logged in AND have that role
const requireRole = (...roles) => [requireAuth, (req, _res, next) => {
  if (!roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have access to this resource'));
  next();
}];

module.exports = { sign, requireAuth, requireRole };
