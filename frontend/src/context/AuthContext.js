import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://vxblnqeiujmjkydxnqex.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4YmxucWVpdWptamt5ZHhucWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNDEwMzYsImV4cCI6MjA4NTgxNzAzNn0.qmD57HGGTvKdxuqbxrahtEkGwUUeBe-I1tcoOfV7rvw';
const AUTH_API = `${SUPABASE_URL}/functions/v1/auth`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  const clearAuth = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const authHeaders = useCallback(() => {
    const headers = { 'Content-Type': 'application/json' };
    if (SUPABASE_ANON_KEY) {
      headers['apikey'] = SUPABASE_ANON_KEY;
      headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
    }
    return headers;
  }, []);

  const authedHeaders = useCallback((userToken) => {
    const headers = { 'Content-Type': 'application/json' };
    if (SUPABASE_ANON_KEY) {
      headers['apikey'] = SUPABASE_ANON_KEY;
    }
    headers['Authorization'] = `Bearer ${userToken}`;
    return headers;
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${AUTH_API}/me`, {
            headers: authedHeaders(token)
          });
          const userData = response.data;
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
          clearAuth();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token, clearAuth, authedHeaders]);

  const login = async (email, password) => {
    const response = await axios.post(`${AUTH_API}/login`, { email, password }, {
      headers: authHeaders()
    });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, name) => {
    const response = await axios.post(`${AUTH_API}/register`, { email, password, name }, {
      headers: authHeaders()
    });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const isAuthenticated = !!user && !!token;

  const requestPasswordReset = async (email) => {
    const response = await axios.post(`${AUTH_API}/password-reset/request`, { email }, {
      headers: authHeaders()
    });
    return response.data;
  };

  const confirmPasswordReset = async (resetToken, newPassword) => {
    const response = await axios.post(`${AUTH_API}/password-reset/confirm`, {
      token: resetToken,
      new_password: newPassword
    }, { headers: authHeaders() });
    return response.data;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const response = await axios.post(
      `${AUTH_API}/change-password`,
      { current_password: currentPassword, new_password: newPassword },
      { headers: authedHeaders(token) }
    );
    return response.data;
  };

  const updateProfile = async (data) => {
    const response = await axios.patch(`${AUTH_API}/profile`, data, {
      headers: authedHeaders(token)
    });
    if (response.data.user) {
      updateUser(response.data.user);
    }
    return response.data;
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      register,
      logout,
      updateUser,
      loading,
      getAuthHeader,
      isAdmin,
      isStaff,
      isAuthenticated,
      requestPasswordReset,
      confirmPasswordReset,
      changePassword,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
