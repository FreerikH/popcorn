import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Base URL for API requests
let API_BASE_URL = '/api';
if (import.meta.env.DEV) {
  API_BASE_URL = 'http://localhost:7000/api';
  console.log('Development build', API_BASE_URL);
} else {
  API_BASE_URL = '/api';
  console.log('Production build', API_BASE_URL);
}

// Types for the API context
interface ApiContextType {
  get: <T>(endpoint: string) => Promise<T>;
  post: <T>(endpoint: string, data?: any) => Promise<T>;
  put: <T>(endpoint: string, data?: any) => Promise<T>;
  delete: <T>(endpoint: string) => Promise<T>;
}

interface ApiProviderProps {
  children: ReactNode;
}

// Create the context with default values
const ApiContext = createContext<ApiContextType>({
  get: async () => Promise.reject('ApiProvider not initialized'),
  post: async () => Promise.reject('ApiProvider not initialized'),
  put: async () => Promise.reject('ApiProvider not initialized'),
  delete: async () => Promise.reject('ApiProvider not initialized'),
});

// Custom hook to use the API context
export const useApi = () => {
  return useContext(ApiContext);
};

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  const { token } = useAuth();

  // Common options for fetch
  const getHeaders = (): HeadersInit => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  };

  // Handle API response
  const handleResponse = async <T,>(response: Response): Promise<T> => {
    // For responses with no content
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();

    if (!response.ok) {
      // You can enhance error handling based on your API's error format
      throw new Error(data.message || 'An error occurred');
    }

    return data as T;
  };

  // API methods
  const get = async <T,>(endpoint: string): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    return handleResponse<T>(response);
  };

  const post = async <T,>(endpoint: string, data?: any): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return handleResponse<T>(response);
  };

  const put = async <T,>(endpoint: string, data?: any): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return handleResponse<T>(response);
  };

  const deleteMethod = async <T,>(endpoint: string): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    return handleResponse<T>(response);
  };

  const apiContextValue: ApiContextType = {
    get,
    post,
    put,
    delete: deleteMethod,
  };

  return (
    <ApiContext.Provider value={apiContextValue}>
      {children}
    </ApiContext.Provider>
  );
};