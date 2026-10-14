import { Capacitor, registerPlugin } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { apiGet } from '../api';

export const RADIUS_KM = 50;

interface LocationSettingsPlugin {
  openLocationSettings(): Promise<{ opened: boolean }>;
  openAppSettings(): Promise<{ opened: boolean }>;
}

const LocationSettings = registerPlugin<LocationSettingsPlugin>('LocationSettings');

export const openLocationSettings = async () => {
  if (!Capacitor.isNativePlatform()) return false;
  await LocationSettings.openLocationSettings();
  return true;
};

export const openAppLocationSettings = async () => {
  if (!Capacitor.isNativePlatform()) return false;
  await LocationSettings.openAppSettings();
  return true;
};

const LOCATION_KEY = 'userLocation';
const PROMPTED_KEY = 'locationPrompted';

export interface UserLocation {
  lat: number;
  lng: number;
  label: string;
  city: string;
}

// ── Local storage helpers ─────────────────────────────────

export const loadLocation = (): UserLocation | null => {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);

    return raw
      ? (JSON.parse(raw) as UserLocation)
      : null;
  } catch {
    return null;
  }
};

export const saveLocation = (loc: UserLocation) => {
  try {
    localStorage.setItem(
      LOCATION_KEY,
      JSON.stringify(loc)
    );

    localStorage.setItem(
      PROMPTED_KEY,
      '1'
    );
  } catch {
    // Ignore storage errors
  }
};

export const hasBeenPrompted = (): boolean => {
  try {
    return (
      localStorage.getItem(PROMPTED_KEY) === '1'
    );
  } catch {
    return false;
  }
};

export const markPrompted = () => {
  try {
    localStorage.setItem(
      PROMPTED_KEY,
      '1'
    );
  } catch {
    // Ignore storage errors
  }
};

// ── Distance (Haversine) ──────────────────────────────────

export const haversineKm = (
  a: {
    lat: number;
    lng: number;
  },
  b: {
    lat: number;
    lng: number;
  }
): number => {
  const R = 6371;

  const toRad = (v: number) =>
    (v * Math.PI) / 180;

  const dLat = toRad(
    b.lat - a.lat
  );

  const dLng = toRad(
    b.lng - a.lng
  );

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) ** 2;

  return (
    2 *
    R *
    Math.asin(Math.sqrt(h))
  );
};

// ── Property coordinates ──────────────────────────────────

export const getCoords = (p: {
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;
  lon?: number | string;
}): {
  lat: number;
  lng: number;
} | null => {
  const lat = Number(
    p.latitude ?? p.lat
  );

  const lng = Number(
    p.longitude ??
      p.lng ??
      p.lon
  );

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }

  if (
    lat === 0 &&
    lng === 0
  ) {
    return null;
  }

  return {
    lat,
    lng,
  };
};

// ── Device location ───────────────────────────────────────

export const getDeviceLocation =
  async (): Promise<{
    lat: number;
    lng: number;
  }> => {
    if (Capacitor.isNativePlatform()) {
      const current =
        await Geolocation.checkPermissions();

      const granted = (s: string) =>
        s === 'granted';

      if (
        !granted(current.location) &&
        !granted(current.coarseLocation)
      ) {
        let req;
        try {
          req = await Geolocation.requestPermissions();
        } catch {
          throw new Error('PERMISSION_DENIED');
        }

        if (
          !granted(req.location) &&
          !granted(req.coarseLocation)
        ) {
          throw new Error(
            'PERMISSION_DENIED'
          );
        }
      }
    }

    // Try GPS first; fall back to a network/coarse fix if GPS is unavailable.
    // This is more reliable on Android devices with location services enabled
    // but a weak indoor GPS signal.
    let pos;
    try {
      pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000,
      });
    } catch (error) {
      const code = (error as { code?: string | number })?.code;
      const message = (error as Error)?.message?.toLowerCase() || '';

      if (
        code === 'PERMISSION_DENIED' ||
        code === 1 ||
        message.includes('permission') ||
        message.includes('denied')
      ) {
        throw new Error('PERMISSION_DENIED');
      }

      try {
        pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 30000,
          maximumAge: 60000,
        });
      } catch (fallbackError) {
        const fallbackMessage = (fallbackError as Error)?.message?.toLowerCase() || '';
        if (fallbackMessage.includes('disabled') || fallbackMessage.includes('unavailable')) {
          throw new Error('LOCATION_SERVICES_DISABLED');
        }
        throw new Error('LOCATION_TIMEOUT');
      }
    }

    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    };
  };



interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GoogleGeocodeResult {
  formatted_address: string;
  address_components: GoogleAddressComponent[];
}

interface GoogleGeocodeResponse {
  status: string;
  results: GoogleGeocodeResult[];
}

export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<{ label: string; city: string }> => {
  try {
    const data = await apiGet(
      `/geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
    );

    const results = Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data?.data?.results)
        ? data.data.results
        : [];
    const result = results[0];
    if (!result) return { label: 'Your location', city: '' };

    const components = result.address_components || [];
    const cityComponent = components.find((component: GoogleAddressComponent) =>
      component.types.some((type) =>
        ['locality', 'administrative_area_level_2', 'administrative_area_level_3'].includes(type),
      ),
    );
    return {
      label: result.label || result.formatted_address || 'Your location',
      city: result.city || cityComponent?.long_name || '',
    };
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return { label: 'Your location', city: '' };
  }
};

export const searchPlaces = async (query: string): Promise<UserLocation[]> => {
  if (!query.trim()) return [];

  const data = await apiGet(`/geocode?q=${encodeURIComponent(query)}`);
  const results = Array.isArray(data)
    ? data
    : Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data?.data?.results)
        ? data.data.results
        : [];

  return results
    .map((result: any) => ({
      lat: Number(result.lat ?? result.latitude),
      lng: Number(result.lng ?? result.longitude ?? result.lon),
      label: String(result.label ?? result.formatted_address ?? result.name ?? ''),
      city: String(result.city ?? result.cityName ?? ''),
    }))
    .filter((result: UserLocation) =>
      Number.isFinite(result.lat) && Number.isFinite(result.lng) && result.label,
    );
};

