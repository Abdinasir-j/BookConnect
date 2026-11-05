import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Star } from 'lucide-react';
import { ksh } from '../../api';
import { useFetch, Loading } from '../../useFetch';

const BookCatalog = ({ addToCart }) => {
  const [params] = useSearchParams();
  const search = params.get('search') || '';
  const [category, setCategory] = useState(params.get('category') || 'All Books');
  const [sort, setSort] = useState('popularity');
  const cats = useFetch('/books/categories');
  const q = new URLSearchParams({ sort, ...(search && { search }), ...(category !== 'All Books' && { category }) }).toString();
  const { data: list, loading, error } = useFetch(`/books?${q}`);

  return (
    <div className="page-container catalog-layout">
      <aside className="card-box sidebar">
        <h4>Categories</h4>
        <ul>
          {['All Books', ...(cats.data || [])].map((c) => (
            <li key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</li>
          ))}
        </ul>
      </aside>
      <main className="catalog-main">
        <div className="sec-header">
          <h2>{search ? `Results for "${search}"` : category}</h2>
          <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="popularity">Sort by: Popularity</option>
            <option value="newest">Newest</option>
            <option value="low">Price: Low to High</option>
            <option value="high">Price: High to Low</option>
          </select>
        </div>
        <Loading loading={loading} error={error}>
          {list?.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No books found.</p>}
          <div className="books-grid cat-books">
            {(list || []).map((b) => (
              <div key={b.id} className="card-box book-card">
                <Link to={`/book/${b.id}`} className="book-thumb" style={{ textDecoration: 'none' }}>{b.emoji}</Link>
                <Link to={`/book/${b.id}`} style={{ textDecoration: 'none' }}><h4>{b.title}</h4></Link>
                <p className="author">{b.author}</p>
                <div className="rating"><Star size={13} fill="#f59e0b" color="#f59e0b" /><span>({b.rating || 'New'})</span>
                  {b.stock < 1 && <span style={{ color: '#dc2626', marginLeft: 6 }}>Out of stock</span>}</div>
                <div className="book-bottom">
                  <span className="price">{ksh(b.price)}</span>
                  <button className="btn-sm" style={{ border: 'none' }} disabled={b.stock < 1} onClick={() => addToCart(b)}>Add to Cart</button>
                </div>
              </div>
            ))}
          </div>
        </Loading>
      </main>
    </div>
  );
};
export default BookCatalog;
