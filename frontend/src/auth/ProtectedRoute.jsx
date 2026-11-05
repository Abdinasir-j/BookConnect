import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, roleHome, roleLogin } from './AuthContext';

// <ProtectedRoute role="admin">…</ProtectedRoute>   or   <GuestOnly>…</GuestOnly>
export function ProtectedRoute({ role = 'customer', children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <p style={{ padding: 40 }}>Loading…</p>;
  if (!user) return <Navigate to={roleLogin(role)} replace state={{ from: location.pathname + location.search }} />;
  if (user.role !== role) return <Navigate to={roleHome(user.role)} replace />;
  return children;
}

// login/signup pages: if already signed in, go to the right place instead
export function GuestOnly({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <p style={{ padding: 40 }}>Loading…</p>;
  if (user) return <Navigate to={location.state?.from || roleHome(user.role)} replace />;
  return children;
}
