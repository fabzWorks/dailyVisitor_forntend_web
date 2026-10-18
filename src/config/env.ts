// ============================================================
// env.ts  -  the only place that reads environment variables
//
// NEXT_PUBLIC_API_URL  ->  where the backend runs (see .env.local / .env.example)
// ============================================================
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
