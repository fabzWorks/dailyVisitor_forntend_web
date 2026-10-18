// useRefreshLiveData  -  gives you a function that reloads notifications + schedule + deliveries now.
// Every mutation hook below calls it after the backend changed, so screens update without any extra code.
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

export function useRefreshLiveData() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.live });
}
