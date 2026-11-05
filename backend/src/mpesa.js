// M-Pesa STK Push.
// MPESA_MODE=simulate -> instantly "succeeds" (demos).  MPESA_MODE=live -> Safaricom Daraja.
// The live branch follows the Daraja docs but must be tested with your own sandbox keys.
const crypto = require('crypto');
const { MPESA } = require('./config');

const base = () => (MPESA.env === 'sandbox' ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke');
function msisdn(phone) {
  let d = String(phone).replace(/\D/g, '');
  if (d.startsWith('0')) d = '254' + d.slice(1);
  else if (d.startsWith('7') || d.startsWith('1')) d = '254' + d;
  return d;
}

async function stkPush(phone, amount, accountRef) {
  if (MPESA.mode !== 'live') {
    return { ok: true, checkoutRequestId: 'sim-' + crypto.randomBytes(6).toString('hex'), completed: true, reference: 'SIM' + crypto.randomBytes(4).toString('hex').toUpperCase(), message: 'Simulated M-Pesa payment completed' };
  }
  const basic = Buffer.from(`${MPESA.key}:${MPESA.secret}`).toString('base64');
  const tokRes = await fetch(`${base()}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${basic}` } });
  if (!tokRes.ok) throw new Error('Could not get M-Pesa access token');
  const { access_token } = await tokRes.json();
  const d = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
  const password = Buffer.from(`${MPESA.shortcode}${MPESA.passkey}${ts}`).toString('base64');
  const num = msisdn(phone);
  const res = await fetch(`${base()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST', headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ BusinessShortCode: MPESA.shortcode, Password: password, Timestamp: ts, TransactionType: 'CustomerPayBillOnline', Amount: Math.round(amount), PartyA: num, PartyB: MPESA.shortcode, PhoneNumber: num, CallBackURL: MPESA.callback, AccountReference: accountRef, TransactionDesc: 'BookConnect order' }),
  });
  const data = await res.json();
  const ok = res.ok && data.ResponseCode === '0';
  return { ok, checkoutRequestId: data.CheckoutRequestID, completed: false, reference: null, message: data.CustomerMessage || data.errorMessage || 'STK push failed' };
}

module.exports = { stkPush };
