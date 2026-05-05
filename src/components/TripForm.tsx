import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { MapPin, Clock, CreditCard, Users, ArrowRight, ArrowLeft, Loader, Sparkles, Navigation } from 'lucide-react';
import { Autocomplete } from '@react-google-maps/api';
import { TripPreferences } from '../types';

interface StepConfig {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  field: keyof TripPreferences;
  placeholder?: string;
  type?: string;
  options?: { label: string; value: string; emoji: string }[];
  detected?: string | null;
  min?: string;
}

const TOTAL_STEPS = 6;

const TripForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [preferences, setPreferences] = useState<TripPreferences>({
    origin: '', destination: '', maxPrice: '', departureDate: '', duration: '', budget: '', companions: '',
  });
  const [detectedOrigin, setDetectedOrigin] = useState<string | null>(null);
  const originAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destinationAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const redirectMessage = (location.state as any)?.message;

  useEffect(() => {
    if (!navigator.geolocation) { setDetectedOrigin('Location not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) return;
        try {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${pos.coords.latitude},${pos.coords.longitude}&key=${apiKey}`);
          const data = await res.json();
          const city = data.results?.[0]?.formatted_address?.split(',')[0]?.trim() ?? 'Current Location';
          setDetectedOrigin(city);
          setPreferences(p => ({ ...p, origin: city }));
        } catch { setDetectedOrigin('Unable to detect'); }
      },
      () => setDetectedOrigin('Permission denied')
    );
  }, []);

  const handleInputChange = (field: keyof TripPreferences, value: string) => {
    if (field === 'maxPrice' && !/^\d*$/.test(value)) return;
    setPreferences(p => ({ ...p, [field]: value }));
  };

  const onPlaceChanged = (field: 'origin' | 'destination') => {
    const ac = field === 'origin' ? originAutocompleteRef.current : destinationAutocompleteRef.current;
    if (!ac) return;
    const place = ac.getPlace();
    if (place?.formatted_address) setPreferences(p => ({ ...p, [field]: place.formatted_address!.split(',')[0].trim() }));
  };

  const generateTrip = async () => {
    setIsGenerating(true);
    try {
      const response = await api.post('/api/generate-itinerary', preferences);
      navigate('/trip-details', { state: { itinerary: response.data, preferences } });
    } catch (err: unknown) {
      const e = err as { response?: { data?: unknown }; message?: string };
      alert('Failed to generate itinerary: ' + (e.response?.data ? JSON.stringify(e.response.data) : e.message));
    } finally { setIsGenerating(false); }
  };

  const steps: StepConfig[] = [
    { icon: Navigation, title: 'Where are you starting from?', subtitle: 'We\'ll detect your location automatically', field: 'origin', placeholder: 'Enter your city', type: 'text', detected: detectedOrigin },
    { icon: MapPin, title: 'Where do you want to explore?', subtitle: 'Your dream destination awaits', field: 'destination', placeholder: 'Paris, Bali, Tokyo...', type: 'text' },
    { icon: CreditCard, title: 'What\'s your budget?', subtitle: 'We\'ll plan the perfect trip within your range', field: 'maxPrice', placeholder: 'e.g. 1500', type: 'text' },
    { icon: Clock, title: 'When do you depart?', subtitle: 'Pick your travel start date', field: 'departureDate', type: 'date', min: new Date().toISOString().split('T')[0] },
    {
      icon: Clock, title: 'How long is your trip?', subtitle: 'Choose your ideal travel duration', field: 'duration',
      options: [
        { label: 'Weekend Getaway', value: 'weekend-getaway-(1-3-days)', emoji: '🌅' },
        { label: 'Short Trip (4–7 days)', value: 'short-trip-(4-7-days)', emoji: '✈️' },
        { label: 'Medium Trip (1–2 weeks)', value: 'medium-trip-(1-2-weeks)', emoji: '🗺️' },
        { label: 'Long Trip (2+ weeks)', value: 'long-trip-(2+-weeks)', emoji: '🌍' },
      ],
    },
    {
      icon: Users, title: 'Who\'s joining you?', subtitle: 'We\'ll tailor recommendations for your group', field: 'companions',
      options: [
        { label: 'Solo', value: 'solo-travel', emoji: '🧳' },
        { label: 'Couple', value: 'couple', emoji: '💑' },
        { label: 'Family', value: 'family-with-kids', emoji: '👨‍👩‍👧' },
        { label: 'Friends', value: 'group-of-friends', emoji: '👫' },
        { label: 'Business', value: 'business-trip', emoji: '💼' },
      ],
    },
  ];

  const current = steps[step - 1];
  const fieldValue = preferences[current.field] as string;
  const progress = (step / TOTAL_STEPS) * 100;

  const STEP_ICONS = steps.map(s => s.icon);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex items-center justify-center p-4 py-12">
      {/* Background orbs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm px-4 py-1.5 rounded-full mb-4">
            <Sparkles className="h-3.5 w-3.5" /> AI-Powered Trip Planner
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-2">Plan Your Dream Trip</h1>
          <p className="text-indigo-300">Answer {TOTAL_STEPS} quick questions — get a full itinerary in seconds</p>
          {redirectMessage && (
            <p className="mt-3 text-yellow-400 text-sm bg-yellow-400/10 border border-yellow-400/20 px-4 py-2 rounded-xl inline-block">
              ⚠️ {redirectMessage}
            </p>
          )}
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden relative"
          >
            {/* Progress bar */}
            <div className="h-1 bg-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />
            </div>

            {/* Step indicator */}
            <div className="px-8 pt-6 pb-2">
              <div className="flex items-center justify-between">
                {steps.map((_s, i) => {
                  const Icon = STEP_ICONS[i];
                  const done = i + 1 < step;
                  const active = i + 1 === step;
                  return (
                    <React.Fragment key={i}>
                      <motion.div
                        animate={{ scale: active ? 1.15 : 1 }}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          done ? 'bg-indigo-500 text-white' :
                          active ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/40' :
                          'bg-white/10 text-white/30'
                        }`}
                      >
                        {done ? <span className="text-xs font-bold">✓</span> : <Icon className="h-4 w-4" />}
                      </motion.div>
                      {i < TOTAL_STEPS - 1 && (
                        <div className={`flex-1 h-0.5 mx-1 rounded transition-all ${i + 1 < step ? 'bg-indigo-500' : 'bg-white/10'}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-indigo-400 text-xs font-medium">Step {step} of {TOTAL_STEPS}</span>
                <span className="text-white/40 text-xs">{Math.round(progress)}% complete</span>
              </div>
            </div>

            {/* Form content */}
            <div className="px-8 pb-8 pt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  {/* Step header */}
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="p-2 bg-indigo-500/20 rounded-xl">
                        <current.icon className="h-5 w-5 text-indigo-400" />
                      </div>
                      <h2 className="text-xl font-bold text-white">{current.title}</h2>
                    </div>
                    <p className="text-indigo-300/70 text-sm ml-12">{current.subtitle}</p>
                  </div>

                  {/* Input / Options */}
                  {current.options ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {current.options.map(opt => (
                        <motion.button
                          key={opt.value}
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={() => handleInputChange(current.field, opt.value)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center ${
                            fieldValue === opt.value
                              ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-lg shadow-indigo-500/20'
                              : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-2xl">{opt.emoji}</span>
                          <span className="text-sm font-medium leading-tight">{opt.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="relative">
                      {(current.field === 'origin' || current.field === 'destination') ? (
                        <Autocomplete
                          onPlaceChanged={() => onPlaceChanged(current.field as 'origin' | 'destination')}
                          onLoad={ac => {
                            if (current.field === 'origin') originAutocompleteRef.current = ac;
                            else destinationAutocompleteRef.current = ac;
                          }}
                          options={{ types: ['(cities)'] }}
                        >
                          <input
                            type="text" value={fieldValue}
                            onChange={e => handleInputChange(current.field, e.target.value)}
                            placeholder={current.detected ? `Detected: ${current.detected}` : current.placeholder}
                            className="w-full px-5 py-4 bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-white/30 text-base focus:outline-none focus:border-indigo-500 focus:bg-white/15 transition"
                          />
                        </Autocomplete>
                      ) : current.field === 'maxPrice' ? (
                        <div className="relative">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400 font-bold text-lg">$</span>
                          <input
                            type="text" value={fieldValue}
                            onChange={e => handleInputChange(current.field, e.target.value)}
                            placeholder={current.placeholder}
                            className="w-full pl-10 pr-5 py-4 bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-white/30 text-base focus:outline-none focus:border-indigo-500 focus:bg-white/15 transition"
                          />
                        </div>
                      ) : (
                        <input
                          type={current.type} value={fieldValue}
                          onChange={e => handleInputChange(current.field, e.target.value)}
                          placeholder={current.placeholder}
                          min={current.min}
                          className="w-full px-5 py-4 bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-white/30 text-base focus:outline-none focus:border-indigo-500 focus:bg-white/15 transition [color-scheme:dark]"
                        />
                      )}

                      {/* Detected location badge */}
                      {current.detected && current.field === 'origin' && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-indigo-400">
                          <Navigation className="h-3 w-3" />
                          <span>Auto-detected: <strong>{current.detected}</strong></span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Nav buttons */}
                  <div className="flex justify-between items-center pt-2">
                    {step > 1 ? (
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setStep(s => s - 1)}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 hover:text-white transition text-sm font-medium"
                      >
                        <ArrowLeft className="h-4 w-4" /> Back
                      </motion.button>
                    ) : <div />}

                    {step < TOTAL_STEPS ? (
                      <motion.button whileHover={{ scale: fieldValue ? 1.03 : 1 }} whileTap={{ scale: fieldValue ? 0.97 : 1 }}
                        onClick={() => setStep(prev => prev + 1)}
                        disabled={!fieldValue}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition ${
                          fieldValue
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-600 hover:to-purple-700'
                            : 'bg-white/10 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        Continue <ArrowRight className="h-4 w-4" />
                      </motion.button>
                    ) : (
                      <motion.button whileHover={{ scale: fieldValue && !isGenerating ? 1.03 : 1 }}
                        onClick={generateTrip}
                        disabled={!fieldValue || isGenerating}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition ${
                          fieldValue && !isGenerating
                            ? 'bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                            : 'bg-white/10 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        {isGenerating ? (
                          <><Loader className="h-4 w-4 animate-spin" /> Generating your trip...</>
                        ) : (
                          <><Sparkles className="h-4 w-4" /> Generate Itinerary</>
                        )}
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Generating overlay */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl z-20"
                >
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                    <Sparkles className="h-12 w-12 text-indigo-400 mb-4" />
                  </motion.div>
                  <p className="text-white text-xl font-bold mt-4">Crafting your itinerary...</p>
                  <p className="text-indigo-300 text-sm mt-2">Amazon Nova AI is planning your adventure 🌍</p>
                  <div className="flex gap-1.5 mt-6">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-2 h-2 bg-indigo-400 rounded-full"
                        animate={{ y: [0, -8, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>


        {/* Bottom hint */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="text-center text-white/30 text-xs mt-6">
          🔒 Your trip data is saved securely to your account
        </motion.p>
      </div>
    </div>
  );
};

export default TripForm;