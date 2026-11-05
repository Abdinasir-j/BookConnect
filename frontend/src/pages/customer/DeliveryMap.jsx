import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './leafletFix';
import { Bike, MapPin, Clock } from 'lucide-react';
import { useFetch, Loading } from '../../useFetch';
import { useTrackedOrder } from './useOrder';

const STORE = [-1.2864, 36.8172];
const km = (a, b) => {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const DeliveryMap = () => {
  const { id, listLoading, listError, empty } = useTrackedOrder();
  const { data: o, loading, error, reload } = useFetch(id ? `/orders/${id}/tracking` : null);

  // refresh the agent's position every 8 seconds
  useEffect(() => {
    if (!id) return;
    const t = setInterval(reload, 8000);
    return () => clearInterval(t);
  }, [id, reload]);

  if (empty) return <div className="page-container"><h2>Live Delivery Tracking</h2><p>You have no orders yet. <Link to="/catalog">Browse books</Link></p></div>;

  const agentPos = o && (o.agent_lat != null ? [o.agent_lat, o.agent_lng] : STORE);
  const dest = o && (o.dest_lat != null ? [o.dest_lat, o.dest_lng] : STORE);
  const dist = o ? km(agentPos, dest) : 0;
  const eta = Math.max(1, Math.round((dist / 20) * 60)); // assume ~20 km/h city traffic

  return (
    <div className="page-container">
      <h2>Live Delivery Tracking</h2>
      <Loading loading={listLoading || (loading && !o)} error={listError || error}>
        {o && (
          <div className="tracking-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
            <div className="card-box" style={{ height: 480, padding: 0, overflow: 'hidden' }}>
              <MapContainer center={agentPos} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={agentPos}><Popup>{o.agent ? o.agent.name : 'Store'}</Popup></Marker>
                <Marker position={dest}><Popup>Your address</Popup></Marker>
                <Polyline positions={[agentPos, dest]} color="#2563eb" />
              </MapContainer>
            </div>
            <div className="card-box">
              <h4 style={{ marginTop: 0 }}>Order #{o.code}</h4>
              <p style={{ fontSize: 13 }}>Status: <strong>{o.status}</strong></p>
              {o.agent ? (
                <p style={{ margin: '0 0 14px' }}><Bike size={16} style={{ verticalAlign: -3 }} /> {o.agent.name}<br /><small style={{ color: 'var(--text-secondary)' }}>{o.agent.phone}</small></p>
              ) : <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No agent assigned yet.</p>}
              <p style={{ fontSize: 13 }}><MapPin size={14} style={{ verticalAlign: -2 }} /> Delivering to: <strong>{o.ship_address}</strong></p>
              {o.status === 'Delivered' ? <p style={{ color: '#059669', fontWeight: 600 }}>✓ Delivered</p> : (
                <p style={{ fontSize: 13 }}><Clock size={14} style={{ verticalAlign: -2 }} /> Approx. {dist.toFixed(1)} km away • ETA ~{eta} min</p>
              )}
              <Link to={`/tracking?order=${o.id}`} className="btn-primary full-btn" style={{ display: 'block', textDecoration: 'none', marginTop: 12 }}>View Details</Link>
            </div>
          </div>
        )}
      </Loading>
    </div>
  );
};
export default DeliveryMap;
