import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
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
    const response = await axios.post(`${API}/auth/login`, { email, password });
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
