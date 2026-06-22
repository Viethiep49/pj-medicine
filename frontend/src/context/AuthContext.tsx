import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthUser {
  id: string;
  username: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }
    return {
      id: payload.sub ?? '',
      username: payload.username ?? '',
      role: payload.role ?? '',
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('access_token');
    if (stored) {
      const decoded = decodeToken(stored);
      if (decoded) {
        setToken(stored);
        setUser(decoded);
      } else {
        localStorage.removeItem('access_token');
      }
    }
  }, []);

  const login = (newToken: string) => {
    const decoded = decodeToken(newToken);
    if (decoded) {
      localStorage.setItem('access_token', newToken);
      setToken(newToken);
      setUser(decoded);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
