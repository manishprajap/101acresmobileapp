/// <reference types="google.maps" />
import React, { useEffect, useRef, useState } from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import {
  cloudUploadOutline,
  closeCircle,
  arrowBack,
  add,
  remove,
  addOutline,
  locationOutline,
  searchOutline,
  sparklesOutline,
} from 'ionicons/icons';
import SwalBase from 'sweetalert2';

import './Addpropertyform.css';
import { apiGet, apiPatch, apiPostFormData } from '../api';

/* =========================================================
   SWEETALERT (always above the full-screen form)
   Needs the small CSS in apf-required.css (z-index rule).
========================================================= */
const Swal = SwalBase.mixin({
  heightAuto: false,
  scrollbarPadding: false,
  confirmButtonColor: '#185FA5',
  customClass: { container: 'app-swal-container' },
});

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Shows every missing / invalid field in a single popup. */
const showRequiredAlert = (errors: string[]) =>
  Swal.fire({
    icon: 'warning',
    title: 'Please fill the required fields',
    html:
      '<ul style="text-align:left;margin:0;padding-left:1.2rem;line-height:1.7">' +
      errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('') +
      '</ul>',
    confirmButtonText: 'OK',
  });

/* =========================================================
   GOOGLE MAPS TYPES
========================================================= */
declare global {
  interface Window {
    google?: typeof google;
  }
}

type GooglePlacePrediction = google.maps.places.AutocompletePrediction;

type LookupItem = {
  id: number;
  name: string;
};

const normalizeLocationName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b(division|district|city|municipal corporation)\b/g, '')
    .replace(/[^a-z0-9]/g, '');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lookupItems = (response: any): LookupItem[] => {
  const candidates = [
    response,
    response?.data,
    response?.result,
    response?.data?.data,
    response?.result?.data,
  ];
  const list = candidates.find(Array.isArray);

  return (list || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((item: any) => ({
      id: Number(
        item.id
        ?? item.value
        ?? item.countryId
        ?? item.country_id
        ?? item.stateId
        ?? item.state_id
        ?? item.cityId
        ?? item.city_id
        ?? item.areaId
        ?? item.area_id
        ?? item.locality_id
        ?? item.localityId
        ?? item.subLocalityId
        ?? item.sub_locality_id
      ),
      name: String(
        item.name
        ?? item.country_name
        ?? item.countryName
        ?? item.state_name
        ?? item.stateName
        ?? item.city_name
        ?? item.cityName
        ?? item.area_name
        ?? item.areaName
        ?? item.locality_name
        ?? item.localityName
        ?? item.locality
        ?? item.sub_locality_name
        ?? item.subLocalityName
        ?? item.sublocalityName
        ?? item.sub_locality
        ?? item.subLocality
        ?? item.label
        ?? item.title
        ?? ''
      ).trim(),
    }))
    .filter((item: LookupItem) => Number.isFinite(item.id) && item.name);
};

type Img = {
  name: string;
  type: string;
  base64: string;
};

/* =========================================================
   STEPS
========================================================= */

const STEP_TITLES = [
  'Basic Details',
  'Property Location',
  'Property Details',
  'Photos & Features',
];

const TOTAL_STEPS = STEP_TITLES.length;

/* =========================================================
   LIST KEYS
========================================================= */

type ListKey =
  | 'otherRooms'
  | 'features'
  | 'amenities'
  | 'locationAdvantages'
  | 'overlooking'
  | 'preferredTenants'
  | 'pgSharing';

/* =========================================================
   FORM STATE
========================================================= */

interface FormState {
  /* Basic */
  lookingTo: string;
  propertyType: string;
  residentialType: string;
  contactNumber: string;

  /* Location */
  countryId: string;
  country: string;
  stateId: string;
  state: string;
  cityId: string;
  city: string;
  areaId: string;
  area: string;
  landmark: string;
  society: string;
  latitude: string;
  longitude: string;
  placeId: string;
  formattedAddress: string;

  /* Residential */
  beds: string;
  baths: string;
  balconies: string;

  /* Area */
  plotArea: string;
  plotLength: string;
  plotBreadth: string;
  carpetArea: string;
  builtUpArea: string;
  superBuiltUpArea: string;
  areaUnit: string;
  showBuiltUp: boolean;
  showSuperBuiltUp: boolean;

  /* Floors */
  totalFloors: string;
  floorNo: string;
  duplex: boolean;

  /* Plot */
  floorsAllowed: string;
  boundaryWall: string;
  constructionDone: string;

  /* Availability */
  availability: string;
  ageOfProperty: string;
  possessionBy: string;
  reraId: string;
  availableFrom: string;

  /* Price */
  price: string;
  allInclusive: boolean;
  negotiable: boolean;
  taxExcluded: boolean;
  maintenanceCharge: string;
  maintenancePeriod: string;
  securityDepositType: string;
  securityDeposit: string;

  /* Rent */
  preferredTenants: string[];

  /* PG */
  pgSuitableFor: string;
  pgSharing: string[];
  pgTotalBeds: string;
  pgFoodIncluded: string;
  pgNoticePeriod: string;

  /* Commercial */
  locatedInside: string;
  zoneType: string;
  washrooms: string;
  pantry: string;
  minSeats: string;
  maxSeats: string;
  cabins: string;
  meetingRooms: string;

  /* Photos */
  sendViaWhatsapp: boolean;

  /* Other */
  otherRooms: string[];
  furnishing: string;
  furnishingItems: Record<string, number>;
  coveredParking: number;
  openParking: number;
  description: string;
  videoUrl: string;
  contactEmail: string;

  /* Features */
  ownership: string;
  features: string[];
  amenities: string[];
  locationAdvantages: string[];
  openSides: string;
  overlooking: string[];
  powerBackup: string;
  facing: string;
  flooring: string;
  roadWidth: string;
  roadWidthUnit: string;
}

/* =========================================================
   INITIAL STATE
========================================================= */

const initial: FormState = {
  lookingTo: '',
  propertyType: '',
  residentialType: '',
  contactNumber: '',

  countryId: '',
  country: '',
  stateId: '',
  state: '',
  cityId: '',
  city: '',
  areaId: '',
  area: '',
  landmark: '',
  society: '',
  latitude: '',
  longitude: '',
  placeId: '',
  formattedAddress: '',

  beds: '',
  baths: '',
  balconies: '0',

  plotArea: '',
  plotLength: '',
  plotBreadth: '',
  carpetArea: '',
  builtUpArea: '',
  superBuiltUpArea: '',
  areaUnit: 'sq.ft.',
  showBuiltUp: false,
  showSuperBuiltUp: false,

  totalFloors: '',
  floorNo: '',
  duplex: false,

  floorsAllowed: '',
  boundaryWall: '',
  constructionDone: '',

  availability: '',
  ageOfProperty: '',
  possessionBy: '',
  reraId: '',
  availableFrom: '',

  price: '',
  allInclusive: false,
  negotiable: false,
  taxExcluded: false,
  maintenanceCharge: '',
  maintenancePeriod: '',
  securityDepositType: '',
  securityDeposit: '',

  preferredTenants: [],

  pgSuitableFor: '',
  pgSharing: [],
  pgTotalBeds: '',
  pgFoodIncluded: '',
  pgNoticePeriod: '',

  locatedInside: '',
  zoneType: '',
  washrooms: '',
  pantry: '',
  minSeats: '',
  maxSeats: '',
  cabins: '',
  meetingRooms: '',

  sendViaWhatsapp: false,

  otherRooms: [],
  furnishing: '',
  furnishingItems: {},
  coveredParking: 0,
  openParking: 0,
  description: '',
  videoUrl: '',
  contactEmail: '',

  ownership: '',
  features: [],
  amenities: [],
  locationAdvantages: [],
  openSides: '',
  overlooking: [],
  powerBackup: '',
  facing: '',
  flooring: '',
  roadWidth: '',
  roadWidthUnit: 'Feet',
};

const getSavedContact = (): string => {
  try {
    const storedUser = localStorage.getItem('user');
    if (!storedUser || storedUser === 'undefined' || storedUser === 'null') return '';

    const parsed = JSON.parse(storedUser);
    const user = parsed?.user ?? parsed?.data ?? parsed;
    const contact = [
      user?.mobile,
      user?.phone,
      user?.mobileNumber,
      user?.phoneNumber,
      user?.contactNumber,
      user?.email,
    ].find((value) => String(value ?? '').trim());

    return contact == null ? '' : String(contact).trim();
  } catch {
    return '';
  }
};

/* =========================================================
   LOCATION HELPERS
========================================================= */

const findLookupItem = (items: LookupItem[], value: unknown): LookupItem | undefined => {
  if (value == null || String(value).trim() === '') return undefined;
  const search = String(value).trim();
  return items.find((item) => String(item.id) === search)
    ?? items.find((item) => item.name.toLowerCase() === search.toLowerCase());
};

const getLocationName = (name: unknown, value: unknown): string => {
  if (name != null && String(name).trim()) return String(name);
  if (value == null || /^\d+$/.test(String(value).trim())) return '';
  return String(value);
};

const getLocationAddressParts = (property: Record<string, unknown>): string[] =>
  String(property.googleLocation ?? property.formattedAddress ?? property.address ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

const reverseGeocodeProperty = async (
  property: Record<string, unknown>,
): Promise<google.maps.GeocoderAddressComponent[]> => {
  const latitude = Number(property.latitude);
  const longitude = Number(property.longitude);
  if (!window.google?.maps?.Geocoder || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return [];
  }

  const geocoder = new window.google.maps.Geocoder();
  return new Promise((resolve) => {
    geocoder.geocode(
      { location: { lat: latitude, lng: longitude } },
      (results, status) => {
        if (status !== 'OK' || !results?.length) {
          console.warn('Property reverse geocoding failed:', status);
          resolve([]);
          return;
        }
        resolve(results[0].address_components ?? []);
      },
    );
  });
};

const getAddressComponentName = (
  components: google.maps.GeocoderAddressComponent[],
  types: string[],
): string =>
  components.find((component) => component.types.some((type) => types.includes(type)))?.long_name ?? '';

/* =========================================================
   PROPERTY OPTIONS
========================================================= */

const PG_TYPE = 'PG / Co-living';
const LOOKING_TO = ['Sale', 'Rent / Lease'];
const KINDS = ['Residential', 'Commercial'];

const RES_TYPES = [
  'Flat / Apartment',
  'Independent House / Villa',
  'Independent / Builder Floor',
  'Plot / Land',
  '1 RK / Studio Apartment',
  'Serviced Apartment',
  'Farmhouse',
  'Other',
];

const COM_TYPES = [
  'Office Space',
  'Co-working Space',
  'Shop',
  'Showroom',
  'Commercial Land',
  'Agricultural Land',
  'Industrial Land',
  'Warehouse / Godown',
  'Cold Storage',
  'Factory',
  'Manufacturing Unit',
  'Hotel / Resort',
  'Guest House / Banquet Hall',
  'Other',
];

const PLOT_TYPES = ['Plot / Land', 'Commercial Land', 'Agricultural Land', 'Industrial Land'];
const OFFICE_TYPES = ['Office Space', 'Co-working Space'];
const RETAIL_TYPES = ['Shop', 'Showroom'];
const HOUSE_TYPES = ['Independent House / Villa', 'Independent / Builder Floor', 'Farmhouse'];

const BEDS = ['1', '2', '3', '4', '5', '5+'];
const BATHS = ['1', '2', '3', '4', '4+'];
const BALCONIES = ['0', '1', '2', '3', 'More than 3'];

const AREA_UNITS = [
  'sq.ft.',
  'sq.yards',
  'sq.m.',
  'acres',
  'marla',
  'cents',
  'bigha',
  'kottah',
  'kanal',
  'grounds',
  'ares',
  'biswa',
  'guntha',
  'aankadam',
  'hectares',
  'rood',
  'chataks',
  'perch',
];

const FLOORS = [
  'Basement',
  'Lower Ground',
  'Ground',
  ...Array.from({ length: 30 }, (_, i) => String(i + 1)),
];

const AVAILABILITY = ['Ready to move', 'Under construction'];
const AGE = ['0-1 years', '1-5 years', '5-10 years', '10+ years'];

const YEAR = new Date().getFullYear();

const POSSESSION = [
  'Within 3 months',
  'Within 6 months',
  ...[0, 1, 2, 3, 4].map((i) => `By ${YEAR + i}`),
];

const OWNERSHIP = ['Owner','Dealer','Freehold', 'Leasehold', 'Co-operative society', 'Power of Attorney'];
const MAINT_PERIOD = ['Monthly', 'Quarterly', 'Yearly', 'One time'];
const DEPOSIT_TYPES = ['None', 'Fixed', 'Multiple of rent'];
const TENANTS = ['Family', 'Bachelor Men', 'Bachelor Women', 'Company'];
const PG_FOR = ['Boys', 'Girls', 'Any'];
const PG_SHARING = ['Single', 'Double', 'Triple', '4+ sharing'];
const PG_FOOD = ['Yes', 'No'];
const PG_NOTICE = ['None', '15 days', '1 month', '2 months'];
const YES_NO = ['Yes', 'No'];

const LOCATED_INSIDE = [
  'Mall',
  'Commercial Project',
  'Residential Project',
  'Retail Complex / Building',
  'Market / High Street',
  'Others',
];

const ZONES = [
  'Industrial',
  'Commercial',
  'Residential',
  'Transport and Communication',
  'Public Utilities',
  'Public and Semi-Public Use',
  'Open Spaces',
  'Agricultural Zone',
  'Special Economic Zone',
  'Natural Conservation Zone',
  'Government Use',
  'Others',
];

const WASHROOMS = ['Private', 'Shared', 'No washroom'];
const PANTRY = ['Private', 'Shared', 'No pantry'];
const OTHER_ROOMS = ['Pooja Room', 'Study Room', 'Servant Room', 'Store Room', 'Others'];
const FURNISHING = ['Unfurnished', 'Semi-Furnished', 'Furnished'];
const COUNTED_ITEMS = ['Light', 'Fans', 'AC', 'TV', 'Beds', 'Wardrobe', 'Geyser'];

const AMENITIES = [
  'Maintenance Staff',
  'Water Storage',
  'Security / Fire Alarm',
  'Visitor Parking',
  'Park',
  'Lift',
  'Rain Water Harvesting',
  'Swimming Pool',
  'Fitness Centre / Gym',
  'Club House / Community Center',
  'Kids Play Area',
  'CCTV Surveillance',
  'Gated Society',
  'Intercom Facility',
  'Waste Disposal',
  'Sewage Treatment Plant',
  'Shopping Centre',
  'Laundry Service',
  'Internet / Wi-Fi',
  'Piped Gas',
  'Water Purifier',
];

const FEATURES = [
  'Recently Renovated',
  'Vaastu Compliant',
  'High Ceiling Height',
  'False Ceiling Lighting',
  'Centrally Air Conditioned',
  'Private Garden / Terrace',
  'Natural Light',
  'Airy Rooms',
  'Spacious Interiors',
  'Corner Property',
  'Pet Friendly',
  'Wheelchair Friendly',
];

const LOCATION_ADV = [
  'Close to Metro Station',
  'Close to School',
  'Close to Hospital',
  'Close to Market',
  'Close to Railway Station',
  'Close to Airport',
  'Close to Mall',
  'Close to Highway',
  'Close to Bus Stop',
];

const OPEN_SIDES = ['1', '2', '3', '3+'];
const OVERLOOKING = ['Pool', 'Park / Garden', 'Club', 'Main Road', 'Others', 'Sea Facing'];
const POWER = ['None', 'Partial', 'Full'];
const FACING = [
  'North',
  'South',
  'East',
  'West',
  'North-East',
  'North-West',
  'South-East',
  'South-West',
];
const FLOORING = ['Marble', 'Vitrified', 'Ceramic', 'Granite', 'Wooden', 'Mosaic', 'Cement', 'Other'];

const MIN_DESC = 30;

/* =========================================================
   HYDRATE (edit mode)
========================================================= */

const snakeCase = (key: string): string =>
  key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);

/** Reads a field whether the API returns camelCase, snake_case or lowercase. */
const readProp = (p: Record<string, unknown>, key: string): unknown => {
  for (const k of [key, snakeCase(key), key.toLowerCase()]) {
    const v = p[k];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
};

/** Pulls a single property object out of whatever shape the API responds with. */
const unwrapProperty = (res: unknown): Record<string, unknown> | null => {
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);
  const isProperty = (value: unknown): value is Record<string, unknown> =>
    isRecord(value) &&
    ['id', 'propertyId', 'property_id', 'title', 'propertyFor', 'property_for', 'propertyType', 'property_type']
      .some((key) => key in value);
  const root = isRecord(res) ? res : null;
  const data = isRecord(root?.data) ? root.data : null;
  const result = isRecord(root?.result) ? root.result : null;
  const nestedData = isRecord(data?.data) ? data.data : null;
  const candidates: unknown[] = [
    data?.property,
    result?.property,
    nestedData?.property,
    data?.data,
    data,
    result?.data,
    result,
    root?.property,
    root,
  ];

  for (const candidate of candidates) {
    if (isProperty(candidate)) return candidate;
    if (Array.isArray(candidate)) {
      const property = candidate.find(isProperty);
      if (property) return property;
    }
  }
  return null;
};

const hydrateForm = (property: Record<string, unknown>): FormState => {
  const hydrated: FormState = {
    ...initial,
    contactNumber: getSavedContact(),
  };
  const setHydratedValue = <K extends keyof FormState>(key: K, value: FormState[K]): void => {
    hydrated[key] = value;
  };

  const listValue = (value: unknown): string[] => {
    const toString = (item: unknown): string => {
      if (item && typeof item === 'object') {
        const entry = item as Record<string, unknown>;
        return String(entry.name ?? entry.value ?? entry.label ?? '').trim();
      }
      return String(item).trim();
    };
    if (Array.isArray(value)) return value.map(toString).filter(Boolean);
    if (typeof value !== 'string' || !value.trim()) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(toString).filter(Boolean);
    } catch {
      // API list fields may be comma-separated strings.
    }
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  };

  const truthy = (value: unknown): boolean =>
    value === true || value === 1 || ['true', 'yes', '1', 'on'].includes(String(value).toLowerCase());

  (Object.keys(initial) as (keyof FormState)[]).forEach((key) => {
    const value = readProp(property, key);
    if (value === undefined || value === null) return;

    if (Array.isArray(initial[key])) {
      setHydratedValue(key, listValue(value) as FormState[typeof key]);
    } else if (typeof initial[key] === 'boolean') {
      setHydratedValue(key, truthy(value) as FormState[typeof key]);
    } else if (typeof initial[key] === 'number') {
      setHydratedValue(key, (Number(value) || 0) as FormState[typeof key]);
    } else if (typeof initial[key] === 'object') {
      if (typeof value === 'string') {
        try {
          setHydratedValue(key, JSON.parse(value) as FormState[typeof key]);
        } catch {
          return;
        }
      } else {
        setHydratedValue(key, value as FormState[typeof key]);
      }
    } else {
      setHydratedValue(key, String(value) as FormState[typeof key]);
    }
  });

  /* ---------- Looking to (Sale / Rent / PG) ---------- */
  const rawLookingTo = [
    readProp(property, 'lookingTo'),
    readProp(property, 'propertyFor'),
    readProp(property, 'listingFor'),
  ].find((value) => value != null && String(value).trim());
  const lookingTo = String(rawLookingTo ?? '').trim().toLowerCase();
  const propertyTitle = String(readProp(property, 'title') ?? '').trim();
  const isPayingGuest = /paying guest|\bpg\b|co-living/i.test(lookingTo)
    || /paying guest|\bpg\b|co-living/i.test(propertyTitle)
    || String(readProp(property, 'residentialType') ?? '').trim().toLowerCase() === PG_TYPE.toLowerCase();
  const titleLookingTo = propertyTitle.match(/\bfor\s+(rent|lease|sale)\b/i)?.[1]?.toLowerCase();
  if (isPayingGuest) {
    hydrated.lookingTo = 'Paying Guest';
  } else if (lookingTo || titleLookingTo) {
    const savedLookingTo = lookingTo || titleLookingTo || '';
    hydrated.lookingTo = savedLookingTo.includes('rent') || savedLookingTo.includes('lease')
      ? 'Rent / Lease'
      : 'Sale';
  } else {
    hydrated.lookingTo = 'Sale';
  }

  /* ---------- Property type (Residential / Commercial + sub type) ---------- */
  const allTypes = [...RES_TYPES, ...COM_TYPES];
  const titleType = propertyTitle.split(/\s+for\s+/i)[0].trim();

  if (hydrated.lookingTo === 'Paying Guest') {
    hydrated.propertyType = 'Residential';
    hydrated.residentialType = PG_TYPE;
  } else {
    if (!hydrated.residentialType) {
      const rawType = String(property.propertyType ?? '').trim();
      if (allTypes.includes(rawType)) hydrated.residentialType = rawType;
      else if (allTypes.includes(titleType)) hydrated.residentialType = titleType;
    }
    if (!KINDS.includes(hydrated.propertyType)) {
      hydrated.propertyType =
        COM_TYPES.includes(hydrated.residentialType) && !RES_TYPES.includes(hydrated.residentialType)
          ? 'Commercial'
          : 'Residential';
    }
  }

  const choiceOptions: Partial<Record<keyof FormState, string[]>> = {
    lookingTo: ['Sale', 'Rent / Lease', 'Paying Guest'],
    propertyType: KINDS,
    residentialType: [...allTypes, PG_TYPE],
    areaUnit: AREA_UNITS,
    availability: AVAILABILITY,
    ageOfProperty: AGE,
    possessionBy: POSSESSION,
    maintenancePeriod: MAINT_PERIOD,
    securityDepositType: DEPOSIT_TYPES,
    preferredTenants: TENANTS,
    pgSuitableFor: PG_FOR,
    pgSharing: PG_SHARING,
    pgFoodIncluded: PG_FOOD,
    pgNoticePeriod: PG_NOTICE,
    locatedInside: LOCATED_INSIDE,
    zoneType: ZONES,
    washrooms: WASHROOMS,
    pantry: PANTRY,
    otherRooms: OTHER_ROOMS,
    furnishing: FURNISHING,
    ownership: OWNERSHIP,
    features: FEATURES,
    amenities: AMENITIES,
    locationAdvantages: LOCATION_ADV,
    openSides: OPEN_SIDES,
    overlooking: OVERLOOKING,
    powerBackup: POWER,
    facing: FACING,
    flooring: FLOORING,
    roadWidthUnit: ['Feet', 'Meter'],
  };
  (Object.entries(choiceOptions) as [keyof FormState, string[]][]).forEach(([key, options]) => {
    const value = hydrated[key];
    const normalize = (item: string): string =>
      options.find((option) => option.toLowerCase() === item.trim().toLowerCase()) ?? item.trim();
    if (Array.isArray(value)) {
      setHydratedValue(key, value.map(normalize) as FormState[typeof key]);
    } else if (typeof value === 'string' && value) {
      setHydratedValue(key, normalize(value) as FormState[typeof key]);
    }
  });

  /* ---------- Location display names ---------- */
  hydrated.country = getLocationName(property.countryName, property.country);
  hydrated.state = getLocationName(property.stateName, property.state);
  hydrated.city = getLocationName(property.cityName, property.city);
  hydrated.area = getLocationName(
    property.areaName ?? property.area_name ?? property.localityName ?? property.locality_name,
    property.area ?? property.locality,
  );
  hydrated.landmark = getLocationName(
    property.subLocalityName
      ?? property.sublocalityName
      ?? property.sub_locality_name
      ?? property.landmarkName,
    property.subLocality
      ?? property.sublocality
      ?? property.sub_locality
      ?? property.landmark,
  );

  const priceValues = [
    property.price,
    property.expectedPrice,
    property.expected_price,
  ].filter((value) => value !== undefined && value !== null && String(value).trim() !== '');
  if (priceValues.length > 0) hydrated.price = String(priceValues[0]);

  if (!hydrated.formattedAddress && property.googleLocation) {
    hydrated.formattedAddress = String(property.googleLocation);
  }

  /* ---------- Contact ---------- */
  const contactNumber = property.contactNumber ?? property.contact_number ?? property.contactName ?? property.phone;
  if (contactNumber != null && String(contactNumber).trim()) {
    hydrated.contactNumber = String(contactNumber);
  }

  /* ---------- Area ---------- */
  const squareFt = property.squareFt ?? property.square_ft ?? property.carpetArea ?? property.builtUpArea ?? property.plotArea;
  if (squareFt != null && !hydrated.carpetArea && !hydrated.builtUpArea && !hydrated.plotArea) {
    if (PLOT_TYPES.includes(hydrated.residentialType)) {
      hydrated.plotArea = String(squareFt);
    } else {
      hydrated.carpetArea = String(squareFt);
    }
  }

  // These two flags are never sent to the API, so rebuild them from the data.
  hydrated.showBuiltUp = Boolean(hydrated.builtUpArea);
  hydrated.showSuperBuiltUp = Boolean(hydrated.superBuiltUpArea);

  /* ---------- Dates must be yyyy-mm-dd for <input type="date"> ---------- */
  if (/^\d{4}-\d{2}-\d{2}T/.test(hydrated.availableFrom)) {
    hydrated.availableFrom = hydrated.availableFrom.slice(0, 10);
  }

  return hydrated;
};

/* =========================================================
   HELPERS
========================================================= */

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');

/* =========================================================
   CATEGORY
========================================================= */

const categorize = (f: FormState) => {
  const isPG = f.lookingTo === 'Paying Guest';
  const isRent = f.lookingTo === 'Rent / Lease';
  const isSale = f.lookingTo === 'Sale';
  const isRes = f.propertyType === 'Residential';
  const isPlot = !isPG && PLOT_TYPES.includes(f.residentialType);
  const isOffice = !isPG && OFFICE_TYPES.includes(f.residentialType);
  const isRetail = !isPG && RETAIL_TYPES.includes(f.residentialType);
  const hasBuilding = !isPG && !isPlot;
  const hasRooms = hasBuilding && isRes;
  const isCommercial = hasBuilding && !isRes;

  return {
    isPG,
    isRent,
    isSale,
    isRes,
    isPlot,
    isOffice,
    isRetail,
    hasBuilding,
    hasRooms,
    isCommercial,
  };
};

/* =========================================================
   CLEAN FORM
========================================================= */

const cleanForm = (f: FormState): FormState => {
  const c = categorize(f);
  const o: FormState = { ...f };
  const reset = (patch: Partial<FormState>) => Object.assign(o, patch);

  if (!c.isPlot) {
    reset({
      plotArea: '',
      plotLength: '',
      plotBreadth: '',
      floorsAllowed: '',
      boundaryWall: '',
      constructionDone: '',
    });
  }

  if (!c.hasBuilding) {
    reset({
      carpetArea: '',
      builtUpArea: '',
      superBuiltUpArea: '',
      totalFloors: '',
      floorNo: '',
      availability: '',
      ageOfProperty: '',
      reraId: '',
      maintenanceCharge: '',
      maintenancePeriod: '',
      coveredParking: 0,
      openParking: 0,
      overlooking: [],
      powerBackup: '',
      flooring: '',
      features: [],
    });
  }

  if (!c.hasRooms) {
    reset({
      beds: '',
      baths: '',
      balconies: '',
      duplex: false,
      otherRooms: [],
    });
  }

  if (!c.hasRooms && !c.isPG) {
    reset({
      furnishing: '',
      furnishingItems: {},
    });
  }

  if (f.furnishing === 'Furnished' || f.furnishing === 'Semi-Furnished') {
    const kept: Record<string, number> = {};
    Object.entries(f.furnishingItems).forEach(([key, value]) => {
      if (value > 0) kept[key] = value;
    });
    reset({ furnishingItems: kept });
  } else {
    reset({ furnishingItems: {} });
  }

  if (f.availability !== 'Ready to move') {
    reset({ ageOfProperty: '' });
  }

  if (!c.isPlot && f.availability !== 'Under construction') {
    reset({ possessionBy: '' });
  }

  if (!c.isSale) {
    reset({
      allInclusive: false,
      taxExcluded: false,
      reraId: '',
    });
  }

  if (c.isSale) {
    reset({
      availableFrom: '',
      securityDepositType: '',
      securityDeposit: '',
    });
  }

  if (!c.isRent) {
    reset({ preferredTenants: [] });
  }

  if (!f.securityDepositType || f.securityDepositType === 'None') {
    reset({ securityDeposit: '' });
  }

  if (!c.isPG) {
    reset({
      pgSuitableFor: '',
      pgSharing: [],
      pgTotalBeds: '',
      pgFoodIncluded: '',
      pgNoticePeriod: '',
    });
  }

  if (!c.isCommercial) {
    reset({
      locatedInside: '',
      zoneType: '',
      washrooms: '',
    });
  }

  if (!c.isOffice) {
    reset({
      pantry: '',
      minSeats: '',
      maxSeats: '',
      cabins: '',
      meetingRooms: '',
    });
  }

  if (!c.isRetail) {
    reset({ locatedInside: '' });
  }

  if (c.isPG) {
    reset({
      ownership: '',
      openSides: '',
      facing: '',
      roadWidth: '',
    });
  }

  if (c.isPlot) {
    reset({ amenities: [] });
  }

  return o;
};

/* =========================================================
   AUTO DESCRIPTION
   Builds a professional description from everything the user
   has already filled in on the previous steps.
========================================================= */

const joinList = (items: string[]): string => {
  const list = items.map((item) => item.trim()).filter(Boolean);
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
};

const formatMoney = (value: string): string => {
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? `₹${n.toLocaleString('en-IN')}` : '';
};

const buildDescription = (raw: FormState): string => {
  const f = cleanForm(raw);
  const c = categorize(f);
  const unit = f.areaUnit;
  const place = [f.society, f.landmark, f.area, f.city].filter(Boolean).join(', ');
  const inPlace = place ? ` in ${place}` : '';
  const lines: string[] = [];

  /* ---------- Intro ---------- */
  if (c.isPG) {
    const guests = f.pgSuitableFor && f.pgSuitableFor !== 'Any' ? ` for ${f.pgSuitableFor.toLowerCase()}` : '';
    lines.push(`A comfortable and well-maintained PG accommodation${guests} is available${inPlace}.`);
  } else {
    const type = f.residentialType || 'property';
    lines.push(`A well-located ${type.toLowerCase()} is available for ${c.isSale ? 'sale' : 'rent'}${inPlace}.`);
  }

  /* ---------- Rooms ---------- */
  if (c.hasRooms) {
    const rooms: string[] = [];
    if (f.beds) rooms.push(`${f.beds} ${f.beds === '1' ? 'bedroom' : 'bedrooms'}`);
    if (f.baths) rooms.push(`${f.baths} ${f.baths === '1' ? 'bathroom' : 'bathrooms'}`);
    if (f.balconies && f.balconies !== '0') {
      rooms.push(`${f.balconies} ${f.balconies === '1' ? 'balcony' : 'balconies'}`);
    }
    if (rooms.length) lines.push(`The home offers ${joinList(rooms)}${f.duplex ? ' in a duplex layout' : ''}.`);
    if (f.otherRooms.length) {
      lines.push(`Additional rooms include ${joinList(f.otherRooms.map((r) => r.toLowerCase()))}.`);
    }
  }

  /* ---------- PG details ---------- */
  if (c.isPG) {
    const pg: string[] = [];
    if (f.pgSharing.length) pg.push(`${joinList(f.pgSharing.map((s) => s.toLowerCase()))} sharing options`);
    if (f.pgTotalBeds) pg.push(`${f.pgTotalBeds} beds in total`);
    if (f.pgFoodIncluded === 'Yes') pg.push('meals included');
    if (pg.length) lines.push(`The PG provides ${joinList(pg)}.`);
    if (f.pgNoticePeriod && f.pgNoticePeriod !== 'None') {
      lines.push(`A notice period of ${f.pgNoticePeriod} applies.`);
    }
  }

  /* ---------- Area ---------- */
  if (c.isPlot) {
    if (f.plotArea) {
      const dims = f.plotLength && f.plotBreadth ? ` (${f.plotLength} x ${f.plotBreadth})` : '';
      lines.push(`The plot spans ${f.plotArea} ${unit}${dims}.`);
    }
    const extra: string[] = [];
    if (f.floorsAllowed) extra.push(`${f.floorsAllowed} floors permitted`);
    if (f.boundaryWall === 'Yes') extra.push('a boundary wall');
    if (f.constructionDone === 'Yes') extra.push('existing construction');
    if (extra.length) lines.push(`It comes with ${joinList(extra)}.`);
  } else if (c.hasBuilding) {
    const areas: string[] = [];
    if (f.carpetArea) areas.push(`a carpet area of ${f.carpetArea} ${unit}`);
    if (f.builtUpArea) areas.push(`a built-up area of ${f.builtUpArea} ${unit}`);
    if (f.superBuiltUpArea) areas.push(`a super built-up area of ${f.superBuiltUpArea} ${unit}`);
    if (areas.length) lines.push(`The property has ${joinList(areas)}.`);
  }

  /* ---------- Floor ---------- */
  if (c.hasBuilding && f.floorNo) {
    const floorText = /^\d+$/.test(f.floorNo) ? `floor ${f.floorNo}` : `the ${f.floorNo.toLowerCase()} floor`;
    lines.push(
      `It is situated on ${floorText}${f.totalFloors ? ` of a ${f.totalFloors}-floor building` : ''}.`,
    );
  } else if (c.hasBuilding && f.totalFloors) {
    lines.push(`The building has ${f.totalFloors} floors in total.`);
  }

  /* ---------- Availability ---------- */
  if (f.availability === 'Ready to move') {
    lines.push(
      `The property is ready to move in${f.ageOfProperty ? ` and is ${f.ageOfProperty} old` : ''}.`,
    );
  } else if (f.availability === 'Under construction') {
    lines.push(
      `The property is under construction${f.possessionBy ? `, with possession ${f.possessionBy.toLowerCase()}` : ''}.`,
    );
  }
  if (f.reraId) lines.push(`RERA registration number: ${f.reraId}.`);

  /* ---------- Commercial ---------- */
  if (c.isCommercial) {
    const com: string[] = [];
    if (f.locatedInside) com.push(`located inside a ${f.locatedInside.toLowerCase()}`);
    if (f.zoneType) com.push(`${f.zoneType.toLowerCase()} zone`);
    if (f.washrooms) com.push(f.washrooms === 'No washroom' ? 'no washroom' : `${f.washrooms.toLowerCase()} washrooms`);
    if (f.pantry) com.push(f.pantry === 'No pantry' ? 'no pantry' : `${f.pantry.toLowerCase()} pantry`);
    if (f.minSeats || f.maxSeats) {
      com.push(`seating for ${[f.minSeats, f.maxSeats].filter(Boolean).join(' to ')}`);
    }
    if (f.cabins) com.push(`${f.cabins} cabins`);
    if (f.meetingRooms) com.push(`${f.meetingRooms} meeting rooms`);
    if (com.length) lines.push(`Key commercial details: ${joinList(com)}.`);
  }

  /* ---------- Furnishing ---------- */
  if (f.furnishing) {
    const items = Object.entries(f.furnishingItems)
      .filter(([, count]) => count > 0)
      .map(([name, count]) => `${count} ${name.toLowerCase()}`);
    lines.push(
      `The property is ${f.furnishing.toLowerCase()}${items.length ? `, including ${joinList(items)}` : ''}.`,
    );
  }

  /* ---------- Parking ---------- */
  const parking: string[] = [];
  if (f.coveredParking > 0) parking.push(`${f.coveredParking} covered`);
  if (f.openParking > 0) parking.push(`${f.openParking} open`);
  if (parking.length) lines.push(`Parking is available with ${joinList(parking)} slot(s).`);

  /* ---------- Other attributes ---------- */
  const attrs: string[] = [];
  if (f.facing) attrs.push(`${f.facing.toLowerCase()}-facing`);
  if (f.ownership) attrs.push(`${f.ownership.toLowerCase()} ownership`);
  if (f.openSides) attrs.push(`${f.openSides} open sides`);
  if (f.flooring) attrs.push(`${f.flooring.toLowerCase()} flooring`);
  if (f.powerBackup && f.powerBackup !== 'None') attrs.push(`${f.powerBackup.toLowerCase()} power backup`);
  if (f.roadWidth) attrs.push(`a ${f.roadWidth} ${f.roadWidthUnit.toLowerCase()} wide road`);
  if (f.overlooking.length) attrs.push(`views of ${joinList(f.overlooking.map((o) => o.toLowerCase()))}`);
  if (attrs.length) lines.push(`Highlights include ${joinList(attrs)}.`);

  if (f.features.length) lines.push(`Property features: ${joinList(f.features)}.`);
  if (f.amenities.length) lines.push(`Amenities: ${joinList(f.amenities)}.`);
  if (f.locationAdvantages.length) {
    lines.push(`Location advantages: ${joinList(f.locationAdvantages.map((l) => l.toLowerCase()))}.`);
  }

  /* ---------- Price ---------- */
  const price = formatMoney(f.price);
  if (price) {
    const flags: string[] = [];
    if (f.negotiable) flags.push('negotiable');
    if (f.allInclusive) flags.push('all inclusive');
    if (f.taxExcluded) flags.push('excluding tax and government charges');
    lines.push(
      `${c.isSale ? 'Expected price' : c.isPG ? 'Rent per bed' : 'Expected rent'} is ${price}${
        c.isSale ? '' : ' per month'
      }${flags.length ? ` (${joinList(flags)})` : ''}.`,
    );
  }

  const maintenance = formatMoney(f.maintenanceCharge);
  if (maintenance) {
    lines.push(
      `Maintenance charges are ${maintenance}${f.maintenancePeriod ? ` (${f.maintenancePeriod.toLowerCase()})` : ''}.`,
    );
  }

  if (!c.isSale && f.securityDepositType && f.securityDepositType !== 'None' && f.securityDeposit) {
    lines.push(
      f.securityDepositType === 'Multiple of rent'
        ? `Security deposit: ${f.securityDeposit} month(s) of rent.`
        : `Security deposit: ${formatMoney(f.securityDeposit) || f.securityDeposit}.`,
    );
  }

  if (c.isRent && f.preferredTenants.length) {
    lines.push(`Preferred tenants: ${joinList(f.preferredTenants.map((t) => t.toLowerCase()))}.`);
  }
  if (!c.isSale && f.availableFrom) lines.push(`Available from ${f.availableFrom}.`);

  lines.push('Contact us today to schedule a visit.');

  return lines.join(' ').slice(0, 5000);
};

/* =========================================================
   API (add and edit are separate calls)
========================================================= */

const createProperty = (payload: FormData) =>
  apiPostFormData('/mobileproperty', payload);

const updateProperty = (id: string | number, payload: FormData) => {
  const update: Record<string, unknown> = Object.fromEntries(payload.entries());
  const rawPrice = update.price;

  if (typeof rawPrice === 'string' && rawPrice.trim()) {
    const price = Number(rawPrice.replace(/,/g, ''));
    if (Number.isFinite(price)) {
      update.price = price;
    }
  }

  return apiPatch(`/properties/${id}`, update);
};

/* =========================================================
   UI COMPONENTS
========================================================= */

/** Red star for required fields */
const Req: React.FC = () => (
  <span className="apf-req" aria-hidden="true">*</span>
);

interface ChipsProps {
  options: string[];
  value: string | string[];
  onChange: (value: string) => void;
  plus?: boolean;
}

const Chips: React.FC<ChipsProps> = ({ options, value, onChange, plus }) => (
  <div className="apf-chips">
    {options.map((option) => {
      const selected = Array.isArray(value) ? value.includes(option) : value === option;
      return (
        <button
          type="button"
          key={option}
          className={`apf-chip ${selected ? 'apf-chip--on' : ''}`}
          onClick={() => onChange(option)}
        >
          {plus && <IonIcon icon={add} />}
          {option}
        </button>
      );
    })}
  </div>
);

interface SectionProps {
  title: string;
  sub?: string;
  optional?: boolean;
  required?: boolean;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, sub, optional, required, children }) => (
  <section className="apf-section">
    <h3 className="apf-h">
      {title}
      {required && <Req />}{' '}
      {optional && <em>(Optional)</em>}
    </h3>
    {sub && <p className="apf-sub">{sub}</p>}
    {children}
  </section>
);

const H4: React.FC<{ required?: boolean; children: React.ReactNode }> = ({ required, children }) => (
  <h4 className="apf-h4">
    {children}
    {required && <Req />}
  </h4>
);

const Check: React.FC<{
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label className="apf-check">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span>{label}</span>
  </label>
);

const Counter: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
}> = ({ label, value, onChange }) => (
  <div className="apf-counter">
    <span>{label}</span>
    <div>
      <button type="button" disabled={value <= 0} onClick={() => onChange(value - 1)}>
        <IonIcon icon={remove} />
      </button>
      <b>{value}</b>
      <button type="button" onClick={() => onChange(value + 1)}>
        <IonIcon icon={add} />
      </button>
    </div>
  </div>
);

const Input: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
  maxLength?: number;
}> = ({ value, onChange, placeholder, type = 'text', min, maxLength }) => (
  <input
    className="apf-input"
    type={type}
    min={min}
    maxLength={maxLength}
    placeholder={placeholder}
    value={value}
    onChange={(e) => onChange(e.target.value)}
  />
);

const Dropdown: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}> = ({ value, onChange, options, placeholder }) => (
  <select className="apf-input apf-select" value={value} onChange={(e) => onChange(e.target.value)}>
    {placeholder !== undefined && <option value="">{placeholder}</option>}
    {options.map((o) => (
      <option key={o} value={o}>{o}</option>
    ))}
  </select>
);

/* =========================================================
   GOOGLE LOCATION AUTOCOMPLETE
========================================================= */

interface LocationAutocompleteProps {
  label: string;
  placeholder: string;
  value: string;
  disabled?: boolean;
  required?: boolean;
  type: 'city' | 'locality' | 'sublocality' | 'society';
  onInput: (value: string) => void;
  onSelect: (prediction: GooglePlacePrediction) => void;
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  label,
  placeholder,
  value,
  disabled = false,
  required = false,
  type,
  onInput,
  onSelect,
}) => {
  const [suggestions, setSuggestions] = useState<GooglePlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);

  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const selectionMadeRef = useRef(false);
  const requestSequenceRef = useRef(0);

  const initialiseService = () => {
    if (!window.google?.maps?.places) return false;
    if (!serviceRef.current) {
      serviceRef.current = new window.google.maps.places.AutocompleteService();
    }
    setMapsReady(true);
    return true;
  };

  useEffect(() => {
    if (initialiseService()) return;
    const handleMapsReady = () => {
      initialiseService();
    };
    window.addEventListener('google-maps-ready', handleMapsReady);
    return () => {
      window.removeEventListener('google-maps-ready', handleMapsReady);
    };
  }, []);

  useEffect(() => {
    const requestSequence = ++requestSequenceRef.current;

    if (selectionMadeRef.current || !value.trim() || disabled || !mapsReady || !serviceRef.current) {
      setSuggestions([]);
      setLoading(false);
      return () => {
        requestSequenceRef.current += 1;
      };
    }

    const timer = window.setTimeout(() => {
      if (
        requestSequence !== requestSequenceRef.current ||
        !serviceRef.current ||
        !window.google?.maps?.places
      ) return;

      setLoading(true);

      const request: google.maps.places.AutocompletionRequest = {
        input: value.trim(),
        componentRestrictions: { country: 'in' },
      };

      if (type === 'city') {
        request.types = ['(cities)'];
      } else if (type === 'locality') {
        request.types = ['locality', 'sublocality', 'postal_code'];
      } else if (type === 'sublocality') {
        request.types = ['sublocality', 'sublocality_level_1', 'sublocality_level_2', 'neighborhood'];
      } else {
        request.types = ['establishment'];
      }

      serviceRef.current.getPlacePredictions(request, (predictions, status) => {
        if (requestSequence !== requestSequenceRef.current) return;
        setLoading(false);
        if (status === 'OK' && predictions) {
          setSuggestions(predictions.slice(0, 6));
        } else {
          setSuggestions([]);
        }
      });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      if (requestSequence === requestSequenceRef.current) {
        requestSequenceRef.current += 1;
      }
    };
  }, [value, disabled, type, mapsReady]);

  const handleSelect = (prediction: GooglePlacePrediction) => {
    selectionMadeRef.current = true;
    requestSequenceRef.current += 1;
    setLoading(false);
    setSuggestions([]);
    onSelect(prediction);
  };

  const handleInput = (input: string) => {
    selectionMadeRef.current = false;
    requestSequenceRef.current += 1;
    onInput(input);
  };

  return (
    <div className="apf-location-autocomplete">
      <label className="apf-location-label">
        {label}
        {required && <Req />}
      </label>

      <div className="apf-location-input-wrap">
        <IonIcon icon={type === 'city' ? searchOutline : locationOutline} />

        <input
          className="apf-input apf-location-input"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => handleInput(e.target.value)}
        />

        {loading && <IonSpinner name="crescent" className="apf-location-spinner" />}
      </div>

      {suggestions.length > 0 && (
        <div className="apf-location-suggestions">
          {suggestions.map((prediction) => (
            <button
              type="button"
              key={prediction.place_id}
              className="apf-location-suggestion"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(prediction)}
            >
              <IonIcon icon={locationOutline} />
              <span>
                <strong>
                  {prediction.structured_formatting?.main_text || prediction.description}
                </strong>
                {prediction.structured_formatting?.secondary_text && (
                  <small>{prediction.structured_formatting.secondary_text}</small>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

interface Props {
  /** 'add' (default) creates a property, 'edit' updates one. */
  mode?: 'add' | 'edit';
  userId?: string;
  /** edit only */
  property?: Record<string, unknown>;
  /** edit only */
  propertyId?: string | number;
  onSuccess?: () => void;
  onExit?: () => void;
  /** Reload the page after a successful save (default true). */
  refreshOnSuccess?: boolean;
}

const AddPropertyForm: React.FC<Props> = ({
  mode,
  userId: userIdProp,
  property,
  propertyId,
  onSuccess,
  onExit,
  refreshOnSuccess = true,
}) => {
  // Backwards compatible: if no mode is passed, a propertyId means edit.
  const isEdit = mode ? mode === 'edit' : propertyId != null;

  const [step, setStep] = useState(0);

  const [form, setForm] = useState<FormState>(() =>
    isEdit && property
      ? hydrateForm(property)
      : { ...initial, contactNumber: getSavedContact() },
  );

  // Full property record (the list item passed in is often only a summary).
  const [source, setSource] = useState<Record<string, unknown> | undefined>(property);
  const [loadingProperty, setLoadingProperty] = useState<boolean>(isEdit && propertyId != null);

  const [images, setImages] = useState<Img[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showMoreFeatures, setShowMoreFeatures] = useState(false);
  const [showMoreAmenities, setShowMoreAmenities] = useState(false);

  const [countries, setCountries] = useState<LookupItem[]>([]);
  const [states, setStates] = useState<LookupItem[]>([]);
  const [, setCities] = useState<LookupItem[]>([]);
  const [areas, setAreas] = useState<LookupItem[]>([]);

  const [googleMapsReady, setGoogleMapsReady] = useState(() => Boolean(window.google?.maps));

  const bodyRef = useRef<HTMLDivElement>(null);

  const c = categorize(form);
  const today = new Date().toISOString().slice(0, 10);

  /* =======================================================
     GENERIC SETTERS
  ======================================================= */

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const toggle = (key: ListKey, value: string) => {
    setForm((previous) => ({
      ...previous,
      [key]: previous[key].includes(value)
        ? previous[key].filter((item) => item !== value)
        : [...previous[key], value],
    }));
  };

  const pick = (key: keyof FormState, value: string) => {
    setForm((previous) => ({
      ...previous,
      [key]: previous[key] === value ? '' : value,
    }));
  };

  const setItem = (name: string, count: number) => {
    setForm((previous) => ({
      ...previous,
      furnishingItems: { ...previous.furnishingItems, [name]: count },
    }));
  };

  /* =======================================================
     AUTO FILL DESCRIPTION
  ======================================================= */

  const autoFillDescription = async () => {
    if (form.description.trim()) {
      const result = await Swal.fire({
        icon: 'question',
        title: 'Replace current description?',
        text: 'Your existing text will be replaced with an auto-generated description.',
        showCancelButton: true,
        confirmButtonText: 'Yes, replace',
        cancelButtonText: 'Keep mine',
      });
      if (!result.isConfirmed) return;
    }

    set('description', buildDescription(form));
  };

  /* =======================================================
     GOOGLE SCRIPT
  ======================================================= */

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.warn('VITE_GOOGLE_MAPS_API_KEY is missing. Google location autocomplete disabled.');
      return;
    }

    if (window.google?.maps?.places) {
      window.dispatchEvent(new Event('google-maps-ready'));
      return;
    }

    const existing = document.getElementById('google-maps-script') as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener(
        'load',
        () => window.dispatchEvent(new Event('google-maps-ready')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.dispatchEvent(new Event('google-maps-ready'));
    };
    script.onerror = () => {
      console.error('Google Maps JavaScript API failed to load.');
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const markMapsReady = (): void => setGoogleMapsReady(Boolean(window.google?.maps));
    markMapsReady();
    window.addEventListener('google-maps-ready', markMapsReady);
    return () => window.removeEventListener('google-maps-ready', markMapsReady);
  }, []);

  /* =======================================================
     COUNTRIES
  ======================================================= */

  useEffect(() => {
    apiGet('/country')
      .then((data) => setCountries(lookupItems(data)))
      .catch(async (error: unknown) => {
        console.error('Country fetch error:', error);
        await Swal.fire({
          icon: 'error',
          title: 'Could not load countries',
          text: error instanceof Error ? error.message : 'Please try again.',
        });
      });
  }, []);

  /* =======================================================
     EDIT MODE: load the COMPLETE saved record
     (the dashboard list only carries a summary, so fields such as
     amenities, furnishing, coordinates etc. would otherwise be blank)
  ======================================================= */

  useEffect(() => {
    if (!isEdit || propertyId == null) {
      setLoadingProperty(false);
      return;
    }

    let cancelled = false;

    const loadFullProperty = async (): Promise<void> => {
      try {
        const res = await apiGet(`/properties/${propertyId}`);
        const full = unwrapProperty(res);
        if (!cancelled && full) {
          const merged = { ...(property ?? {}) };
          Object.entries(full).forEach(([key, value]) => {
            if (value !== undefined && value !== null && !(typeof value === 'string' && !value.trim())) {
              merged[key] = value;
            }
          });
          setSource(merged);
          setForm(hydrateForm(merged));
        }
      } catch (error) {
        // Fall back to whatever the list gave us.
        console.warn('Could not load full property, using list data:', error);
      } finally {
        if (!cancelled) setLoadingProperty(false);
      }
    };

    void loadFullProperty();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, propertyId]);

  /* =======================================================
     EDIT MODE: resolve saved location names / IDs
  ======================================================= */

  useEffect(() => {
    if (!isEdit || !source || loadingProperty || countries.length === 0) return;
    const property = source;

    const loadLocationOptions = async (): Promise<void> => {
      try {
        const addressComponents = googleMapsReady
          ? await reverseGeocodeProperty(property)
          : [];
        const geoCountry = getAddressComponentName(addressComponents, ['country']);
        const geoState = getAddressComponentName(addressComponents, ['administrative_area_level_1']);
        const geoCity = getAddressComponentName(addressComponents, [
          'locality',
          'postal_town',
          'administrative_area_level_3',
          'administrative_area_level_2',
        ]);
        const geoArea = getAddressComponentName(addressComponents, [
          'sublocality_level_1',
          'sublocality',
          'neighborhood',
        ]);
        const geoLandmark = getAddressComponentName(addressComponents, [
          'sublocality_level_2',
          'neighborhood',
        ]);
        const addressParts = getLocationAddressParts(property);
        const addressCountry = geoCountry || addressParts.at(-1);
        const addressState = geoState || addressParts.at(-2);
        const addressCity = geoCity || addressParts.at(-3);
        const country = findLookupItem(countries, property.countryId ?? property.country_id)
          ?? findLookupItem(countries, property.countryName ?? property.country)
          ?? findLookupItem(countries, addressCountry);
        const countryName = country?.name ?? getLocationName(property.countryName, property.country) ?? '';
        let stateName = getLocationName(property.stateName, property.state) || addressState || '';
        let cityName = getLocationName(property.cityName, property.city) || '';
        let stateId = '';
        let cityId = '';
        let areaName = getLocationName(
          property.areaName
            ?? property.area_name
            ?? property.localityName
            ?? property.locality_name,
          property.locality ?? property.area ?? property.localityId ?? property.locality_id,
        ) || geoArea;
        let areaId = '';
        let landmarkName = getLocationName(
          property.subLocalityName
            ?? property.sublocalityName
            ?? property.sub_locality_name
            ?? property.landmarkName,
          property.subLocality
            ?? property.sublocality
            ?? property.sub_locality
            ?? property.landmark,
        ) || geoLandmark;

        if (country) {
          const stateOptions = lookupItems(await apiGet(`/states?countryId=${country.id}`));
          setStates(stateOptions);
          const state = findLookupItem(stateOptions, property.stateId ?? property.state_id)
            ?? findLookupItem(stateOptions, property.stateName ?? property.state)
            ?? findLookupItem(stateOptions, addressState);
          if (state) {
            stateId = String(state.id);
            stateName = state.name;
            const cityOptions = lookupItems(await apiGet(`/cities?stateId=${state.id}`));
            setCities(cityOptions);
            const city = findLookupItem(cityOptions, property.cityId ?? property.city_id)
              ?? findLookupItem(cityOptions, property.cityName ?? property.city)
              ?? findLookupItem(cityOptions, addressCity);
            if (city) {
              cityId = String(city.id);
              cityName = city.name;
            }
          }
        }

        const resolvedCityId = cityId || (
          /^\d+$/.test(String(property.cityId ?? property.city_id ?? ''))
            ? String(property.cityId ?? property.city_id)
            : ''
        );
        if (resolvedCityId) {
          const areaOptions = lookupItems(await apiGet(`/area?cityId=${resolvedCityId}`));
          setAreas(areaOptions);
          const area = findLookupItem(
            areaOptions,
            property.areaId
              ?? property.area_id
              ?? property.localityId
              ?? property.locality_id
              ?? property.areaName
              ?? property.area_name
              ?? property.localityName
              ?? property.locality_name
              ?? property.locality
              ?? property.area,
          ) ?? findLookupItem(areaOptions, geoArea);
          if (area) {
            areaId = String(area.id);
            areaName = area.name;
          }
          const landmark = findLookupItem(
            areaOptions,
            property.landmarkId
              ?? property.landmark_id
              ?? property.subLocalityId
              ?? property.sublocalityId
              ?? property.sub_locality_id
              ?? property.subLocalityName
              ?? property.sublocalityName
              ?? property.sub_locality_name
              ?? property.subLocality
              ?? property.sublocality
              ?? property.sub_locality
              ?? property.landmark,
          ) ?? findLookupItem(areaOptions, geoLandmark);
          if (landmark) landmarkName = landmark.name;
        } else {
          setAreas([]);
        }

        const cityIndex = addressParts.findIndex(
          (part) => cityName && normalizeLocationName(part) === normalizeLocationName(cityName),
        );
        const addressPartsBeforeCity = cityIndex > 0 ? addressParts.slice(0, cityIndex) : [];
        if (!areaName && addressPartsBeforeCity.length > 0) {
          areaName = addressPartsBeforeCity[addressPartsBeforeCity.length - 1];
        }
        if (!landmarkName && addressPartsBeforeCity.length > 1) {
          landmarkName = addressPartsBeforeCity[addressPartsBeforeCity.length - 2];
        }

        if (!cityName && addressCity) {
          cityName = addressCity;
        }
        if (!cityName && property.city != null) {
          throw new Error(`Could not find a city name for ID ${String(property.city)}.`);
        }
        if (!areaName && property.area != null) {
          throw new Error(`Could not find a locality name for ID ${String(property.area)}.`);
        }

        setForm((current) => ({
          ...current,
          countryId: country ? String(country.id) : current.countryId,
          country: countryName || current.country,
          stateId: stateId || current.stateId,
          state: stateName || current.state,
          cityId: cityId || current.cityId,
          city: cityName || current.city,
          areaId: areaId || current.areaId,
          area: areaName || current.area,
          landmark: landmarkName || current.landmark,
        }));
      } catch (error) {
        console.error('Property location lookup error:', error);
        await Swal.fire({
          icon: 'error',
          title: 'Could not load property location',
          text: error instanceof Error ? error.message : 'Could not fetch the saved country, state, and city names.',
        });
      }
    };

    void loadLocationOptions();
  }, [isEdit, source, loadingProperty, countries, googleMapsReady]);

  /* =======================================================
     SCROLL TOP
  ======================================================= */

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  /* =======================================================
     LOOKING TO
  ======================================================= */

  const changeLookingTo = (value: string) => {
    setForm((previous) => ({
      ...previous,
      lookingTo: value,
      residentialType:
        previous.lookingTo === 'Paying Guest' ? '' : previous.residentialType,
    }));
  };

  /* =======================================================
     COUNTRY / STATE
  ======================================================= */

  const clearBelowCountry = {
    stateId: '',
    state: '',
    cityId: '',
    city: '',
    areaId: '',
    area: '',
    landmark: '',
    society: '',
    latitude: '',
    longitude: '',
    placeId: '',
    formattedAddress: '',
  };

  const onCountry = async (id: string) => {
    const selected = countries.find((item) => String(item.id) === id);

    setForm((previous) => ({
      ...previous,
      ...clearBelowCountry,
      countryId: id,
      country: selected?.name || '',
    }));

    setStates([]);
    setCities([]);
    setAreas([]);

    if (!id) return;

    try {
      setStates(lookupItems(await apiGet(`/states?countryId=${id}`)));
    } catch {
      setStates([]);
    }
  };

  const onState = async (id: string) => {
    const selected = states.find((item) => String(item.id) === id);

    setForm((previous) => ({
      ...previous,
      stateId: id,
      state: selected?.name || '',
      cityId: '',
      city: '',
      areaId: '',
      area: '',
      landmark: '',
      society: '',
      latitude: '',
      longitude: '',
      placeId: '',
      formattedAddress: '',
    }));

    setCities([]);
    setAreas([]);

    if (!id) return;

    try {
      setCities(lookupItems(await apiGet(`/cities?stateId=${id}`)));
    } catch {
      setCities([]);
    }
  };

  /* =======================================================
     PLACE DETAILS
  ======================================================= */

  const getPlaceDetails = (
    placeId: string,
  ): Promise<google.maps.places.PlaceResult | null> =>
    new Promise((resolve) => {
      if (!window.google?.maps?.places) {
        resolve(null);
        return;
      }

      const service = new window.google.maps.places.PlacesService(
        document.createElement('div'),
      );

      service.getDetails(
        {
          placeId,
          fields: ['place_id', 'formatted_address', 'geometry', 'address_components', 'name'],
        },
        (place, status) => {
          resolve(status === 'OK' && place ? place : null);
        },
      );
    });

  const getAddressComponent = (
    place: google.maps.places.PlaceResult,
    types: string[],
  ) =>
    place.address_components?.find((component: google.maps.GeocoderAddressComponent) =>
      component.types.some((type) => types.includes(type)),
    )?.long_name || '';

  /* =======================================================
     CITY GOOGLE SELECT
  ======================================================= */

  const selectCity = async (prediction: GooglePlacePrediction) => {
    const place = await getPlaceDetails(prediction.place_id);
    if (!place) return;

    const googleCityName =
      getAddressComponent(place, [
        'locality',
        'postal_town',
        'administrative_area_level_3',
        'administrative_area_level_2',
      ]) ||
      prediction.structured_formatting?.main_text ||
      '';

    const stateName = getAddressComponent(place, ['administrative_area_level_1']);
    const latitude = place.geometry?.location?.lat();
    const longitude = place.geometry?.location?.lng();

    let stateId = form.stateId;
    let state = form.state;

    if (stateName) {
      const stateMatch = states.find(
        (item) => item.name.toLowerCase().trim() === stateName.toLowerCase().trim(),
      );
      if (stateMatch) {
        stateId = String(stateMatch.id);
        state = stateMatch.name;
      }
    }

    let cityId = '';

    try {
      if (stateId) {
        const list = lookupItems(await apiGet(`/cities?stateId=${stateId}`));
        setCities(list);
        const cityMatch = list.find(
          (item) => normalizeLocationName(item.name) === normalizeLocationName(googleCityName),
        );
        if (cityMatch) cityId = String(cityMatch.id);
      }
    } catch (error) {
      console.error('City lookup error:', error);
    }

    setForm((previous) => ({
      ...previous,
      stateId,
      state: state || stateName,
      cityId,
      city: googleCityName,
      areaId: '',
      area: '',
      landmark: '',
      society: '',
      latitude: latitude !== undefined ? String(latitude) : '',
      longitude: longitude !== undefined ? String(longitude) : '',
      placeId: place.place_id || prediction.place_id,
      formattedAddress: place.formatted_address || '',
    }));

    if (cityId) {
      try {
        setAreas(lookupItems(await apiGet(`/area?cityId=${cityId}`)));
      } catch {
        setAreas([]);
      }
    }
  };

  /* =======================================================
     LOCALITY GOOGLE SELECT
  ======================================================= */

  const selectLocality = async (prediction: GooglePlacePrediction) => {
    const place = await getPlaceDetails(prediction.place_id);
    if (!place) return;

    const localityName =
      getAddressComponent(place, [
        'sublocality',
        'sublocality_level_1',
        'locality',
        'neighborhood',
        'postal_code',
      ]) ||
      prediction.structured_formatting?.main_text ||
      '';

    const latitude = place.geometry?.location?.lat();
    const longitude = place.geometry?.location?.lng();

    const normalizedLocality = normalizeLocationName(localityName);
    const areaMatch = areas
      .map((item) => ({ item, normalizedName: normalizeLocationName(item.name) }))
      .filter(
        ({ normalizedName }) =>
          normalizedName === normalizedLocality ||
          (normalizedLocality.length >= 4 && normalizedName.includes(normalizedLocality)),
      )
      .sort((first, second) => first.normalizedName.length - second.normalizedName.length)[0]?.item;

    const areaId = areaMatch ? String(areaMatch.id) : '';

    setForm((previous) => ({
      ...previous,
      areaId,
      area: localityName,
      landmark: '',
      society: '',
      latitude: latitude !== undefined ? String(latitude) : previous.latitude,
      longitude: longitude !== undefined ? String(longitude) : previous.longitude,
      placeId: place.place_id || prediction.place_id,
      formattedAddress: place.formatted_address || previous.formattedAddress,
    }));
  };

  /* =======================================================
     SUB LOCALITY
  ======================================================= */

  const selectSubLocality = async (prediction: GooglePlacePrediction) => {
    const place = await getPlaceDetails(prediction.place_id);
    if (!place) return;

    const subLocality =
      getAddressComponent(place, [
        'sublocality',
        'sublocality_level_1',
        'sublocality_level_2',
        'neighborhood',
      ]) ||
      prediction.structured_formatting?.main_text ||
      '';

    const latitude = place.geometry?.location?.lat();
    const longitude = place.geometry?.location?.lng();

    setForm((previous) => ({
      ...previous,
      landmark: subLocality,
      latitude: latitude !== undefined ? String(latitude) : previous.latitude,
      longitude: longitude !== undefined ? String(longitude) : previous.longitude,
      placeId: place.place_id || prediction.place_id,
      formattedAddress: place.formatted_address || previous.formattedAddress,
    }));
  };

  /* =======================================================
     SOCIETY / APARTMENT
  ======================================================= */

  const selectSociety = async (prediction: GooglePlacePrediction) => {
    const place = await getPlaceDetails(prediction.place_id);
    if (!place) return;

    const societyName =
      place.name || prediction.structured_formatting?.main_text || '';

    const latitude = place.geometry?.location?.lat();
    const longitude = place.geometry?.location?.lng();

    setForm((previous) => ({
      ...previous,
      society: societyName,
      latitude: latitude !== undefined ? String(latitude) : previous.latitude,
      longitude: longitude !== undefined ? String(longitude) : previous.longitude,
      placeId: place.place_id || prediction.place_id,
      formattedAddress: place.formatted_address || previous.formattedAddress,
    }));
  };

  /* =======================================================
     IMAGE UPLOAD
  ======================================================= */

  const handleImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    const valid = files.filter(
      (file) =>
        ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type) &&
        file.size <= 10 * 1024 * 1024,
    );

    if (valid.length !== files.length) {
      void Swal.fire({
        icon: 'warning',
        title: 'Some images were skipped',
        text: 'Only PNG/JPG/JPEG/WebP under 10 MB allowed.',
      });
    }

    const room = 50 - images.length;
    const added: Img[] = [];

    for (const file of valid.slice(0, Math.max(room, 0))) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });

        added.push({ name: file.name, type: file.type, base64 });
      } catch (error) {
        console.error('Image read error:', error);
      }
    }

    setImages((previous) => [...previous, ...added]);
    event.target.value = '';
  };

  /* =======================================================
     VALIDATION — returns EVERY problem on a step
  ======================================================= */

  const validate = (currentStep: number): string[] => {
    const errors: string[] = [];

    if (currentStep === 0) {
      if (!form.lookingTo) errors.push('Please select whether you want to Sale, rent, or list a PG');
      if (!c.isPG && !form.propertyType) errors.push('Property category is required');
      if (!c.isPG && !form.residentialType) errors.push('Property type is required');
      if (!form.contactNumber.trim()) errors.push('Contact details are required');
    }

    if (currentStep === 1) {
      if (!form.countryId) errors.push('Country is required');
      if (!form.stateId) errors.push('State is required');

      if (!form.city.trim()) {
        errors.push('City is required');
      } else if (!form.cityId) {
        errors.push('City must match the selected state — pick it from the suggestions');
      }

      if (!form.area.trim()) errors.push('Locality is required');

      if (form.city.trim() && form.area.trim() && (!form.latitude || !form.longitude)) {
        errors.push('Select your location from the Google suggestions so the map position can be saved');
      }

      if (c.isPlot && !form.plotArea) errors.push('Plot area is required');

      if (c.hasBuilding && !form.carpetArea && !form.builtUpArea && !form.superBuiltUpArea) {
        errors.push('At least one area (carpet / built-up / super built-up) is required');
      }

      // Price lives on this step, so it is validated here.
      if (!form.price.trim()) {
        errors.push(c.isSale ? 'Expected price is required' : 'Expected rent is required');
      }
    }

    if (currentStep === 2) {
      if (form.description.trim() && form.description.trim().length < MIN_DESC) {
        errors.push(`Description needs at least ${MIN_DESC} characters`);
      }

      if (form.videoUrl.trim() && !/^https?:\/\//i.test(form.videoUrl.trim())) {
        errors.push('Video link must start with http:// or https://');
      }
    }

    return errors;
  };

  /* =======================================================
     NEXT / BACK
  ======================================================= */

  const next = () => {
    const errors = validate(step);

    if (errors.length > 0) {
      void showRequiredAlert(errors);
      return;
    }

    setStep((previous) => Math.min(previous + 1, TOTAL_STEPS - 1));
  };

  const back = () => {
    if (step === 0) {
      onExit?.();
      return;
    }
    setStep((previous) => previous - 1);
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const submit = async () => {
    if (loadingProperty) return;

    // Find the first step that has problems and show all of them.
    for (let currentStep = 0; currentStep < TOTAL_STEPS; currentStep++) {
      const errors = validate(currentStep);
      if (errors.length > 0) {
        setStep(currentStep);
        await showRequiredAlert(errors);
        return;
      }
    }

    const userId = userIdProp || localStorage.getItem('userId');

    if (!userId) {
      await Swal.fire({
        icon: 'error',
        title: 'Login required',
        text: 'User ID not found. Please log in again.',
      });
      return;
    }

    if (isEdit && propertyId == null) {
      await Swal.fire({
        icon: 'error',
        title: 'Cannot update',
        text: 'Property ID is missing.',
      });
      return;
    }

    setSubmitting(true);

    try {
      const f = cleanForm(form);
      const fc = categorize(f);
      const payload = new FormData();

      payload.append('userId', userId);

      /* ---------- derived values ---------- */

      const propertyFor = fc.isSale ? 'Sale' : 'Rent';

      const place = [f.society, f.landmark, f.area, f.city].filter(Boolean).join(', ');

      const title = fc.isPG
        ? `PG in ${place}`
        : `${f.residentialType} for ${propertyFor} in ${place}`;

      const squareFt = f.plotArea || f.carpetArea || f.builtUpArea || f.superBuiltUpArea;

      const derived: Record<string, string> = {
        propertyFor,
        title,
        squareFt,
        propertyLocation: f.country.toLowerCase() === 'india' ? 'National' : 'International',
        priceFor: propertyFor === 'Sale' ? 'Total' : 'Monthly',
        address: [f.society, f.landmark, f.area, f.city, f.state, f.country]
          .filter(Boolean)
          .join(', '),
        googleLocation: f.formattedAddress,
        slug: slugify(f.city || title),
        contactName: f.contactNumber,
        isBankProperty: 'no',
      };

      /* ---------- location values (kept hidden, still saved) ---------- */

      payload.append('latitude', String(Number(f.latitude)));
      payload.append('longitude', String(Number(f.longitude)));
      payload.append('placeId', f.placeId || '');
      payload.append('formattedAddress', f.formattedAddress || '');
      payload.append('country', f.country || '');
      payload.append('state', f.state || '');
      payload.append('city', f.city || '');
      payload.append('area', f.area || '');

      // The API requires areaId as a non-empty field. When Google returns a
      // locality absent from the master area list, pass its name; the API's
      // integer conversion stores area as null while address keeps it.
      payload.append('areaId', f.areaId || f.area || f.landmark || '');

      /* ---------- form values ---------- */

      const skip = [
        'showBuiltUp',
        'showSuperBuiltUp',
        'lookingTo',
        'country',
        'state',
        'city',
        'area',
        'areaId',
        'latitude',
        'longitude',
        'placeId',
        'formattedAddress',
      ];

      Object.entries(f).forEach(([key, value]) => {
        if (value === undefined || value === null || skip.includes(key) || key in derived) {
          return;
        }

        if (Array.isArray(value)) {
          payload.append(key, value.join(', '));
        } else if (typeof value === 'object') {
          payload.append(key, JSON.stringify(value));
        } else {
          payload.append(key, String(value));
        }
      });

      Object.entries(derived).forEach(([key, value]) => {
        payload.append(key, value);
      });

      /* ---------- images ---------- */

      if (!isEdit || images.length > 0) {
        payload.append(
          'imagesPayload',
          JSON.stringify(
            images.map((image) => ({
              name: image.name,
              type: image.type,
              data: image.base64.split(',')[1],
            })),
          ),
        );
      }

      /* ---------- API: add and edit are separate ---------- */

      const data = isEdit
        ? await updateProperty(propertyId as string | number, payload)
        : await createProperty(payload);

      if (data?.success === false) {
        throw new Error(
          data.error || data.message || (isEdit ? 'Could not update property' : 'Could not add property'),
        );
      }

      setSubmitting(false);

      await Swal.fire({
        icon: 'success',
        title: isEdit ? 'Property updated' : 'Property added',
        text: data?.message || (isEdit ? 'Property updated successfully!' : 'Property added successfully!'),
      });

      window.dispatchEvent(new Event(isEdit ? 'property:changed' : 'property:created'));

      if (!isEdit) {
        setForm({ ...initial, contactNumber: getSavedContact() });
        setImages([]);
        setStates([]);
        setCities([]);
        setAreas([]);
        setStep(0);
        setShowMoreFeatures(false);
        setShowMoreAmenities(false);
      }

      onSuccess?.();

      // Refresh the page so every list / counter shows the new data.
      if (refreshOnSuccess) {
        window.location.reload();
      }
    } catch (error: unknown) {
      console.error('Submit Error:', error);

      const message = error instanceof Error
        ? error.message
        : error && typeof error === 'object'
          ? String(
            (error as { error?: unknown }).error
            ?? (error as { message?: unknown }).message
            ?? 'Something went wrong',
          )
          : 'Something went wrong';
      const authenticationRequired = message.toLowerCase().includes('authentication required');

      await Swal.fire({
        icon: 'error',
        title: authenticationRequired
          ? 'Authentication required'
          : isEdit
            ? 'Could not update property'
            : 'Could not add property',
        text: authenticationRequired
          ? `${message}. Please sign in again and retry.`
          : message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* =======================================================
     DERIVED UI
  ======================================================= */

  const types = form.propertyType === 'Commercial' ? COM_TYPES : RES_TYPES;
  const isLast = step === TOTAL_STEPS - 1;

  const areaVal = Number(form.plotArea || form.carpetArea || form.builtUpArea || form.superBuiltUpArea);
  const priceNum = Number(form.price);
  const perUnit = c.isSale && areaVal > 0 && priceNum > 0 ? Math.round(priceNum / areaVal) : 0;

  const showOpenSides =
    c.isPlot || c.isCommercial || HOUSE_TYPES.includes(form.residentialType);

  const unitSelect = (
    <select
      className="apf-input apf-select"
      value={form.areaUnit}
      onChange={(e) => set('areaUnit', e.target.value)}
    >
      {AREA_UNITS.map((unit) => (
        <option key={unit} value={unit}>{unit}</option>
      ))}
    </select>
  );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="apf-root">
      {/* HEADER */}
      <header className="apf-header">
        <button type="button" className="apf-back" onClick={back} aria-label="Back">
          <IonIcon icon={arrowBack} />
        </button>

        <div className="apf-titlebox">
          <h2>{STEP_TITLES[step]}</h2>
          <span className="apf-stepno">
            Step {step + 1} of {TOTAL_STEPS}
          </span>
        </div>
      </header>

      {/* BODY */}
      <div className="apf-body" ref={bodyRef}>
        {loadingProperty && (
          <p className="apf-loading">
            <IonSpinner name="crescent" /> Loading property details…
          </p>
        )}

        <p className="apf-required-note">
          <Req /> Required field
        </p>

        {/* ================= STEP 1 ================= */}
        {step === 0 && (
          <>
            <Section title="You're looking to?" required>
              <Chips options={LOOKING_TO} value={form.lookingTo} onChange={changeLookingTo} />
            </Section>

            {!c.isPG && (
              <>
                <Section title="Property type" required>
                  <Chips
                    options={KINDS}
                    value={form.propertyType}
                    onChange={(value) =>
                      setForm((previous) => ({
                        ...previous,
                        propertyType: value,
                        residentialType: '',
                      }))
                    }
                  />
                </Section>

                <Section title="Select property type" required>
                  <Chips
                    options={types}
                    value={form.residentialType}
                    onChange={(value) => set('residentialType', value)}
                  />
                </Section>
              </>
            )}

            <Section title="Contact details" required>
              <Input
                placeholder="Phone number / Username / Email"
                value={form.contactNumber}
                onChange={(v) => set('contactNumber', v)}
              />
            </Section>
          </>
        )}

        {/* ================= STEP 2 ================= */}
        {step === 1 && (
          <>
            <Section
              title="Where is your property located?"
              sub="Select locations from the suggestions so we can save the exact map position."
              required
            >
              {/* COUNTRY */}
              <label className="apf-location-label">
                Country
                <Req />
              </label>
              <select
                className="apf-input apf-select"
                value={form.countryId}
                onChange={(event) => onCountry(event.target.value)}
              >
                <option value="">Select country</option>
                {countries.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>

              {/* STATE */}
              <label className="apf-location-label">
                State
                <Req />
              </label>
              <select
                className="apf-input apf-select"
                value={form.stateId}
                disabled={!form.countryId}
                onChange={(event) => onState(event.target.value)}
              >
                <option value="">Select state</option>
                {states.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>

              {/* CITY */}
              <LocationAutocomplete
                label="City"
                required
                placeholder="Enter city"
                type="city"
                value={form.city}
                disabled={!form.stateId}
                onInput={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    city: value,
                    cityId: '',
                    area: '',
                    areaId: '',
                    landmark: '',
                    society: '',
                    latitude: '',
                    longitude: '',
                    placeId: '',
                    formattedAddress: '',
                  }))
                }
                onSelect={selectCity}
              />

              {/* LOCALITY */}
              <LocationAutocomplete
                label="Locality"
                required
                placeholder="Enter locality / area"
                type="locality"
                value={form.area}
                disabled={!form.city}
                onInput={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    area: value,
                    areaId: '',
                    landmark: '',
                    society: '',
                    latitude: '',
                    longitude: '',
                    placeId: '',
                    formattedAddress: '',
                  }))
                }
                onSelect={selectLocality}
              />

              {/* SUB LOCALITY */}
              <LocationAutocomplete
                label="Sub Locality"
                placeholder="Enter sub locality / neighbourhood"
                type="sublocality"
                value={form.landmark}
                disabled={!form.area}
                onInput={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    landmark: value,
                    latitude: '',
                    longitude: '',
                    placeId: '',
                    formattedAddress: '',
                  }))
                }
                onSelect={selectSubLocality}
              />

              {/* SOCIETY */}
              {!c.isPlot && (
                <LocationAutocomplete
                  label={c.isPG ? 'PG / Building Name' : 'Apartment / Society / Project'}
                  placeholder={c.isPG ? 'Search PG / building' : 'Search apartment / society / project'}
                  type="society"
                  value={form.society}
                  disabled={!form.area}
                  onInput={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      society: value,
                      latitude: '',
                      longitude: '',
                      placeId: '',
                      formattedAddress: '',
                    }))
                  }
                  onSelect={selectSociety}
                />
              )}

              {/* Selected address and latitude / longitude are kept in state
                  (and sent to the API) but intentionally NOT displayed. */}
            </Section>

            {/* PG */}
            {c.isPG && (
              <Section title="PG Details">
                <H4>PG is suitable for</H4>
                <Chips
                  options={PG_FOR}
                  value={form.pgSuitableFor}
                  onChange={(value) => pick('pgSuitableFor', value)}
                />

                <H4>Room sharing</H4>
                <Chips
                  plus
                  options={PG_SHARING}
                  value={form.pgSharing}
                  onChange={(value) => toggle('pgSharing', value)}
                />

                <Input
                  type="number"
                  min="1"
                  placeholder="Total number of beds"
                  value={form.pgTotalBeds}
                  onChange={(v) => set('pgTotalBeds', v)}
                />

                <H4>Meals included</H4>
                <Chips
                  options={PG_FOOD}
                  value={form.pgFoodIncluded}
                  onChange={(value) => pick('pgFoodIncluded', value)}
                />

                <H4>Notice period</H4>
                <Chips
                  options={PG_NOTICE}
                  value={form.pgNoticePeriod}
                  onChange={(value) => pick('pgNoticePeriod', value)}
                />
              </Section>
            )}

            {/* RESIDENTIAL ROOMS */}
            {c.hasRooms && (
              <Section title="Room Details">
                <H4>Bedrooms</H4>
                <Chips options={BEDS} value={form.beds} onChange={(value) => pick('beds', value)} />

                <H4>Bathrooms</H4>
                <Chips options={BATHS} value={form.baths} onChange={(value) => pick('baths', value)} />

                <H4>Balconies</H4>
                <Chips
                  options={BALCONIES}
                  value={form.balconies}
                  onChange={(value) => set('balconies', value)}
                />
              </Section>
            )}

            {/* COMMERCIAL */}
            {c.isCommercial && (
              <Section title="Commercial Details">
                {c.isRetail && (
                  <>
                    <H4>Located inside</H4>
                    <Chips
                      options={LOCATED_INSIDE}
                      value={form.locatedInside}
                      onChange={(value) => pick('locatedInside', value)}
                    />
                  </>
                )}

                <H4>Zone type</H4>
                <Dropdown
                  placeholder="Select zone type"
                  options={ZONES}
                  value={form.zoneType}
                  onChange={(v) => set('zoneType', v)}
                />

                <H4>Washrooms</H4>
                <Chips
                  options={WASHROOMS}
                  value={form.washrooms}
                  onChange={(value) => pick('washrooms', value)}
                />

                {c.isOffice && (
                  <>
                    <H4>Pantry</H4>
                    <Chips
                      options={PANTRY}
                      value={form.pantry}
                      onChange={(value) => pick('pantry', value)}
                    />

                    <div className="apf-unit-row">
                      <Input type="number" min="0" placeholder="Min. seats" value={form.minSeats} onChange={(v) => set('minSeats', v)} />
                      <Input type="number" min="0" placeholder="Max. seats" value={form.maxSeats} onChange={(v) => set('maxSeats', v)} />
                    </div>

                    <div className="apf-unit-row">
                      <Input type="number" min="0" placeholder="Cabins" value={form.cabins} onChange={(v) => set('cabins', v)} />
                      <Input type="number" min="0" placeholder="Meeting rooms" value={form.meetingRooms} onChange={(v) => set('meetingRooms', v)} />
                    </div>
                  </>
                )}
              </Section>
            )}

            {/* PLOT */}
            {c.isPlot && (
              <Section title="Plot Details">
                <H4 required>Plot area</H4>
                <div className="apf-unit-row">
                  <Input type="number" min="0" placeholder="Plot Area" value={form.plotArea} onChange={(v) => set('plotArea', v)} />
                  {unitSelect}
                </div>

                <div className="apf-unit-row">
                  <Input type="number" min="0" placeholder="Plot length" value={form.plotLength} onChange={(v) => set('plotLength', v)} />
                  <Input type="number" min="0" placeholder="Plot breadth" value={form.plotBreadth} onChange={(v) => set('plotBreadth', v)} />
                </div>

                <H4>Floors allowed</H4>
                <Input type="number" min="0" placeholder="Number of floors" value={form.floorsAllowed} onChange={(v) => set('floorsAllowed', v)} />

                <H4>Boundary wall</H4>
                <Chips options={YES_NO} value={form.boundaryWall} onChange={(value) => pick('boundaryWall', value)} />

                <H4>Construction done</H4>
                <Chips options={YES_NO} value={form.constructionDone} onChange={(value) => pick('constructionDone', value)} />
              </Section>
            )}

            {/* AREA */}
            {c.hasBuilding && (
              <Section title="Area Details" sub="At least one area type is mandatory" required>
                <div className="apf-unit-row">
                  <Input type="number" min="0" placeholder="Carpet Area" value={form.carpetArea} onChange={(v) => set('carpetArea', v)} />
                  {unitSelect}
                </div>

                {form.showBuiltUp ? (
                  <Input type="number" placeholder="Built-up Area" value={form.builtUpArea} onChange={(v) => set('builtUpArea', v)} />
                ) : (
                  <button type="button" className="apf-link" onClick={() => set('showBuiltUp', true)}>
                    + Built-up Area
                  </button>
                )}

                {form.showSuperBuiltUp ? (
                  <Input type="number" placeholder="Super Built-up Area" value={form.superBuiltUpArea} onChange={(v) => set('superBuiltUpArea', v)} />
                ) : (
                  <button type="button" className="apf-link" onClick={() => set('showSuperBuiltUp', true)}>
                    + Super Built-up Area
                  </button>
                )}
              </Section>
            )}

            {/* FLOOR */}
            {c.hasBuilding && (
              <Section title="Floor Details">
                <Input type="number" min="0" placeholder="Total floors" value={form.totalFloors} onChange={(v) => set('totalFloors', v)} />

                <Dropdown
                  placeholder="Property on floor"
                  options={FLOORS}
                  value={form.floorNo}
                  onChange={(v) => set('floorNo', v)}
                />

                {c.hasRooms && (
                  <Check
                    label="This property is a Duplex"
                    checked={form.duplex}
                    onChange={(value) => set('duplex', value)}
                  />
                )}
              </Section>
            )}

            {/* AVAILABILITY */}
            {c.hasBuilding && (
              <Section title="Availability">
                <Chips
                  options={AVAILABILITY}
                  value={form.availability}
                  onChange={(value) => set('availability', value)}
                />

                {form.availability === 'Ready to move' && (
                  <>
                    <H4>Property age</H4>
                    <Chips options={AGE} value={form.ageOfProperty} onChange={(value) => pick('ageOfProperty', value)} />
                  </>
                )}

                {form.availability === 'Under construction' && (
                  <>
                    <H4>Possession</H4>
                    <Chips options={POSSESSION} value={form.possessionBy} onChange={(value) => pick('possessionBy', value)} />
                  </>
                )}

                {c.isSale && (
                  <Input placeholder="RERA registration no. (Optional)" value={form.reraId} onChange={(v) => set('reraId', v)} />
                )}
              </Section>
            )}

            {/* PRICE */}
            <Section title={c.isSale ? 'Price Details' : 'Rent Details'} required>
              <div className="apf-prefix">
                <span>₹</span>
                <Input
                  type="number"
                  min="0"
                  placeholder={
                    c.isSale
                      ? 'Expected Price'
                      : c.isPG
                        ? 'Rent per bed / month'
                        : 'Expected Rent / month'
                  }
                  value={form.price}
                  onChange={(v) => set('price', v)}
                />
              </div>

              {perUnit > 0 && (
                <p className="apf-note">
                  About ₹{perUnit.toLocaleString('en-IN')} per {form.areaUnit}
                </p>
              )}

              {c.isSale && (
                <Check
                  label="All inclusive price"
                  checked={form.allInclusive}
                  onChange={(value) => set('allInclusive', value)}
                />
              )}

              <Check
                label={c.isSale ? 'Price Negotiable' : 'Rent Negotiable'}
                checked={form.negotiable}
                onChange={(value) => set('negotiable', value)}
              />

              {c.isSale && (
                <Check
                  label="Tax and Govt. charges excluded"
                  checked={form.taxExcluded}
                  onChange={(value) => set('taxExcluded', value)}
                />
              )}

              {c.hasBuilding && (
                <>
                  <H4>Maintenance charges</H4>
                  <div className="apf-prefix">
                    <span>₹</span>
                    <Input type="number" placeholder="Maintenance amount" value={form.maintenanceCharge} onChange={(v) => set('maintenanceCharge', v)} />
                  </div>

                  <Chips
                    options={MAINT_PERIOD}
                    value={form.maintenancePeriod}
                    onChange={(value) => pick('maintenancePeriod', value)}
                  />
                </>
              )}

              {!c.isSale && (
                <>
                  <H4>Security deposit</H4>
                  <Chips
                    options={DEPOSIT_TYPES}
                    value={form.securityDepositType}
                    onChange={(value) => pick('securityDepositType', value)}
                  />

                  {form.securityDepositType && form.securityDepositType !== 'None' && (
                    <Input
                      type="number"
                      placeholder={
                        form.securityDepositType === 'Multiple of rent'
                          ? "Number of months' rent"
                          : 'Deposit amount'
                      }
                      value={form.securityDeposit}
                      onChange={(v) => set('securityDeposit', v)}
                    />
                  )}
                </>
              )}
            </Section>

            {c.isRent && (
              <Section title="Preferred Tenants" optional>
                <Chips plus options={TENANTS} value={form.preferredTenants} onChange={(value) => toggle('preferredTenants', value)} />
              </Section>
            )}

            {!c.isSale && (
              <Section title="Available From" optional>
                <Input type="date" min={today} value={form.availableFrom} onChange={(v) => set('availableFrom', v)} />
              </Section>
            )}
          </>
        )}

        {/* ================= STEP 3 ================= */}
        {step === 2 && (
          <>
            {c.hasRooms && (
              <Section title="Room & Furnishing">
                <H4>Other rooms</H4>
                <Chips plus options={OTHER_ROOMS} value={form.otherRooms} onChange={(value) => toggle('otherRooms', value)} />

                <H4>Furnishing</H4>
                <Chips options={FURNISHING} value={form.furnishing} onChange={(value) => pick('furnishing', value)} />

                {(form.furnishing === 'Furnished' || form.furnishing === 'Semi-Furnished') &&
                  COUNTED_ITEMS.map((item) => (
                    <Counter
                      key={item}
                      label={item}
                      value={form.furnishingItems[item] || 0}
                      onChange={(count) => setItem(item, count)}
                    />
                  ))}
              </Section>
            )}

            {c.hasBuilding && (
              <Section title="Parking" optional>
                <Counter label="Covered Parking" value={form.coveredParking} onChange={(value) => set('coveredParking', value)} />
                <Counter label="Open Parking" value={form.openParking} onChange={(value) => set('openParking', value)} />
              </Section>
            )}

            <Section title="Property Description" sub="Write your own, or auto-fill from the details you entered.">
              <button type="button" className="apf-autofill" onClick={autoFillDescription}>
                <IonIcon icon={sparklesOutline} />
                Auto-fill description
              </button>

              <textarea
                className="apf-input apf-textarea"
                rows={7}
                maxLength={5000}
                placeholder="Describe your property..."
                value={form.description}
                onChange={(event) => set('description', event.target.value)}
              />
              <div className="apf-count">{form.description.length}/5000</div>
            </Section>

            <Section title="Property Video" optional>
              <Input type="url" placeholder="YouTube / video URL" value={form.videoUrl} onChange={(v) => set('videoUrl', v)} />
            </Section>

            <Section title="Contact Email" optional>
              <Input type="email" placeholder="Email" value={form.contactEmail} onChange={(v) => set('contactEmail', v)} />
            </Section>
          </>
        )}

        {/* ================= STEP 4 ================= */}
        {step === 3 && (
          <>
            <Section title="Property Photos" optional>
              <label className="apf-upload">
                <IonIcon icon={cloudUploadOutline} className="apf-upload-icon" />

                <span className="apf-upload-main">
                  <IonIcon icon={addOutline} />
                  Add photos
                </span>

                <span className="apf-upload-sub">Browse photos from your device</span>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  hidden
                  onChange={handleImages}
                />
              </label>

              <p className="apf-note">Up to 50 photos, maximum 10 MB each.</p>

              {images.length > 0 && (
                <div className="apf-preview-grid">
                  {images.map((image, index) => (
                    <div className="apf-preview-item" key={`${image.name}-${index}`}>
                      <img src={image.base64} alt={`Property ${index + 1}`} />

                      <button
                        type="button"
                        className="apf-preview-remove"
                        onClick={() =>
                          setImages((previous) => previous.filter((_, imageIndex) => imageIndex !== index))
                        }
                      >
                        <IonIcon icon={closeCircle} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className="apf-whatsapp">
                <input
                  type="checkbox"
                  checked={form.sendViaWhatsapp}
                  onChange={(event) => set('sendViaWhatsapp', event.target.checked)}
                />
                <span>I will send photos over WhatsApp</span>
              </label>
            </Section>

            {!c.isPG && (
              <Section title="Ownership">
                <Chips options={OWNERSHIP} value={form.ownership} onChange={(value) => pick('ownership', value)} />
              </Section>
            )}

            {!c.isPlot && (
              <Section title="Amenities">
                <Chips
                  plus
                  options={showMoreAmenities ? AMENITIES : AMENITIES.slice(0, 8)}
                  value={form.amenities}
                  onChange={(value) => toggle('amenities', value)}
                />

                {!showMoreAmenities && (
                  <button type="button" className="apf-link" onClick={() => setShowMoreAmenities(true)}>
                    + More amenities
                  </button>
                )}
              </Section>
            )}

            {c.hasBuilding && (
              <Section title="Property Features">
                <Chips
                  plus
                  options={showMoreFeatures ? FEATURES : FEATURES.slice(0, 6)}
                  value={form.features}
                  onChange={(value) => toggle('features', value)}
                />

                {!showMoreFeatures && (
                  <button type="button" className="apf-link" onClick={() => setShowMoreFeatures(true)}>
                    + More property features
                  </button>
                )}
              </Section>
            )}

            {showOpenSides && (
              <Section title="Open sides" optional>
                <Chips options={OPEN_SIDES} value={form.openSides} onChange={(value) => pick('openSides', value)} />
              </Section>
            )}

            {c.hasBuilding && (
              <>
                <Section title="Overlooking" optional>
                  <Chips plus options={OVERLOOKING} value={form.overlooking} onChange={(value) => toggle('overlooking', value)} />
                </Section>

                <Section title="Power Backup" optional>
                  <Chips options={POWER} value={form.powerBackup} onChange={(value) => pick('powerBackup', value)} />
                </Section>

                <Section title="Flooring" optional>
                  <Dropdown placeholder="Select flooring" options={FLOORING} value={form.flooring} onChange={(v) => set('flooring', v)} />
                </Section>
              </>
            )}

            {!c.isPG && (
              <Section title="Property Facing" optional>
                <Chips options={FACING} value={form.facing} onChange={(value) => pick('facing', value)} />
              </Section>
            )}

            {!c.isPG && (
              <Section title="Road Width" optional>
                <div className="apf-unit-row">
                  <Input type="number" min="0" placeholder="Road width" value={form.roadWidth} onChange={(v) => set('roadWidth', v)} />
                  <Dropdown options={['Feet', 'Meter']} value={form.roadWidthUnit} onChange={(v) => set('roadWidthUnit', v)} />
                </div>
              </Section>
            )}

            <Section title="Nearby Locations" optional>
              <Chips plus options={LOCATION_ADV} value={form.locationAdvantages} onChange={(value) => toggle('locationAdvantages', value)} />
            </Section>
          </>
        )}
      </div>

      {/* FOOTER */}
      <div className="apf-footer">
        {isLast ? (
          <button type="button" className="apf-btn" onClick={submit} disabled={submitting || loadingProperty}>
            {submitting ? <IonSpinner name="dots" /> : isEdit ? 'Update Property' : 'Save Property'}
          </button>
        ) : (
          <button type="button" className="apf-btn" onClick={next}>
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default AddPropertyForm;