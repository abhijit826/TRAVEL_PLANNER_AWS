import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/api';
import { MapPin, Clock, CreditCard, Users, ArrowRight, Loader } from 'lucide-react';
import { LoadScript, Autocomplete } from '@react-google-maps/api';
import { TripPreferences } from '../types';

// Step definition type
interface StepConfig {
  icon: React.ElementType;
  title: string;
  field: keyof TripPreferences;
  placeholder?: string;
  type?: string;
  options?: string[];
  detected?: string | null;
  min?: string;
}

const TripForm: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [preferences, setPreferences] = useState<TripPreferences>({
    origin: '',
    destination: '',
    maxPrice: '',
    departureDate: '',
    duration: '',
    budget: '',
    companions: '',
  });

  const [detectedOrigin, setDetectedOrigin] = useState<string | null>(null);

  // Refs for Google Maps Autocomplete
  const originAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destinationAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setDetectedOrigin('Location not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          console.warn('Google Maps API Key is missing. Location detection disabled.');
          return;
        }
        try {
          // Use Google Maps Geocoding directly (not through api instance — external URL)
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
          );
          const data = await res.json();
          const address: string = data.results?.[0]?.formatted_address ?? 'Current Location';
          const city = address.split(',')[0].trim();
          setDetectedOrigin(city);
          setPreferences((prev) => ({ ...prev, origin: city }));
        } catch {
          setDetectedOrigin('Unable to detect location');
        }
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setDetectedOrigin('Location permission denied');
      }
    );
  }, []);

  const handleInputChange = (field: keyof TripPreferences, value: string) => {
    if (field === 'maxPrice' && !/^\d*$/.test(value)) return;
    setPreferences((prev) => ({ ...prev, [field]: value }));
  };

  const onPlaceChanged = (field: 'origin' | 'destination') => {
    const autocomplete =
      field === 'origin' ? originAutocompleteRef.current : destinationAutocompleteRef.current;
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (place?.formatted_address) {
      const city = place.formatted_address.split(',')[0].trim();
      setPreferences((prev) => ({ ...prev, [field]: city }));
    }
  };

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const generateTrip = async () => {
    setIsGenerating(true);
    try {
      const response = await api.post('/api/generate-itinerary', preferences);
      navigate('/trip-details', { state: { itinerary: response.data, preferences } });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: unknown }; message?: string };
      const msg = axiosErr.response?.data
        ? JSON.stringify(axiosErr.response.data)
        : (axiosErr.message ?? 'Unknown error');
      console.error('Error generating itinerary:', msg);
      alert('Failed to generate itinerary: ' + msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderStep = () => {
    const stepComponents: StepConfig[] = [
      {
        icon: MapPin,
        title: 'Where are you starting from?',
        field: 'origin',
        placeholder: 'Enter your origin',
        type: 'text',
        detected: detectedOrigin,
      },
      {
        icon: MapPin,
        title: 'Where do you want to Explore?',
        field: 'destination',
        placeholder: 'Enter a destination (e.g., Paris)',
        type: 'text',
      },
      {
        icon: CreditCard,
        title: 'What is your Budget?',
        field: 'maxPrice',
        placeholder: 'Enter your budget in USD (e.g., 1000)',
        type: 'text',
      },
      {
        icon: Clock,
        title: 'When do you want to depart?',
        field: 'departureDate',
        placeholder: 'Choose departure date',
        type: 'date',
        min: new Date().toISOString().split('T')[0],
      },
      {
        icon: Clock,
        title: 'How long is your Trip?',
        field: 'duration',
        options: [
          'Weekend Getaway (1-3 days)',
          'Short Trip (4-7 days)',
          'Medium Trip (1-2 weeks)',
          'Long Trip (2+ weeks)',
        ],
      },
      {
        icon: Users,
        title: 'Who are you traveling with?',
        field: 'companions',
        options: ['Solo Travel', 'Couple', 'Family with Kids', 'Group of Friends', 'Business Trip'],
      },
    ];

    const current = stepComponents[step - 1];
    const { icon: Icon, title, field, placeholder, type, options, detected, min } = current;
    const fieldValue = preferences[field] as string;

    return (
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -100 }}
        className="space-y-6"
      >
        <div className="flex items-center space-x-3 text-2xl font-bold text-gray-800">
          <Icon className="h-8 w-8 text-indigo-600" />
          <h2>{title}</h2>
        </div>

        {options ? (
          <select
            value={fieldValue}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Select an option</option>
            {options.map((option) => (
              <option key={option} value={option.toLowerCase().replace(/ /g, '-')}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <div>
            {(field === 'origin' || field === 'destination') ? (
              <Autocomplete
                onPlaceChanged={() => onPlaceChanged(field as 'origin' | 'destination')}
                onLoad={(ac) => {
                  if (field === 'origin') originAutocompleteRef.current = ac;
                  else destinationAutocompleteRef.current = ac;
                }}
                options={{ types: ['(cities)'] }}
              >
                <input
                  type={type}
                  value={fieldValue}
                  onChange={(e) => handleInputChange(field, e.target.value)}
                  placeholder={detected ? `${placeholder} (Detected: ${detected})` : placeholder}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </Autocomplete>
            ) : (
              <input
                type={type}
                value={fieldValue}
                onChange={(e) => handleInputChange(field, e.target.value)}
                placeholder={placeholder}
                min={min}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            )}
          </div>
        )}

        <div className="flex justify-between">
          {step > 1 && (
            <button
              onClick={prevStep}
              className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          )}
          {step < stepComponents.length ? (
            <button
              onClick={nextStep}
              disabled={!fieldValue}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
                fieldValue
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <span>Next</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={generateTrip}
              disabled={!fieldValue || isGenerating}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
                fieldValue && !isGenerating
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>Generate Trip</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''}
        libraries={['places']}
      >
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Perfect Trip</h1>
          <p className="text-gray-600 mb-6">
            Answer a few questions and our AI will generate a personalized travel itinerary for you.
          </p>

          {/* Step progress indicator */}
          <div className="mb-8 flex items-center">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <React.Fragment key={i}>
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-colors ${
                    i <= step ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {i}
                </div>
                {i < 6 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-colors ${
                      i < step ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {renderStep()}
        </div>
      </LoadScript>
    </div>
  );
};

export default TripForm;