import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const BYPASS_AUTH = true; // Authentication disabled - portal is open access
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const AuthContext = createContext(null);

// Default user for bypass mode
const DEFAULT_USER = {
  id: 'bypass-user',
  email: 'staff@illinoisestatelaw.com',
  name: 'Staff User',
  role: 'admin',
  is_active: true
};

console.log('[AUTH] API endpoint:', API);
console.log('[AUTH] Bypass mode: ENABLED (no login required)');

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    if (BYPASS_AUTH) {
      // Store bypass user and token in localStorage for API interceptors
      localStorage.setItem('user', JSON.stringify(DEFAULT_USER));
      localStorage.setItem('token', 'bypass-token');
      return DEFAULT_USER;
    }
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => {
    if (BYPASS_AUTH) {
      localStorage.setItem('token', 'bypass-token');
      return 'bypass-token';
    }
    return localStorage.getItem('token');
  });
  const [loading, setLoading] = useState(false); // No loading needed in bypass mode

  const clearAuth = useCallback(() => {
    if (BYPASS_AUTH) return; // Don't clear auth in bypass mode
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (BYPASS_AUTH) {
      // Skip auth check in bypass mode
      return;
    }
    const initAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const userData = response.data;
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
          console.error('Auth check failed:', error);
          clearAuth();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token, clearAuth]);

  const login = async (email, password) => {
    console.log('[AUTH] Login attempt for:', email);
    console.log('[AUTH] API endpoint:', `${API}/auth/login`);

    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      console.log('[AUTH] Login successful');

      const { access_token, user: userData } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(access_token);
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('[AUTH] Login failed:', error);
      console.error('[AUTH] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
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
  const isAuthenticated = BYPASS_AUTH ? true : (!!user && !!token);

  const requestPasswordReset = async (email) => {
    const response = await axios.post(`${API}/auth/password-reset/request`, { email });
    return response.data;
  };

  const confirmPasswordReset = async (resetToken, newPassword) => {
    const response = await axios.post(`${API}/auth/password-reset/confirm`, {
      token: resetToken,
      new_password: newPassword
    });
    return response.data;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const response = await axios.post(
      `${API}/auth/change-password`,
      { current_password: currentPassword, new_password: newPassword },
      getAuthHeader()
    );
    return response.data;
  };

  const updateProfile = async (data) => {
    const response = await axios.patch(`${API}/auth/profile`, data, getAuthHeader());
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
