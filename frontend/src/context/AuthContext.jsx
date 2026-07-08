import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { AuthContext } from './authContextStore';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('codevault_token')));

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('codevault_token');
    if (!token) return undefined;

    api.getMe()
      .then(data => {
        if (!cancelled) setUser(data);
      })
      .catch(() => localStorage.removeItem('codevault_token'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem('codevault_token', data.token);
    setUser({ userId: data.userId, username: data.username, email: data.email });
    return data;
  };

  const register = async (username, email, password) => {
    const data = await api.register({ username, email, password });
    localStorage.setItem('codevault_token', data.token);
    setUser({ userId: data.userId, username });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('codevault_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
