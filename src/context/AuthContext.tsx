import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../api/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const token = await AsyncStorage.getItem('token');
      const cached = await AsyncStorage.getItem('user');
      if (token && cached) {
        try {
          setUser(JSON.parse(cached));
        } catch {
          await AsyncStorage.removeItem('user');
        }
        authAPI
          .me()
          .then(({ data }) => setUser(data.data.user))
          .catch(async () => {
            await AsyncStorage.multiRemove(['token', 'user']);
            setUser(null);
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (credentials: {
    email: string;
    password: string;
  }): Promise<User> => {
    const { data } = await authAPI.login(credentials);
    const { user: u, token } = data.data;
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  };

  const register = async (payload: {
    name: string;
    email: string;
    password: string;
  }): Promise<User> => {
    const { data } = await authAPI.register(payload);
    const { user: u, token } = data.data;
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user !== null && user.role === 'admin',
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
