// ============================================================
// client.ts  -  the ONE function that talks to the network
//
//   http()     our backend  (adds API_URL, sends/reads JSON, throws ApiError on any problem)
//   getJson()  public map services (same error rules)
//
// Screens never call these directly. They use the hooks in src/hooks,
// which call the small functions in src/api/*.api.ts, which call http().
// ============================================================
import { API_URL } from '@/config/env';

// 'network' = the server could not be reached at all   |   'http' = the server answered with an error
export type ApiErrorKind = 'network' | 'http';

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;   // HTTP status (401, 409 ...) - only for kind 'http'

  constructor(message: string, kind: ApiErrorKind, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

interface HttpOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
}

// Calls our backend.  http<ResponseType>('/api/...', { body })
// - the backend answers { success: false, message } on a problem -> we throw ApiError(message)
// - backend not running / no internet -> ApiError('Cannot reach the server...')
export async function http<T>(path: string, options: HttpOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? (options.body ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 'network');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new ApiError(data.message || 'Something went wrong', 'http', res.status);
  }
  return data as T;
}

// Calls a public URL (map search, routing). Throws ApiError if it fails.
export async function getJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new ApiError('Cannot reach the map service. Check your internet connection.', 'network');
  }
  if (!res.ok) throw new ApiError('The map service returned an error', 'http', res.status);
  return (await res.json()) as T;
}
