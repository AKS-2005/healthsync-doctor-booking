import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('healthsync_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize and verify user from token on app mount
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('healthsync_token');
      if (savedToken) {
        try {
          const res = await authApi.getMe();
          if (res.data.success) {
            setUser(res.data.user);
          }
        } catch (error) {
          console.warn('Session check failed or expired:', error.message);
          localStorage.removeItem('healthsync_token');
          localStorage.removeItem('healthsync_user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Login handler
  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.data.success) {
      const { token: receivedToken, user: receivedUser } = res.data;
      localStorage.setItem('healthsync_token', receivedToken);
      localStorage.setItem('healthsync_user', JSON.stringify(receivedUser));
      setToken(receivedToken);
      setUser(receivedUser);
      return receivedUser;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  // Register handler
  const register = async (userData) => {
    const res = await authApi.register(userData);
    if (res.data.success) {
      const { token: receivedToken, user: receivedUser } = res.data;
      localStorage.setItem('healthsync_token', receivedToken);
      localStorage.setItem('healthsync_user', JSON.stringify(receivedUser));
      setToken(receivedToken);
      setUser(receivedUser);
      return receivedUser;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  // Quick Demo Login Helper for seamless testing
  const loginAsDemo = async (role = 'PATIENT') => {
    let email = 'patient1@healthsync.com';
    let password = 'patient123';

    if (role === 'DOCTOR') {
      email = 'dr.sharma@healthsync.com';
      password = 'doctor123';
    } else if (role === 'ADMIN') {
      email = 'admin@healthsync.com';
      password = 'admin123';
    }

    return await login(email, password);
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('healthsync_token');
    localStorage.removeItem('healthsync_user');
    setToken(null);
    setUser(null);
  };
  const isPatient = user?.role === 'PATIENT';
  const isDoctor = user?.role === 'DOCTOR';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        loginAsDemo,
        logout,
        isAuthenticated: !!user,
        isPatient,
        isDoctor,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
