const express = require('express');
const cors = require('cors');
const { CORS_ORIGINS } = require('./config');

const app = express();
app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/me', require('./routes/me'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/agent', require('./routes/agent'));
app.use('/api/notifications', require('./routes/notifications'));

app.use('/api', (_req, res) => res.status(404).json({ detail: 'Not found' }));

// every error becomes { detail: "message" }
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ detail: 'Invalid JSON' });
  if (err.status) return res.status(err.status).json({ detail: err.detail });
  console.error(err);
  res.status(500).json({ detail: 'Server error. Check the backend console.' });
});

module.exports = app;
