import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { api, fmtDateTime } from '../api';

const ICON = { new_book: '📚', order_update: '📦', new_order: '🛒', assignment: '🛵', delivered: '✅' };

// Bell with unread badge. Polls the API every 10s, so a customer sees
// "New book added" shortly after an admin adds it, and a pop-up toast appears.
export default function NotificationBell() {
  const navigate = useNavigate();
  const [data, setData] = useState({ unread: 0, notifications: [] });
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const lastId = useRef(null);
  const box = useRef(null);

  const load = useCallback(async () => {
    try {
      const d = await api('/notifications');
      const newest = d.notifications[0];
      if (lastId.current !== null && newest && newest.id > lastId.current && !newest.is_read) {
        setToast(newest);
        setTimeout(() => setToast(null), 7000);
      }
      if (newest) lastId.current = Math.max(lastId.current ?? 0, newest.id);
      else if (lastId.current === null) lastId.current = 0;
      setData(d);
    } catch { /* ignore: keep last state */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [load]);

  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openItem = async (n) => {
    setOpen(false); setToast(null);
    if (!n.is_read) { await api(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {}); load(); }
    if (n.link) navigate(n.link);
  };
  const readAll = async () => { await api('/notifications/read-all', { method: 'POST' }); load(); };

  return (
    <div ref={box} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(!open)} title="Notifications" aria-label="Notifications"
        style={{ position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', padding: 6, display: 'flex' }}>
        <Bell size={20} />
        {data.unread > 0 && (
          <span style={{ position: 'absolute', top: 0, right: 0, background: '#ef4444', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
            {data.unread > 99 ? '99+' : data.unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', right: 0, top: '110%', width: 330, maxHeight: 420, overflowY: 'auto', zIndex: 1000, background: 'var(--card-bg, #fff)', color: 'var(--text-primary, #111)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.18)', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
            <strong style={{ fontSize: 14 }}>Notifications</strong>
            {data.unread > 0 && <button onClick={readAll} style={{ background: 'none', border: 'none', color: 'var(--primary, #2563eb)', cursor: 'pointer', fontSize: 12 }}>Mark all read</button>}
          </div>
          {data.notifications.length === 0 && <p style={{ padding: 16, fontSize: 13, color: 'var(--text-secondary, #6b7280)' }}>No notifications yet.</p>}
          {data.notifications.map((n) => (
            <div key={n.id} onClick={() => openItem(n)}
              style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', gap: 10, borderBottom: '1px solid var(--border-color, #f1f5f9)', background: n.is_read ? 'transparent' : 'rgba(37,99,235,.08)' }}>
              <span style={{ fontSize: 20 }}>{ICON[n.type] || '🔔'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: n.is_read ? 500 : 700 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)' }}>{n.message}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary, #9ca3af)', marginTop: 2 }}>{fmtDateTime(n.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div onClick={() => openItem(toast)}
          style={{ position: 'fixed', right: 20, top: 80, zIndex: 2000, width: 300, cursor: 'pointer', background: '#1e293b', color: '#fff', padding: '12px 14px', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.35)', display: 'flex', gap: 10, textAlign: 'left' }}>
          <span style={{ fontSize: 22 }}>{ICON[toast.type] || '🔔'}</span>
          <div><div style={{ fontWeight: 700, fontSize: 13 }}>{toast.title}</div><div style={{ fontSize: 12, opacity: 0.85 }}>{toast.message}</div></div>
        </div>
      )}
    </div>
  );
}
