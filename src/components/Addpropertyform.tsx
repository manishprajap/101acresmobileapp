/// <reference types="google.maps" />
import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  IonToast,
  IonIcon,
  IonSpinner,
} from '@ionic/react';

import {
  cloudUploadOutline,
  closeCircle,
  arrowBack,
  add,
  remove,
  addOutline,
  locationOutline,
  searchOutline,
} from 'ionicons/icons';

import './Addpropertyform.css';
import { apiGet, apiPostFormData } from '../api';

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
    .map((item: any) => ({
      id: Number(item.id ?? item.value ?? item.countryId ?? item.stateId ?? item.cityId ?? item.areaId ?? item.area_id),
      name: String(item.name ?? item.country_name ?? item.state_name ?? item.city_name ?? item.area_name ?? item.areaName ?? item.cityName ?? item.label ?? item.title ?? '').trim(),
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
  lookingTo: 'Sell',
  propertyType: 'Residential',
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
   PROPERTY OPTIONS
========================================================= */

const PG_TYPE = 'PG / Co-living';

const LOOKING_TO = [
  'Sell',
  'Rent / Lease',
  'Paying Guest',
];

const KINDS = [
  'Residential',
  'Commercial',
];

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

const PLOT_TYPES = [
  'Plot / Land',
  'Commercial Land',
  'Agricultural Land',
  'Industrial Land',
];

const OFFICE_TYPES = [
  'Office Space',
  'Co-working Space',
];

const RETAIL_TYPES = [
  'Shop',
  'Showroom',
];

const HOUSE_TYPES = [
  'Independent House / Villa',
  'Independent / Builder Floor',
  'Farmhouse',
];

const BEDS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '5+',
];

const BATHS = [
  '1',
  '2',
  '3',
  '4',
  '4+',
];

const BALCONIES = [
  '0',
  '1',
  '2',
  '3',
  'More than 3',
];

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
  ...Array.from(
    { length: 30 },
    (_, i) => String(i + 1),
  ),
];

const AVAILABILITY = [
  'Ready to move',
  'Under construction',
];

const AGE = [
  '0-1 years',
  '1-5 years',
  '5-10 years',
  '10+ years',
];

const YEAR = new Date().getFullYear();

const POSSESSION = [
  'Within 3 months',
  'Within 6 months',
  ...[0, 1, 2, 3, 4].map(
    (i) => `By ${YEAR + i}`,
  ),
];

const OWNERSHIP = [
  'Freehold',
  'Leasehold',
  'Co-operative society',
  'Power of Attorney',
];

const MAINT_PERIOD = [
  'Monthly',
  'Quarterly',
  'Yearly',
  'One time',
];

const DEPOSIT_TYPES = [
  'None',
  'Fixed',
  'Multiple of rent',
];

const TENANTS = [
  'Family',
  'Bachelor Men',
  'Bachelor Women',
  'Company',
];

const PG_FOR = [
  'Boys',
  'Girls',
  'Any',
];

const PG_SHARING = [
  'Single',
  'Double',
  'Triple',
  '4+ sharing',
];

const PG_FOOD = [
  'Yes',
  'No',
];

const PG_NOTICE = [
  'None',
  '15 days',
  '1 month',
  '2 months',
];

const YES_NO = [
  'Yes',
  'No',
];

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

const WASHROOMS = [
  'Private',
  'Shared',
  'No washroom',
];

const PANTRY = [
  'Private',
  'Shared',
  'No pantry',
];

const OTHER_ROOMS = [
  'Pooja Room',
  'Study Room',
  'Servant Room',
  'Store Room',
  'Others',
];

const FURNISHING = [
  'Unfurnished',
  'Semi-Furnished',
  'Furnished',
];

const COUNTED_ITEMS = [
  'Light',
  'Fans',
  'AC',
  'TV',
  'Beds',
  'Wardrobe',
  'Geyser',
];

const OTHER_ITEMS = [
  'Sofa',
  'Washing Machine',
  'Stove',
  'Fridge',
  'Water Purifier',
  'Microwave',
  'Modular Kitchen',
  'Chimney',
  'Dining Table',
  'Curtains',
  'Exhaust Fan',
];

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

const OPEN_SIDES = [
  '1',
  '2',
  '3',
  '3+',
];

const OVERLOOKING = [
  'Pool',
  'Park / Garden',
  'Club',
  'Main Road',
  'Others',
  'Sea Facing',
];

const POWER = [
  'None',
  'Partial',
  'Full',
];

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

const FLOORING = [
  'Marble',
  'Vitrified',
  'Ceramic',
  'Granite',
  'Wooden',
  'Mosaic',
  'Cement',
  'Other',
];

const MIN_DESC = 30;

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
  const isPG =
    f.lookingTo === 'Paying Guest';

  const isRent =
    f.lookingTo === 'Rent / Lease';

  const isSell =
    f.lookingTo === 'Sell';

  const isRes =
    f.propertyType === 'Residential';

  const isPlot =
    !isPG &&
    PLOT_TYPES.includes(f.residentialType);

  const isOffice =
    !isPG &&
    OFFICE_TYPES.includes(f.residentialType);

  const isRetail =
    !isPG &&
    RETAIL_TYPES.includes(f.residentialType);

  const hasBuilding =
    !isPG && !isPlot;

  const hasRooms =
    hasBuilding && isRes;

  const isCommercial =
    hasBuilding && !isRes;

  return {
    isPG,
    isRent,
    isSell,
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

const cleanForm = (
  f: FormState,
): FormState => {
  const c = categorize(f);

  const o: FormState = {
    ...f,
  };

  const reset = (
    patch: Partial<FormState>,
  ) =>
    Object.assign(o, patch);

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

  if (
    f.furnishing === 'Furnished' ||
    f.furnishing === 'Semi-Furnished'
  ) {
    const kept: Record<string, number> = {};

    Object.entries(
      f.furnishingItems,
    ).forEach(([key, value]) => {
      if (value > 0) {
        kept[key] = value;
      }
    });

    reset({
      furnishingItems: kept,
    });
  } else {
    reset({
      furnishingItems: {},
    });
  }

  if (
    f.availability !== 'Ready to move'
  ) {
    reset({
      ageOfProperty: '',
    });
  }

  if (
    !c.isPlot &&
    f.availability !==
    'Under construction'
  ) {
    reset({
      possessionBy: '',
    });
  }

  if (!c.isSell) {
    reset({
      allInclusive: false,
      taxExcluded: false,
      reraId: '',
    });
  }

  if (c.isSell) {
    reset({
      availableFrom: '',
      securityDepositType: '',
      securityDeposit: '',
    });
  }

  if (!c.isRent) {
    reset({
      preferredTenants: [],
    });
  }

  if (
    !f.securityDepositType ||
    f.securityDepositType === 'None'
  ) {
    reset({
      securityDeposit: '',
    });
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
    reset({
      locatedInside: '',
    });
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
    reset({
      amenities: [],
    });
  }

  return o;
};

/* =========================================================
   UI COMPONENTS
========================================================= */

interface ChipsProps {
  options: string[];
  value: string | string[];
  onChange: (value: string) => void;
  plus?: boolean;
}

const Chips: React.FC<ChipsProps> = ({
  options,
  value,
  onChange,
  plus,
}) => (
  <div className="apf-chips">
    {options.map((option) => {
      const selected = Array.isArray(value)
        ? value.includes(option)
        : value === option;

      return (
        <button
          type="button"
          key={option}
          className={`apf-chip ${selected
            ? 'apf-chip--on'
            : ''
            }`}
          onClick={() =>
            onChange(option)
          }
        >
          {plus && (
            <IonIcon icon={add} />
          )}
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
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({
  title,
  sub,
  optional,
  children,
}) => (
  <section className="apf-section">
    <h3 className="apf-h">
      {title}{' '}
      {optional && (
        <em>(Optional)</em>
      )}
    </h3>

    {sub && (
      <p className="apf-sub">
        {sub}
      </p>
    )}

    {children}
  </section>
);

const Check: React.FC<{
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}> = ({
  label,
  checked,
  onChange,
}) => (
    <label className="apf-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) =>
          onChange(e.target.checked)
        }
      />
      <span>{label}</span>
    </label>
  );

const Counter: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
}> = ({
  label,
  value,
  onChange,
}) => (
    <div className="apf-counter">
      <span>{label}</span>

      <div>
        <button
          type="button"
          disabled={value <= 0}
          onClick={() =>
            onChange(value - 1)
          }
        >
          <IonIcon icon={remove} />
        </button>

        <b>{value}</b>

        <button
          type="button"
          onClick={() =>
            onChange(value + 1)
          }
        >
          <IonIcon icon={add} />
        </button>
      </div>
    </div>
  );

/* =========================================================
   GOOGLE LOCATION AUTOCOMPLETE
========================================================= */

interface LocationAutocompleteProps {
  label: string;
  placeholder: string;
  value: string;
  disabled?: boolean;
  type: 'city' | 'locality' | 'sublocality' | 'society';
  onInput: (value: string) => void;
  onSelect: (prediction: GooglePlacePrediction) => void;
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  label,
  placeholder,
  value,
  disabled = false,
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
      serviceRef.current =
        new window.google.maps.places.AutocompleteService();
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
        request.types = [
          'sublocality',
          'sublocality_level_1',
          'sublocality_level_2',
          'neighborhood',
        ];
      } else {
        request.types = ['establishment'];
      }

      serviceRef.current.getPlacePredictions(
        request,
        (
          predictions,
          status,
        ) => {
          if (requestSequence !== requestSequenceRef.current) return;

          setLoading(false);

          if (
            status === 'OK' &&
            predictions
          ) {
            setSuggestions(
              predictions.slice(0, 6),
            );
          } else {
            setSuggestions([]);
          }
        },
      );
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
      <label className="apf-location-label">{label}</label>

      <div className="apf-location-input-wrap">
        <IonIcon
          icon={type === 'city' ? searchOutline : locationOutline}
        />

        <input
          className="apf-input apf-location-input"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => handleInput(e.target.value)}
        />

        {loading && (
          <IonSpinner
            name="crescent"
            className="apf-location-spinner"
          />
        )}
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
                  {prediction.structured_formatting?.main_text ||
                    prediction.description}
                </strong>
                {prediction.structured_formatting?.secondary_text && (
                  <small>
                    {prediction.structured_formatting.secondary_text}
                  </small>
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
  userId?: string;
  onSuccess?: () => void;
  onExit?: () => void;
}

const AddPropertyForm: React.FC<Props> = ({
  userId: userIdProp,
  onSuccess,
  onExit,
}) => {
  const [step, setStep] =
    useState(0);

  const [form, setForm] =
    useState<FormState>(() => ({
      ...initial,
      contactNumber: getSavedContact(),
    }));

  const [images, setImages] =
    useState<Img[]>([]);

  const [submitting, setSubmitting] =
    useState(false);

  const [toast, setToast] =
    useState<{
      message: string;
      color: string;
    } | null>(null);

  const [
    showMoreFeatures,
    setShowMoreFeatures,
  ] = useState(false);

  const [
    showMoreAmenities,
    setShowMoreAmenities,
  ] = useState(false);

  const [
    countries,
    setCountries,
  ] = useState<LookupItem[]>([]);

  const [
    states,
    setStates,
  ] = useState<LookupItem[]>([]);

  const [
    cities,
    setCities,
  ] = useState<LookupItem[]>([]);

  const [
    areas,
    setAreas,
  ] = useState<LookupItem[]>([]);

  const bodyRef =
    useRef<HTMLDivElement>(null);

  const c = categorize(form);

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  /* =======================================================
     GENERIC SETTERS
  ======================================================= */

  const set = <
    K extends keyof FormState
  >(
    key: K,
    value: FormState[K],
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const toggle = (
    key: ListKey,
    value: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: previous[key].includes(
        value,
      )
        ? previous[key].filter(
          (item) =>
            item !== value,
        )
        : [
          ...previous[key],
          value,
        ],
    }));
  };

  const pick = (
    key: keyof FormState,
    value: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]:
        previous[key] === value
          ? ''
          : value,
    }));
  };

  const setItem = (
    name: string,
    count: number,
  ) => {
    setForm((previous) => ({
      ...previous,
      furnishingItems: {
        ...previous.furnishingItems,
        [name]: count,
      },
    }));
  };

  /* =======================================================
     GOOGLE SCRIPT
  ======================================================= */

  useEffect(() => {
    const apiKey =
      import.meta.env
        .VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.warn(
        'VITE_GOOGLE_MAPS_API_KEY is missing. Google location autocomplete disabled.',
      );
      return;
    }

    if (window.google?.maps?.places) {
      window.dispatchEvent(new Event('google-maps-ready'));
      return;
    }

    const existing = document.getElementById(
      'google-maps-script',
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener('load', () =>
        window.dispatchEvent(new Event('google-maps-ready')),
        { once: true },
      );
      return;
    }

    const script =
      document.createElement(
        'script',
      );

    script.id =
      'google-maps-script';

    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        apiKey,
      )}&libraries=places`;

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

  /* =======================================================
     COUNTRIES
  ======================================================= */

  useEffect(() => {
    apiGet('/country')
      .then((data) =>
        setCountries(lookupItems(data)),
      )
      .catch((error) =>
        console.error(
          'Country fetch error:',
          error,
        ),
      );
  }, []);

  /* =======================================================
     SCROLL TOP
  ======================================================= */

  useEffect(() => {
    bodyRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, [step]);

  /* =======================================================
     LOOKING TO
  ======================================================= */

  const changeLookingTo = (
    value: string,
  ) => {
    setForm((previous) => {
      if (
        value ===
        'Paying Guest'
      ) {
        return {
          ...previous,
          lookingTo: value,
          propertyType:
            'Residential',
          residentialType:
            PG_TYPE,
        };
      }

      return {
        ...previous,
        lookingTo: value,
        residentialType:
          previous.lookingTo ===
            'Paying Guest'
            ? ''
            : previous.residentialType,
      };
    });
  };

  /* =======================================================
     COUNTRY
  ======================================================= */

  const onCountry = async (
    id: string,
  ) => {
    const selected =
      countries.find(
        (item) =>
          String(item.id) === id,
      );

    setForm((previous) => ({
      ...previous,

      countryId: id,
      country:
        selected?.name || '',

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
    }));

    setStates([]);
    setCities([]);
    setAreas([]);

    if (!id) return;

    try {
      const data =
        await apiGet(
          `/states?countryId=${id}`,
        );

      setStates(lookupItems(data));
    } catch {
      setStates([]);
    }
  };

  /* =======================================================
     STATE
  ======================================================= */

  const onState = async (
    id: string,
  ) => {
    const selected =
      states.find(
        (item) =>
          String(item.id) === id,
      );

    setForm((previous) => ({
      ...previous,

      stateId: id,
      state:
        selected?.name || '',

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
      const data =
        await apiGet(
          `/cities?stateId=${id}`,
        );

      setCities(lookupItems(data));
    } catch {
      setCities([]);
    }
  };

  /* =======================================================
     PLACE DETAILS
  ======================================================= */

  const getPlaceDetails = (
    placeId: string,
  ): Promise<
    google.maps.places.PlaceResult | null
  > => {
    return new Promise(
      (resolve) => {
        if (
          !window.google?.maps
            ?.places
        ) {
          resolve(null);
          return;
        }

        const service =
          new window.google.maps.places.PlacesService(
            document.createElement(
              'div',
            ),
          );

        service.getDetails(
          {
            placeId,
            fields: [
              'place_id',
              'formatted_address',
              'geometry',
              'address_components',
              'name',
            ],
          },
          (
            place,
            status,
          ) => {
            if (
              status === 'OK' &&
              place
            ) {
              resolve(place);
            } else {
              resolve(null);
            }
          },
        );
      },
    );
  };

  /* =======================================================
     ADDRESS COMPONENT
  ======================================================= */

  const getAddressComponent = (
    place: google.maps.places.PlaceResult,
    types: string[],
  ) => {
    return (
      place.address_components?.find(
        (component: google.maps.GeocoderAddressComponent) =>
          component.types.some((type) => types.includes(type)),
      )?.long_name || ''
    );
  };

  /* =======================================================
     CITY GOOGLE SELECT
  ======================================================= */

  const selectCity = async (
    prediction: GooglePlacePrediction,
  ) => {
    const place =
      await getPlaceDetails(
        prediction.place_id,
      );

    if (!place) return;

    const googleCityName =
      getAddressComponent(place, [
        'locality',
        'postal_town',
        'administrative_area_level_3',
        'administrative_area_level_2',
      ]) ||
      prediction
        .structured_formatting
        ?.main_text ||
      '';

    const stateName =
      getAddressComponent(place, [
        'administrative_area_level_1',
      ]);

    const countryName =
      getAddressComponent(place, [
        'country',
      ]);

    const latitude =
      place.geometry?.location
        ?.lat();

    const longitude =
      place.geometry?.location
        ?.lng();

    /* Try to resolve state */
    let stateId =
      form.stateId;

    let state =
      form.state;

    if (stateName) {
      const stateMatch =
        states.find(
          (item) =>
            item.name
              .toLowerCase()
              .trim() ===
            stateName
              .toLowerCase()
              .trim(),
        );

      if (stateMatch) {
        stateId = String(
          stateMatch.id,
        );

        state =
          stateMatch.name;
      }
    }

    /* Resolve city ID from local DB */
    let cityId = '';

    try {
      if (stateId) {
        const data =
          await apiGet(
            `/cities?stateId=${stateId}`,
          );

        const list = lookupItems(data);

        setCities(list);

        const cityMatch =
          list.find(
            (item) => normalizeLocationName(item.name) === normalizeLocationName(googleCityName),
          );

        if (cityMatch) {
          cityId = String(
            cityMatch.id,
          );
        }
      }
    } catch (error) {
      console.error(
        'City lookup error:',
        error,
      );
    }

    setForm((previous) => ({
      ...previous,

      stateId,
      state:

        state ||
        stateName,

      cityId,
      city: googleCityName,

      areaId: '',
      area: '',

      landmark: '',
      society: '',

      latitude:
        latitude !== undefined
          ? String(latitude)
          : '',

      longitude:
        longitude !== undefined
          ? String(longitude)
          : '',

      placeId:
        place.place_id ||
        prediction.place_id,

      formattedAddress:
        place.formatted_address ||
        '',
    }));

    /* Load DB areas */
    if (cityId) {
      try {
        const data =
          await apiGet(
            `/area?cityId=${cityId}`,
          );

        setAreas(lookupItems(data));
      } catch {
        setAreas([]);
      }
    }
  };

  /* =======================================================
     LOCALITY GOOGLE SELECT
  ======================================================= */

  const selectLocality = async (
    prediction: GooglePlacePrediction,
  ) => {
    const place =
      await getPlaceDetails(
        prediction.place_id,
      );

    if (!place) return;

    const localityName =
      getAddressComponent(place, [
        'sublocality',
        'sublocality_level_1',
        'locality',
        'neighborhood',
        'postal_code',
      ]) ||
      prediction
        .structured_formatting
        ?.main_text ||
      '';

    const latitude =
      place.geometry?.location
        ?.lat();

    const longitude =
      place.geometry?.location
        ?.lng();

    /* Match local DB locality */
    let areaId = '';

    const normalizedLocality = normalizeLocationName(localityName);
    const areaMatch = areas
      .map((item) => ({
        item,
        normalizedName: normalizeLocationName(item.name),
      }))
      .filter(({ normalizedName }) =>
        normalizedName === normalizedLocality ||
        (normalizedLocality.length >= 4 && normalizedName.includes(normalizedLocality)),
      )
      .sort((first, second) =>
        first.normalizedName.length - second.normalizedName.length,
      )[0]?.item;

    if (areaMatch) {
      areaId = String(
        areaMatch.id,
      );
    }

    setForm((previous) => ({
      ...previous,

      areaId,
      area: localityName,

      landmark: '',
      society: '',

      latitude:
        latitude !== undefined
          ? String(latitude)
          : previous.latitude,

      longitude:
        longitude !== undefined
          ? String(longitude)
          : previous.longitude,

      placeId:
        place.place_id ||
        prediction.place_id,

      formattedAddress:
        place.formatted_address ||
        previous.formattedAddress,
    }));
  };

  /* =======================================================
     SUB LOCALITY
  ======================================================= */

  const selectSubLocality =
    async (
      prediction: GooglePlacePrediction,
    ) => {
      const place =
        await getPlaceDetails(
          prediction.place_id,
        );

      if (!place) return;

      const subLocality =
        getAddressComponent(
          place,
          [
            'sublocality',
            'sublocality_level_1',
            'sublocality_level_2',
            'neighborhood',
          ],
        ) ||
        prediction
          .structured_formatting
          ?.main_text ||
        '';

      const latitude =
        place.geometry?.location
          ?.lat();

      const longitude =
        place.geometry?.location
          ?.lng();

      setForm((previous) => ({
        ...previous,

        landmark: subLocality,

        latitude:
          latitude !== undefined
            ? String(latitude)
            : previous.latitude,

        longitude:
          longitude !== undefined
            ? String(longitude)
            : previous.longitude,

        placeId:
          place.place_id ||
          prediction.place_id,

        formattedAddress:
          place.formatted_address ||
          previous.formattedAddress,
      }));
    };

  /* =======================================================
     SOCIETY / APARTMENT
  ======================================================= */

  const selectSociety =
    async (
      prediction: GooglePlacePrediction,
    ) => {
      const place =
        await getPlaceDetails(
          prediction.place_id,
        );

      if (!place) return;

      const societyName =
        place.name ||
        prediction
          .structured_formatting
          ?.main_text ||
        '';

      const latitude =
        place.geometry?.location
          ?.lat();

      const longitude =
        place.geometry?.location
          ?.lng();

      setForm((previous) => ({
        ...previous,

        society: societyName,

        latitude:
          latitude !== undefined
            ? String(latitude)
            : previous.latitude,

        longitude:
          longitude !== undefined
            ? String(longitude)
            : previous.longitude,

        placeId:
          place.place_id ||
          prediction.place_id,

        formattedAddress:
          place.formatted_address ||
          previous.formattedAddress,
      }));
    };

  /* =======================================================
     IMAGE UPLOAD
  ======================================================= */

  const handleImages = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(
      event.target.files || [],
    );

    const valid = files.filter(
      (file) =>
        [
          'image/jpeg',
          'image/png',
          'image/jpg',
          'image/webp',
        ].includes(file.type) &&
        file.size <=
        10 * 1024 * 1024,
    );

    if (
      valid.length !==
      files.length
    ) {
      setToast({
        message:
          'Only PNG/JPG/JPEG/WebP under 10 MB allowed.',
        color: 'warning',
      });
    }

    const room =
      50 - images.length;

    const added: Img[] = [];

    for (
      const file of valid.slice(
        0,
        Math.max(room, 0),
      )
    ) {
      try {
        const base64 =
          await new Promise<string>(
            (resolve, reject) => {
              const reader =
                new FileReader();

              reader.onload = () =>
                resolve(
                  reader.result as string,
                );

              reader.onerror = () =>
                reject(
                  new Error(
                    'Failed to read file',
                  ),
                );

              reader.readAsDataURL(
                file,
              );
            },
          );

        added.push({
          name: file.name,
          type: file.type,
          base64,
        });
      } catch (error) {
        console.error(
          'Image read error:',
          error,
        );
      }
    }

    setImages((previous) => [
      ...previous,
      ...added,
    ]);

    event.target.value = '';
  };

  /* =======================================================
     VALIDATION
  ======================================================= */

  const validate = (
    currentStep: number,
  ): string | null => {
    if (currentStep === 0) {
      if (
        !c.isPG &&
        !form.residentialType
      ) {
        return 'Please select a property type';
      }

      if (
        !form.contactNumber.trim()
      ) {
        return 'Contact details are required';
      }
    }

    if (currentStep === 1) {
      if (!form.countryId) {
        return 'Please select a country';
      }

      if (!form.stateId) {
        return 'Please select a state';
      }

      if (!form.city.trim()) {
        return 'Please select a city';
      }

      if (!form.cityId) {
        return 'Please choose a city that matches the selected state';
      }

      if (!form.area.trim()) {
        return 'Please select a locality';
      }

      if (
        !form.latitude ||
        !form.longitude
      ) {
        return 'Please select your location from Google Maps suggestions so latitude and longitude can be saved.';
      }

      if (
        c.isRes &&
        !form.society &&
        form.residentialType !==
        'Plot / Land'
      ) {
        // Society is optional in most cases,
        // so don't block submission.
      }

      if (
        c.isPlot &&
        !form.plotArea
      ) {
        return 'Plot area is mandatory';
      }

      if (
        c.hasBuilding &&
        !form.carpetArea &&
        !form.builtUpArea &&
        !form.superBuiltUpArea
      ) {
        return 'At least one area type is mandatory';
      }
    }

    if (currentStep === 2) {
      if (!form.price.trim()) {
        return c.isSell
          ? 'Expected price is required'
          : 'Expected rent is required';
      }

      if (
        form.description.trim() &&
        form.description.trim()
          .length < MIN_DESC
      ) {
        return `Description needs at least ${MIN_DESC} characters`;
      }

      if (
        form.videoUrl.trim() &&
        !/^https?:\/\//i.test(
          form.videoUrl.trim(),
        )
      ) {
        return 'Video link must start with http:// or https://';
      }
    }

    return null;
  };

  /* =======================================================
     NEXT
  ======================================================= */

  const next = () => {
    const error =
      validate(step);

    if (error) {
      setToast({
        message: error,
        color: 'danger',
      });
      return;
    }

    setStep((previous) =>
      Math.min(
        previous + 1,
        TOTAL_STEPS - 1,
      ),
    );
  };

  /* =======================================================
     BACK
  ======================================================= */

  const back = () => {
    if (step === 0) {
      onExit?.();
      return;
    }

    setStep((previous) =>
      previous - 1,
    );
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const submit = async () => {
    for (
      let currentStep = 0;
      currentStep < TOTAL_STEPS;
      currentStep++
    ) {
      const error =
        validate(currentStep);

      if (error) {
        setStep(currentStep);

        setToast({
          message: error,
          color: 'danger',
        });

        return;
      }
    }

    const userId =
      userIdProp ||
      localStorage.getItem(
        'userId',
      );

    if (!userId) {
      setToast({
        message:
          'User ID not found. Please log in again.',
        color: 'danger',
      });

      return;
    }

    setSubmitting(true);

    try {
      const f =
        cleanForm(form);

      const fc =
        categorize(f);

      const payload =
        new FormData();

      payload.append(
        'userId',
        userId,
      );

      /* ===================================================
         DERIVED VALUES
      =================================================== */

      const propertyFor =
        fc.isSell
          ? 'Sale'
          : fc.isPG
            ? 'Paying Guest'
            : 'Rent';

      const place = [
        f.society,
        f.landmark,
        f.area,
        f.city,
      ]
        .filter(Boolean)
        .join(', ');

      const title = fc.isPG
        ? `PG in ${place}`
        : `${f.residentialType} for ${propertyFor} in ${place}`;

      const squareFt =
        f.plotArea ||
        f.carpetArea ||
        f.builtUpArea ||
        f.superBuiltUpArea;

      const derived: Record<
        string,
        string
      > = {
        propertyFor,

        title,

        squareFt,

        propertyLocation:
          f.country
            .toLowerCase() ===
            'india'
            ? 'National'
            : 'International',

        priceFor:
          propertyFor === 'Sale'
            ? 'Total'
            : 'Monthly',

        address: [
          f.society,
          f.landmark,
          f.area,
          f.city,
          f.state,
          f.country,
        ]
          .filter(Boolean)
          .join(', '),

        googleLocation:
          f.formattedAddress,

        slug: slugify(
          f.city ||
          title,
        ),

        contactName:
          f.contactNumber,

        isBankProperty: 'no',
      };

      /* ===================================================
         IMPORTANT:
         LOCATION VALUES ARE NOW SENT
      =================================================== */

      payload.append(
        'latitude',
        String(Number(f.latitude)),
      );

      payload.append(
        'longitude',
        String(Number(f.longitude)),
      );

      payload.append(
        'placeId',
        f.placeId || '',
      );

      payload.append(
        'formattedAddress',
        f.formattedAddress || '',
      );

      /*
       * Keep display names.
       * These were previously skipped.
       *
       * Backend can now use them if needed.
       */
      payload.append(
        'country',
        f.country || '',
      );

      payload.append(
        'state',
        f.state || '',
      );

      payload.append(
        'city',
        f.city || '',
      );

      payload.append(
        'area',
        f.area || '',
      );

      // The current API requires areaId as a non-empty field. When Google
      // returns a locality absent from the master area list, pass its name;
      // the API's integer conversion stores area as null while address keeps it.
      payload.append(
        'areaId',
        f.areaId || f.area || f.landmark || '',
      );

      /* ===================================================
         FORM VALUES
      =================================================== */

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

      Object.entries(f).forEach(
        ([key, value]) => {
          if (
            value === undefined ||
            value === null ||
            skip.includes(key) ||
            key in derived
          ) {
            return;
          }

          if (
            Array.isArray(value)
          ) {
            payload.append(
              key,
              value.join(', '),
            );
          } else if (
            typeof value ===
            'object'
          ) {
            payload.append(
              key,
              JSON.stringify(value),
            );
          } else {
            payload.append(
              key,
              String(value),
            );
          }
        },
      );

      /* ===================================================
         DERIVED
      =================================================== */

      Object.entries(
        derived,
      ).forEach(
        ([key, value]) => {
          payload.append(
            key,
            value,
          );
        },
      );

      /* ===================================================
         IMAGES
      =================================================== */

      payload.append(
        'imagesPayload',
        JSON.stringify(
          images.map((image) => ({
            name: image.name,
            type: image.type,
            data: image.base64
              .split(',')[1],
          })),
        ),
      );

      /* ===================================================
         DEBUG
      =================================================== */

      console.log(
        'PROPERTY LOCATION BEFORE SUBMIT',
        {
          latitude:
            f.latitude,

          longitude:
            f.longitude,

          placeId:
            f.placeId,

          formattedAddress:
            f.formattedAddress,

          countryId:
            f.countryId,

          stateId:
            f.stateId,

          cityId:
            f.cityId,

          areaId:
            f.areaId,

          city:
            f.city,

          area:
            f.area,

          landmark:
            f.landmark,

          society:
            f.society,
        },
      );

      /* ===================================================
         API
      =================================================== */

      const data =
        await apiPostFormData(
          '/mobileproperty',
          payload,
        );

      console.log(
        'PROPERTY CREATE RESPONSE',
        data,
      );

      setToast({
        message:
          data?.message ||
          'Property added successfully!',
        color: 'success',
      });

      // Dashboard may remain cached by IonRouterOutlet when this form is
      // opened from it; notify the existing view to reload API data.
      window.dispatchEvent(new Event('property:created'));

      setForm(initial);
      setImages([]);

      setStates([]);
      setCities([]);
      setAreas([]);

      setStep(0);

      setShowMoreFeatures(
        false,
      );

      setShowMoreAmenities(
        false,
      );

      onSuccess?.();
    } catch (error: any) {
      console.error(
        'Submit Error:',
        error,
      );

      setToast({
        message:
          error?.message ||
          'Something went wrong',
        color: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* =======================================================
     DERIVED UI
  ======================================================= */

  const types =
    form.propertyType ===
      'Commercial'
      ? COM_TYPES
      : RES_TYPES;

  const isLast =
    step ===
    TOTAL_STEPS - 1;

  const areaVal =
    Number(
      form.plotArea ||
      form.carpetArea ||
      form.builtUpArea ||
      form.superBuiltUpArea,
    );

  const priceNum =
    Number(form.price);

  const perUnit =
    c.isSell &&
      areaVal > 0 &&
      priceNum > 0
      ? Math.round(
        priceNum / areaVal,
      )
      : 0;

  const showOpenSides =
    c.isPlot ||
    c.isCommercial ||
    HOUSE_TYPES.includes(
      form.residentialType,
    );

  const unitSelect = (
    <select
      className="apf-input apf-select"
      value={form.areaUnit}
      onChange={(e) =>
        set(
          'areaUnit',
          e.target.value,
        )
      }
    >
      {AREA_UNITS.map(
        (unit) => (
          <option
            key={unit}
            value={unit}
          >
            {unit}
          </option>
        ),
      )}
    </select>
  );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="apf-root">

      {/* HEADER */}

      <header className="apf-header">
        <button
          type="button"
          className="apf-back"
          onClick={back}
          aria-label="Back"
        >
          <IonIcon
            icon={arrowBack}
          />
        </button>

        <div className="apf-titlebox">
          <h2>
            {
              STEP_TITLES[
              step
              ]
            }
          </h2>

          <span className="apf-stepno">
            Step {step + 1} of{' '}
            {TOTAL_STEPS}
          </span>
        </div>
      </header>

      {/* PROGRESS */}
      {/* <div className="apf-progress" aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}>
        <div
          style={{
            width: `${((step + 1) / TOTAL_STEPS) * 100}%`,
          }}
        />
      </div> */}

      {/* BODY */}

      <div
        className="apf-body"
        ref={bodyRef}
      >

        {/* =================================================
            STEP 1
        ================================================= */}

        {step === 0 && (
          <>
            <Section title="You're looking to?">
              <Chips
                options={
                  LOOKING_TO
                }
                value={
                  form.lookingTo
                }
                onChange={
                  changeLookingTo
                }
              />
            </Section>

            {!c.isPG && (
              <>
                <Section title="Property type">
                  <Chips
                    options={
                      KINDS
                    }
                    value={
                      form.propertyType
                    }
                    onChange={(
                      value,
                    ) =>
                      setForm(
                        (
                          previous,
                        ) => ({
                          ...previous,
                          propertyType:
                            value,
                          residentialType:
                            '',
                        }),
                      )
                    }
                  />
                </Section>

                <Section title="Select property type">
                  <Chips
                    options={
                      types
                    }
                    value={
                      form.residentialType
                    }
                    onChange={(
                      value,
                    ) =>
                      set(
                        'residentialType',
                        value,
                      )
                    }
                  />
                </Section>
              </>
            )}

            <Section title="Contact details">
              <input
                className="apf-input"
                placeholder="Phone number / Username / Email"
                value={
                  form.contactNumber
                }
                onChange={(
                  event,
                ) =>
                  set(
                    'contactNumber',
                    event.target
                      .value,
                  )
                }
              />
            </Section>
          </>
        )}

        {/* =================================================
            STEP 2 LOCATION
        ================================================= */}

        {step === 1 && (
          <>
            <Section
              title="Where is your property located?"
              sub="Select locations from the suggestions so we can save the exact map coordinates."
            >

              {/* COUNTRY */}

              <select
                className="apf-input apf-select"
                value={
                  form.countryId
                }
                onChange={(event) =>
                  onCountry(
                    event.target
                      .value,
                  )
                }
              >
                <option value="">
                  Country
                </option>

                {countries.map(
                  (item) => (
                    <option
                      key={
                        item.id
                      }
                      value={
                        item.id
                      }
                    >
                      {
                        item.name
                      }
                    </option>
                  ),
                )}
              </select>

              {/* STATE */}

              <select
                className="apf-input apf-select"
                value={
                  form.stateId
                }
                disabled={
                  !form.countryId
                }
                onChange={(event) =>
                  onState(
                    event.target
                      .value,
                  )
                }
              >
                <option value="">
                  State
                </option>

                {states.map(
                  (item) => (
                    <option
                      key={
                        item.id
                      }
                      value={
                        item.id
                      }
                    >
                      {
                        item.name
                      }
                    </option>
                  ),
                )}
              </select>

              {/* GOOGLE CITY */}

              <LocationAutocomplete
                label="City"
                placeholder="Enter city"
                type="city"
                value={
                  form.city
                }
                disabled={
                  !form.stateId
                }
                onInput={(value) =>
                  setForm(
                    (
                      previous,
                    ) => ({
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
                    }),
                  )
                }
                onSelect={
                  selectCity
                }
              />

              {/* LOCALITY */}

              <LocationAutocomplete
                label="Locality"
                placeholder="Enter locality / area"
                type="locality"
                value={
                  form.area
                }
                disabled={
                  !form.city
                }
                onInput={(value) =>
                  setForm(
                    (
                      previous,
                    ) => ({
                      ...previous,
                      area: value,
                      areaId: '',
                      landmark: '',
                      society: '',
                      latitude: '',
                      longitude: '',
                      placeId: '',
                      formattedAddress: '',
                    }),
                  )
                }
                onSelect={
                  selectLocality
                }
              />

              {/* SUB LOCALITY */}

              <LocationAutocomplete
                label="Sub Locality"
                placeholder="Enter sub locality / neighbourhood"
                type="sublocality"
                value={
                  form.landmark
                }
                disabled={
                  !form.area
                }
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
                onSelect={
                  selectSubLocality
                }
              />

              {/* SOCIETY */}

              {!c.isPlot && (
                <LocationAutocomplete
                  label={
                    c.isPG
                      ? 'PG / Building Name'
                      : 'Apartment / Society / Project'
                  }
                  placeholder={
                    c.isPG
                      ? 'Search PG / building'
                      : 'Search apartment / society / project'
                  }
                  type="society"
                  value={
                    form.society
                  }
                  disabled={
                    !form.area
                  }
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
                  onSelect={
                    selectSociety
                  }
                />
              )}

              {/* SELECTED ADDRESS */}

              {form.formattedAddress && (
                <div className="apf-selected-address">
                  <IonIcon
                    icon={
                      locationOutline
                    }
                  />

                  <div>
                    <strong>
                      Location selected
                    </strong>

                    <span>
                      {
                        form.formattedAddress
                      }
                    </span>
                  </div>
                </div>
              )}

              {/* COORDINATES */}

              {form.latitude &&
                form.longitude && (
                  <div className="apf-coordinate-box">
                    <div>
                      <small>
                        Latitude
                      </small>

                      <strong>
                        {
                          form.latitude
                        }
                      </strong>
                    </div>

                    <div>
                      <small>
                        Longitude
                      </small>

                      <strong>
                        {
                          form.longitude
                        }
                      </strong>
                    </div>
                  </div>
                )}
            </Section>

            {/* PG */}

            {c.isPG && (
              <Section title="PG Details">

                <h4 className="apf-h4">
                  PG is suitable for
                </h4>

                <Chips
                  options={
                    PG_FOR
                  }
                  value={
                    form.pgSuitableFor
                  }
                  onChange={(
                    value,
                  ) =>
                    pick(
                      'pgSuitableFor',
                      value,
                    )
                  }
                />

                <h4 className="apf-h4">
                  Room sharing
                </h4>

                <Chips
                  plus
                  options={
                    PG_SHARING
                  }
                  value={
                    form.pgSharing
                  }
                  onChange={(
                    value,
                  ) =>
                    toggle(
                      'pgSharing',
                      value,
                    )
                  }
                />

                <input
                  className="apf-input"
                  type="number"
                  min="1"
                  placeholder="Total number of beds"
                  value={
                    form.pgTotalBeds
                  }
                  onChange={(
                    event,
                  ) =>
                    set(
                      'pgTotalBeds',
                      event.target
                        .value,
                    )
                  }
                />

                <h4 className="apf-h4">
                  Meals included
                </h4>

                <Chips
                  options={
                    PG_FOOD
                  }
                  value={
                    form.pgFoodIncluded
                  }
                  onChange={(
                    value,
                  ) =>
                    pick(
                      'pgFoodIncluded',
                      value,
                    )
                  }
                />

                <h4 className="apf-h4">
                  Notice period
                </h4>

                <Chips
                  options={
                    PG_NOTICE
                  }
                  value={
                    form.pgNoticePeriod
                  }
                  onChange={(
                    value,
                  ) =>
                    pick(
                      'pgNoticePeriod',
                      value,
                    )
                  }
                />
              </Section>
            )}

            {/* RESIDENTIAL ROOMS */}

            {c.hasRooms && (
              <Section title="Room Details">

                <h4 className="apf-h4">
                  Bedrooms
                </h4>

                <Chips
                  options={BEDS}
                  value={
                    form.beds
                  }
                  onChange={(
                    value,
                  ) =>
                    pick(
                      'beds',
                      value,
                    )
                  }
                />

                <h4 className="apf-h4">
                  Bathrooms
                </h4>

                <Chips
                  options={BATHS}
                  value={
                    form.baths
                  }
                  onChange={(
                    value,
                  ) =>
                    pick(
                      'baths',
                      value,
                    )
                  }
                />

                <h4 className="apf-h4">
                  Balconies
                </h4>

                <Chips
                  options={
                    BALCONIES
                  }
                  value={
                    form.balconies
                  }
                  onChange={(
                    value,
                  ) =>
                    set(
                      'balconies',
                      value,
                    )
                  }
                />
              </Section>
            )}

            {/* COMMERCIAL */}

            {c.isCommercial && (
              <Section title="Commercial Details">

                {c.isRetail && (
                  <>
                    <h4 className="apf-h4">
                      Located inside
                    </h4>

                    <Chips
                      options={
                        LOCATED_INSIDE
                      }
                      value={
                        form.locatedInside
                      }
                      onChange={(
                        value,
                      ) =>
                        pick(
                          'locatedInside',
                          value,
                        )
                      }
                    />
                  </>
                )}

                <h4 className="apf-h4">
                  Zone type
                </h4>

                <select
                  className="apf-input apf-select"
                  value={
                    form.zoneType
                  }
                  onChange={(
                    event,
                  ) =>
                    set(
                      'zoneType',
                      event.target
                        .value,
                    )
                  }
                >
                  <option value="">
                    Select zone type
                  </option>

                  {ZONES.map(
                    (zone) => (
                      <option
                        key={zone}
                      >
                        {zone}
                      </option>
                    ),
                  )}
                </select>

                <h4 className="apf-h4">
                  Washrooms
                </h4>

                <Chips
                  options={
                    WASHROOMS
                  }
                  value={
                    form.washrooms
                  }
                  onChange={(
                    value,
                  ) =>
                    pick(
                      'washrooms',
                      value,
                    )
                  }
                />

                {c.isOffice && (
                  <>
                    <h4 className="apf-h4">
                      Pantry
                    </h4>

                    <Chips
                      options={
                        PANTRY
                      }
                      value={
                        form.pantry
                      }
                      onChange={(
                        value,
                      ) =>
                        pick(
                          'pantry',
                          value,
                        )
                      }
                    />

                    <div className="apf-unit-row">
                      <input
                        className="apf-input"
                        type="number"
                        min="0"
                        placeholder="Min. seats"
                        value={
                          form.minSeats
                        }
                        onChange={(
                          event,
                        ) =>
                          set(
                            'minSeats',
                            event.target
                              .value,
                          )
                        }
                      />

                      <input
                        className="apf-input"
                        type="number"
                        min="0"
                        placeholder="Max. seats"
                        value={
                          form.maxSeats
                        }
                        onChange={(
                          event,
                        ) =>
                          set(
                            'maxSeats',
                            event.target
                              .value,
                          )
                        }
                      />
                    </div>

                    <div className="apf-unit-row">
                      <input
                        className="apf-input"
                        type="number"
                        min="0"
                        placeholder="Cabins"
                        value={
                          form.cabins
                        }
                        onChange={(
                          event,
                        ) =>
                          set(
                            'cabins',
                            event.target
                              .value,
                          )
                        }
                      />

                      <input
                        className="apf-input"
                        type="number"
                        min="0"
                        placeholder="Meeting rooms"
                        value={
                          form.meetingRooms
                        }
                        onChange={(
                          event,
                        ) =>
                          set(
                            'meetingRooms',
                            event.target
                              .value,
                          )
                        }
                      />
                    </div>
                  </>
                )}
              </Section>
            )}

            {/* PLOT */}

            {c.isPlot && (
              <Section title="Plot Details">

                <div className="apf-unit-row">
                  <input
                    className="apf-input"
                    type="number"
                    min="0"
                    placeholder="Plot Area"
                    value={
                      form.plotArea
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'plotArea',
                        event.target
                          .value,
                      )
                    }
                  />

                  {unitSelect}
                </div>

                <div className="apf-unit-row">
                  <input
                    className="apf-input"
                    type="number"
                    min="0"
                    placeholder="Plot length"
                    value={
                      form.plotLength
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'plotLength',
                        event.target
                          .value,
                      )
                    }
                  />

                  <input
                    className="apf-input"
                    type="number"
                    min="0"
                    placeholder="Plot breadth"
                    value={
                      form.plotBreadth
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'plotBreadth',
                        event.target
                          .value,
                      )
                    }
                  />
                </div>

                <h4 className="apf-h4">
                  Floors allowed
                </h4>

                <input
                  className="apf-input"
                  type="number"
                  min="0"
                  placeholder="Number of floors"
                  value={
                    form.floorsAllowed
                  }
                  onChange={(
                    event,
                  ) =>
                    set(
                      'floorsAllowed',
                      event.target
                        .value,
                    )
                  }
                />

                <h4 className="apf-h4">
                  Boundary wall
                </h4>

                <Chips
                  options={
                    YES_NO
                  }
                  value={
                    form.boundaryWall
                  }
                  onChange={(
                    value,
                  ) =>
                    pick(
                      'boundaryWall',
                      value,
                    )
                  }
                />

                <h4 className="apf-h4">
                  Construction done
                </h4>

                <Chips
                  options={
                    YES_NO
                  }
                  value={
                    form.constructionDone
                  }
                  onChange={(
                    value,
                  ) =>
                    pick(
                      'constructionDone',
                      value,
                    )
                  }
                />
              </Section>
            )}

            {/* AREA */}

            {c.hasBuilding && (
              <Section
                title="Area Details"
                sub="At least one area type is mandatory"
              >
                <div className="apf-unit-row">
                  <input
                    className="apf-input"
                    type="number"
                    min="0"
                    placeholder="Carpet Area"
                    value={
                      form.carpetArea
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'carpetArea',
                        event.target
                          .value,
                      )
                    }
                  />

                  {unitSelect}
                </div>

                {form.showBuiltUp ? (
                  <input
                    className="apf-input"
                    type="number"
                    placeholder="Built-up Area"
                    value={
                      form.builtUpArea
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'builtUpArea',
                        event.target
                          .value,
                      )
                    }
                  />
                ) : (
                  <button
                    type="button"
                    className="apf-link"
                    onClick={() =>
                      set(
                        'showBuiltUp',
                        true,
                      )
                    }
                  >
                    + Built-up Area
                  </button>
                )}

                {form.showSuperBuiltUp ? (
                  <input
                    className="apf-input"
                    type="number"
                    placeholder="Super Built-up Area"
                    value={
                      form.superBuiltUpArea
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'superBuiltUpArea',
                        event.target
                          .value,
                      )
                    }
                  />
                ) : (
                  <button
                    type="button"
                    className="apf-link"
                    onClick={() =>
                      set(
                        'showSuperBuiltUp',
                        true,
                      )
                    }
                  >
                    + Super Built-up Area
                  </button>
                )}
              </Section>
            )}

            {/* FLOOR */}

            {c.hasBuilding && (
              <Section title="Floor Details">

                <input
                  className="apf-input"
                  type="number"
                  min="0"
                  placeholder="Total floors"
                  value={
                    form.totalFloors
                  }
                  onChange={(
                    event,
                  ) =>
                    set(
                      'totalFloors',
                      event.target
                        .value,
                    )
                  }
                />

                <select
                  className="apf-input apf-select"
                  value={
                    form.floorNo
                  }
                  onChange={(
                    event,
                  ) =>
                    set(
                      'floorNo',
                      event.target
                        .value,
                    )
                  }
                >
                  <option value="">
                    Property on floor
                  </option>

                  {FLOORS.map(
                    (floor) => (
                      <option
                        key={floor}
                      >
                        {floor}
                      </option>
                    ),
                  )}
                </select>

                {c.hasRooms && (
                  <Check
                    label="This property is a Duplex"
                    checked={
                      form.duplex
                    }
                    onChange={(
                      value,
                    ) =>
                      set(
                        'duplex',
                        value,
                      )
                    }
                  />
                )}
              </Section>
            )}

            {/* AVAILABILITY */}

            {c.hasBuilding && (
              <Section title="Availability">

                <Chips
                  options={
                    AVAILABILITY
                  }
                  value={
                    form.availability
                  }
                  onChange={(
                    value,
                  ) =>
                    set(
                      'availability',
                      value,
                    )
                  }
                />

                {form.availability ===
                  'Ready to move' && (
                    <>
                      <h4 className="apf-h4">
                        Property age
                      </h4>

                      <Chips
                        options={AGE}
                        value={
                          form.ageOfProperty
                        }
                        onChange={(
                          value,
                        ) =>
                          pick(
                            'ageOfProperty',
                            value,
                          )
                        }
                      />
                    </>
                  )}

                {form.availability ===
                  'Under construction' && (
                    <>
                      <h4 className="apf-h4">
                        Possession
                      </h4>

                      <Chips
                        options={
                          POSSESSION
                        }
                        value={
                          form.possessionBy
                        }
                        onChange={(
                          value,
                        ) =>
                          pick(
                            'possessionBy',
                            value,
                          )
                        }
                      />
                    </>
                  )}

                {c.isSell && (
                  <input
                    className="apf-input"
                    placeholder="RERA registration no. (Optional)"
                    value={
                      form.reraId
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'reraId',
                        event.target
                          .value,
                      )
                    }
                  />
                )}
              </Section>
            )}

            {/* PRICE */}

            <Section
              title={
                c.isSell
                  ? 'Price Details'
                  : 'Rent Details'
              }
            >
              <div className="apf-prefix">
                <span>₹</span>

                <input
                  className="apf-input"
                  type="number"
                  min="0"
                  placeholder={
                    c.isSell
                      ? 'Expected Price'
                      : c.isPG
                        ? 'Rent per bed / month'
                        : 'Expected Rent / month'
                  }
                  value={
                    form.price
                  }
                  onChange={(
                    event,
                  ) =>
                    set(
                      'price',
                      event.target
                        .value,
                    )
                  }
                />
              </div>

              {perUnit > 0 && (
                <p className="apf-note">
                  About ₹
                  {perUnit.toLocaleString(
                    'en-IN',
                  )}{' '}
                  per{' '}
                  {
                    form.areaUnit
                  }
                </p>
              )}

              {c.isSell && (
                <Check
                  label="All inclusive price"
                  checked={
                    form.allInclusive
                  }
                  onChange={(
                    value,
                  ) =>
                    set(
                      'allInclusive',
                      value,
                    )
                  }
                />
              )}

              <Check
                label={
                  c.isSell
                    ? 'Price Negotiable'
                    : 'Rent Negotiable'
                }
                checked={
                  form.negotiable
                }
                onChange={(
                  value,
                ) =>
                  set(
                    'negotiable',
                    value,
                  )
                }
              />

              {c.isSell && (
                <Check
                  label="Tax and Govt. charges excluded"
                  checked={
                    form.taxExcluded
                  }
                  onChange={(
                    value,
                  ) =>
                    set(
                      'taxExcluded',
                      value,
                    )
                  }
                />
              )}

              {c.hasBuilding && (
                <>
                  <h4 className="apf-h4">
                    Maintenance charges
                  </h4>

                  <div className="apf-prefix">
                    <span>₹</span>

                    <input
                      className="apf-input"
                      type="number"
                      placeholder="Maintenance amount"
                      value={
                        form.maintenanceCharge
                      }
                      onChange={(
                        event,
                      ) =>
                        set(
                          'maintenanceCharge',
                          event.target
                            .value,
                        )
                      }
                    />
                  </div>

                  <Chips
                    options={
                      MAINT_PERIOD
                    }
                    value={
                      form.maintenancePeriod
                    }
                    onChange={(
                      value,
                    ) =>
                      pick(
                        'maintenancePeriod',
                        value,
                      )
                    }
                  />
                </>
              )}

              {!c.isSell && (
                <>
                  <h4 className="apf-h4">
                    Security deposit
                  </h4>

                  <Chips
                    options={
                      DEPOSIT_TYPES
                    }
                    value={
                      form.securityDepositType
                    }
                    onChange={(
                      value,
                    ) =>
                      pick(
                        'securityDepositType',
                        value,
                      )
                    }
                  />

                  {form.securityDepositType &&
                    form.securityDepositType !==
                    'None' && (
                      <input
                        className="apf-input"
                        type="number"
                        placeholder={
                          form.securityDepositType ===
                            'Multiple of rent'
                            ? "Number of months' rent"
                            : 'Deposit amount'
                        }
                        value={
                          form.securityDeposit
                        }
                        onChange={(
                          event,
                        ) =>
                          set(
                            'securityDeposit',
                            event.target
                              .value,
                          )
                        }
                      />
                    )}
                </>
              )}
            </Section>

            {c.isRent && (
              <Section
                title="Preferred Tenants"
                optional
              >
                <Chips
                  plus
                  options={
                    TENANTS
                  }
                  value={
                    form.preferredTenants
                  }
                  onChange={(
                    value,
                  ) =>
                    toggle(
                      'preferredTenants',
                      value,
                    )
                  }
                />
              </Section>
            )}

            {!c.isSell && (
              <Section
                title="Available From"
                optional
              >
                <input
                  className="apf-input"
                  type="date"
                  min={today}
                  value={
                    form.availableFrom
                  }
                  onChange={(
                    event,
                  ) =>
                    set(
                      'availableFrom',
                      event.target
                        .value,
                    )
                  }
                />
              </Section>
            )}
          </>
        )}

        {/* =================================================
            STEP 3
        ================================================= */}

        {step === 2 && (
          <>
            {c.hasRooms && (
              <Section
                title="Room & Furnishing"
              >
                <h4 className="apf-h4">
                  Other rooms
                </h4>

                <Chips
                  plus
                  options={
                    OTHER_ROOMS
                  }
                  value={
                    form.otherRooms
                  }
                  onChange={(
                    value,
                  ) =>
                    toggle(
                      'otherRooms',
                      value,
                    )
                  }
                />

                <h4 className="apf-h4">
                  Furnishing
                </h4>

                <Chips
                  options={
                    FURNISHING
                  }
                  value={
                    form.furnishing
                  }
                  onChange={(
                    value,
                  ) =>
                    pick(
                      'furnishing',
                      value,
                    )
                  }
                />

                {(form.furnishing ===
                  'Furnished' ||
                  form.furnishing ===
                  'Semi-Furnished') && (
                    <>
                      {COUNTED_ITEMS.map(
                        (item) => (
                          <Counter
                            key={item}
                            label={item}
                            value={
                              form
                                .furnishingItems[
                              item
                              ] ||
                              0
                            }
                            onChange={(
                              count,
                            ) =>
                              setItem(
                                item,
                                count,
                              )
                            }
                          />
                        ),
                      )}
                    </>
                  )}
              </Section>
            )}

            {c.hasBuilding && (
              <Section
                title="Parking"
                optional
              >
                <Counter
                  label="Covered Parking"
                  value={
                    form.coveredParking
                  }
                  onChange={(
                    value,
                  ) =>
                    set(
                      'coveredParking',
                      value,
                    )
                  }
                />

                <Counter
                  label="Open Parking"
                  value={
                    form.openParking
                  }
                  onChange={(
                    value,
                  ) =>
                    set(
                      'openParking',
                      value,
                    )
                  }
                />
              </Section>
            )}

            <Section
              title="Property Description"
              sub="Add useful information about your property."
            >
              <textarea
                className="apf-input apf-textarea"
                rows={7}
                maxLength={5000}
                placeholder="Describe your property..."
                value={
                  form.description
                }
                onChange={(
                  event,
                ) =>
                  set(
                    'description',
                    event.target
                      .value,
                  )
                }
              />

              <div className="apf-count">
                {
                  form.description
                    .length
                }
                /5000
              </div>
            </Section>

            <Section
              title="Property Video"
              optional
            >
              <input
                className="apf-input"
                type="url"
                placeholder="YouTube / video URL"
                value={
                  form.videoUrl
                }
                onChange={(
                  event,
                ) =>
                  set(
                    'videoUrl',
                    event.target
                      .value,
                  )
                }
              />
            </Section>

            <Section
              title="Contact Email"
              optional
            >
              <input
                className="apf-input"
                type="email"
                placeholder="Email"
                value={
                  form.contactEmail
                }
                onChange={(
                  event,
                ) =>
                  set(
                    'contactEmail',
                    event.target
                      .value,
                  )
                }
              />
            </Section>
          </>
        )}

        {/* =================================================
            STEP 4
        ================================================= */}

        {step === 3 && (
          <>
            <Section
              title="Property Photos"
              optional
            >
              <label className="apf-upload">
                <IonIcon
                  icon={
                    cloudUploadOutline
                  }
                  className="apf-upload-icon"
                />

                <span className="apf-upload-main">
                  <IonIcon
                    icon={
                      addOutline
                    }
                  />
                  Add photos
                </span>

                <span className="apf-upload-sub">
                  Browse photos from your device
                </span>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  hidden
                  onChange={
                    handleImages
                  }
                />
              </label>

              <p className="apf-note">
                Up to 50 photos,
                maximum 10 MB each.
              </p>

              {images.length >
                0 && (
                  <div className="apf-preview-grid">
                    {images.map(
                      (
                        image,
                        index,
                      ) => (
                        <div
                          className="apf-preview-item"
                          key={
                            `${image.name}-${index}`
                          }
                        >
                          <img
                            src={
                              image.base64
                            }
                            alt={`Property ${index + 1}`}
                          />

                          <button
                            type="button"
                            className="apf-preview-remove"
                            onClick={() =>
                              setImages(
                                (
                                  previous,
                                ) =>
                                  previous.filter(
                                    (
                                      _,
                                      imageIndex,
                                    ) =>
                                      imageIndex !==
                                      index,
                                  ),
                              )
                            }
                          >
                            <IonIcon
                              icon={
                                closeCircle
                              }
                            />
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                )}

              <label className="apf-whatsapp">
                <input
                  type="checkbox"
                  checked={
                    form.sendViaWhatsapp
                  }
                  onChange={(
                    event,
                  ) =>
                    set(
                      'sendViaWhatsapp',
                      event.target
                        .checked,
                    )
                  }
                />

                <span>
                  I will send photos over WhatsApp
                </span>
              </label>
            </Section>

            {!c.isPG && (
              <Section title="Ownership">
                <Chips
                  options={
                    OWNERSHIP
                  }
                  value={
                    form.ownership
                  }
                  onChange={(
                    value,
                  ) =>
                    pick(
                      'ownership',
                      value,
                    )
                  }
                />
              </Section>
            )}

            {!c.isPlot && (
              <Section title="Amenities">
                <Chips
                  plus
                  options={
                    showMoreAmenities
                      ? AMENITIES
                      : AMENITIES.slice(
                        0,
                        8,
                      )
                  }
                  value={
                    form.amenities
                  }
                  onChange={(
                    value,
                  ) =>
                    toggle(
                      'amenities',
                      value,
                    )
                  }
                />

                {!showMoreAmenities && (
                  <button
                    type="button"
                    className="apf-link"
                    onClick={() =>
                      setShowMoreAmenities(
                        true,
                      )
                    }
                  >
                    + More amenities
                  </button>
                )}
              </Section>
            )}

            {c.hasBuilding && (
              <Section title="Property Features">
                <Chips
                  plus
                  options={
                    showMoreFeatures
                      ? FEATURES
                      : FEATURES.slice(
                        0,
                        6,
                      )
                  }
                  value={
                    form.features
                  }
                  onChange={(
                    value,
                  ) =>
                    toggle(
                      'features',
                      value,
                    )
                  }
                />

                {!showMoreFeatures && (
                  <button
                    type="button"
                    className="apf-link"
                    onClick={() =>
                      setShowMoreFeatures(
                        true,
                      )
                    }
                  >
                    + More property features
                  </button>
                )}
              </Section>
            )}

            {showOpenSides && (
              <Section
                title="Open sides"
                optional
              >
                <Chips
                  options={
                    OPEN_SIDES
                  }
                  value={
                    form.openSides
                  }
                  onChange={(
                    value,
                  ) =>
                    pick(
                      'openSides',
                      value,
                    )
                  }
                />
              </Section>
            )}

            {c.hasBuilding && (
              <>
                <Section
                  title="Overlooking"
                  optional
                >
                  <Chips
                    plus
                    options={
                      OVERLOOKING
                    }
                    value={
                      form.overlooking
                    }
                    onChange={(
                      value,
                    ) =>
                      toggle(
                        'overlooking',
                        value,
                      )
                    }
                  />
                </Section>

                <Section
                  title="Power Backup"
                  optional
                >
                  <Chips
                    options={
                      POWER
                    }
                    value={
                      form.powerBackup
                    }
                    onChange={(
                      value,
                    ) =>
                      pick(
                        'powerBackup',
                        value,
                      )
                    }
                  />
                </Section>

                <Section
                  title="Flooring"
                  optional
                >
                  <select
                    className="apf-input apf-select"
                    value={
                      form.flooring
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'flooring',
                        event.target
                          .value,
                      )
                    }
                  >
                    <option value="">
                      Select flooring
                    </option>

                    {FLOORING.map(
                      (item) => (
                        <option
                          key={item}
                        >
                          {item}
                        </option>
                      ),
                    )}
                  </select>
                </Section>
              </>
            )}

            {!c.isPG && (
              <Section
                title="Property Facing"
                optional
              >
                <Chips
                  options={
                    FACING
                  }
                  value={
                    form.facing
                  }
                  onChange={(
                    value,
                  ) =>
                    pick(
                      'facing',
                      value,
                    )
                  }
                />
              </Section>
            )}

            {!c.isPG && (
              <Section
                title="Road Width"
                optional
              >
                <div className="apf-unit-row">
                  <input
                    className="apf-input"
                    type="number"
                    min="0"
                    placeholder="Road width"
                    value={
                      form.roadWidth
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'roadWidth',
                        event.target
                          .value,
                      )
                    }
                  />

                  <select
                    className="apf-input apf-select"
                    value={
                      form.roadWidthUnit
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'roadWidthUnit',
                        event.target
                          .value,
                      )
                    }
                  >
                    <option>
                      Feet
                    </option>
                    <option>
                      Meter
                    </option>
                  </select>
                </div>
              </Section>
            )}

            <Section
              title="Nearby Locations"
              optional
            >
              <Chips
                plus
                options={
                  LOCATION_ADV
                }
                value={
                  form.locationAdvantages
                }
                onChange={(
                  value,
                ) =>
                  toggle(
                    'locationAdvantages',
                    value,
                  )
                }
              />
            </Section>
          </>
        )}
      </div>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <div className="apf-footer">
        {isLast ? (
          <button
            type="button"
            className="apf-btn"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? (
              <IonSpinner
                name="dots"
              />
            ) : (
              'Save and Submit'
            )}
          </button>
        ) : (
          <button
            type="button"
            className="apf-btn"
            onClick={next}
          >
            Next
          </button>
        )}
      </div>

      <IonToast
        isOpen={!!toast}
        message={
          toast?.message
        }
        duration={3500}
        color={
          toast?.color
        }
        onDidDismiss={() =>
          setToast(null)
        }
      />
    </div>
  );
};

export default AddPropertyForm;