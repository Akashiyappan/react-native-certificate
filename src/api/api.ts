import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['token', 'user']);
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authAPI = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Certificates
export const certAPI = {
  upload: (formData: FormData) =>
    api.post('/certificate/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),
  verify: (formData: FormData) =>
    api.post('/certificate/verify', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getMine: () => api.get('/certificate/mine'),
  getAll: (params?: object) => api.get('/certificate/all', { params }),
  getById: (id: string) => api.get(`/certificate/${id}`),
  updateStatus: (id: string, status: string) =>
    api.put(`/certificate/status/${id}`, { status }),
};

// Verification
export const verifyAPI = {
  getLogs: (params?: object) => api.get('/verification/logs', { params }),
  getStats: () => api.get('/verification/stats'),
};
