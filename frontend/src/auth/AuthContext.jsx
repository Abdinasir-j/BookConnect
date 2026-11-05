import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const roleHome = (role) => (role === 'admin' ? '/admin/dashboard' : role === 'agent' ? '/agent/dashboard' : '/dashboard');
export const roleLogin = (role) => `/login?role=${role || 'customer'}`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!getToken()); // wait for /me only if a token exists

  const logout = useCallback(() => { setToken(null); setUser(null); }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!getToken()) return;
    api('/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
  }, [logout]);

  const login = async (identifier, password, role) => {
    const res = await api('/auth/login', { method: 'POST', body: { identifier, password, role }, auth: false });
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const register = async (form) => {
    const res = await api('/auth/register', { method: 'POST', body: form, auth: false });
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  return <AuthContext.Provider value={{ user, ready, login, register, logout, setUser }}>{children}</AuthContext.Provider>;
}
