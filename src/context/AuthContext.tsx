import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

interface User {
  email: string;
  isPro?: boolean;
  proPlan?: string;
  proExpiresAt?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  useEffect(() => {
    const checkToken = () => {
      // 1. Check URL parameters (for mobile/webview redirects)
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      const urlUser = params.get('user');

      if (urlToken && urlUser) {
        try {
          const userObj = JSON.parse(urlUser);
          login(urlToken, userObj);
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
          setIsLoading(false);
          return;
        } catch (e) {
          console.error('Failed to parse user from URL', e);
        }
      }

      // 2. Check LocalStorage
      const savedToken = localStorage.getItem('auth_token');
      const savedUser = localStorage.getItem('auth_user');
      
      if (savedToken && savedUser) {
        try {
          const decoded: any = jwtDecode(savedToken);
          const currentTime = Date.now() / 1000;
          
          if (decoded.exp < currentTime) {
            logout();
          } else if (!token) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
          }
        } catch (error) {
          logout();
        }
      }
      setIsLoading(false);
    };

    checkToken();
    const interval = setInterval(checkToken, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      isAuthenticated: !!token,
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
