import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../api/reportApi';

export const useGetEcoSummary = () =>
  useQuery({
    queryKey: ['eco-summary'],
    queryFn: () => reportApi.getEcoSummary(),
  });

export const useGetEcoList = (params) =>
  useQuery({
    queryKey: ['eco-list', params],
    queryFn: () => reportApi.getEcoList(params),
  });

export const useGetProductHistory = (productId) =>
  useQuery({
    queryKey: ['product-history', productId],
    queryFn: () => reportApi.getProductHistory(productId),
    enabled: !!productId,
  });

export const useGetBomHistory = (productId) =>
  useQuery({
    queryKey: ['bom-history', productId],
    queryFn: () => reportApi.getBomChangeHistory(productId),
    enabled: !!productId,
  });

export const useGetActiveMatrix = () =>
  useQuery({
    queryKey: ['active-matrix'],
    queryFn: () => reportApi.getActiveMatrix(),
  });

export const useGetAuditTrail = (params) =>
  useQuery({
    queryKey: ['audit-trail', params],
    queryFn: () => reportApi.getAuditTrail(params),
  });

export const useGetAdminDashboard = () =>
  useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: reportApi.getAdminDashboard,
  });
