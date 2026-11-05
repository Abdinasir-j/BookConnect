import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, ShoppingCart, Users, CreditCard, Truck, BarChart3, Settings, LogOut, Plus, Edit, Trash2, Package } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, ksh, fmtDate } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useFetch, Loading } from '../../useFetch';
import NotificationBell from '../../components/NotificationBell';
import './AdminPages.css';

const ORDER_STATUSES = ['Pending', 'Processing', 'Assigned', 'Picked Up', 'Out for Delivery', 'Delivered', 'Cancelled'];
const badge = (s) => (s === 'Delivered' || s === 'Completed' || s === 'Paid' || s === 'Active' ? 'delivered' : ['Out for Delivery', 'Picked Up'].includes(s) ? 'shipped' : ['Cancelled', 'Failed', 'Disabled'].includes(s) ? 'low' : 'processing');
const input = { padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 13 };

const AdminLayout = ({ activeTab, children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Books', path: '/admin/books', icon: <BookOpen size={18} /> },
    { name: 'Orders', path: '/admin/orders', icon: <ShoppingCart size={18} /> },
    { name: 'Inventory', path: '/admin/inventory', icon: <Package size={18} /> },
    { name: 'Customers', path: '/admin/customers', icon: <Users size={18} /> },
    { name: 'Payments', path: '/admin/payments', icon: <CreditCard size={18} /> },
    { name: 'Delivery', path: '/admin/delivery', icon: <Truck size={18} /> },
    { name: 'Reports', path: '/admin/reports', icon: <BarChart3 size={18} /> },
    { name: 'Settings', path: '/admin/profile', icon: <Settings size={18} /> },
  ];
  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="sidebar-brand"><span>⚙️</span><div><h3>BookConnect</h3><p>Admin Control Panel</p></div></div>
        <ul className="sidebar-menu">
          {menuItems.map((item) => (
            <li key={item.name} className={activeTab === item.name.toLowerCase() ? 'active' : ''}><Link to={item.path}>{item.icon} {item.name}</Link></li>
          ))}
          <li className="logout-li">
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 8px' }}>{user?.name}</p>
            <button onClick={() => { logout(); navigate('/login?role=admin', { replace: true }); }} className="logout-btn"><LogOut size={18} /> Logout</button>
          </li>
        </ul>
      </aside>
      <main className="admin-content">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}><NotificationBell /></div>
        {children}
      </main>
    </div>
  );
};

// 2. Dashboard
export const AdminDashboard = () => {
  const { data: s, loading, error } = useFetch('/admin/stats');
  return (
    <AdminLayout activeTab="dashboard">
      <h2>Dashboard Overview</h2>
      <Loading loading={loading} error={error}>
        {s && (
          <>
            <div className="metrics-grid">
              <div className="card-box metric-card"><span>Total Books</span><h3>{s.total_books}</h3></div>
              <div className="card-box metric-card"><span>Total Orders</span><h3>{s.total_orders}</h3></div>
              <div className="card-box metric-card"><span>Total Customers</span><h3>{s.total_customers}</h3></div>
              <div className="card-box metric-card"><span>Total Revenue</span><h3>{ksh(s.total_revenue)}</h3></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginTop: 25 }}>
              <div className="card-box">
                <h4>Sales Overview</h4>
                <div style={{ height: 300, marginTop: 15 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={s.monthly_sales}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <Tooltip formatter={(v) => [ksh(v), 'Revenue']} />
                      <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card-box">
                <h4>Recent Orders</h4>
                <table className="admin-table" style={{ marginTop: 15 }}>
                  <thead><tr><th>Order</th><th>Total</th><th>Status</th></tr></thead>
                  <tbody>{s.recent_orders.map((o) => <tr key={o.id}><td>#{o.code}</td><td>{ksh(o.total)}</td><td><span className={`badge-status ${badge(o.status)}`}>{o.status}</span></td></tr>)}</tbody>
                </table>
                {s.low_stock > 0 && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 14 }}>⚠ {s.low_stock} book(s) low on stock — <Link to="/admin/inventory">view inventory</Link></p>}
              </div>
            </div>
          </>
        )}
      </Loading>
    </AdminLayout>
  );
};

// 3. Books
const EMPTY = { title: '', author: '', category: 'Fiction', price: '', stock: 0, emoji: '📘', description: '' };
export const AdminBooks = () => {
  const { data: books, loading, error, reload } = useFetch('/books?sort=newest');
  const cats = useFetch('/books/categories');
  const [form, setForm] = useState(null); // null = hidden
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setErr('');
    const body = { ...form, price: Number(form.price), stock: Number(form.stock) };
    try {
      await api(form.id ? `/books/${form.id}` : '/books', { method: form.id ? 'PUT' : 'POST', body });
      setForm(null); reload();
    } catch (er) { setErr(er.message); }
  };
  const del = async (b) => {
    if (!window.confirm(`Delete "${b.title}"?`)) return;
    try { await api(`/books/${b.id}`, { method: 'DELETE' }); reload(); } catch (er) { alert(er.message); }
  };

  return (
    <AdminLayout activeTab="books">
      <div className="sec-header">
        <h2>Books Management</h2>
        <button className="btn-primary" onClick={() => setForm(EMPTY)}><Plus size={16} /> Add Book</button>
      </div>
      {form && (
        <form className="card-box" onSubmit={save} style={{ marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <h4 style={{ gridColumn: '1/-1', margin: 0 }}>{form.id ? 'Edit Book' : 'Add Book'}</h4>
          {err && <div style={{ gridColumn: '1/-1', color: '#b91c1c', fontSize: 13 }}>{err}</div>}
          <input style={input} placeholder="Title" value={form.title} onChange={set('title')} required />
          <input style={input} placeholder="Author" value={form.author} onChange={set('author')} required />
          <input style={input} list="cats" placeholder="Category" value={form.category} onChange={set('category')} required />
          <datalist id="cats">{(cats.data || []).map((c) => <option key={c} value={c} />)}</datalist>
          <input style={input} type="number" min="1" step="1" placeholder="Price (KSh)" value={form.price} onChange={set('price')} required />
          <input style={input} type="number" min="0" placeholder="Stock" value={form.stock} onChange={set('stock')} required />
          <input style={input} placeholder="Emoji cover" value={form.emoji} onChange={set('emoji')} />
          <textarea style={{ ...input, gridColumn: '1/-1', fontFamily: 'inherit' }} rows="2" placeholder="Description" value={form.description} onChange={set('description')} />
          <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10 }}>
            <button className="btn-primary" type="submit">Save</button>
            <button className="btn-outline" type="button" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}
      <div className="card-box">
        <Loading loading={loading} error={error}>
          <table className="admin-table">
            <thead><tr><th>ID</th><th>Title</th><th>Author</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
            <tbody>
              {(books || []).map((b) => (
                <tr key={b.id}>
                  <td>#{b.id}</td><td>{b.emoji} {b.title}</td><td>{b.author}</td><td>{b.category}</td><td>{ksh(b.price)}</td><td>{b.stock}</td>
                  <td style={{ display: 'flex', gap: 10 }}>
                    <Edit size={16} style={{ cursor: 'pointer' }} onClick={() => { setErr(''); setForm({ ...b }); }} />
                    <Trash2 size={16} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => del(b)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Loading>
      </div>
    </AdminLayout>
  );
};

// 4. Orders
export const AdminOrders = () => {
  const [filter, setFilter] = useState('');
  const { data: orders, loading, error, reload } = useFetch(`/admin/orders${filter ? `?status=${encodeURIComponent(filter)}` : ''}`);
  const setStatus = async (id, status) => { try { await api(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status } }); reload(); } catch (e) { alert(e.message); } };
  return (
    <AdminLayout activeTab="orders">
      <div className="sec-header">
        <h2>Order Management</h2>
        <select style={input} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Status</option>{ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="card-box">
        <Loading loading={loading} error={error}>
          <table className="admin-table">
            <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
            <tbody>
              {(orders || []).map((o) => (
                <tr key={o.id}>
                  <td>#{o.code}</td><td>{fmtDate(o.created_at)}</td><td>{o.customer_name}</td><td>{ksh(o.total)}</td>
                  <td><span className={`badge-status ${badge(o.payment_status)}`}>{o.payment_status}</span></td>
                  <td><select style={input} value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>{ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></td>
                </tr>
              ))}
              {orders?.length === 0 && <tr><td colSpan="6">No orders.</td></tr>}
            </tbody>
          </table>
        </Loading>
      </div>
    </AdminLayout>
  );
};

// 5. Inventory
export const AdminInventory = () => {
  const { data: books, loading, error, reload } = useFetch('/admin/inventory');
  const restock = async (b) => {
    const v = window.prompt(`New stock quantity for "${b.title}"`, b.stock);
    if (v === null || v === '' || isNaN(v) || Number(v) < 0) return;
    await api(`/books/${b.id}/stock?stock=${Number(v)}`, { method: 'PATCH' });
    reload();
  };
  return (
    <AdminLayout activeTab="inventory">
      <h2>Inventory Management & Stock Alerts</h2>
      <div className="card-box">
        <Loading loading={loading} error={error}>
          <table className="admin-table">
            <thead><tr><th>Book Title</th><th>Stock</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {(books || []).map((b) => (
                <tr key={b.id}>
                  <td>{b.title}</td><td>{b.stock}</td>
                  <td><span className={`badge-status ${b.stock === 0 ? 'low' : b.stock <= 10 ? 'processing' : 'ok'}`}>{b.stock === 0 ? 'Out of Stock' : b.stock <= 10 ? 'Low Stock' : 'In Stock'}</span></td>
                  <td><button className="btn-outline" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => restock(b)}>Update Stock</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Loading>
      </div>
    </AdminLayout>
  );
};

// 6. Customers
export const AdminCustomers = () => {
  const { data, loading, error, reload } = useFetch('/admin/customers');
  const [q, setQ] = useState('');
  const toggle = async (id) => { await api(`/admin/customers/${id}/active`, { method: 'PATCH' }); reload(); };
  const list = (data || []).filter((c) => `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <AdminLayout activeTab="customers">
      <div className="sec-header"><h2>Customer Management</h2><input style={input} placeholder="Search customers…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="card-box">
        <Loading loading={loading} error={error}>
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}><td>{c.name}</td><td>{c.email}</td><td>{c.phone}</td><td>{c.orders}</td>
                  <td><span className={`badge-status ${c.is_active ? 'delivered' : 'low'}`}>{c.is_active ? 'Active' : 'Disabled'}</span></td>
                  <td><button className="btn-outline" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => toggle(c.id)}>{c.is_active ? 'Disable' : 'Enable'}</button></td></tr>
              ))}
            </tbody>
          </table>
        </Loading>
      </div>
    </AdminLayout>
  );
};

// 7. Payments
export const AdminPayments = () => {
  const { data, loading, error } = useFetch('/admin/payments');
  const [method, setMethod] = useState('');
  const list = (data || []).filter((p) => !method || p.method === method);
  return (
    <AdminLayout activeTab="payments">
      <div className="sec-header"><h2>Payment Management (M-Pesa / Card / COD)</h2>
        <select style={input} value={method} onChange={(e) => setMethod(e.target.value)}><option value="">All Methods</option><option value="mpesa">M-Pesa</option><option value="card">Card</option><option value="cod">Cash on Delivery</option></select></div>
      <div className="card-box">
        <Loading loading={loading} error={error}>
          <table className="admin-table">
            <thead><tr><th>ID</th><th>Order</th><th>Method</th><th>Amount</th><th>Reference</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}><td>PAY-{String(p.id).padStart(3, '0')}</td><td>#{p.order_code}</td><td>{p.method.toUpperCase()}</td><td>{ksh(p.amount)}</td><td>{p.reference || '—'}</td>
                  <td><span className={`badge-status ${badge(p.status)}`}>{p.status}</span></td><td>{fmtDate(p.created_at)}</td></tr>
              ))}
            </tbody>
          </table>
        </Loading>
      </div>
    </AdminLayout>
  );
};

// 8. Delivery
export const AdminDelivery = () => {
  const orders = useFetch('/admin/orders');
  const agents = useFetch('/admin/agents');
  const assign = async (orderId, agentId) => {
    if (!agentId) return;
    try { await api(`/admin/orders/${orderId}/assign`, { method: 'POST', body: { agent_id: Number(agentId) } }); orders.reload(); } catch (e) { alert(e.message); }
  };
  const list = (orders.data || []).filter((o) => !['Cancelled'].includes(o.status));
  return (
    <AdminLayout activeTab="delivery">
      <h2>Delivery Agent Assignment & Tracking</h2>
      <div className="card-box">
        <Loading loading={orders.loading || agents.loading} error={orders.error || agents.error}>
          <table className="admin-table">
            <thead><tr><th>Order</th><th>Address</th><th>Agent</th><th>Status</th><th>Assign</th></tr></thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}><td>#{o.code}</td><td>{o.ship_address}</td><td>{o.agent?.name || '—'}</td>
                  <td><span className={`badge-status ${badge(o.status)}`}>{o.status}</span></td>
                  <td>{o.status === 'Delivered' ? '—' : (
                    <select style={input} value={o.agent?.id || ''} onChange={(e) => assign(o.id, e.target.value)}>
                      <option value="">Select agent</option>{(agents.data || []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>)}</td></tr>
              ))}
            </tbody>
          </table>
        </Loading>
      </div>
    </AdminLayout>
  );
};

// 9. Reports
export const AdminReports = () => {
  const { data: s, loading, error } = useFetch('/admin/stats');
  return (
    <AdminLayout activeTab="reports">
      <h2>Sales Reports & Analytics</h2>
      <Loading loading={loading} error={error}>
        {s && (
          <>
            <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="card-box metric-card"><span>Total Revenue</span><h3>{ksh(s.total_revenue)}</h3></div>
              <div className="card-box metric-card"><span>Total Orders</span><h3>{s.total_orders}</h3></div>
              <div className="card-box metric-card"><span>Avg. Order Value</span><h3>{ksh(s.avg_order_value)}</h3></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginTop: 25 }}>
              <div className="card-box">
                <h4>Sales Overview (last 6 months)</h4>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={s.monthly_sales}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={(v) => [ksh(v), 'Revenue']} /><Bar dataKey="sales" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card-box">
                <h4>Top Selling Books</h4>
                <table className="admin-table"><thead><tr><th>Book</th><th>Sold</th><th>Revenue</th></tr></thead>
                  <tbody>{s.top_books.map((b) => <tr key={b.title}><td>{b.title}</td><td>{b.quantity}</td><td>{ksh(b.revenue)}</td></tr>)}</tbody></table>
              </div>
            </div>
          </>
        )}
      </Loading>
    </AdminLayout>
  );
};

// 10. Admin profile
export const AdminProfile = () => {
  const { user, setUser } = useAuth();
  const [f, setF] = useState({ name: user.name, phone: user.phone || '' });
  const [pw, setPw] = useState({ current_password: '', new_password: '' });
  const [msg, setMsg] = useState('');
  const run = async (fn, ok) => { try { await fn(); setMsg('✓ ' + ok); } catch (e) { setMsg('⚠ ' + e.message); } };
  return (
    <AdminLayout activeTab="settings">
      <h2>Admin Profile Settings</h2>
      {msg && <p style={{ fontSize: 13 }}>{msg}</p>}
      <div className="card-box" style={{ maxWidth: 460 }}>
        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); run(async () => setUser(await api('/auth/me', { method: 'PUT', body: f })), 'Profile saved'); }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Full Name</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <label style={{ fontSize: 12, fontWeight: 600 }}>Email</label><input value={user.email} disabled />
          <label style={{ fontSize: 12, fontWeight: 600 }}>Phone</label><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <button className="btn-primary" type="submit">Save</button>
        </form>
        <h4 style={{ marginTop: 24 }}>Change Password</h4>
        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); run(async () => { await api('/auth/change-password', { method: 'POST', body: pw }); setPw({ current_password: '', new_password: '' }); }, 'Password changed'); }}>
          <input type="password" placeholder="Current password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} required />
          <input type="password" placeholder="New password" minLength={6} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} required />
          <button className="btn-outline" type="submit">Change Password</button>
        </form>
      </div>
    </AdminLayout>
  );
};
