import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Heart, MapPin, Settings, LogOut, Eye, Star } from 'lucide-react';
import { api, ksh, fmtDate } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useFetch, Loading } from '../../useFetch';

const statusClass = (s) => (['Delivered'].includes(s) ? 'delivered' : ['Out for Delivery', 'Picked Up'].includes(s) ? 'shipped' : s === 'Cancelled' ? 'low' : 'processing');
const FILTERS = { All: null, Processing: ['Pending', 'Processing', 'Assigned'], Shipped: ['Picked Up', 'Out for Delivery'], Delivered: ['Delivered'] };

const CustomerDashboard = ({ initialTab = 'orders', wishlist = [], toggleWishlist }) => {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [filter, setFilter] = useState('All');
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({ name: user.name, email: user.email, phone: user.phone || '' });
  const [pw, setPw] = useState({ current_password: '', new_password: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [newAddr, setNewAddr] = useState('');

  const orders = useFetch('/orders/mine');
  const wished = useFetch('/me/wishlist', [wishlist.length]);
  const addrs = useFetch('/me/addresses');

  const menu = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'orders', label: 'My Orders', icon: <ShoppingBag size={18} /> },
    { id: 'wishlist', label: 'Wishlist', icon: <Heart size={18} /> },
    { id: 'reviews', label: 'Reviews', icon: <Star size={18} /> },
    { id: 'addresses', label: 'Addresses', icon: <MapPin size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];
  const item = (active) => ({ padding: '10px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 6, marginTop: 5, fontWeight: 500, fontSize: 14, color: active ? '#fff' : 'var(--text-secondary)', background: active ? 'var(--primary)' : 'transparent' });
  const notify = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 4000); };

  const shown = (orders.data || []).filter((o) => !FILTERS[filter] || FILTERS[filter].includes(o.status));
  const set = (k) => (e) => setProfile({ ...profile, [k]: e.target.value });

  const saveProfile = async (e) => {
    e.preventDefault();
    try { setUser(await api('/auth/me', { method: 'PUT', body: profile })); setEditing(false); notify('ok', 'Profile updated'); }
    catch (er) { notify('err', er.message); }
  };
  const changePw = async (e) => {
    e.preventDefault();
    try { await api('/auth/change-password', { method: 'POST', body: pw }); setPw({ current_password: '', new_password: '' }); notify('ok', 'Password changed'); }
    catch (er) { notify('err', er.message); }
  };
  const addAddr = async (e) => {
    e.preventDefault();
    if (!newAddr.trim()) return;
    try { await api('/me/addresses', { method: 'POST', body: { line: newAddr, city: 'Nairobi' } }); setNewAddr(''); addrs.reload(); }
    catch (er) { notify('err', er.message); }
  };
  const delAddr = async (id) => { await api(`/me/addresses/${id}`, { method: 'DELETE' }); addrs.reload(); };
  const cancel = async (id) => {
    if (!window.confirm('Cancel this order?')) return;
    try { await api(`/orders/${id}/cancel`, { method: 'POST' }); orders.reload(); } catch (er) { notify('err', er.message); }
  };
  const doLogout = () => { logout(); navigate('/', { replace: true }); };

  const delivered = (orders.data || []).filter((o) => o.status === 'Delivered');
  const reviewable = [...new Map(delivered.flatMap((o) => o.items).filter((i) => i.book_id).map((i) => [i.book_id, i])).values()];

  return (
    <div className="page-container" style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 30, alignItems: 'start' }}>
      <aside className="card-box" style={{ padding: '20px 10px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 60, height: 60, background: 'var(--primary)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 10px' }}>👤</div>
          <h4 style={{ margin: 0 }}>{user.name}</h4>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>Customer</p>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {menu.map((m) => <li key={m.id} onClick={() => setActiveTab(m.id)} style={item(activeTab === m.id)}>{m.icon} {m.label}</li>)}
          <li onClick={doLogout} style={{ ...item(false), color: '#ef4444', marginTop: 20, borderTop: '1px solid var(--border-color)', paddingTop: 15 }}><LogOut size={18} /> Logout</li>
        </ul>
      </aside>

      <main className="card-box">
        {msg.text && <div style={{ background: msg.type === 'ok' ? '#d1fae5' : '#fee2e2', color: msg.type === 'ok' ? '#047857' : '#b91c1c', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>{msg.text}</div>}

        {activeTab === 'orders' && (
          <>
            <h3 style={{ marginTop: 0 }}>My Orders</h3>
            <div className="orders-tabs" style={{ display: 'flex', gap: 20, borderBottom: '1px solid var(--border-color)', marginBottom: 20, paddingBottom: 10 }}>
              {Object.keys(FILTERS).map((f) => (
                <span key={f} onClick={() => setFilter(f)} style={{ fontWeight: 600, fontSize: 13, color: filter === f ? 'var(--primary)' : 'var(--text-secondary)', borderBottom: filter === f ? '2px solid var(--primary)' : 'none', paddingBottom: 11, marginBottom: -11 }}>{f}</span>
              ))}
            </div>
            <Loading loading={orders.loading} error={orders.error}>
              <table className="admin-table">
                <thead><tr><th>Order #</th><th>Date</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {shown.map((o) => (
                    <tr key={o.id}>
                      <td>#{o.code}</td><td>{fmtDate(o.created_at)}</td><td>{ksh(o.total)}</td>
                      <td><span className={`badge-status ${statusClass(o.status)}`}>{o.status}</span></td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <Link to={`/tracking?order=${o.id}`} className="btn-outline" style={{ padding: '6px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Eye size={14} /> Track</Link>
                        {['Pending', 'Processing'].includes(o.status) && <button className="btn-outline" style={{ padding: '6px 10px', fontSize: 11, color: '#dc2626' }} onClick={() => cancel(o.id)}>Cancel</button>}
                      </td>
                    </tr>
                  ))}
                  {shown.length === 0 && <tr><td colSpan="5">No orders here yet. <Link to="/catalog">Start shopping</Link></td></tr>}
                </tbody>
              </table>
            </Loading>
          </>
        )}

        {activeTab === 'dashboard' && (
          <>
            <h3 style={{ marginTop: 0 }}>Account Dashboard</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Welcome back, {user.name}!</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, margin: '20px 0' }}>
              <div className="card-box metric-card"><span>Orders</span><h3>{orders.data?.length ?? '–'}</h3></div>
              <div className="card-box metric-card"><span>Wishlist</span><h3>{wishlist.length}</h3></div>
              <div className="card-box metric-card"><span>In transit</span><h3>{(orders.data || []).filter((o) => ['Picked Up', 'Out for Delivery'].includes(o.status)).length}</h3></div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/tracking" className="btn-primary" style={{ textDecoration: 'none' }}>Track latest order</Link>
              <Link to="/catalog" className="btn-outline" style={{ textDecoration: 'none' }}>Browse books</Link>
            </div>
          </>
        )}

        {activeTab === 'wishlist' && (
          <>
            <h3 style={{ marginTop: 0 }}>Wishlist</h3>
            <Loading loading={wished.loading && !wished.data} error={wished.error}>
              {wished.data?.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Nothing saved yet. Browse <Link to="/catalog">books</Link>.</p>}
              {(wished.data || []).filter((b) => wishlist.includes(b.id)).map((b) => (
                <div key={b.id} className="cart-item-row">
                  <Link to={`/book/${b.id}`} style={{ textDecoration: 'none' }}>{b.emoji} {b.title} — {ksh(b.price)}</Link>
                  <button className="btn-outline" onClick={() => toggleWishlist(b)}>Remove</button>
                </div>
              ))}
            </Loading>
          </>
        )}

        {activeTab === 'reviews' && (
          <>
            <h3 style={{ marginTop: 0 }}>My Reviews</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Review books from your delivered orders.</p>
            {reviewable.length === 0 && <p style={{ fontSize: 13 }}>Once an order is delivered, you can review its books here.</p>}
            {reviewable.map((b) => (
              <div key={b.book_id} className="cart-item-row"><span>📘 {b.title}</span>
                <Link to={`/reviews/${b.book_id}`} className="btn-outline" style={{ textDecoration: 'none' }}>Write a Review</Link></div>
            ))}
          </>
        )}

        {activeTab === 'addresses' && (
          <>
            <h3 style={{ marginTop: 0 }}>Addresses</h3>
            <Loading loading={addrs.loading && !addrs.data} error={addrs.error}>
              {(addrs.data || []).map((a) => (
                <div key={a.id} className="cart-item-row"><span><MapPin size={14} style={{ verticalAlign: -2 }} /> {a.line}</span><button className="btn-outline" onClick={() => delAddr(a.id)}>Delete</button></div>
              ))}
            </Loading>
            <form className="auth-form" style={{ display: 'flex', gap: 10, marginTop: 16 }} onSubmit={addAddr}>
              <input value={newAddr} onChange={(e) => setNewAddr(e.target.value)} placeholder="Add new address (e.g. Kilimani, Nairobi)" style={{ marginBottom: 0 }} />
              <button className="btn-primary" type="submit">Add</button>
            </form>
          </>
        )}

        {activeTab === 'settings' && (
          <>
            <h3 style={{ marginTop: 0 }}>My Profile</h3>
            <form className="auth-form" style={{ maxWidth: 420 }} onSubmit={saveProfile}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Full Name</label>
              <input value={profile.name} onChange={set('name')} disabled={!editing} />
              <label style={{ fontSize: 12, fontWeight: 600 }}>Email</label>
              <input value={profile.email} onChange={set('email')} disabled={!editing} />
              <label style={{ fontSize: 12, fontWeight: 600 }}>Phone</label>
              <input value={profile.phone} onChange={set('phone')} disabled={!editing} />
              {editing ? <button className="btn-primary" type="submit">Save Changes</button>
                : <button className="btn-primary" type="button" onClick={() => setEditing(true)}>Edit Profile</button>}
            </form>
            <h4 style={{ marginTop: 30 }}>Change Password</h4>
            <form className="auth-form" style={{ maxWidth: 420 }} onSubmit={changePw}>
              <input type="password" placeholder="Current password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} required />
              <input type="password" placeholder="New password (min 6)" minLength={6} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} required />
              <button className="btn-outline" type="submit">Update Password</button>
            </form>
          </>
        )}
      </main>
    </div>
  );
};

export default CustomerDashboard;
