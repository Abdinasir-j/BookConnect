import React from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './leafletFix';
import { Phone } from 'lucide-react';
import { fmtDateTime } from '../../api';
import { useFetch, Loading } from '../../useFetch';
import { useTrackedOrder } from './useOrder';

const FLOW = ['Pending', 'Processing', 'Assigned', 'Out for Delivery', 'Delivered'];
const LABEL = { Pending: 'Order Placed', Processing: 'Payment Confirmed / Preparing', Assigned: 'Agent Assigned', 'Out for Delivery': 'Out for Delivery', Delivered: 'Delivered' };
const STORE = [-1.2864, 36.8172];

const OrderTracking = () => {
  const { id, listLoading, listError, empty } = useTrackedOrder();
  const { data: o, loading, error } = useFetch(id ? `/orders/${id}/tracking` : null);

  if (empty) return <div className="page-container"><h2>Track Your Order</h2><p>You have no orders yet. <Link to="/catalog">Browse books</Link></p></div>;

  const reached = (s) => o?.events.some((e) => e.status === s || (s === 'Assigned' && e.status === 'Picked Up'));
  const eventFor = (s) => [...(o?.events || [])].reverse().find((e) => e.status === s);
  const idx = o ? Math.max(...FLOW.map((s, i) => (reached(s) || o.status === s ? i : -1))) : 0;
  const agentPos = o && (o.agent_lat != null ? [o.agent_lat, o.agent_lng] : STORE);
  const dest = o && (o.dest_lat != null ? [o.dest_lat, o.dest_lng] : STORE);

  return (
    <div className="page-container">
      <h2>Track Your Order</h2>
      <Loading loading={listLoading || loading} error={listError || error}>
        {o && (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Order #{o.code} • Status: <strong>{o.status}</strong></p>
            <div className="tracking-grid">
              <div className="card-box">
                {o.status === 'Cancelled' ? <p>This order was cancelled.</p> : (
                  <ul className="timeline">
                    {FLOW.map((s, i) => (
                      <li key={s} className={i < idx || o.status === 'Delivered' ? 'done' : i === idx ? 'current' : ''}>
                        <strong>{LABEL[s]}</strong>{eventFor(s) ? fmtDateTime(eventFor(s).created_at) : 'Pending'}
                      </li>
                    ))}
                  </ul>
                )}
                {o.agent ? (
                  <div style={{ padding: 12, background: 'var(--bg-color)', borderRadius: 8, marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><strong>Delivery Agent</strong><br /><small>{o.agent.name} {o.agent.phone && `• ${o.agent.phone}`}</small></div>
                    {o.agent.phone && <a href={`tel:${o.agent.phone}`} className="btn-outline" style={{ textDecoration: 'none' }}><Phone size={14} /></a>}
                  </div>
                ) : <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>A delivery agent will be assigned soon.</p>}
                <Link to={`/delivery-map?order=${o.id}`} className="btn-primary full-btn" style={{ display: 'block', textDecoration: 'none', marginTop: 14 }}>View Live Location</Link>
              </div>
              <div className="card-box" style={{ height: 420, padding: 0, overflow: 'hidden' }}>
                <MapContainer center={agentPos} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={agentPos}><Popup>{o.agent ? 'Delivery agent' : 'Store'}</Popup></Marker>
                  <Marker position={dest}><Popup>Your address: {o.ship_address}</Popup></Marker>
                  <Polyline positions={[agentPos, dest]} color="#2563eb" />
                </MapContainer>
              </div>
            </div>
          </>
        )}
      </Loading>
    </div>
  );
};
export default OrderTracking;
