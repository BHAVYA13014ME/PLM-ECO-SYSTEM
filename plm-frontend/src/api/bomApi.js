import axiosInstance from './axiosInstance';

export const bomApi = {
  getAll: (params) => axiosInstance.get('/bom', { params }),
  getById: (id) => axiosInstance.get(`/bom/${id}`),
  create: (data) => axiosInstance.post('/bom', data),
  update: (id, data) => axiosInstance.put(`/bom/${id}`, data),
  delete: (id) => axiosInstance.delete(`/bom/${id}`),
  activate: (id) => axiosInstance.post(`/bom/${id}/activate`),
  getDiff: (id, compareId) => axiosInstance.get(`/bom/${id}/diff/${compareId}`),
};
