import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { bomApi } from '../api/bomApi';

const normalizeFilters = (filters = {}) => ({
  productId: filters.productId || undefined,
  status: filters.status || '',
  page: Number(filters.page || 1),
  limit: Number(filters.limit || 20),
});

export const useGetBoms = (filters) =>
  useQuery({
    queryKey: ['boms', normalizeFilters(filters)],
    queryFn: () => bomApi.getAll(normalizeFilters(filters)),
  });

export const useGetBom = (id) =>
  useQuery({
    queryKey: ['boms', id],
    queryFn: () => bomApi.getById(id),
    enabled: !!id,
  });

export const useCreateBom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bomApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms'] });
      toast.success('BoM created successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error creating BoM');
    },
  });
};

export const useUpdateBom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => bomApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['boms'] });
      queryClient.invalidateQueries({ queryKey: ['boms', variables.id] });
      toast.success('BoM updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error updating BoM');
    },
  });
};

export const useDeleteBom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bomApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms'] });
      toast.success('BoM soft-deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error deleting BoM');
    },
  });
};

export const useActivateBom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bomApi.activate,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['boms'] });
      queryClient.invalidateQueries({ queryKey: ['boms', id] });
      toast.success('BoM activated successfully (Direct Activation)');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error activating BoM');
    },
  });
};

export const useGetBomDiff = (bomId, compareId) =>
  useQuery({
    queryKey: ['bom-diff', bomId, compareId],
    queryFn: () => bomApi.getDiff(bomId, compareId),
    enabled: !!bomId && !!compareId,
  });
