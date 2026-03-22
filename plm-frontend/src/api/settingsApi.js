import axiosInstance from './axiosInstance';

export const settingsApi = {
  getStages: () => axiosInstance.get('/settings/stages'),
  createStage: (data) => axiosInstance.post('/settings/stages', data),
  updateStage: (id, data) => axiosInstance.put(`/settings/stages/${id}`, data),
  deleteStage: (id) => axiosInstance.delete(`/settings/stages/${id}`),
};
