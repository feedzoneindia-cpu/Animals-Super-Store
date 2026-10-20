import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService.js';

const AuthContext = createContext(null);

/**
 * Holds the authenticated user (or null) and exposes auth actions.
 * The user is restored on mount via GET /auth/me so a page refresh
 * keeps the session alive — no localStorage token handling.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authService
      .me()
      .then((currentUser) => {
        if (!cancelled) setUser(currentUser);
      })
      .catch(() => {
        // Anonymous — expected for logged-out visitors.
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (payload) => {
    const currentUser = await authService.login(payload);
    setUser(currentUser);
    return currentUser;
  }, []);

  const register = useCallback(async (payload) => {
    const currentUser = await authService.register(payload);
    setUser(currentUser);
    return currentUser;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const currentUser = await authService.googleLogin(credential);
    setUser(currentUser);
    return currentUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const currentUser = await authService.updateProfile(payload);
    setUser(currentUser);
    return currentUser;
  }, []);

  const value = useMemo(
    () => ({ user, isInitializing, login, register, loginWithGoogle, logout, updateProfile }),
    [user, isInitializing, login, register, loginWithGoogle, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
