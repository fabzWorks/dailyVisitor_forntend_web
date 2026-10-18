// ============================================================
// useAuth.ts  -  login, signup and logout
//
//   const login = useLogin();
//   await login.mutateAsync({ email, password });   // throws ApiError if it fails
//   login.isPending                                 // true while waiting for the backend
//
// Login / signup do NOT put the user in the store themselves - the screen does it
// after showing its toast (see UnifiedLogin / UnifiedSignup).
// ============================================================
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api';
import { useAuthStore } from '@/store/authStore';
import { useResidentStore } from '@/store/residentStore';
import { useVisitorStore } from '@/store/visitorStore';

export function useLogin() {
  return useMutation({ mutationFn: authApi.login });
}

export function useSignupResident() {
  return useMutation({ mutationFn: authApi.signupResident });
}

export function useSignupProvider() {
  return useMutation({ mutationFn: authApi.signupProvider });
}

// Logout = forget the user + wipe cached backend data + reset both apps' screens,
// so the next person who logs in never sees the previous person's data.
export function useLogout() {
  const queryClient = useQueryClient();
  const signOut = useAuthStore((s) => s.signOut);
  const resetResident = useResidentStore((s) => s.reset);
  const resetVisitor = useVisitorStore((s) => s.reset);

  return () => {
    signOut();
    queryClient.clear();
    resetResident();
    resetVisitor();
  };
}
