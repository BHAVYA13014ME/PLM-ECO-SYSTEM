import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ecoApi } from '../api/ecoApi';

const normalizeFilters = (filters = {}) => ({
  status: filters.status || '',
  ecoType: filters.ecoType || '',
  targetProductId: filters.targetProductId || undefined,
  page: Number(filters.page || 1),
  limit: Number(filters.limit || 20),
});

export const useGetECOs = (filters) =>
  useQuery({
    queryKey: ['ecos', normalizeFilters(filters)],
    queryFn: () => ecoApi.getAll(normalizeFilters(filters)),
  });

export const useGetECO = (id) =>
  useQuery({
    queryKey: ['ecos', id],
    queryFn: () => ecoApi.getById(id),
    enabled: !!id,
  });

export const useCreateECO = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ecoApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecos'] });
      toast.success('ECO created successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error creating ECO');
    },
  });
};

export const useUpdateECO = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => ecoApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ecos'] });
      queryClient.invalidateQueries({ queryKey: ['ecos', variables.id] });
      toast.success('ECO updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error updating ECO');
    },
  });
};

export const useAdvanceECO = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ecoApi.advance,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['ecos'] });
      queryClient.invalidateQueries({ queryKey: ['ecos', id] });
      toast.success('ECO advanced successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error advancing ECO. Ensure you meet approval rules.');
    },
  });
};

export const useRejectECO = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ecoApi.reject,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['ecos'] });
      queryClient.invalidateQueries({ queryKey: ['ecos', id] });
      toast.success('ECO has been rejected');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error rejecting ECO');
    },
  });
};
