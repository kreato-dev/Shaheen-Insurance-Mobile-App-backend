// src/hooks/useAuth.js
import { useEffect, useState } from 'react';
import { loginAdmin } from '../api';

const TOKEN_KEY = 'shaheen_admin_token';

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  async function login({ mobile, password }) {
    setLoading(true);
    try {
      const res = await loginAdmin({ mobile, password });
      setToken(res.token);
      setUserInfo({
        id: res.user?.id,
        fullName: res.user?.fullName,
        role: res.user?.role,
      });
      return res;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken('');
    setUserInfo(null);
  }

  const isAuthenticated = !!token;

  return {
    token,
    isAuthenticated,
    loading,
    login,
    logout,
    userInfo,
  };
}
