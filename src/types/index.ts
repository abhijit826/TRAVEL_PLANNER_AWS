export interface TripPreferences {
  origin: string;
  destination: string;
  maxPrice: string;
  departureDate: string;
  duration: string;
  budget: string;
  companions: string;
}

export interface POI {
  id: string;
  name: string;
  description: string;
  image: string;
  location: string;
  category: string;
}


// types.ts
export interface TravelDocument {
  id: string;
  type: 'passport' | 'visa' | 'creditCard' | 'vaccination' | 'drivingLicense' | 'internationalPermit' | 'nationalId' | 'insurance';
  number: string;
  expiryDate: string;
  country?: string;
  embassy?: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  issuer?: string;        // For driving license, national ID, insurance
  vaccineType?: string;   // For vaccination certificate
  doseCount?: number;     // For vaccination certificate
  insuranceProvider?: string; // For insurance
  coverageDetails?: string;   // For insurance
}
export interface Trip {
  id: string;
  destination: string;
  duration: string;
  budget: string;
  companions: string;
  itinerary: {
    day: number;
    activities: {
      time: string;
      activity: string;
      location: string;
      cost: string;
    }[];
  }[];
  totalCost: string;
}