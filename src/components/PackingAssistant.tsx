import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Plane,
  Train,
  Bus,
  Car,
  Sun,
  Snowflake,
  CloudRain,
  CloudSun,
  Trash2,
  Plus,
  Check,
  Download,
  Printer,
  Sparkles,
  RefreshCw,
  Info,
  Lock,
  AlertCircle,
  Calendar,
  ShieldAlert,
} from 'lucide-react';
import api from '../utils/api';

interface PackingItem {
  id: string;
  name: string;
  packed: boolean;
}

interface PackingCategory {
  name: string;
  items: PackingItem[];
}

interface PackingList {
  categories: PackingCategory[];
  baggageRulesSummary?: string;
  transitTips?: string[];
}

interface Trip {
  _id: string;
  userId: string;
  destination: string;
  duration: string;
  budget: string;
  companions: string;
  activities: string[];
  date?: string;
  createdAt?: string;
  packingList?: PackingList;
}

const TRANSIT_MODES = [
  { value: 'Flight', label: 'Flight', icon: Plane },
  { value: 'Train', label: 'Train', icon: Train },
  { value: 'Bus', label: 'Bus', icon: Bus },
  { value: 'Car', label: 'Car/Road Trip', icon: Car },
];

const WEATHER_OPTIONS = [
  { value: 'Hot', label: 'Hot & Sunny', icon: Sun, color: 'text-amber-400' },
  { value: 'Cold', label: 'Cold & Snowy', icon: Snowflake, color: 'text-blue-300' },
  { value: 'Rainy', label: 'Rainy/Monsoon', icon: CloudRain, color: 'text-cyan-400' },
  { value: 'Mild', label: 'Mild/Temperate', icon: CloudSun, color: 'text-orange-300' },
  { value: 'Extreme', label: 'Extreme/Harsh', icon: ShieldAlert, color: 'text-rose-400' },
];

const BAGGAGE_OPTIONS: Record<string, { label: string; description: string }[]> = {
  Flight: [
    { label: 'Carry-on Only', description: 'Under-seat + overhead bin (typically 7-10kg limit)' },
    { label: 'Standard Checked Bag', description: 'Checked bag (typically 20-23kg) + small cabin bag' },
    { label: 'Heavy/Multiple Baggage', description: 'Multiple checked bags or oversized sports equipment' },
  ],
  Train: [
    { label: 'Train Cabin Limits', description: 'Overhead rack, under-seat storage, or luggage vestibule' },
    { label: 'Luggage Coach', description: 'Heavier items booked in the railway cargo coach' },
  ],
  Bus: [
    { label: 'Cabin Overhead/Seat', description: 'Small backpack or handbag kept inside the coach' },
    { label: 'Under-Bus Hold', description: 'Larger suitcase or trunk placed in the undercarriage compartment' },
  ],
  Car: [
    { label: 'Standard Trunk Space', description: 'Fit inside the car trunk and rear seating area' },
    { label: 'No Limits/Roof Rack', description: 'Spacious SUV, minivan, or rooftop cargo box storage' },
  ],
};

const PackingAssistant: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTripId = queryParams.get('tripId');

  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selector Form State
  const [transitMode, setTransitMode] = useState('Flight');
  const [weather, setWeather] = useState('Mild');
  const [baggageOption, setBaggageOption] = useState('');
  const [newItemName, setNewItemName] = useState<Record<string, string>>({});

  // Fetch Trips
  useEffect(() => {
    const fetchTrips = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const profileRes = await api.get('/api/profile');
        const userId = profileRes.data._id;
        const tripsResponse = await api.get(`/api/users/${userId}/trips`);
        const userTrips: Trip[] = tripsResponse.data;
        setTrips(userTrips);

        if (initialTripId) {
          const trip = userTrips.find((t) => t._id === initialTripId);
          if (trip) setSelectedTrip(trip);
          else if (userTrips.length > 0) setSelectedTrip(userTrips[0]);
        } else if (userTrips.length > 0) {
          setSelectedTrip(userTrips[0]);
        }
      } catch (err) {
        console.error('Error fetching trips for packing:', err);
        setErrorMsg('Failed to load trips. Please ensure you are logged in.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrips();
  }, [initialTripId]);

  // Sync state when selected trip changes
  useEffect(() => {
    if (selectedTrip) {
      // Set default baggage option based on the selected/default transit mode
      const defaultBaggage = BAGGAGE_OPTIONS[transitMode]?.[0]?.label || '';
      setBaggageOption(defaultBaggage);
    }
  }, [selectedTrip, transitMode]);

  // Derived progress statistics
  const progressStats = useMemo(() => {
    if (!selectedTrip?.packingList?.categories) {
      return { total: 0, packed: 0, percent: 0 };
    }
    let total = 0;
    let packed = 0;
    selectedTrip.packingList.categories.forEach((cat) => {
      cat.items.forEach((item) => {
        total += 1;
        if (item.packed) packed += 1;
      });
    });
    const percent = total > 0 ? Math.round((packed / total) * 100) : 0;
    return { total, packed, percent };
  }, [selectedTrip]);

  // Generate packing list via backend API
  const handleGenerate = async () => {
    if (!selectedTrip) return;
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const response = await api.post(`/api/trips/${selectedTrip._id}/packing/generate`, {
        transitMode,
        baggageOption,
        weather,
      });

      const updatedTrip = { ...selectedTrip, packingList: response.data };
      setSelectedTrip(updatedTrip);
      setTrips(trips.map((t) => (t._id === selectedTrip._id ? updatedTrip : t)));
    } catch (err: any) {
      console.error('Error generating packing list:', err);
      setErrorMsg(err.response?.data?.details || err.response?.data?.error || 'Failed to generate list');
    } finally {
      setIsGenerating(false);
    }
  };

  // Update backend packing list state
  const savePackingList = async (updatedList: PackingList) => {
    if (!selectedTrip) return;
    setIsSaving(true);
    try {
      const response = await api.put(`/api/trips/${selectedTrip._id}`, {
        packingList: updatedList,
      });
      const updatedTrip = { ...selectedTrip, packingList: response.data.packingList };
      setSelectedTrip(updatedTrip);
      setTrips(trips.map((t) => (t._id === selectedTrip._id ? updatedTrip : t)));
    } catch (err) {
      console.error('Error updating packing list:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle item packed status
  const handleToggleItem = async (categoryName: string, itemId: string) => {
    if (!selectedTrip?.packingList) return;

    const updatedCategories = selectedTrip.packingList.categories.map((cat) => {
      if (cat.name === categoryName) {
        return {
          ...cat,
          items: cat.items.map((item) =>
            item.id === itemId ? { ...item, packed: !item.packed } : item
          ),
        };
      }
      return cat;
    });

    const updatedList = { ...selectedTrip.packingList, categories: updatedCategories };
    await savePackingList(updatedList);
  };

  // Add custom item to a category
  const handleAddCustomItem = async (categoryName: string) => {
    const itemName = newItemName[categoryName]?.trim();
    if (!itemName || !selectedTrip?.packingList) return;

    const updatedCategories = selectedTrip.packingList.categories.map((cat) => {
      if (cat.name === categoryName) {
        return {
          ...cat,
          items: [
            ...cat.items,
            { id: `custom_${Date.now()}`, name: itemName, packed: false },
          ],
        };
      }
      return cat;
    });

    const updatedList = { ...selectedTrip.packingList, categories: updatedCategories };
    setNewItemName({ ...newItemName, [categoryName]: '' });
    await savePackingList(updatedList);
  };

  // Delete item from a category
  const handleDeleteItem = async (categoryName: string, itemId: string) => {
    if (!selectedTrip?.packingList) return;

    const updatedCategories = selectedTrip.packingList.categories.map((cat) => {
      if (cat.name === categoryName) {
        return {
          ...cat,
          items: cat.items.filter((item) => item.id !== itemId),
        };
      }
      return cat;
    });

    const updatedList = { ...selectedTrip.packingList, categories: updatedCategories };
    await savePackingList(updatedList);
  };

  // Reset/Clear Checklist
  const handleResetChecklist = async () => {
    if (!window.confirm('Are you sure you want to clear the current packing list? This will erase all checked status and custom items.')) {
      return;
    }
    if (!selectedTrip) return;
    const updatedList: PackingList = { categories: [], baggageRulesSummary: '', transitTips: [] };
    await savePackingList(updatedList);
  };

  // Download checklist as Markdown file
  const handleDownload = () => {
    if (!selectedTrip?.packingList) return;

    const { destination, duration } = selectedTrip;
    let markdown = `# Packing Checklist for ${destination} (${duration})\n\n`;
    markdown += `Generated by AI Packing Assistant\n`;
    markdown += `Transit Mode: ${transitMode} | Weather: ${weather} | Baggage: ${baggageOption}\n\n`;

    if (selectedTrip.packingList.baggageRulesSummary) {
      markdown += `## Baggage Allowance Summary\n${selectedTrip.packingList.baggageRulesSummary}\n\n`;
    }

    if (selectedTrip.packingList.transitTips && selectedTrip.packingList.transitTips.length > 0) {
      markdown += `## Transit Tips\n`;
      selectedTrip.packingList.transitTips.forEach((tip) => {
        markdown += `- ${tip}\n`;
      });
      markdown += `\n`;
    }

    markdown += `## Packing Checklist\n\n`;
    selectedTrip.packingList.categories.forEach((cat) => {
      markdown += `### ${cat.name}\n`;
      cat.items.forEach((item) => {
        const check = item.packed ? '[x]' : '[ ]';
        markdown += `- ${check} ${item.name}\n`;
      });
      markdown += `\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Packing_List_${destination.replace(/\s+/g, '_')}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Checklist
  const handlePrint = () => {
    window.print();
  };

  // Helper to calculate category specific progress
  const getCategoryProgress = (cat: PackingCategory) => {
    const total = cat.items.length;
    const packed = cat.items.filter((i) => i.packed).length;
    const percent = total > 0 ? Math.round((packed / total) * 100) : 0;
    return { total, packed, percent };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <motion.div
          className="text-indigo-600 flex flex-col items-center gap-3"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          <Briefcase className="h-12 w-12 text-indigo-400" />
          <span className="text-gray-400 font-medium text-sm animate-pulse">Loading Packing Details...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-gray-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            <Briefcase className="h-8 w-8 text-indigo-400" /> AI Packing Assistant
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Generate, customize, and track your travel packing essentials powered by AI recommendations.
          </p>
        </div>

        {/* Trip Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <label className="text-sm font-semibold text-gray-400 flex items-center gap-1.5 whitespace-nowrap">
            <Calendar className="h-4 w-4 text-indigo-400" /> Select Trip:
          </label>
          <select
            value={selectedTrip?._id || ''}
            onChange={(e) => {
              const trip = trips.find((t) => t._id === e.target.value);
              setSelectedTrip(trip || null);
            }}
            className="px-4 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-gray-200 outline-none focus:border-indigo-400 transition min-w-[200px]"
          >
            {trips.map((t) => (
              <option key={t._id} value={t._id} className="bg-gray-900 text-gray-200">
                {t.destination} ({t.duration})
              </option>
            ))}
            {trips.length === 0 && (
              <option value="" className="bg-gray-900 text-gray-400">
                No trips available
              </option>
            )}
          </select>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{errorMsg}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      {!selectedTrip ? (
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-12 text-center border border-white/10">
          <Briefcase className="h-16 w-16 text-gray-600 mx-auto mb-4 animate-bounce" />
          <h3 className="text-xl font-bold text-gray-300">No active trips</h3>
          <p className="text-gray-400 mt-2 max-w-md mx-auto">
            You need to create a trip first before using the AI Packing Assistant. Navigate to "My Adventures" and add a new trip!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Options & Generator Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
              <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400" /> Generator Preferences
              </h2>

              <div className="space-y-5 relative z-10">
                {/* Transit Mode Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Transit Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {TRANSIT_MODES.map((mode) => {
                      const Icon = mode.icon;
                      const active = transitMode === mode.value;
                      return (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => setTransitMode(mode.value)}
                          className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-sm transition-all duration-300 ${
                            active
                              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-600/10'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Weather Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Expected Weather
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {WEATHER_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const active = weather === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setWeather(opt.value)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-sm transition-all duration-300 ${
                            active
                              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-600/10'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${opt.color}`} />
                          <span className="font-medium">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Baggage Limits Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Baggage Limitations
                  </label>
                  <div className="space-y-2">
                    {BAGGAGE_OPTIONS[transitMode]?.map((opt) => {
                      const active = baggageOption === opt.label;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setBaggageOption(opt.label)}
                          className={`w-full text-left p-3 rounded-xl border text-sm transition-all duration-300 ${
                            active
                              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-600/10'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                          }`}
                        >
                          <div className="font-semibold text-gray-200">{opt.label}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{opt.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Generate Button */}
                <motion.button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>Analyzing & Packing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 text-indigo-200" />
                      <span>Generate AI Checklist</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            {/* AI Insights & Transit Advice */}
            {selectedTrip.packingList?.categories && selectedTrip.packingList.categories.length > 0 && (
              <div className="space-y-4">
                {/* Transit Safety Warning / Tips */}
                {selectedTrip.packingList.transitTips && selectedTrip.packingList.transitTips.length > 0 && (
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                    <h3 className="text-sm font-extrabold text-indigo-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Lock className="h-4 w-4 text-indigo-400" /> Safe Transit Advisory
                    </h3>
                    <ul className="space-y-2 text-xs text-gray-300">
                      {selectedTrip.packingList.transitTips.map((tip, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-indigo-400 font-bold">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Baggage Rules Summary */}
                {selectedTrip.packingList.baggageRulesSummary && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
                    <h3 className="text-sm font-extrabold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Info className="h-4 w-4 text-amber-400" /> Baggage Guidance
                    </h3>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {selectedTrip.packingList.baggageRulesSummary}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Checklist Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Packing List Progress */}
            {selectedTrip.packingList?.categories && selectedTrip.packingList.categories.length > 0 ? (
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                      <span>Trip Packing Progress</span>
                      {isSaving && <span className="text-xs font-normal text-indigo-400 animate-pulse">(saving...)</span>}
                    </h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {progressStats.packed} of {progressStats.total} items packed ({progressStats.percent}%)
                    </p>
                  </div>

                  {/* Actions (Download, Print, Clear) */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownload}
                      title="Download as Markdown"
                      className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition"
                    >
                      <Download className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={handlePrint}
                      title="Print Checklist"
                      className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition"
                    >
                      <Printer className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={handleResetChecklist}
                      title="Reset Checklist"
                      className="px-3 py-1.5 text-xs bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-rose-300 transition flex items-center gap-1 font-semibold"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>

                {/* Progress bar container */}
                <div className="w-full bg-white/5 h-3.5 rounded-full overflow-hidden border border-white/10">
                  <motion.div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressStats.percent}%` }}
                    transition={{ type: 'spring', stiffness: 80 }}
                  />
                </div>
              </div>
            ) : null}

            {/* Checklist items categories */}
            <div className="space-y-6">
              {!selectedTrip.packingList?.categories || selectedTrip.packingList.categories.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-md rounded-2xl py-16 px-6 text-center border border-white/10 shadow-xl flex flex-col items-center justify-center">
                  <Sparkles className="h-12 w-12 text-indigo-400 mb-4 animate-pulse" />
                  <h3 className="text-xl font-bold text-gray-200">No Checklist Generated Yet</h3>
                  <p className="text-gray-400 mt-2 max-w-md">
                    Choose your transit mode, weather conditions, and baggage options on the left, then click "Generate AI Checklist" to build a customized list.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-1">
                  {selectedTrip.packingList.categories.map((category) => {
                    const catProgress = getCategoryProgress(category);
                    return (
                      <div
                        key={category.name}
                        className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
                      >
                        <div>
                          {/* Category Header */}
                          <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                            <h3 className="font-bold text-gray-200">{category.name}</h3>
                            <span className="text-xs bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full">
                              {catProgress.packed}/{catProgress.total} packed
                            </span>
                          </div>

                          {/* Category Items List */}
                          <ul className="space-y-2 mb-4 max-h-[220px] overflow-y-auto pr-1">
                            {category.items.map((item) => (
                              <li
                                key={item.id}
                                className="group flex items-center justify-between gap-3 text-sm py-1"
                              >
                                <label className="flex items-center gap-3 cursor-pointer select-none text-left flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={item.packed}
                                    onChange={() => handleToggleItem(category.name, item.id)}
                                    className="sr-only"
                                  />
                                  <div
                                    className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-all ${
                                      item.packed
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : 'border-white/20 group-hover:border-white/40'
                                    }`}
                                  >
                                    {item.packed && <Check className="h-3.5 w-3.5" />}
                                  </div>
                                  <span
                                    className={`truncate transition-all ${
                                      item.packed ? 'line-through text-gray-500' : 'text-gray-200'
                                    }`}
                                  >
                                    {item.name}
                                  </span>
                                </label>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(category.name, item.id)}
                                  className="text-gray-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition duration-200 print:hidden"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </li>
                            ))}
                            {category.items.length === 0 && (
                              <p className="text-xs text-gray-500 italic py-2">No items in this category.</p>
                            )}
                          </ul>
                        </div>

                        {/* Add custom item form */}
                        <div className="pt-3 border-t border-white/5 mt-auto flex items-center gap-2 print:hidden">
                          <input
                            type="text"
                            placeholder="Add custom item..."
                            value={newItemName[category.name] || ''}
                            onChange={(e) =>
                              setNewItemName({ ...newItemName, [category.name]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddCustomItem(category.name);
                              }
                            }}
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-indigo-500 flex-1 transition"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddCustomItem(category.name)}
                            className="p-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-xl transition border border-indigo-500/30"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingAssistant;
