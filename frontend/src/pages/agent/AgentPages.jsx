import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bike, Package, History, User, LogOut, MapPin, CheckCircle, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../customer/leafletFix';
import { api, ksh, fmtDate } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useFetch, Loading } from '../../useFetch';
import NotificationBell from '../../components/NotificationBell';
import './AgentPages.css';

const badge = (s) => (s === 'Delivered' ? 'delivered' : s === 'Assigned' ? 'shipped' : 'processing');
const STORE = [-1.2864, 36.8172];

const AgentLayout = ({ activeTab, children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const menuItems = [
    { name: 'Dashboard', path: '/agent/dashboard', icon: <Bike size={18} /> },
    { name: 'Assigned Orders', path: '/agent/orders', icon: <Package size={18} /> },
    { name: 'Delivery History', path: '/agent/history', icon: <History size={18} /> },
    { name: 'Profile', path: '/agent/profile', icon: <User size={18} /> },
  ];
  return (
    <div className="agent-container">
      <aside className="agent-sidebar">
        <div className="sidebar-brand"><Bike size={24} color="#fff" /><div><h3>BookConnect</h3><p>Agent Portal</p></div></div>
        <ul className="sidebar-menu">
          {menuItems.map((item) => (
            <li key={item.name} className={activeTab === item.name.toLowerCase().replace(' ', '') ? 'active' : ''}><Link to={item.path}>{item.icon} {item.name}</Link></li>
          ))}
          <li className="logout-li">
            <p style={{ fontSize: 11, color: '#bfdbfe', margin: '0 0 8px' }}>{user?.name}</p>
            <button onClick={() => { logout(); navigate('/login?role=agent', { replace: true }); }} className="logout-btn"><LogOut size={18} /> Logout</button>
          </li>
        </ul>
      </aside>
      <main className="agent-content">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}><NotificationBell /></div>
        {children}
      </main>
    </div>
  );
};

const OrdersTable = ({ orders, action }) => (
  <table className="admin-table">
    <thead><tr><th>Order ID</th><th>Customer</th><th>Address</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>
      {orders.map((o) => (
        <tr key={o.id}><td>#{o.code}</td><td>{o.ship_name}</td><td>{o.ship_address}</td>
          <td><span className={`badge-status ${badge(o.status)}`}>{o.status}</span></td>
          <td>{action(o)}</td></tr>
      ))}
      {orders.length === 0 && <tr><td colSpan="5">No orders.</td></tr>}
    </tbody>
  </table>
);

// 2. Dashboard
export const AgentDashboard = () => {
  const { user } = useAuth();
  const stats = useFetch('/agent/stats');
  const orders = useFetch('/agent/orders');
  const s = stats.data;
  return (
    <AgentLayout activeTab="dashboard">
      <h2 style={{ margin: '0 0 5px' }}>Welcome, {user.name}</h2>
      <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>Here is your delivery summary for today.</p>
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card-box metric-card" style={{ borderLeft: '4px solid #3b82f6' }}><span>Total Assigned</span><h3>{s?.total_assigned ?? '–'}</h3></div>
        <div className="card-box metric-card" style={{ borderLeft: '4px solid #f59e0b' }}><span>In Progress</span><h3>{s?.in_progress ?? '–'}</h3></div>
        <div className="card-box metric-card" style={{ borderLeft: '4px solid #10b981' }}><span>Delivered</span><h3>{s?.delivered ?? '–'}</h3></div>
      </div>
      <div className="card-box" style={{ marginTop: 25 }}>
        <h4>Today's Deliveries</h4>
        <Loading loading={orders.loading} error={orders.error}>
          <OrdersTable orders={orders.data || []} action={(o) => <Link to={`/agent/order/${o.id}`} className="btn-outline" style={{ padding: '4px 8px', fontSize: 11 }}>View</Link>} />
        </Loading>
      </div>
    </AgentLayout>
  );
};

// 3. Assigned orders
export const AgentAssignedOrders = () => {
  const { data, loading, error } = useFetch('/agent/orders');
  return (
    <AgentLayout activeTab="assignedorders">
      <h2>Assigned Orders</h2>
      <div className="card-box" style={{ marginTop: 15 }}>
        <Loading loading={loading} error={error}>
          <OrdersTable orders={data || []} action={(o) => <Link to={`/agent/order/${o.id}`} className="btn-primary" style={{ padding: '4px 8px', fontSize: 11, textDecoration: 'none' }}>Open</Link>} />
        </Loading>
      </div>
    </AgentLayout>
  );
};

// 4. Order details
export const AgentOrderDetails = () => {
  const { id } = useParams();
  const { data: o, loading, error } = useFetch(`/agent/orders/${id}`);
  return (
    <AgentLayout activeTab="assignedorders">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Link to="/agent/orders" style={{ textDecoration: 'none', color: 'var(--primary)', fontWeight: 600 }}>← Back</Link>
        <h2 style={{ margin: 0 }}>Order {o ? `#${o.code}` : ''}</h2>
      </div>
      <Loading loading={loading} error={error}>
        {o && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card-box">
              <h4 style={{ marginTop: 0 }}>Customer</h4>
              <p style={{ fontSize: 13 }}><strong>Name:</strong> {o.ship_name}</p>
              <p style={{ fontSize: 13 }}><strong>Phone:</strong> <a href={`tel:${o.ship_phone}`}>{o.ship_phone}</a></p>
              <p style={{ fontSize: 13 }}><strong>Address:</strong> {o.ship_address}, {o.ship_city}</p>
              <p style={{ fontSize: 13 }}><strong>Payment:</strong> {o.payment_method === 'cod' ? `Cash on delivery — collect ${ksh(o.total)}` : `Prepaid (${o.payment_method.toUpperCase()})`}</p>
              <p style={{ fontSize: 13 }}><strong>Status:</strong> <span className={`badge-status ${badge(o.status)}`}>{o.status}</span></p>
            </div>
            <div className="card-box">
              <h4 style={{ marginTop: 0 }}>Items</h4>
              <table className="admin-table">
                <thead><tr><th>Book</th><th>Qty</th><th>Price</th></tr></thead>
                <tbody>{o.items.map((i, k) => <tr key={k}><td>{i.title}</td><td>{i.quantity}</td><td>{ksh(i.price)}</td></tr>)}</tbody>
              </table>
              <p style={{ textAlign: 'right', fontWeight: 700 }}>Total: {ksh(o.total)}</p>
              <Link to={`/agent/map/${o.id}`} className="btn-primary full-btn" style={{ display: 'block', textDecoration: 'none' }}>Open Route / Update Status</Link>
            </div>
          </div>
        )}
      </Loading>
    </AgentLayout>
  );
};

// 5 & 6. Route map + update status
export const AgentMapRoute = () => {
  const { id } = useParams();
  const { data: o, loading, error, setData } = useFetch(`/agent/orders/${id}`);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const update = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg('');
    const send = async (lat, lng) => {
      try {
        const upd = await api(`/agent/orders/${id}/status`, { method: 'PATCH', body: { status: status || o.status, note: note || null, lat, lng } });
        setData(upd); setNote(''); setMsg('✓ Status and location updated');
      } catch (er) { setMsg('⚠ ' + er.message); } finally { setBusy(false); }
    };
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition((p) => send(p.coords.latitude, p.coords.longitude), () => send(o.agent_lat ?? STORE[0], o.agent_lng ?? STORE[1]), { timeout: 5000 });
    else send(o.agent_lat ?? STORE[0], o.agent_lng ?? STORE[1]);
  };

  const agentPos = o && (o.agent_lat != null ? [o.agent_lat, o.agent_lng] : STORE);
  const dest = o && (o.dest_lat != null ? [o.dest_lat, o.dest_lng] : STORE);

  return (
    <AgentLayout activeTab="assignedorders">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Link to={`/agent/order/${id}`} style={{ textDecoration: 'none', color: 'var(--primary)', fontWeight: 600 }}>← Back</Link>
        <h2 style={{ margin: 0 }}>Delivery Route {o ? `#${o.code}` : ''}</h2>
      </div>
      <Loading loading={loading} error={error}>
        {o && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            <div className="card-box" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 500 }}>
              <div style={{ padding: 15, borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={16} /> {o.ship_address}</h4>
                <span className={`badge-status ${badge(o.status)}`}>{o.status}</span>
              </div>
              <div style={{ flex: 1 }}>
                <MapContainer key={`${agentPos}`} center={agentPos} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={agentPos}><Popup>Your location</Popup></Marker>
                  <Marker position={dest}><Popup>Customer destination</Popup></Marker>
                  <Polyline positions={[agentPos, dest]} color="blue" />
                </MapContainer>
              </div>
            </div>
            <div className="card-box">
              <h4 style={{ margin: '0 0 15px' }}>Update Status</h4>
              {['Delivered', 'Cancelled'].includes(o.status) ? <p>This order is {o.status.toLowerCase()}.</p> : (
                <form className="auth-form" onSubmit={update}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Change Status</label>
                  <select value={status || o.status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color)', margin: '5px 0 15px' }}>
                    <option>Assigned</option><option>Picked Up</option><option>Out for Delivery</option><option>Delivered</option>
                  </select>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Note</label>
                  <textarea rows="3" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add notes..." style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color)', margin: '5px 0 15px', fontFamily: 'inherit' }} />
                  <button className="btn-primary full-btn" disabled={busy}><Navigation size={14} style={{ marginRight: 5 }} />{busy ? 'Updating…' : 'Update Status & Location'}</button>
                </form>
              )}
              {msg && <p style={{ fontSize: 13 }}>{msg}</p>}
            </div>
          </div>
        )}
      </Loading>
    </AgentLayout>
  );
};

// 7. History
export const AgentHistory = () => {
  const { data, loading, error } = useFetch('/agent/history');
  return (
    <AgentLayout activeTab="deliveryhistory">
      <h2>Delivery History</h2>
      <div className="card-box" style={{ marginTop: 15 }}>
        <Loading loading={loading} error={error}>
          <table className="admin-table">
            <thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Location</th></tr></thead>
            <tbody>
              {(data || []).map((o) => (
                <tr key={o.id}><td>#{o.code}</td><td>{fmtDate(o.delivered_at)}</td>
                  <td><span className="badge-status delivered"><CheckCircle size={12} style={{ marginRight: 4 }} />Delivered</span></td><td>{o.ship_address}</td></tr>
              ))}
              {data?.length === 0 && <tr><td colSpan="4">No completed deliveries yet.</td></tr>}
            </tbody>
          </table>
        </Loading>
      </div>
    </AgentLayout>
  );
};

// Profile
export const AgentProfile = () => {
  const { user, setUser } = useAuth();
  const [f, setF] = useState({ name: user.name, phone: user.phone || '' });
  const [msg, setMsg] = useState('');
  const save = async (e) => {
    e.preventDefault();
    try { setUser(await api('/auth/me', { method: 'PUT', body: f })); setMsg('✓ Saved'); } catch (er) { setMsg('⚠ ' + er.message); }
  };
  return (
    <AgentLayout activeTab="profile">
      <h2>My Profile</h2>
      <div className="card-box" style={{ maxWidth: 420 }}>
        <form className="auth-form" onSubmit={save}>
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input value={user.email} disabled />
          <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <button className="btn-primary" type="submit">Save</button>
        </form>
        {msg && <p style={{ fontSize: 13 }}>{msg}</p>}
      </div>
    </AgentLayout>
  );
};
