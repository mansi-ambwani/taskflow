import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // On first load, restore the session from the saved token.
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((res) => setUser(res.data.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  // Any 401 from the API (expired token) logs the user out.
  useEffect(() => {
    window.addEventListener('taskflow:unauthorized', logout);
    return () => window.removeEventListener('taskflow:unauthorized', logout);
  }, [logout]);

  const handleAuth = (res) => {
    tokenStore.set(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const login = useCallback(async (email, password) => handleAuth(await api.login({ email, password })), []);
  const register = useCallback(
    async (name, email, password, inviteCode) => handleAuth(await api.register({ name, email, password, inviteCode })),
    []
  );

  const value = useMemo(
    () => ({ user, loading, isAdmin: user?.role === 'admin', login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
