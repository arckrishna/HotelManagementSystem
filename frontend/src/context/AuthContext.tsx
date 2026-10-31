import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authApi } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<User>;
  loginAsDemoRole: (role: UserRole) => Promise<User>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_CREDENTIALS: Record<UserRole, { user: string; pass: string; title: string }> = {
  admin: { user: 'admin@staysync.com', pass: 'Admin@123', title: 'Admin / Hotel Manager' },
  receptionist: { user: 'receptionist@staysync.com', pass: 'Staff@123', title: 'Receptionist' },
  restaurant_staff: { user: 'restaurant@staysync.com', pass: 'Staff@123', title: 'Restaurant Staff' },
  bar_staff: { user: 'bar@staysync.com', pass: 'Staff@123', title: 'Bar Staff' },
  maintenance_staff: { user: 'maintenance@staysync.com', pass: 'Staff@123', title: 'Maintenance Staff' },
  inventory_manager: { user: 'inventory@staysync.com', pass: 'Staff@123', title: 'Inventory Manager' },
  accountant: { user: 'accountant@staysync.com', pass: 'Staff@123', title: 'Accountant' },
  guest: { user: 'guest1@staysync.com', pass: 'Guest@123', title: 'Guest (Priya Sharma)' },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('staysync_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('staysync_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('staysync_token');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          setUser(res.data);
          localStorage.setItem('staysync_user', JSON.stringify(res.data));
        } catch (err) {
          console.error("Token verification failed:", err);
          logout();
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (usernameOrEmail: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authApi.login({ username_or_email: usernameOrEmail, password });
      const { access_token, user_id, username, email, role, full_name } = res.data;
      
      const loggedInUser: User = {
        id: user_id,
        username,
        email,
        full_name,
        role: role as UserRole,
        is_active: true,
        created_at: new Date().toISOString()
      };

      setToken(access_token);
      setUser(loggedInUser);
      localStorage.setItem('staysync_token', access_token);
      localStorage.setItem('staysync_user', JSON.stringify(loggedInUser));

      return loggedInUser;
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemoRole = async (role: UserRole): Promise<User> => {
    const creds = DEMO_CREDENTIALS[role];
    if (!creds) throw new Error(`Unknown role: ${role}`);
    return login(creds.user, creds.pass);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('staysync_token');
    localStorage.removeItem('staysync_user');
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true; // Admin has superuser access
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, loginAsDemoRole, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
