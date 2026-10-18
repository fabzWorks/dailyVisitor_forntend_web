// geo.api.ts  -  free public map services (NOT our backend)
//   reverse -> "what address is at this map point?"
//   search  -> "where is this place name?"
//   route   -> driving route between two points
import { getJson } from './client';
import { EXTERNAL_URLS } from './endpoints';

// Only the fields we use from the Nominatim answer
export interface NominatimAddress {
  country?: string; state?: string; region?: string; state_district?: string;
  city?: string; town?: string; village?: string; county?: string;
  suburb?: string; neighbourhood?: string; quarter?: string; city_district?: string; residential?: string;
  house_number?: string; road?: string;
}
export interface ReverseGeocodeResult { address?: NominatimAddress; display_name?: string }
export interface SearchPlaceResult { lat: string; lon: string }
export interface DrivingRouteResult {
  routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
}

export const geoApi = {
  reverse: (lat: number, lng: number) =>
    getJson<ReverseGeocodeResult>(EXTERNAL_URLS.reverseGeocode(lat, lng)),

  search: (query: string) =>
    getJson<SearchPlaceResult[]>(EXTERNAL_URLS.searchPlace(query)),

  route: (fromLat: number, fromLng: number, toLat: number, toLng: number) =>
    getJson<DrivingRouteResult>(EXTERNAL_URLS.drivingRoute(fromLat, fromLng, toLat, toLng)),
};
