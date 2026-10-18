// ============================================================
// useRequests.ts  -  the "subscribe to a service" flow
//
//   useMatchProviders    resident taps "Find Providers"  -> list of matching providers
//   useCreateRequest     resident taps "Confirm"         -> request saved, provider notified
//   useRespondToRequest  provider taps Accept / Reject   -> accept creates the schedule
// ============================================================
import { useMutation } from '@tanstack/react-query';
import { requestsApi } from '@/api';
import type { RespondToRequestBody } from '@/api/types';
import { useRefreshLiveData } from './useRefreshLiveData';

export function useMatchProviders() {
  return useMutation({ mutationFn: requestsApi.match });
}

export function useCreateRequest() {
  const refreshLiveData = useRefreshLiveData();
  return useMutation({
    mutationFn: requestsApi.create,
    onSettled: refreshLiveData,
  });
}

export function useRespondToRequest() {
  const refreshLiveData = useRefreshLiveData();
  return useMutation({
    mutationFn: ({ requestId, ...body }: { requestId: number } & RespondToRequestBody) =>
      requestsApi.respond(requestId, body),
    onSettled: refreshLiveData,   // also on error: the request may already have been answered
  });
}
