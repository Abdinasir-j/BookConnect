// Demo data. Runs automatically the first time (empty users table).
// Reset everything:  npm run seed
const bcrypt = require('bcryptjs');
const db = require('./db');
const { norm } = require('./util');
const { locate, STORE } = require('./geo');

const BOOKS = [
  ['Atomic Habits', 'James Clear', 'Business', 1499, 50, '📘', 'An easy and proven way to build good habits and break bad ones. Practical strategies that show how tiny changes deliver remarkable results.'],
  ['Clean Code', 'Robert C. Martin', 'Technology', 2499, 8, '📗', 'A handbook of agile software craftsmanship. Learn to write readable, maintainable code that survives change.'],
  ['Dune', 'Frank Herbert', 'Fiction', 1899, 5, '📙', 'The epic science-fiction saga of Paul Atreides on the desert planet Arrakis.'],
  ['Think Like a Monk', 'Jay Shetty', 'Religion', 1399, 12, '📕', 'Train your mind for peace and purpose every day, drawing on lessons from monastic life.'],
  ['The Psychology of Money', 'Morgan Housel', 'Business', 1599, 22, '📒', 'Timeless lessons on wealth, greed and happiness told through short, engaging stories.'],
  ['Sapiens', 'Yuval Noah Harari', 'Academic', 1799, 12, '📓', 'A brief history of humankind, from the Stone Age to the present day.'],
  ['The Gruffalo', 'Julia Donaldson', "Children's", 899, 30, '📔', 'A clever mouse invents a fearsome monster, then meets him. A beloved read-aloud for kids.'],
  ['Introduction to Algorithms', 'Thomas H. Cormen', 'Academic', 5200, 6, '📚', 'The standard university textbook on algorithms and data structures.'],
  ['Things Fall Apart', 'Chinua Achebe', 'Fiction', 1200, 25, '📖', 'A classic African novel about the clash between tradition and colonial change.'],
];
const USERS = [
  ['Admin User', 'admin@bookconnect.com', '0700000001', 'Admin@123', 'admin'],
  ['John Kamau', 'agent@bookconnect.com', '0712345678', 'Agent@123', 'agent'],
  ['Peter Ochieng', 'agent2@bookconnect.com', '0723456789', 'Agent@123', 'agent'],
  ['Jane Wanjiru', 'customer@bookconnect.com', '0725333939', 'Customer@123', 'customer'],
  ['Mary Wanjiku', 'mary@example.com', '0734567890', 'Customer@123', 'customer'],
];

async function seed() {
  const U = {};
  for (const [name, email, phone, pw, role] of USERS) {
    const r = await db.exec('INSERT INTO users (name,email,phone,phone_norm,password_hash,role) VALUES (?,?,?,?,?,?)', [name, email, phone, norm(phone), bcrypt.hashSync(pw, 10), role]);
    U[email] = { id: r.insertId, name, phone };
  }
  const B = [];
  for (const [title, author, category, price, stock, emoji, description] of BOOKS) {
    const r = await db.exec('INSERT INTO books (title,author,category,price,stock,emoji,description) VALUES (?,?,?,?,?,?,?)', [title, author, category, price, stock, emoji, description]);
    B.push({ id: r.insertId, title, price });
  }
  const cust = U['customer@bookconnect.com'], mary = U['mary@example.com'], agent = U['agent@bookconnect.com'];
  await db.exec('INSERT INTO addresses (user_id, line, city) VALUES (?,?,?)', [cust.id, 'Westlands, Nairobi', 'Nairobi']);
  for (const [bi, u, rating, text] of [[0, cust, 5, 'Great book! Easy to read and very practical.'], [0, mary, 4, 'Solid advice on habit stacking.'], [1, mary, 5, 'Every developer should read this.'], [2, cust, 4, 'Dense world building but rewarding.'], [4, mary, 5, 'Changed how I think about money.'], [5, cust, 5, 'Fascinating from start to finish.']]) {
    await db.exec('INSERT INTO reviews (book_id,user_id,rating,text) VALUES (?,?,?,?)', [B[bi].id, u.id, rating, text]);
  }

  const FLOW = ['Pending', 'Processing', 'Assigned', 'Picked Up', 'Out for Delivery', 'Delivered'];
  async function order(customer, lines, status, method, agentUser, address = 'Westlands, Nairobi') {
    const subtotal = lines.reduce((s, [i, qn]) => s + B[i].price * qn, 0);
    const [lat, lng] = locate(address, 'Nairobi');
    const out = status === 'Out for Delivery';
    const r = await db.exec(`INSERT INTO orders (code,customer_id,agent_id,status,subtotal,delivery_fee,total,payment_method,payment_status,ship_name,ship_phone,ship_address,ship_city,dest_lat,dest_lng,agent_lat,agent_lng,delivered_at)
      VALUES ('TMP',?,?,?,?,300,?,?,?,?,?,?,'Nairobi',?,?,?,?,?)`,
      [customer.id, agentUser ? agentUser.id : null, status, subtotal, subtotal + 300, method, method === 'cod' ? 'Pay on delivery' : 'Paid', customer.name, customer.phone, address, lat, lng, out ? STORE[0] : null, out ? STORE[1] : null, status === 'Delivered' ? new Date() : null]);
    await db.exec('UPDATE orders SET code = ? WHERE id = ?', [`BK-${1000 + r.insertId}`, r.insertId]);
    for (const [i, qn] of lines) await db.exec('INSERT INTO order_items (order_id,book_id,title,price,quantity) VALUES (?,?,?,?,?)', [r.insertId, B[i].id, B[i].title, B[i].price, qn]);
    await db.exec('INSERT INTO payments (order_id,method,amount,status,reference,phone) VALUES (?,?,?,?,?,?)', [r.insertId, method, subtotal + 300, method === 'cod' ? 'Pending' : 'Completed', 'SEED', customer.phone]);
    const steps = FLOW.includes(status) ? FLOW.slice(0, FLOW.indexOf(status) + 1) : ['Pending'];
    for (const s of steps) await db.exec('INSERT INTO tracking_events (order_id,status) VALUES (?,?)', [r.insertId, s]);
  }
  await order(cust, [[0, 1], [2, 1]], 'Out for Delivery', 'mpesa', agent);
  await order(mary, [[1, 1]], 'Assigned', 'mpesa', agent, 'Kilimani, Nairobi');
  await order(cust, [[5, 1]], 'Delivered', 'mpesa', agent);
  await order(mary, [[6, 2], [8, 1]], 'Processing', 'cod', null, 'Kasarani, Nairobi');

  await db.exec('INSERT INTO notifications (user_id,type,title,message,link) VALUES (?,?,?,?,?)', [cust.id, 'new_book', 'Welcome to BookConnect 📚', 'You will be notified here whenever new books are added.', '/catalog']);
}

async function seedIfEmpty() {
  const { c } = await db.one('SELECT COUNT(*) AS c FROM users');
  if (c === 0) {
    await seed();
    console.log('✓ Demo data created. Logins: admin@bookconnect.com / Admin@123, agent@bookconnect.com / Agent@123, customer@bookconnect.com / Customer@123');
  }
}

module.exports = { seed, seedIfEmpty };

if (require.main === module) {
  (async () => {
    await db.init();
    if (process.argv.includes('--reset')) {
      await db.exec('SET FOREIGN_KEY_CHECKS = 0');
      for (const t of ['notifications', 'tracking_events', 'payments', 'order_items', 'orders', 'wishlist', 'addresses', 'reviews', 'books', 'users']) await db.exec(`TRUNCATE TABLE ${t}`);
      await db.exec('SET FOREIGN_KEY_CHECKS = 1');
    }
    await seedIfEmpty();
    process.exit(0);
  })().catch((e) => { console.error(e); process.exit(1); });
}
