import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Spinner from '../components/Spinner';

interface User {
  id: string;
  name: string;
  email: string;
  shopId: string;
  shopName: string;
  shopEmail?: string;
  shopPhone?: string;
  shopSlogan?: string;
  shopLogo?: string;
  shopCurrency?: string;
  role: string;
  customRole?: string;
  accessibleBranches?: string[];
  mainBranches?: string[];
  isReadOnly?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  updateUser: (data: Partial<User>) => void;
  activeBranchId: string | null;
  switchBranch: (branchId: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Check local storage for token and user on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Fetch fresh user data to keep permissions up to date
        fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        })
        .then(res => {
          if (res.ok) return res.json();
        })
        .then(freshUser => {
          if (freshUser) {
            setUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));
            
            // Auto-select branch if not set
            if (!localStorage.getItem('activeBranchId')) {
              if (freshUser.accessibleBranches && freshUser.accessibleBranches.length > 0) {
                localStorage.setItem('activeBranchId', freshUser.accessibleBranches[0]);
                window.location.reload();
              }
            }
          }
        })
        .catch(err => console.error("Failed to refresh user data", err));
        
      } catch (e) {
        console.error("Failed to parse stored user", e);
      }
    }
    setIsInitialized(true);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    
    // Auto-select branch if not set
    if (!localStorage.getItem('activeBranchId')) {
      if (newUser.accessibleBranches && newUser.accessibleBranches.length > 0) {
        localStorage.setItem('activeBranchId', newUser.accessibleBranches[0]);
      }
    }
  };

  const logout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('activeBranchId');
      setIsLoggingOut(false);
    }, 800);
  };

  const activeBranchId = localStorage.getItem('activeBranchId') || null;

  const hasPermission = useCallback((permissionId: string) => {
    // If backend marks the session as Read-Only (e.g. Owner visiting another branch)
    if (user?.isReadOnly) {
      const readPermissions = ['view_vault', 'view_ledger', 'view_transfers', 'view_cash'];
      return readPermissions.includes(permissionId);
    }
    // Permission system disabled by user request. All staff have full access to their branches.
    return true;
  }, [user?.isReadOnly]);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const switchBranch = useCallback((branchId: string | null) => {
    if (branchId) {
      localStorage.setItem('activeBranchId', branchId);
    } else {
      localStorage.removeItem('activeBranchId');
    }
    window.location.reload();
  }, []);

  if (!isInitialized) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white dark:bg-slate-950 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }


  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, hasPermission, updateUser, activeBranchId, switchBranch }}>
      {children}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center transition-opacity duration-500">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <Spinner />
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900 dark:text-white mb-1">Signing out</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">See you next time!</p>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
