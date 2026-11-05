const { q, exec } = require('./db');

// Notify one user
async function notifyUser(userId, type, title, message, link = null, conn) {
  await exec('INSERT INTO notifications (user_id, type, title, message, link) VALUES (?,?,?,?,?)', [userId, type, title, message, link], conn);
}

// Notify every active user with a role (e.g. all customers when a book is added)
async function notifyRole(role, type, title, message, link = null, conn) {
  await exec(
    `INSERT INTO notifications (user_id, type, title, message, link)
     SELECT id, ?, ?, ?, ? FROM users WHERE role = ? AND is_active = 1`,
    [type, title, message, link, role], conn);
}

module.exports = { notifyUser, notifyRole };
