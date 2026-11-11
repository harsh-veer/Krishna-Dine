import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/endpoints';
import { onAuthError, tokenStore } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [mustChangePassword, setMustChange] = useState(false);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  const applySession = useCallback((data) => {
    if (data.token) tokenStore.set(data.token);
    setUser(data.user);
    setMustChange(Boolean(data.mustChangePassword));
    return data;
  }, []);

  const clear = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setMustChange(false);
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) return;
    authApi
      .me()
      .then(applySession)
      .catch(clear)
      .finally(() => setLoading(false));
  }, [applySession, clear]);

  useEffect(
    () =>
      onAuthError(({ status, code }) => {
        if (code === 'PASSWORD_CHANGE_REQUIRED') setMustChange(true);
        else if (status === 401) clear();
      }),
    [clear]
  );

  const value = useMemo(
    () => ({
      user,
      token: tokenStore.get(),
      loading,
      mustChangePassword,
      isAuthenticated: Boolean(user),
      login: async (email, password) => applySession(await authApi.login({ email, password })),
      changePassword: async (currentPassword, newPassword) => applySession(await authApi.changePassword({ currentPassword, newPassword })),
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          /* ignore */
        }
        clear();
      },
    }),
    [user, loading, mustChangePassword, applySession, clear]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export const homeFor = (user) => (user?.role === 'admin' ? '/admin' : user?.role === 'waiter' ? '/waiter' : '/kitchen');
