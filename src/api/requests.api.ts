// requests.api.ts  -  the "subscribe to a service" flow
//   match    -> resident taps "Find Providers"
//   create   -> resident taps "Confirm"
//   respond  -> provider taps Accept / Reject
import { http } from './client';
import { ENDPOINTS } from './endpoints';
import type {
  CreateRequestBody, CreateRequestResponse, MatchProvidersBody, MatchProvidersResponse,
  RespondToRequestBody, RespondToRequestResponse,
} from './types';

export const requestsApi = {
  match: (body: MatchProvidersBody) =>
    http<MatchProvidersResponse>(ENDPOINTS.requests.match, { method: 'POST', body }),

  create: (body: CreateRequestBody) =>
    http<CreateRequestResponse>(ENDPOINTS.requests.create, { method: 'POST', body }),

  respond: (requestId: number, body: RespondToRequestBody) =>
    http<RespondToRequestResponse>(ENDPOINTS.requests.respond(requestId), { method: 'POST', body }),
};
