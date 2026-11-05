import React from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { ksh } from '../../api';

export const OrderConfirmation = () => {
  const order = useLocation().state?.order;
  if (!order) return <Navigate to="/orders" replace />;
  return (
    <div className="page-container text-center" style={{ padding: '60px 20px' }}>
      <div className="card-box confirmation-card">
        <div className="success-icon">✅</div>
        <h2>Order Placed Successfully!</h2>
        <p>Your order <strong>#{order.code}</strong> for <strong>{ksh(order.total)}</strong> has been received.</p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Payment: {order.payment_method === 'mpesa' ? 'M-Pesa' : order.payment_method === 'card' ? 'Card' : 'Cash on delivery'}
        </p>
        <div className="hero-btns" style={{ justifyContent: 'center', marginTop: 20 }}>
          <Link to="/orders" className="btn-primary">View Orders</Link>
          <Link to={`/tracking?order=${order.id}`} className="btn-outline">Track Delivery</Link>
        </div>
      </div>
    </div>
  );
};
