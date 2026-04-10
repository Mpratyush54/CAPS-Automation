import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logService } from '../services/logService';
import { useAuthStore } from '../store/auth';

export const useLogs = (filter) => {
  const { user } = useAuthStore();
  const userId = user?.id || user?._id;
  
  return useQuery({
    queryKey: ['logs', filter],
    queryFn: () => logService.getLogs(filter, userId),
  });
};

export const useCreateLog = () => {
  const { user } = useAuthStore();
  const userId = user?.id || user?._id;
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (logData) => logService.saveLog(logData, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });
};

export const useUpdateLog = () => {
  const { user } = useAuthStore();
  const userId = user?.id || user?._id;
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, logData }) => logService.saveLog({ id, ...logData }, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });
};

export const useDeleteLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logService.deleteLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });
};

export const useReviewLog = () => {
  const { user } = useAuthStore();
  const userId = user?.id || user?._id;
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => logService.reviewLog(data, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });
};
