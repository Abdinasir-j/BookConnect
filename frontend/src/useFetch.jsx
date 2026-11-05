import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export function useFetch(path, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!path) return Promise.resolve();
    setLoading(true);
    setError('');
    return api(path)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load, setData };
}

export const Loading = ({ loading, error, children }) => {
  if (loading) return <p style={{ color: 'var(--text-secondary)', padding: 20 }}>Loading…</p>;
  if (error) return <p style={{ color: '#dc2626', padding: 20 }}>⚠ {error}</p>;
  return children;
};
