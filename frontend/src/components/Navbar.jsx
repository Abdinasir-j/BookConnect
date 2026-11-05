import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Sun, Moon, LogOut, User } from 'lucide-react';
import { useAuth, roleHome } from '../auth/AuthContext';
import NotificationBell from './NotificationBell';
import './Navbar.css';

const Navbar = ({ theme, toggleTheme, cartCount }) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/catalog?search=${encodeURIComponent(searchQuery)}`);
  };

  const handleLogout = () => { logout(); navigate('/', { replace: true }); };
  const isCustomer = user?.role === 'customer';

  return (
    <header className="navbar">
      <div className="nav-brand">
        <span className="brand-icon">📚</span>
        <div>
          <h1>BookConnect</h1>
          <p>Books. Anytime. Anywhere.</p>
        </div>
      </div>

      <nav className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/catalog">Books</Link>
        {isCustomer && <Link to="/orders">My Orders</Link>}
        {isCustomer && <Link to="/tracking">Track Delivery</Link>}
        {isCustomer && <Link to="/profile">Profile</Link>}
      </nav>

      <div className="nav-actions">
        <form onSubmit={handleSearchSubmit} className="search-box">
          <input type="text" placeholder="Search books..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <button type="submit" style={{ background: 'none', border: 'none', position: 'absolute', left: 8, top: 7, cursor: 'pointer' }}>
            <Search size={16} className="search-icon" />
          </button>
        </form>

        <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {user && <NotificationBell />}

        <Link to="/cart" className="cart-btn">
          <ShoppingCart size={18} />
          {cartCount > 0 && <span className="badge">{cartCount}</span>}
        </Link>

        {user ? (
          <>
            <Link to={roleHome(user.role)} className="auth-btn" style={{ background: 'transparent', border: '1px solid var(--nav-text)' }}>
              <User size={16} /> {user.name.split(' ')[0]}
            </Link>
            <button onClick={handleLogout} className="auth-btn" style={{ background: '#ef4444', border: 'none', cursor: 'pointer' }}>
              <LogOut size={16} /> Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="auth-btn"><User size={16} /> Login</Link>
        )}
      </div>
    </header>
  );
};

export default Navbar;
