import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { api } from './api';
import { useAuth } from './auth/AuthContext';
import { ProtectedRoute, GuestOnly } from './auth/ProtectedRoute';
import CustomerHome from './pages/customer/CustomerHome';
import { SignUp, Login } from './pages/customer/AuthPages';
import BookCatalog from './pages/customer/BookCatalog';
import BookDetails from './pages/customer/BookDetails';
import Reviews from './pages/customer/Reviews';
import DeliveryMap from './pages/customer/DeliveryMap';
import { ShoppingCartView, CheckoutView } from './pages/customer/CartCheckout';
import { OrderConfirmation } from './pages/customer/OrderConfirmation';
import OrderTracking from './pages/customer/OrderTracking';
import CustomerDashboard from './pages/customer/CustomerDashboard';

import {
  AdminDashboard, AdminBooks, AdminOrders,
  AdminInventory, AdminCustomers, AdminPayments, AdminDelivery,
  AdminReports, AdminProfile
} from './pages/admin/AdminPages';

import {
  AgentDashboard, AgentAssignedOrders, AgentOrderDetails, AgentMapRoute, AgentHistory, AgentProfile
} from './pages/agent/AgentPages';

const loadCart = () => { try { return JSON.parse(localStorage.getItem('bc_cart')) || []; } catch { return []; } };

function AppContent() {
  const { user } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem('bc_theme') || 'light');
  const [cartItems, setCartItems] = useState(loadCart);
  const [wishlist, setWishlist] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const hideCustomerNav = location.pathname.startsWith('/admin') || location.pathname.startsWith('/agent');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bc_theme', theme);
  }, [theme]);

  useEffect(() => { localStorage.setItem('bc_cart', JSON.stringify(cartItems)); }, [cartItems]);
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  // load the customer's wishlist whenever they log in; clear it on logout
  useEffect(() => {
    if (user?.role === 'customer') api('/me/wishlist').then((l) => setWishlist(l.map((b) => b.id))).catch(() => {});
    else setWishlist([]);
  }, [user]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const addToCart = (book, qty = 1) =>
    setCartItems((items) => {
      const found = items.find((i) => i.id === book.id);
      if (found) return items.map((i) => (i.id === book.id ? { ...i, quantity: i.quantity + qty } : i));
      return [...items, { id: book.id, title: book.title, author: book.author, price: book.price, emoji: book.emoji, quantity: qty }];
    });
  const updateQuantity = (index, q) => setCartItems((items) => (q < 1 ? items : items.map((it, i) => (i === index ? { ...it, quantity: q } : it))));
  const removeFromCart = (index) => setCartItems((items) => items.filter((_, i) => i !== index));
  const clearCart = () => setCartItems([]);

  const toggleWishlist = async (book) => {
    if (!user) return navigate('/login', { state: { from: location.pathname } });
    const has = wishlist.includes(book.id);
    setWishlist((w) => (has ? w.filter((id) => id !== book.id) : [...w, book.id]));
    try { await api(`/me/wishlist/${book.id}`, { method: has ? 'DELETE' : 'POST' }); }
    catch { setWishlist((w) => (has ? [...w, book.id] : w.filter((id) => id !== book.id))); }
  };

  const customer = (el) => <ProtectedRoute role="customer">{el}</ProtectedRoute>;
  const dash = (tab) => customer(<CustomerDashboard initialTab={tab} wishlist={wishlist} toggleWishlist={toggleWishlist} />);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {!hideCustomerNav && <Navbar theme={theme} toggleTheme={toggleTheme} cartCount={cartItems.reduce((a, i) => a + i.quantity, 0)} />}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          {/* Public customer pages */}
          <Route path="/" element={<CustomerHome addToCart={addToCart} />} />
          <Route path="/signup" element={<GuestOnly><SignUp /></GuestOnly>} />
          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/catalog" element={<BookCatalog addToCart={addToCart} />} />
          <Route path="/book/:id" element={<BookDetails addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} />} />
          <Route path="/reviews/:id" element={<Reviews />} />
          <Route path="/cart" element={<ShoppingCartView cartItems={cartItems} updateQuantity={updateQuantity} removeFromCart={removeFromCart} />} />

          {/* Customer-only pages (redirect to /login, then back here) */}
          <Route path="/checkout" element={customer(<CheckoutView cartItems={cartItems} clearCart={clearCart} />)} />
          <Route path="/confirmation" element={customer(<OrderConfirmation />)} />
          <Route path="/orders" element={dash('orders')} />
          <Route path="/dashboard" element={dash('dashboard')} />
          <Route path="/profile" element={dash('settings')} />
          <Route path="/tracking" element={customer(<OrderTracking />)} />
          <Route path="/delivery-map" element={customer(<DeliveryMap />)} />

          {/* Admin */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/login" element={<Navigate to="/login?role=admin" replace />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/books" element={<ProtectedRoute role="admin"><AdminBooks /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute role="admin"><AdminOrders /></ProtectedRoute>} />
          <Route path="/admin/inventory" element={<ProtectedRoute role="admin"><AdminInventory /></ProtectedRoute>} />
          <Route path="/admin/customers" element={<ProtectedRoute role="admin"><AdminCustomers /></ProtectedRoute>} />
          <Route path="/admin/payments" element={<ProtectedRoute role="admin"><AdminPayments /></ProtectedRoute>} />
          <Route path="/admin/delivery" element={<ProtectedRoute role="admin"><AdminDelivery /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute role="admin"><AdminReports /></ProtectedRoute>} />
          <Route path="/admin/profile" element={<ProtectedRoute role="admin"><AdminProfile /></ProtectedRoute>} />

          {/* Delivery agent */}
          <Route path="/agent" element={<Navigate to="/agent/dashboard" replace />} />
          <Route path="/agent/login" element={<Navigate to="/login?role=agent" replace />} />
          <Route path="/agent/dashboard" element={<ProtectedRoute role="agent"><AgentDashboard /></ProtectedRoute>} />
          <Route path="/agent/orders" element={<ProtectedRoute role="agent"><AgentAssignedOrders /></ProtectedRoute>} />
          <Route path="/agent/order/:id" element={<ProtectedRoute role="agent"><AgentOrderDetails /></ProtectedRoute>} />
          <Route path="/agent/map/:id" element={<ProtectedRoute role="agent"><AgentMapRoute /></ProtectedRoute>} />
          <Route path="/agent/history" element={<ProtectedRoute role="agent"><AgentHistory /></ProtectedRoute>} />
          <Route path="/agent/profile" element={<ProtectedRoute role="agent"><AgentProfile /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {!hideCustomerNav && <Footer />}
    </div>
  );
}

export default function App() {
  return <Router basename={import.meta.env.BASE_URL}><AppContent /></Router>;
}
