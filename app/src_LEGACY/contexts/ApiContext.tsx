import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

// Define types for API context
interface ApiContextType {
  apiGet: <T>(endpoint: string) => Promise<T>;
  apiPost: <T>(endpoint: string, data?: any) => Promise<T>;
  apiPut: <T>(endpoint: string, data?: any) => Promise<T>;
  apiDelete: <T>(endpoint: string) => Promise<T>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

// Create the context with a default value
const ApiContext = createContext<ApiContextType | undefined>(undefined);

// Provider component
export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get baseURL for API requests
  const getBaseUrl = useCallback(() => {
    const isProduction = !window.location.hostname.includes('localhost') && 
                       !window.location.hostname.includes('127.0.0.1');
    return isProduction ? '' : 'http://127.0.0.1:8000';
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Handle response and errors
  const handleResponse = useCallback(async (response: Response) => {
    if (response.status === 401) {
      // Unauthorized - logout user
      await logout();
      throw new Error('Your session has expired. Please log in again.');
    }

    // Try to parse JSON response
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Check if response is ok
    if (!response.ok) {
      const errorMessage = data?.message || `Error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return data;
  }, [logout]);

  // Generic request function
  const apiRequest = useCallback(async <T,>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<T> => {
    setLoading(true);
    setError(null);

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

      console.log(`API ${method} request to:`, url);
      const response = await fetch(url, options);
      const result = await handleResponse(response);
      
      console.log(`API ${method} response:`, result);
      return result as T;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error(`API ${method} error:`, errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getBaseUrl, handleResponse]);

  // Specific methods
  const apiGet = useCallback(<T,>(endpoint: string): Promise<T> => {
    return apiRequest<T>('GET', endpoint);
  }, [apiRequest]);

  const apiPost = useCallback(<T,>(endpoint: string, data?: any): Promise<T> => {
    return apiRequest<T>('POST', endpoint, data);
  }, [apiRequest]);

  const apiPut = useCallback(<T,>(endpoint: string, data?: any): Promise<T> => {
    return apiRequest<T>('PUT', endpoint, data);
  }, [apiRequest]);

  const apiDelete = useCallback(<T,>(endpoint: string): Promise<T> => {
    return apiRequest<T>('DELETE', endpoint);
  }, [apiRequest]);

  // Context value
  const value: ApiContextType = {
    apiGet,
    apiPost,
    apiPut,
    apiDelete,
    loading,
    error,
    clearError
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
};

// Custom hook for using the API context
export const useApi = (): ApiContextType => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};