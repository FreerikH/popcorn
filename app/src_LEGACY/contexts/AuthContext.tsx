import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// User type definition
export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

// Auth context type definition
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the Auth Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Get baseURL for API requests
  const getBaseUrl = useCallback(() => {
    const isProduction = !window.location.hostname.includes('localhost') && 
                       !window.location.hostname.includes('127.0.0.1');
    return isProduction ? '' : 'http://127.0.0.1:8000';
  }, []);

  // Create a function to make authenticated API requests
  const apiRequest = useCallback(async <T,>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<T> => {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      };

      // Add body for POST and PUT requests
      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      console.log(`Auth API ${method} request to:`, url);
      const response = await fetch(url, options);
      
      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Error: ${response.status} ${response.statusText}` }));
        throw new Error(errorData.message || 'Authentication failed');
      }
      
      // Try to parse JSON response
      const result = await response.json();
      console.log(`Auth API ${method} response:`, result);
      return result as T;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error(`Auth API ${method} error:`, errorMessage);
      setError(errorMessage);
      throw err;
    }
  }, [getBaseUrl]);

  // Special function for login that uses form data format
  const loginRequest = useCallback(async (email: string, password: string) => {
    try {
      console.log('login');
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/api/auth/login`;
      
      // Use FormData for login to match OAuth2PasswordRequestForm
      const formData = new FormData();
      formData.append('username', email); // Backend expects 'username' not 'email'
      formData.append('password', password);
      
      const options: RequestInit = {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        body: formData // Send as form data, not JSON
      };
      
      console.log(`Auth API login request to:`, url);
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Error: ${response.status} ${response.statusText}` }));
        throw new Error(errorData.message || 'Login failed');
      }
      
      const result = await response.json();
      console.log(`Auth API login response:`, result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error(`Auth API login error:`, errorMessage);
      setError(errorMessage);
      throw err;
    }
  }, [getBaseUrl]);

  // Check if user is authenticated
  const checkAuthStatus = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      // Updated endpoint to match backend
      const data = await apiRequest<{ data: User }>('GET', '/api/auth/me');
      
      if (data && data.data) {
        setUser(data.data);
        setIsAuthenticated(true);
        setError(null);
        return true;
      } else {
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }
    } catch (err) {
      console.error("Auth status check failed:", err);
      setUser(null);
      setIsAuthenticated(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Use specialized login request function
      const data = await loginRequest(email, password);
      
      if (data && data.data) {
        setUser(data.data);
        setIsAuthenticated(true);
      } else {
        throw new Error('Login failed: No user data returned');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loginRequest]);

  // Register function
  const register = useCallback(async (name: string, email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Updated endpoint to match backend
      const data = await apiRequest<{ data: User }>('POST', '/api/auth/register', { name, email, password });
      
      if (data && data.data) {
        setUser(data.data);
        setIsAuthenticated(true);
      } else {
        throw new Error('Registration failed: No user data returned');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Updated endpoint to match backend
      await apiRequest<{ success: boolean }>('POST', '/api/auth/logout');
      
      // Clear user state regardless of API response
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    } catch (err) {
      console.error("Logout error:", err);
      // Still clear user state even if API call fails
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Prepare the context value
  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    checkAuthStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the Auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};