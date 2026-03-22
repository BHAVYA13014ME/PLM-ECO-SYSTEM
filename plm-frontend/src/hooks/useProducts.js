import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { productApi } from '../api/productApi';

const normalizeFilters = (filters = {}) => ({
  search: filters.search || '',
  status: filters.status || '',
  page: Number(filters.page || 1),
  limit: Number(filters.limit || 20),
});

export const useGetProducts = (filters) =>
  useQuery({
    queryKey: ['products', normalizeFilters(filters)],
    queryFn: () => productApi.getAll(normalizeFilters(filters)),
  });

export const useGetProduct = (id) =>
  useQuery({
    queryKey: ['products', id],
    queryFn: () => productApi.getById(id),
    enabled: !!id,
  });

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error creating product');
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => productApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.id] });
      toast.success('Product updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error updating product');
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error deleting product');
    },
  });
};

export const useActivateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productApi.activate,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', id] });
      toast.success('Product activated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error activating product');
    },
  });
};
