import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

// API Base URL
//const API_BASE_URL = 'http://localhost:7000/api';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Define types
export interface User {
  email: string;
  disabled?: boolean;
  name?: string;
  avatar?: string;
}

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string, avatar?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
}

// Create auth context with default values
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  token: null,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: () => {},
  isAuthenticated: false
});

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch user data helper function
  const fetchUserData = async (authToken: string): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Check if we have a token on initial load
  useEffect(() => {
    const checkLoggedIn = async () => {
      if (token) {
        const userData = await fetchUserData(token);
        if (userData) {
          setCurrentUser(userData);
        } else {
          // Token is invalid, clear it
          logout();
        }
      }
      setLoading(false);
    };
    
    checkLoggedIn();
  }, [token]);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      
      const response = await fetch(`${API_BASE_URL}/token`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const data: LoginResponse = await response.json();
        const authToken = data.access_token;
        
        // Save token
        setToken(authToken);
        localStorage.setItem('token', authToken);
        
        // Fetch user data
        const userData = await fetchUserData(authToken);
        if (userData) {
          setCurrentUser(userData);
          return { success: true };
        }
      }
      
      return { success: false, message: 'Invalid email or password' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'An error occurred during login' };
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string) => {
    try {
      const userData = {
        name,
        email,
        password
      };
      
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (response.status === 201) {
        // Auto-login after successful registration
        return await login(email, password);
      } else if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.detail || 'Registration failed' };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'An error occurred during registration' };
    }
  };

  // Logout function
  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const value: AuthContextType = {
    currentUser,
    token,
    login,
    register,
    logout,
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};