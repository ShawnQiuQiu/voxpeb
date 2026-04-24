import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Mock User type to replace Supabase User
export interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string) => Promise<void>;
  signUp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for existing session
    const storedUser = localStorage.getItem('voxpeb_mock_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user', e);
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    const mockUser = { id: Math.random().toString(36).substring(7), email };
    setUser(mockUser);
    localStorage.setItem('voxpeb_mock_user', JSON.stringify(mockUser));
  };

  const signUp = async (email: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    const mockUser = { id: Math.random().toString(36).substring(7), email };
    setUser(mockUser);
    localStorage.setItem('voxpeb_mock_user', JSON.stringify(mockUser));
  };

  const signOut = async () => {
    await new Promise(resolve => setTimeout(resolve, 400));
    setUser(null);
    localStorage.removeItem('voxpeb_mock_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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