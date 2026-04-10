import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { momService } from '../services/momService';

export const useMoms = () => {
  return useQuery({
    queryKey: ['moms'],
    queryFn: momService.getMoms,
  });
};

export const useMomCategories = () => {
  return useQuery({
    queryKey: ['mom-categories'],
    queryFn: momService.getCategories,
  });
};

export const useCreateMom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: momService.createMom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moms'] });
    },
  });
};

export const useUpdateMomStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => momService.updateMomStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moms'] });
    },
  });
};

export const useCreateMomCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: momService.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mom-categories'] });
    },
  });
};
