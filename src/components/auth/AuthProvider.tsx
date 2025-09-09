import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

// Assumed shape of the user object from your auth server
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  country?: string;
  cvPath?: string;
  preferredJobTypes?: string;
  preferredLocations?: string;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean; // To handle initial token check
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, firstName: string, lastName: string, phoneNumber?: string) => Promise<boolean>;
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

// --- IMPORTANT ---
// This code assumes your auth server has the following endpoints:
// POST /api/auth/signup - Body: { firstName, lastName, email, password, phoneNumber }
// POST /api/auth/signin - Body: { email, password }
// GET  /api/auth/profile - Header: { Authorization: "Bearer <token>" }
//
// And that a successful login/register returns: { user: {...}, token: "...", jwtToken: "..." }

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [isLoading, setIsLoading] = useState(true);

  // Effect to check for an existing token on initial app load
  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        try {
          // Verify the token with the backend
          const response = await fetch('http://localhost:3000/api/auth/profile', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
          } else {
            // Token is invalid or expired
            localStorage.removeItem('authToken');
            setToken(null);
            setUser(null);
          }
        } catch (error) {
          console.error("Token validation failed", error);
          localStorage.removeItem('authToken');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    validateToken();
  }, [token]);


  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const { user: userData, token: authToken } = await response.json();
      
      setUser(userData);
      setToken(authToken);
      localStorage.setItem('authToken', authToken);
      
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  const register = async (email: string, password: string, firstName: string, lastName: string, phoneNumber?: string): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password, phoneNumber }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const { user: userData, token: authToken } = await response.json();

      setUser(userData);
      setToken(authToken);
      localStorage.setItem('authToken', authToken);

      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('http://localhost:3000/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('authToken');
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
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