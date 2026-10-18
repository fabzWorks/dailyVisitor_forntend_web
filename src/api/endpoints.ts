// ============================================================
// endpoints.ts  -  EVERY backend URL of the app lives here
//
// Nothing else in the project is allowed to write a URL by hand.
// If the backend changes a route, this is the only file you edit.
//
// Paths with ids are small functions:  ENDPOINTS.requests.respond(5)  ->  '/api/requests/5/respond'
// Matches the "API list" table in dailyVisitor_backend/README.md
// ============================================================
export type Role = 'resident' | 'provider';

export const ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    signupResident: '/api/auth/signup/resident',
    signupProvider: '/api/auth/signup/provider',
  },
  requests: {
    match: '/api/requests/match',
    create: '/api/requests',
    respond: (requestId: number) => `/api/requests/${requestId}/respond`,
  },
  notifications: {
    list: (userId: number) => `/api/notifications/${userId}`,
  },
  subscriptions: {
    list: (role: Role, userId: number) => `/api/subscriptions/${role}/${userId}`,
    arrive: (subscriptionId: number) => `/api/subscriptions/${subscriptionId}/arrive`,
    complete: (subscriptionId: number) => `/api/subscriptions/${subscriptionId}/complete`,
  },
  deliveries: {
    list: (role: Role, userId: number) => `/api/deliveries/${role}/${userId}`,
    note: (deliveryId: number) => `/api/deliveries/${deliveryId}/note`,
  },
  skips: {
    create: '/api/skips',
  },
} as const;

// Free public map services (NOT our backend). Used by the map screens.
export const EXTERNAL_URLS = {
  reverseGeocode: (lat: number, lng: number) =>
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=en&lat=${lat}&lon=${lng}`,
  searchPlace: (query: string) =>
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=en&q=${encodeURIComponent(query)}`,
  drivingRoute: (fromLat: number, fromLng: number, toLat: number, toLng: number) =>
    `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`,
} as const;
