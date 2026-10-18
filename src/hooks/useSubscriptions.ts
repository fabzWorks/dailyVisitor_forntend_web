// ============================================================
// useSubscriptions.ts  -  the provider's two daily buttons
//
//   useMarkArrived    "I am arrived"  -> the resident gets a notification
//   useMarkCompleted  "Service done"  -> the resident gets a "service done" notification
// ============================================================
import { useMutation } from '@tanstack/react-query';
import { subscriptionsApi } from '@/api';
import type { DeliveryDayBody } from '@/api/types';
import { useRefreshLiveData } from './useRefreshLiveData';

type DeliveryDayVars = { subscriptionId: number } & DeliveryDayBody;

export function useMarkArrived() {
  const refreshLiveData = useRefreshLiveData();
  return useMutation({
    mutationFn: ({ subscriptionId, ...body }: DeliveryDayVars) => subscriptionsApi.arrive(subscriptionId, body),
    onSettled: refreshLiveData,
  });
}

export function useMarkCompleted() {
  const refreshLiveData = useRefreshLiveData();
  return useMutation({
    mutationFn: ({ subscriptionId, ...body }: DeliveryDayVars) => subscriptionsApi.complete(subscriptionId, body),
    onSettled: refreshLiveData,
  });
}
