import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Star, Heart, Truck, ShieldCheck, ShoppingBag } from 'lucide-react';
import { ksh } from '../../api';
import { useFetch, Loading } from '../../useFetch';

const BookDetails = ({ addToCart, wishlist, toggleWishlist }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const { data: book, loading, error } = useFetch(`/books/${id}`);

  return (
    <div className="page-container">
      <Loading loading={loading} error={error}>
        {book && (
          <>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}><Link to="/">Home</Link> › <Link to="/catalog">Books</Link> › {book.title}</p>
            <div className="card-box details-grid">
              <div className="details-cover"><span style={{ fontSize: 110 }}>{book.emoji}</span><strong>{book.title}</strong></div>
              <div>
                <h2 style={{ margin: '0 0 4px' }}>{book.title}</h2>
                <p className="author" style={{ fontSize: 14 }}>{book.author}</p>
                <div className="rating" style={{ fontSize: 13 }}>
                  {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={15} fill={n <= Math.round(book.rating) ? '#f59e0b' : 'none'} color="#f59e0b" />)}
                  <span>{book.rating || 'No ratings yet'} ({book.reviews} reviews)</span>
                  <span style={{ marginLeft: 10, color: book.stock > 0 ? '#059669' : '#dc2626', fontWeight: 600 }}>{book.stock > 0 ? `In Stock (${book.stock})` : 'Out of Stock'}</span>
                </div>
                <div className="price" style={{ fontSize: 28, margin: '10px 0' }}>{ksh(book.price)}</div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 520 }}>{book.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0', flexWrap: 'wrap' }}>
                  <div className="qty-stepper">
                    <button onClick={() => setQty(Math.max(1, qty - 1))}>-</button><span>{qty}</span><button onClick={() => setQty(Math.min(book.stock || 1, qty + 1))}>+</button>
                  </div>
                  <button className="btn-primary" disabled={book.stock < 1} onClick={() => addToCart(book, qty)}><ShoppingBag size={14} style={{ marginRight: 6 }} />Add to Cart</button>
                  <button className="btn-primary" style={{ background: '#059669' }} disabled={book.stock < 1} onClick={() => { addToCart(book, qty); navigate('/cart'); }}>Buy Now</button>
                  <button className="btn-outline" onClick={() => toggleWishlist(book)}>
                    <Heart size={14} fill={wishlist.includes(book.id) ? '#ef4444' : 'none'} color={wishlist.includes(book.id) ? '#ef4444' : 'currentColor'} style={{ marginRight: 6, verticalAlign: -2 }} />
                    {wishlist.includes(book.id) ? 'In Wishlist' : 'Add to Wishlist'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 24, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span><Truck size={14} style={{ verticalAlign: -2 }} /> Delivery within Nairobi</span>
                  <span><ShieldCheck size={14} style={{ verticalAlign: -2 }} /> Secure payment</span>
                </div>
                <Link to={`/reviews/${book.id}`} className="link-more" style={{ marginTop: 18 }}>Read all {book.reviews} reviews →</Link>
              </div>
            </div>
          </>
        )}
      </Loading>
    </div>
  );
};
export default BookDetails;
