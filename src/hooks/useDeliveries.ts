// ============================================================
// useDeliveries.ts  -  what the RESIDENT can do on a day's delivery
//
//   useSaveDeliveryNote  extra note for the provider after "arrived"
//   useSkipServices      out of station -> skip services on chosen dates
// ============================================================
import { useMutation } from '@tanstack/react-query';
import { deliveriesApi } from '@/api';
import type { DeliveryNoteBody } from '@/api/types';
import { useRefreshLiveData } from './useRefreshLiveData';

export function useSaveDeliveryNote() {
  const refreshLiveData = useRefreshLiveData();
  return useMutation({
    mutationFn: ({ deliveryId, ...body }: { deliveryId: number } & DeliveryNoteBody) =>
      deliveriesApi.saveNote(deliveryId, body),
    onSettled: refreshLiveData,
  });
}

export function useSkipServices() {
  const refreshLiveData = useRefreshLiveData();
  return useMutation({
    mutationFn: deliveriesApi.skip,
    onSettled: refreshLiveData,   // wait for fresh deliveries so "Skipped" shows everywhere
  });
}
