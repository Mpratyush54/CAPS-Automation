import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportService } from '../services/reportService';

export const useReportSummary = () => {
  return useQuery({
    queryKey: ['report-summary'],
    queryFn: reportService.getSummary,
  });
};

export const useReports = (params) => {
  return useQuery({
    queryKey: ['reports', params],
    queryFn: () => reportService.getReports(params),
  });
};

export const useWorkLogsReport = (params) => {
  return useQuery({
    queryKey: ['reports-worklogs', params],
    queryFn: () => reportService.getWorkLogs(params),
  });
};

export const useStats = (scope, teamId) => {
  return useQuery({
    queryKey: ['report-analytics', scope, teamId],
    queryFn: () => reportService.getAnalytics(scope, teamId),
  });
};

export const useSubmitWeeklyReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reportService.submitWeeklyReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};
