import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

// Assumed shape of the user object from your auth server
interface User {
  id: string;
  email: string;
  name?: string; // name is optional
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean; // To handle initial token check
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  // register: (email: string, password: name: string) => Promise<boolean>; // 'name' parameter added here
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [isLoading, setIsLoading] = useState(true);

  // Effect to re-hydrate user state if a token is found on initial app load
  useEffect(() => {
    // In a stateless JWT setup, simply having a token means the user *might* be authenticated.
    // The actual validation happens when protected routes are accessed.
    // However, to display user info immediately, we'd typically store *some* user data alongside the token,
    // or make a `/api/auth/me` call.
    // Since our backend login/signup returns the user, we'll store minimal user data on successful auth.
    // For now, let's keep it simple: if a token exists, we assume a potential session.
    // A more robust app might add a `/api/auth/me` endpoint on the backend and call it here.

    // For this setup, we will:
    // 1. Check if a token exists.
    // 2. If it exists, attempt to parse user data that *might* be stored with it (e.g., in a separate localStorage item).
    //    For now, we'll just set isLoading to false.
    // 3. The `login` and `register` functions will set both token AND user.
    // If you add a `/api/auth/me` endpoint later, you can re-introduce a fetch call here.

    // Simplified initial load: just mark as loaded after checking for token existence.
    // The `user` state will only be populated after a successful login/register.
    setIsLoading(false);
  }, []); // Run only once on mount

  // --- Backend Interaction ---

  const handleAuthSuccess = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('authToken', authToken);
    // Optionally, store user data in localStorage too if you don't want to hit `/api/auth/me` on every refresh
    localStorage.setItem('user', JSON.stringify(userData));
    toast.success('Authentication successful!');
  };

  const handleAuthError = (error: any) => {
    toast.error(error.message || 'An unexpected error occurred.');
    console.error("Authentication error:", error);
    return false;
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed'); // Backend sends `error` field
      }

      handleAuthSuccess(data.user, data.token);
      return true;
    } catch (error: any) {
      return handleAuthError(error);
    }
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/signup', { // Corrected endpoint to `/api/auth/signup`
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed'); // Backend sends `error` field
      }

      handleAuthSuccess(data.user, data.token);
      return true;
    } catch (error: any) {
      return handleAuthError(error);
    }
  };

  const logout = async () => {
    // Optionally, inform the backend (though for stateless JWTs, client-side token deletion is enough)
    if (token) {
        try {
            await fetch('http://localhost:3000/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            toast.info("Successfully logged out from server.");
        } catch (error) {
            console.error("Logout API call failed, but proceeding with client-side logout:", error);
        }
    }

    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user'); // Also remove stored user data if you added it
    toast.info('You have been logged out.');
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user, // `!!user` ensures it's a boolean
    isLoading,
    login,
    register,
    logout,
  };

  // Render a loading state until the initial token check is complete
  if (isLoading) {
    return <div>Loading authentication...</div>; // Or a proper loading spinner component
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};