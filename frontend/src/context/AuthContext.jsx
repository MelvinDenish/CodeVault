import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('codevault_token');
    if (token) {
      api.getMe()
        .then(data => setUser(data))
        .catch(() => localStorage.removeItem('codevault_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
