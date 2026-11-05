require('dotenv').config();

module.exports = {
  PORT: Number(process.env.PORT || 3000),
  DB: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bookconnect',
  },
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '12h',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost,http://localhost:5173,http://127.0.0.1:5173').split(',').map((s) => s.trim()).filter(Boolean),
  DELIVERY_FEE: Number(process.env.DELIVERY_FEE || 300),
  MPESA: {
    mode: process.env.MPESA_MODE || 'simulate',
    env: process.env.MPESA_ENV || 'sandbox',
    key: process.env.MPESA_CONSUMER_KEY || '',
    secret: process.env.MPESA_CONSUMER_SECRET || '',
    shortcode: process.env.MPESA_SHORTCODE || '174379',
    passkey: process.env.MPESA_PASSKEY || '',
    callback: process.env.MPESA_CALLBACK_URL || '',
  },
};
