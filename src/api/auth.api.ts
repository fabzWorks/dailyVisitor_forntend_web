// auth.api.ts  -  login and signup
import { http } from './client';
import { ENDPOINTS } from './endpoints';
import type { AuthResponse, LoginBody, ProviderSignupBody, ResidentSignupBody } from './types';

export const authApi = {
  login: (body: LoginBody) =>
    http<AuthResponse>(ENDPOINTS.auth.login, { method: 'POST', body }),

  signupResident: (body: ResidentSignupBody) =>
    http<AuthResponse>(ENDPOINTS.auth.signupResident, { method: 'POST', body }),

  signupProvider: (body: ProviderSignupBody) =>
    http<AuthResponse>(ENDPOINTS.auth.signupProvider, { method: 'POST', body }),
};
