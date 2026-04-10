import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';

export const useDashboard = (role) => {
  return useQuery({
    queryKey: ['dashboard', role],
    queryFn: () => dashboardService.getDashboardData(role),
    enabled: !!role,
  });
};
