import React, { useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Star } from 'lucide-react';
import { api, fmtDate } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useFetch, Loading } from '../../useFetch';

const Stars = ({ value, size = 14, onPick }) => (
  <span>{[1, 2, 3, 4, 5].map((n) => (
    <Star key={n} size={size} style={{ cursor: onPick ? 'pointer' : 'default' }} onClick={() => onPick && onPick(n)} fill={n <= value ? '#f59e0b' : 'none'} color="#f59e0b" />
  ))}</span>
);

const Reviews = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const book = useFetch(`/books/${id}`);
  const rev = useFetch(`/books/${id}/reviews`);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');

  const write = () => {
    if (!user) return navigate('/login', { state: { from: location.pathname } });
    if (user.role !== 'customer') return setErr('Only customers can write reviews');
    setOpen(!open);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await api(`/books/${id}/reviews`, { method: 'POST', body: { rating, text } });
      setText(''); setOpen(false);
      rev.reload(); book.reload();
    } catch (er) { setErr(er.message); }
  };

  const b = book.data;
  return (
    <div className="page-container">
      <h2>Reviews & Ratings</h2>
      <Loading loading={book.loading || rev.loading} error={book.error || rev.error}>
        {b && rev.data && (
          <div className="card-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div className="book-thumb" style={{ width: 70, height: 90, margin: 0 }}>{b.emoji}</div>
                <div>
                  <Link to={`/book/${b.id}`} style={{ textDecoration: 'none' }}><h3 style={{ margin: 0 }}>{b.title}</h3></Link>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>{b.rating || '–'} <Stars value={Math.round(b.rating)} size={16} /></div>
                  <small style={{ color: 'var(--text-secondary)' }}>{rev.data.total} reviews</small>
                </div>
              </div>
              <div style={{ minWidth: 260 }}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, margin: '3px 0' }}>
                    <span style={{ width: 22 }}>{n} ★</span>
                    <div style={{ flex: 1, height: 8, background: 'var(--border-color)', borderRadius: 4 }}>
                      <div style={{ width: `${rev.data.distribution[n]}%`, height: '100%', background: '#2563eb', borderRadius: 4 }} />
                    </div>
                    <span style={{ width: 34 }}>{rev.data.distribution[n]}%</span>
                  </div>
                ))}
              </div>
              <button className="btn-primary" onClick={write}>Write a Review</button>
            </div>
            {err && <p style={{ color: '#dc2626', fontSize: 13 }}>{err}</p>}
            {open && (
              <form onSubmit={submit} className="auth-form" style={{ marginTop: 20 }}>
                <Stars value={rating} size={22} onPick={setRating} />
                <textarea rows="3" value={text} onChange={(e) => setText(e.target.value)} placeholder="Share your thoughts..." required
                  style={{ width: '100%', boxSizing: 'border-box', margin: '10px 0', padding: 10, borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontFamily: 'inherit' }} />
                <button className="btn-primary" type="submit">Submit Review</button>
              </form>
            )}
            <hr className="divider" />
            {rev.data.reviews.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No reviews yet. Be the first!</p>}
            {rev.data.reviews.map((r) => (
              <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{r.name}</strong><small style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.created_at)}</small></div>
                <Stars value={r.rating} size={12} />
                <p style={{ margin: '6px 0 0', fontSize: 13 }}>{r.text}</p>
              </div>
            ))}
          </div>
        )}
      </Loading>
    </div>
  );
};
export default Reviews;
