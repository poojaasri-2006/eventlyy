import API_BASE_URL from '../config';
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('evently_token') || null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('evently_token')));

  useEffect(() => {
    let active = true;

    if (!token) {
      localStorage.removeItem('evently_token');
      localStorage.removeItem('evently_user');
      return () => {
        active = false;
      };
    }
    localStorage.setItem('evently_token', token);
    fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (response) => {
        if (!response.ok) {
          if (active) {
            setToken(null);
            setUser(null);
          }
          return;
        }
        const userData = await response.json();
        if (active) {
          setUser(userData);
          localStorage.setItem('evently_user', JSON.stringify(userData));
        }
      })
      .catch((error) => {
        console.error('Error fetching user', error);
        if (active) {
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const login = async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('evently_user', JSON.stringify(data.user));
      return { success: true, user: data.user };
    }
    return { success: false, message: data.message };
  };

  const logout = () => {
    localStorage.removeItem('evently_token');
    localStorage.removeItem('evently_user');
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
