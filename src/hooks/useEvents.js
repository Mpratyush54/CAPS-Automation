import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '../services/eventService';

export const useEvents = () => {
  return useQuery({
    queryKey: ['events'],
    queryFn: eventService.getEvents,
  });
};

export const useEventTeams = () => {
  return useQuery({
    queryKey: ['teams'],
    queryFn: eventService.getTeams,
  });
};

export const useSaveEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: eventService.saveEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: eventService.deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};
