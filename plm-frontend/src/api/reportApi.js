import axiosInstance from './axiosInstance';

export const reportApi = {
  getEcoSummary: () => axiosInstance.get('/reports/eco-summary'),
  getEcoList: (params) => axiosInstance.get('/reports/eco-list', { params }),
  getProductHistory: (id) => axiosInstance.get(`/reports/product-version-history/${id}`),
  getBomChangeHistory: (id) => axiosInstance.get(`/reports/bom-change-history/${id}`),
  getAuditTrail: (params) => axiosInstance.get('/reports/audit-trail', { params }),
  getActiveMatrix: () => axiosInstance.get('/reports/active-matrix'),
  getAdminDashboard: () => axiosInstance.get('/reports/admin-dashboard'),
};
