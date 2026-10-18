// ============================================================
// errors.ts  -  turn ANY thrown value into text that is safe to show in a toast
//
//   try { await something(); } catch (err) { toast.error(getErrorMessage(err)); }
//
// ApiError (from src/api/client.ts) already carries a friendly message from the backend.
// ============================================================
import { ApiError } from '@/api/client';

export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  return fallback;
}

// true when the backend answered with this HTTP status (e.g. isStatus(err, 401) for wrong password)
export function isStatus(err: unknown, status: number): boolean {
  return err instanceof ApiError && err.status === status;
}
