import axiosInstance from './axiosInstance';

export const ecoApi = {
  getAll: (params) => axiosInstance.get('/eco', { params }),
  getById: (id) => axiosInstance.get(`/eco/${id}`),
  create: (data) => axiosInstance.post('/eco', data),
  update: (id, data) => axiosInstance.put(`/eco/${id}`, data),
  advance: (id) => axiosInstance.post(`/eco/${id}/advance`),
  reject: (id) => axiosInstance.post(`/eco/${id}/reject`),
};
