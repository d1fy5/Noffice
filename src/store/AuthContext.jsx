import { createContext, useContext, useState, useEffect } from 'react';
import { AuthAPI } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('noffice.auth');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('noffice.auth', JSON.stringify(user));
    } else {
      localStorage.removeItem('noffice.auth');
    }
  }, [user]);

  const login = async (email, password) => {
    try {
      const result = await AuthAPI.login(email, password);
      if (result.success && result.user) {
        setUser(result.user);
        return { success: true };
      }
      return { success: false, message: result.message || 'Email atau password salah' };
    } catch (error) {
      return { success: false, message: 'Gagal terhubung ke server' };
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
