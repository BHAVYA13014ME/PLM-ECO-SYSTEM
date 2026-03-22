import axios from 'axios';
import axiosInstance from './axiosInstance';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const authApi = {
  login: (data) => axiosInstance.post('/auth/login', data),
  logout: () => axiosInstance.post('/auth/logout'),
  getMe: () => axiosInstance.get('/auth/me'),
  refreshSession: () => axios.post(`${API_BASE_URL}/auth/refresh-token`, {}, { withCredentials: true }),
};
