const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { one, exec } = require('../db');
const { sign, requireAuth } = require('../auth');
const { HttpError, wrap, norm, isEmail, str, need, userOut } = require('../util');

const ROLE_NAMES = { customer: 'customer', admin: 'admin', agent: 'delivery agent' };

router.post('/register', wrap(async (req, res) => {
  const name = str(req.body.name, 'name', 2, 120);
  const email = str(req.body.email, 'email', 3, 160).toLowerCase();
  need(isEmail(email), 'email: invalid email address');
  const phone = str(req.body.phone, 'phone', 9, 20);
  const password = str(req.body.password, 'password', 6, 72);
  if (await one('SELECT id FROM users WHERE email = ?', [email])) throw new HttpError(409, 'An account with this email already exists');
  const pn = norm(phone);
  if (pn && (await one('SELECT id FROM users WHERE phone_norm = ?', [pn]))) throw new HttpError(409, 'An account with this phone number already exists');
  // public sign-up always creates a CUSTOMER; admins/agents are created by seed/admin only
  const r = await exec('INSERT INTO users (name,email,phone,phone_norm,password_hash,role) VALUES (?,?,?,?,?,?)', [name, email, phone, pn, bcrypt.hashSync(password, 10), 'customer']);
  const user = await one('SELECT * FROM users WHERE id = ?', [r.insertId]);
  res.status(201).json({ access_token: sign(user), token_type: 'bearer', user: userOut(user) });
}));

// Login: the user chooses a role (customer | agent | admin) and must match the account's role
router.post('/login', wrap(async (req, res) => {
  const ident = String(req.body.identifier || '').trim();
  const password = String(req.body.password || '');
  const role = req.body.role || req.body.portal || null;
  need(ident && password, 'Enter your email/phone and password');
  need(!role || ROLE_NAMES[role], 'role: must be customer, agent or admin');

  let user = await one('SELECT * FROM users WHERE email = ?', [ident.toLowerCase()]);
  if (!user && !ident.includes('@')) { const pn = norm(ident); if (pn) user = await one('SELECT * FROM users WHERE phone_norm = ?', [pn]); }
  if (!user || !bcrypt.compareSync(password.slice(0, 72), user.password_hash)) throw new HttpError(401, 'Incorrect email/phone or password');
  if (!user.is_active) throw new HttpError(403, 'This account has been disabled');
  if (role && user.role !== role) throw new HttpError(403, `This account is not a ${ROLE_NAMES[role]} account. Choose "${ROLE_NAMES[user.role]}" as your role and try again.`);
  res.json({ access_token: sign(user), token_type: 'bearer', user: userOut(user) });
}));

router.get('/me', requireAuth, (req, res) => res.json(userOut(req.user)));

router.put('/me', requireAuth, wrap(async (req, res) => {
  const u = req.user;
  let { name, email, phone } = req.body;
  if (email && email.toLowerCase() !== u.email) {
    need(isEmail(email), 'email: invalid email address');
    if (await one('SELECT id FROM users WHERE email = ? AND id <> ?', [email.toLowerCase(), u.id])) throw new HttpError(409, 'Email already in use');
    await exec('UPDATE users SET email = ? WHERE id = ?', [email.toLowerCase(), u.id]);
  }
  if (name) await exec('UPDATE users SET name = ? WHERE id = ?', [str(name, 'name', 2, 120), u.id]);
  if (phone !== undefined) await exec('UPDATE users SET phone = ?, phone_norm = ? WHERE id = ?', [phone, norm(phone), u.id]);
  res.json(userOut(await one('SELECT * FROM users WHERE id = ?', [u.id])));
}));

router.post('/change-password', requireAuth, wrap(async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!bcrypt.compareSync(String(current_password || ''), req.user.password_hash)) throw new HttpError(400, 'Current password is incorrect');
  await exec('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(str(new_password, 'new_password', 6, 72), 10), req.user.id]);
  res.json({ ok: true });
}));

module.exports = router;
