import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ksh, api } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useFetch } from '../../useFetch';
import { Trash2, ShoppingBag } from 'lucide-react';

export const ShoppingCartView = ({ cartItems, updateQuantity, removeFromCart }) => {
  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const delivery = cartItems.length > 0 ? 300 : 0;
  const total = subtotal + delivery;

  return (
    <div className="page-container">
      <h2>Your Shopping Cart ({cartItems.reduce((acc, item) => acc + item.quantity, 0)} items)</h2>
      <div className="cart-layout">
        <div className="card-box cart-items-list">
          {cartItems.length === 0 ? (
            <div style={{textAlign:'center', padding:'40px'}}>
              <ShoppingBag size={40} color="var(--text-secondary)" />
              <p>Your cart is empty.</p>
              <Link to="/catalog" className="btn-primary" style={{display:'inline-block', marginTop:'10px', textDecoration:'none'}}>Browse Books</Link>
            </div>
          ) : (
            cartItems.map((item, index) => (
              <div key={index} className="cart-item-row">
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                  <span style={{fontSize:'24px'}}>{item.emoji || '📖'}</span>
                  <div>
                    <h4 style={{margin:0, fontSize:'14px', color:'var(--text-primary)'}}>{item.title}</h4>
                    <p style={{margin:0, fontSize:'12px', color:'var(--text-secondary)'}}>By {item.author || 'Author'}</p>
                  </div>
                </div>

                <div className="qty-box" style={{display:'flex', alignItems:'center', gap:'15px'}}>
                  {/* Quantity Spinner with up/down controls */}
                  <div style={{display:'flex', alignItems:'center', border:'1px solid var(--border-color)', borderRadius:'4px', overflow:'hidden'}}>
                    <button 
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                      style={{background:'var(--bg-color)', border:'none', padding:'4px 8px', cursor:'pointer', color:'var(--text-primary)', fontWeight:'bold'}}
                    >-</button>
                    <span style={{padding:'0 10px', fontSize:'13px', fontWeight:'600'}}>{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      style={{background:'var(--bg-color)', border:'none', padding:'4px 8px', cursor:'pointer', color:'var(--text-primary)', fontWeight:'bold'}}
                    >+</button>
                  </div>

                  <span style={{fontWeight:'700', fontSize:'14px', width:'60px', textAlign:'right'}}>
                    {ksh(item.price * item.quantity)}
                  </span>

                  <button 
                    onClick={() => removeFromCart(index)} 
                    style={{background:'transparent', border:'none', cursor:'pointer', padding:'6px'}}
                    title="Remove item"
                  >
                    <Trash2 size={18} color="#ef4444" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="card-box order-summary">
            <h4>Order Summary</h4>
            <div className="summary-line"><span>Subtotal</span><span>{ksh(subtotal)}</span></div>
            <div className="summary-line"><span>Delivery Fee</span><span>{ksh(delivery)}</span></div>
            <hr className="divider" />
            <div className="summary-line total"><span>Total</span><span>{ksh(total)}</span></div>
            
            <Link to="/checkout" className="btn-primary full-btn text-center" style={{display:'block', textDecoration:'none', marginTop:'20px'}}>
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export const CheckoutView = ({ cartItems, clearCart }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [method, setMethod] = useState('mpesa');
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', address: '', city: 'Nairobi' });
  const [mpesaPhone, setMpesaPhone] = useState(user?.phone || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const saved = useFetch('/me/addresses');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const subtotal = cartItems.reduce((a, i) => a + i.price * i.quantity, 0);
  const delivery = cartItems.length ? 300 : 0;
  const total = subtotal + delivery;

  const pay = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const order = await api('/orders', { method: 'POST', body: {
        items: cartItems.map((i) => ({ book_id: i.id, quantity: i.quantity })),
        name: form.name, phone: form.phone, address: form.address, city: form.city, payment_method: method,
      } });
      if (method === 'mpesa') {
        try { await api('/payments/mpesa/stk-push', { method: 'POST', body: { order_id: order.id, phone: mpesaPhone || form.phone } }); }
        catch (er) { setError(`Order ${order.code} was created but M-Pesa failed: ${er.message}. You can pay later from My Orders.`); clearCart(); setBusy(false); return; }
      }
      clearCart();
      navigate('/confirmation', { state: { order }, replace: true });
    } catch (er) { setError(er.message); setBusy(false); }
  };

  if (cartItems.length === 0) {
    return (
      <div className="page-container" style={{ textAlign: 'center' }}>
        <h2>Checkout</h2>
        <p>Your cart is empty.</p>
        <Link to="/catalog" className="btn-primary" style={{ textDecoration: 'none' }}>Browse Books</Link>
      </div>
    );
  }

  const methods = [
    { id: 'mpesa', label: 'M-Pesa', hint: 'An STK push is sent to your phone.' },
    { id: 'card', label: 'Card Payment', hint: 'Visa / Mastercard (demo: approved instantly)' },
    { id: 'cod', label: 'Cash on Delivery', hint: 'Pay the agent when your books arrive.' },
  ];

  return (
    <form className="page-container" onSubmit={pay}>
      <h2>Checkout</h2>
      {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 6, marginBottom: 14, fontSize: 13 }}>{error}</div>}
      <div className="cart-layout">
        <div>
          <div className="card-box" style={{ marginBottom: 20 }}>
            <h4>1. Shipping Address</h4>
            {(saved.data || []).length > 0 && (
              <select className="sort-select" style={{ marginBottom: 12, width: '100%' }} defaultValue="" onChange={(e) => { const a = saved.data.find((x) => String(x.id) === e.target.value); if (a) setForm({ ...form, address: a.line, city: a.city }); }}>
                <option value="">Use a saved address…</option>
                {saved.data.map((a) => <option key={a.id} value={a.id}>{a.line}</option>)}
              </select>
            )}
            <div className="auth-form">
              <input value={form.name} onChange={set('name')} placeholder="Full name" required />
              <input value={form.phone} onChange={set('phone')} placeholder="Phone (07xx...)" required />
              <input value={form.address} onChange={set('address')} placeholder="Estate / street (e.g. Westlands)" required />
              <input value={form.city} onChange={set('city')} placeholder="City" required />
            </div>
          </div>
          <div className="card-box">
            <h4>2. Payment Method</h4>
            {methods.map((m) => (
              <label key={m.id} className={`pay-option ${method === m.id ? 'selected' : ''}`}>
                <input type="radio" name="pay" checked={method === m.id} onChange={() => setMethod(m.id)} />
                <span><strong>{m.label}</strong><br /><small style={{ color: 'var(--text-secondary)' }}>{m.hint}</small></span>
              </label>
            ))}
            {method === 'mpesa' && (
              <div className="auth-form"><input value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} placeholder="M-Pesa phone number" required /></div>
            )}
            {method === 'card' && (
              <div className="auth-form">
                <input placeholder="Card number" required />
                <div style={{ display: 'flex', gap: 10 }}><input placeholder="MM/YY" required /><input placeholder="CVV" required /></div>
                <small style={{ color: 'var(--text-secondary)' }}>Demo only — card details are not sent or stored.</small>
              </div>
            )}
          </div>
        </div>

        <div className="card-box order-summary" style={{ alignSelf: 'start' }}>
          <h4>Order Summary</h4>
          {cartItems.map((i) => (
            <div key={i.id} className="summary-line"><span>{i.emoji} {i.title} × {i.quantity}</span><span>{ksh(i.price * i.quantity)}</span></div>
          ))}
          <hr className="divider" />
          <div className="summary-line"><span>Subtotal</span><span>{ksh(subtotal)}</span></div>
          <div className="summary-line"><span>Delivery</span><span>{ksh(delivery)}</span></div>
          <div className="summary-line total"><span>Total</span><span>{ksh(total)}</span></div>
          <button type="submit" className="btn-primary full-btn" style={{ marginTop: 16 }} disabled={busy}>
            {busy ? 'Processing…' : method === 'mpesa' ? 'Pay with M-Pesa' : method === 'card' ? 'Pay with Card' : 'Place Order'}
          </button>
          <Link to="/cart" style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--primary)' }}>Back to cart</Link>
        </div>
      </div>
    </form>
  );
};
