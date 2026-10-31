/* eslint-disable react-refresh/only-export-components */
// oxlint-disable react/only-export-components
import React, { createContext, useState, useEffect, useRef } from 'react';
import api, { getAuthToken, getActiveRoleFromPath } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const loginInFlightRef = useRef(false);

  useEffect(() => {
    const loadUser = async () => {
      const params = new URLSearchParams(window.location.search);
      const queryToken = params.get('auth_token');
      if (queryToken) {
        try {
          sessionStorage.setItem('token', queryToken);
          localStorage.setItem('token', queryToken);
        } catch {}
      }

      const token = getAuthToken();
      if (token) {
        try {
          const res = await api.get('/auth/me');
          const userData = res.data.data;
          setUser(userData);
          if (userData?.role) {
            try {
              sessionStorage.setItem('token', token);
              sessionStorage.setItem('user_role', userData.role);
              localStorage.setItem(`token_${userData.role}`, token);
            } catch {}
          }
        } catch (err) {
          console.error('Failed to load user', err);
          // Only invalidate and clear stored tokens if unauthorized (HTTP 401)
          // Transient issues like rate limiting (HTTP 429) or temporary network failure must NOT wipe tokens
          if (err.response?.status === 401) {
            try {
              sessionStorage.removeItem('token');
              sessionStorage.removeItem('user_role');
              const activeRole = getActiveRoleFromPath();
              if (activeRole) {
                localStorage.removeItem(`token_${activeRole}`);
              }
            } catch {}
          }
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = async (email, password, role) => {
    if (loginInFlightRef.current) {
      return Promise.reject(new Error('A login request is already in progress.'));
    }
    loginInFlightRef.current = true;
    try {
      const payload = { email, password };
      if (role) payload.role = role;
      const res = await api.post('/auth/login', payload);
      const { token, user: loggedInUser } = res.data;
      
      // Store in tab-isolated sessionStorage
      try {
        sessionStorage.setItem('token', token);
        if (loggedInUser?.role) {
          sessionStorage.setItem('user_role', loggedInUser.role);
          // Store in role-scoped localStorage for persistence across reloads
          localStorage.setItem(`token_${loggedInUser.role}`, token);
        }
        localStorage.setItem('token', token);
      } catch {}

      setUser(loggedInUser);
      return res.data;
    } finally {
      loginInFlightRef.current = false;
    }
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  };

  const registerSociety = async (societyData) => {
    const res = await api.post('/auth/register-society', societyData);
    return res.data;
  };

  const joinSociety = async (joinData) => {
    const res = await api.post('/auth/join-society', joinData);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}

    const role = user?.role || sessionStorage.getItem('user_role') || getActiveRoleFromPath();
    try {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user_role');
      if (role) {
        localStorage.removeItem(`token_${role}`);
      }
      // If the generic token matches this session, clear it as well
      const genericToken = localStorage.getItem('token');
      const currentToken = getAuthToken();
      if (genericToken === currentToken) {
        localStorage.removeItem('token');
      }
    } catch {}

    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, registerSociety, joinSociety }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
