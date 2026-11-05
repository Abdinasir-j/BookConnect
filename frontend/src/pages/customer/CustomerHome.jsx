import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, GraduationCap, Briefcase, Code, Smile, Church, ArrowRight, Star, ShoppingBag, Package, MapPin } from 'lucide-react';
import { ksh } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useFetch, Loading } from '../../useFetch';
import './CustomerPages.css';

const categories = [
  { name: 'Fiction', icon: <BookOpen size={24} /> }, { name: 'Academic', icon: <GraduationCap size={24} /> },
  { name: 'Business', icon: <Briefcase size={24} /> }, { name: 'Technology', icon: <Code size={24} /> },
  { name: "Children's", icon: <Smile size={24} /> }, { name: 'Religion', icon: <Church size={24} /> },
];

const CustomerHome = ({ addToCart }) => {
  const { user } = useAuth();
  const { data, loading, error } = useFetch('/books');
  const featured = (data || []).slice(0, 5);
  const isCustomer = user?.role === 'customer';

  return (
    <div className="page-container">
      {user ? (
        <section className="hero-box" style={{ background: 'var(--hero-bg)' }}>
          <div className="hero-text">
            <span className="badge-tag">WELCOME BACK</span>
            <h2>Hello, {user.name.split(' ')[0]} 👋</h2>
            <p>{isCustomer ? 'Pick up where you left off — check your orders, track a delivery, or find your next read.' : 'You are signed in. Open your portal from the button below.'}</p>
            <div className="hero-btns">
              {isCustomer ? (
                <>
                  <Link to="/orders" className="btn-primary"><Package size={14} style={{ verticalAlign: -2 }} /> My Orders</Link>
                  <Link to="/tracking" className="btn-outline"><MapPin size={14} style={{ verticalAlign: -2 }} /> Track Delivery</Link>
                  <Link to="/catalog" className="btn-outline">Browse Books</Link>
                </>
              ) : (
                <Link to={user.role === 'admin' ? '/admin/dashboard' : '/agent/dashboard'} className="btn-primary">Open my portal</Link>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="hero-box" style={{ background: 'var(--hero-bg)' }}>
          <div className="hero-text">
            <span className="badge-tag">BOOKCONNECT ONLINE PLATFORM</span>
            <h2>Find Your Next Great Read</h2>
            <p>Discover, purchase, and receive your favorite books with ease. From bestsellers to hidden gems, BookConnect brings the library directly to your doorstep.</p>
            <div className="hero-btns">
              <Link to="/catalog" className="btn-primary">Browse Books Now</Link>
              <Link to="/signup" className="btn-outline">Create Account</Link>
            </div>
          </div>
        </section>
      )}

      <section className="section-block">
        <div className="sec-header">
          <h3>Shop by Category</h3>
          <Link to="/catalog" className="link-more">View All <ArrowRight size={16} /></Link>
        </div>
        <div className="cat-grid">
          {categories.map((c) => (
            <Link to={`/catalog?category=${encodeURIComponent(c.name)}`} key={c.name} className="card-box cat-item" style={{ textDecoration: 'none' }}>
              <div className="icon-wrap">{c.icon}</div>
              <span>{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="sec-header">
          <h3>Featured Books</h3>
          <Link to="/catalog" className="link-more">View All Books <ArrowRight size={16} /></Link>
        </div>
        <Loading loading={loading} error={error}>
          <div className="books-grid">
            {featured.map((book) => (
              <div key={book.id} className="card-box book-card">
                <Link to={`/book/${book.id}`} className="book-thumb" style={{ textDecoration: 'none' }}>{book.emoji}</Link>
                <Link to={`/book/${book.id}`} style={{ textDecoration: 'none' }}><h4>{book.title}</h4></Link>
                <p className="author">By {book.author}</p>
                <div className="rating"><Star size={13} fill="#f59e0b" color="#f59e0b" /><span>({book.rating || 'New'})</span></div>
                <div className="book-bottom">
                  <span className="price">{ksh(book.price)}</span>
                  <button className="btn-sm" style={{ border: 'none' }} onClick={() => addToCart(book)} disabled={book.stock < 1}><ShoppingBag size={14} /> Add</button>
                </div>
              </div>
            ))}
          </div>
        </Loading>
      </section>
    </div>
  );
};
export default CustomerHome;
