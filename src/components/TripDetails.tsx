import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Map,
  Download,
  Share2,
  Sun,
  CloudRain,
  Cloud,
  Wind,
  Tag,
  Users as UsersIcon,
} from 'lucide-react';
import { GoogleMap, DirectionsService, DirectionsRenderer, TrafficLayer } from '@react-google-maps/api';
import api from '../utils/api';

const TripDetails: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const itineraryData = location.state?.itinerary;
  const preferences = location.state?.preferences;

  // Guard: if accessed directly without itinerary state, redirect to create-trip
  useEffect(() => {
    if (!itineraryData) {
      navigate('/create-trip', { replace: true, state: { message: 'Please generate an itinerary first.' } });
    }
  }, [itineraryData, navigate]);

  const [activeDay, setActiveDay] = useState(1);
  const [showMap, setShowMap] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isUserIdLoading, setIsUserIdLoading] = useState(true);
  const [shareSuccess, setShareSuccess] = useState(false);

  const itinerary = itineraryData?.itinerary || { dailyPlans: [], rawText: 'No itinerary available' };

  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsUserIdLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');
        const response = await api.get('/api/profile');
        setUserId(response.data._id);
        console.log('User ID fetched:', response.data._id);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setMapError('Failed to load user profile for trip saving.');
      } finally {
        setIsUserIdLoading(false);
      }
    };

    fetchUserProfile();

    console.log('Raw Itinerary Data:', itineraryData);
    console.log('Extracted Itinerary:', itinerary);
    console.log('Preferences:', preferences);
    if (showMap && itinerary.dailyPlans[activeDay - 1]?.activities) {
      console.log('Map Locations:', itinerary.dailyPlans[activeDay - 1].activities.map((a: { location: string }) => a.location));
    }
  }, [itineraryData, itinerary, preferences, showMap, activeDay]);

  const WeatherIcon = ({ condition }: { condition: string }) => {
    switch (condition.toLowerCase()) {
      case 'rain': return <CloudRain className="h-6 w-6 text-blue-500" />;
      case 'cloudy': return <Cloud className="h-6 w-6 text-gray-500" />;
      case 'clear': case 'sunny': return <Sun className="h-6 w-6 text-yellow-500" />;
      default: return <Wind className="h-6 w-6 text-gray-400" />;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  const mapContainerStyle = {
    height: '24rem',
    width: '100%',
    borderRadius: '1rem',
  };

  const center = { lat: 34.0522, lng: -118.2437 }; // Default to LAX

  const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
  ];

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_FALLBACK_API_KEY';
  if (!apiKey || apiKey === 'YOUR_FALLBACK_API_KEY') {
    console.warn('Google Maps API Key is not defined or using fallback. Check your .env file.');
    setMapError('Google Maps API Key is missing or invalid. Please configure VITE_GOOGLE_MAPS_API_KEY in .env.');
  }

  const normalizeLocation = (location: string): string => {
    const locationMap: Record<string, string> = {
      'LAX Airport & Union Station': 'Los Angeles International Airport, Los Angeles, CA to Union Station, Los Angeles, CA',
      'LAX': 'Los Angeles International Airport, Los Angeles, CA',
      'Chennai Central Railway Station': 'Chennai Central, Chennai, India',
      'Hyderabad Deccan Railway Station': 'Hyderabad Deccan, Hyderabad, India',
      'Charminar': 'Charminar, Hyderabad, India',
      'Near Charminar': 'Charminar, Hyderabad, India',
    };
    const normalized = locationMap[location] || location;
    console.log(`Normalizing ${location} to ${normalized}`);
    return normalized;
  };

  const getBookingUrl = () => {
    const startDate = itinerary.startDate || new Date().toISOString().split('T')[0];
    const destination = normalizeLocation(itinerary.destination || '');
    const activities = itinerary.dailyPlans[activeDay - 1]?.activities || [];
    const origin = activities.length > 0 ? normalizeLocation(activities[0].location) : destination;

    console.log('Itinerary Data for Booking:', { startDate, destination, origin, activities });

    if (destination.includes('mas') || destination.includes('hyb') || activities.some((a: { location: string }) => a.location.toLowerCase().includes('chennai') || a.location.toLowerCase().includes('hyderabad'))) {
      return `https://www.irctc.co.in/nget/train-search?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(destination)}&date=${encodeURIComponent(startDate)}`;
    } else if (destination.includes('los angeles') || destination.includes('lax') || activities.some((a: { location: string }) => a.location.toLowerCase().includes('los angeles') || a.location.toLowerCase().includes('lax'))) {
      return `https://www.expedia.com/Flights-Search?mode=search&flight-type=on&destination=${encodeURIComponent('Los Angeles, CA (LAX-Los Angeles Intl.)')}&d1=${encodeURIComponent(startDate)}`;
    } else {
      return `https://www.makemytrip.com/flights/?fromCity=${encodeURIComponent(origin)}&toCity=${encodeURIComponent(destination)}&tripDate=${encodeURIComponent(startDate)}`;
    }
  };

  const saveTrip = async () => {
    if (!userId) {
      alert('User ID is not loaded. Please try again or log in.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');
      const tripData = {
        userId,
        destination: itinerary.destination,
        duration: preferences.duration || 'unknown',
        budget: preferences.budget || 'unknown',
        companions: preferences.companions || 'unknown',
        activities: itinerary.dailyPlans.flatMap((day: { activities: { description?: string; location: string }[] }) => day.activities.map((act) => act.description || act.location)),
      };
      console.log('Sending trip data:', tripData);
      const response = await api.post('/api/trips', tripData);
      console.log('Trip saved:', response.data);
      navigate('/my-trips');
    } catch (err: unknown) {
      const e = err as { response?: { data: unknown }; message?: string };
      console.error('Error saving trip:', e.response ? e.response.data : e.message);
      alert('Failed to save trip. Check console for details.');
    }
  };

  const handleBookNow = () => {
    saveTrip();
    const bookingUrl = getBookingUrl();
    window.open(bookingUrl, '_blank');
  };

  const downloadItinerary = () => {
    let content = `Trip to ${itinerary.destination}\n`;
    content += `Dates: ${itinerary.startDate} (${itinerary.durationDays} days)\n`;
    content += `Total Estimated Cost: $${itinerary.totalCost}\n\n`;
    itinerary.dailyPlans.forEach((day: { day: number; date: string; activities: { time?: string; description?: string; location: string; cost?: number }[] }) => {
      content += `--- Day ${day.day}: ${day.date} ---\n`;
      day.activities.forEach((activity) => {
        content += `${activity.time || 'N/A'}: ${activity.description} at ${activity.location} ($${activity.cost})\n`;
      });
      content += '\n';
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${itinerary.destination.replace(/\s+/g, '_')}_Itinerary.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareItinerary = () => {
    const shareText = `✈️ My trip to ${itinerary.destination}!
📅 ${itinerary.durationDays} days starting ${itinerary.startDate}
💰 Estimated cost: $${itinerary.totalCost}

Generated by Travel Planner AI`;

    if (navigator.share) {
      navigator.share({ title: `Trip to ${itinerary.destination}`, text: shareText }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareText)
        .then(() => {
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 2000);
        })
        .catch(console.error);
    }
  };

  const drawRoute = useCallback((response: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
    console.log('Directions Response:', response, 'Status:', status);
    if (status === 'OK' && directionsRenderer && response) {
      directionsRenderer.setDirections(response);
      if (response.routes[0] && response.routes[0].legs) {
        const legs = response.routes[0].legs;
        const activities = itinerary.dailyPlans[activeDay - 1].activities;
        console.log(`Legs: ${legs.length}, Activities: ${activities.length}`);
        activities.forEach((activity: { description?: string; location: string }, index: number) => {
          let position;
          if (index < legs.length) {
            position = legs[index].start_location;
          } else if (index === activities.length - 1 && legs.length > 0) {
            position = legs[legs.length - 1].end_location;
          } else {
            console.warn(`No position for activity ${index}:`, activity);
            position = index > 0 ? legs[legs.length - 1].end_location : center;
          }
          new google.maps.Marker({
            map: directionsRenderer.getMap(),
            position,
            title: activity.description,
            label: `${index + 1}`,
          });
        });
      } else {
        console.warn('No valid route or legs in response:', response);
      }
    } else if (status === 'ZERO_RESULTS') {
      console.warn('No route found between the selected locations. (They might be too far apart or not specific enough for routing).');
    } else {
      console.error('Directions request failed with status:', status);
    }
  }, [directionsRenderer, activeDay, itinerary.dailyPlans]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 px-4 py-12">
      {/* Background orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20"
        >
          {/* Header Section */}
          <div className="relative h-72 sm:h-96">
            <img
              src="https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1974&q=80"
              alt={itinerary.destination}
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
            <div className="absolute inset-0 flex items-end p-8">
              <motion.div variants={itemVariants} className="w-full">
                <h1 className="text-5xl font-extrabold text-white mb-4 drop-shadow-xl">{itinerary.destination}</h1>
                <div className="flex flex-wrap gap-4 mt-3 text-indigo-100">
                  <span className="flex items-center bg-white/10 backdrop-blur px-4 py-2 rounded-full border border-white/20">
                    <Calendar className="h-5 w-5 mr-2 text-indigo-300" />
                    {itinerary.startDate} ({itinerary.durationDays} days)
                  </span>
                  <span className="flex items-center bg-white/10 backdrop-blur px-4 py-2 rounded-full border border-white/20">
                    <DollarSign className="h-5 w-5 mr-2 text-indigo-300" />
                    ${itinerary.totalCost}
                  </span>
                  <span className="flex items-center bg-white/10 backdrop-blur px-4 py-2 rounded-full border border-white/20">
                    <Users className="h-5 w-5 mr-2 text-indigo-300" />
                    {preferences?.companions || 'N/A'}
                  </span>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-8">
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <h2 className="text-3xl font-bold text-white">Your Travel Itinerary</h2>
              <div className="flex flex-wrap gap-3">
                <motion.button
                  variants={itemVariants}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setShowMap(!showMap)}
                  className="flex items-center px-5 py-2.5 bg-white/10 text-white rounded-xl border border-white/20 hover:bg-white/20 transition-all font-medium"
                >
                  <Map className="h-5 w-5 mr-2 text-indigo-300" />
                  <span>{showMap ? 'Hide Map' : 'Show Map'}</span>
                </motion.button>
                <motion.button
                  variants={itemVariants}
                  whileHover={{ scale: 1.05 }}
                  onClick={downloadItinerary}
                  className="flex items-center px-5 py-2.5 bg-white/10 text-white rounded-xl border border-white/20 hover:bg-white/20 transition-all font-medium"
                >
                  <Download className="h-5 w-5 mr-2 text-indigo-300" />
                  <span>Download</span>
                </motion.button>
                <motion.button
                  variants={itemVariants}
                  whileHover={{ scale: 1.05 }}
                  onClick={shareItinerary}
                  className={`flex items-center px-5 py-2.5 rounded-xl border transition-all font-medium ${
                    shareSuccess
                      ? 'bg-green-500/20 text-green-300 border-green-500/30'
                      : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                  }`}
                >
                  <Share2 className="h-5 w-5 mr-2 text-indigo-300" />
                  <span>{shareSuccess ? 'Copied! ✓' : 'Share'}</span>
                </motion.button>
              </div>
            </motion.div>

            {showMap && (
              <div className="mb-8 rounded-2xl overflow-hidden border border-white/20 shadow-2xl relative">
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={center}
                  zoom={10}
                  options={{ styles: darkMapStyle }}
                  onLoad={(mapInstance) => console.log('Map Loaded:', mapInstance)}
                  onUnmount={() => setMapError(null)}
                >
                  <TrafficLayer />
                  {itinerary.dailyPlans[activeDay - 1]?.activities.length > 1 && (
                    <DirectionsService
                      options={{
                        origin: normalizeLocation(itinerary.dailyPlans[activeDay - 1].activities[0].location),
                        destination: normalizeLocation(itinerary.dailyPlans[activeDay - 1].activities[itinerary.dailyPlans[activeDay - 1].activities.length - 1].location),
                        waypoints: itinerary.dailyPlans[activeDay - 1].activities
                          .slice(1, -1)
                          .filter((item: { location: string }, index: number, self: { location: string }[]) =>
                            index === self.findIndex((t: { location: string }) => t.location === item.location)
                          )
                          .map((activity: { location: string }) => ({ location: normalizeLocation(activity.location), stopover: true })),
                        optimizeWaypoints: true,
                        travelMode: google.maps.TravelMode.WALKING,
                      }}
                      callback={drawRoute}
                    />
                  )}
                  <DirectionsRenderer
                    options={{ suppressMarkers: true }}
                    onLoad={(renderer) => {
                      setDirectionsRenderer(renderer);
                      console.log('Directions Renderer Loaded:', renderer);
                    }}
                  />
                </GoogleMap>
              </div>
            )}

            {/* Day Tabs */}
            <motion.div variants={itemVariants} className="flex mb-8 overflow-x-auto pb-2 space-x-3 scrollbar-hide">
              {itinerary.dailyPlans.map((day: { day: number; date: string; weather?: { temperature?: number; condition?: string; rainProbability?: number }; activities: { time?: string; description?: string; location: string; cost?: number }[] }) => (
                <motion.button
                  key={day.day}
                  variants={itemVariants}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveDay(day.day)}
                  className={`flex-shrink-0 px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                    activeDay === day.day
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 border-transparent'
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
                  }`}
                >
                  Day {day.day}
                </motion.button>
              ))}
            </motion.div>

            {/* Daily Plan Details */}
            <motion.div variants={containerVariants} className="bg-slate-900/50 rounded-3xl p-8 border border-white/10 backdrop-blur-md">
              {itinerary.dailyPlans
                .filter((day: { day: number }) => day.day === activeDay)
                .map((day: { day: number; date: string; weather?: { temperature?: number; condition?: string; rainProbability?: number }; activities: { time?: string; description?: string; location: string; cost?: number }[] }) => (
                  <motion.div key={day.day} variants={itemVariants}>
                    <h3 className="text-3xl font-bold text-white mb-6 flex items-center">
                      <Calendar className="h-8 w-8 mr-3 text-indigo-400" />
                      Day {day.day} <span className="text-indigo-300/60 font-normal ml-3">| {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                    </h3>

                    {/* Crowd and Weather Info */}
                    <motion.div
                      variants={itemVariants}
                      className="mb-8 p-6 bg-white/5 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6 border border-white/10"
                    >
                      {/* Crowd Level */}
                      <div className="flex items-center space-x-5">
                        <div className="p-3 bg-indigo-500/20 rounded-xl">
                          <UsersIcon className="h-7 w-7 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-indigo-200/60 text-sm font-medium uppercase tracking-wider">Crowd Level</p>
                          <p className={`text-xl font-bold mt-1 ${
                            itinerary.crowdLevel === 'high' ? 'text-pink-400' : 'text-emerald-400'
                          }`}>
                            {itinerary.crowdLevel || 'N/A'}
                          </p>
                          <p className="text-sm text-indigo-200/80 mt-1">
                            {itinerary.crowdLevel === 'high' ? 'Consider early visits to avoid crowds.' : 'Enjoy a relaxed trip!'}
                          </p>
                        </div>
                      </div>

                      {/* Weather Info */}
                      <div className="flex items-center space-x-5">
                        <div className="p-3 bg-indigo-500/20 rounded-xl">
                          <WeatherIcon condition={day.weather?.condition || 'Unknown'} />
                        </div>
                        <div>
                          <p className="text-indigo-200/60 text-sm font-medium uppercase tracking-wider mb-2">Weather</p>
                          <div className="flex gap-4">
                            <p className="text-white font-medium flex items-center bg-white/5 px-2 py-1 rounded">
                              <Sun className="h-4 w-4 mr-1.5 text-yellow-500" />
                              {day.weather?.temperature || 'N/A'}°F
                            </p>
                            <p className="text-white font-medium flex items-center bg-white/5 px-2 py-1 rounded">
                              <CloudRain className="h-4 w-4 mr-1.5 text-blue-400" />
                              {day.weather?.rainProbability || 'N/A'}%
                            </p>
                          </div>
                          <p className="text-sm text-indigo-200/80 mt-2">
                            Expect <span className="text-white font-semibold">{day.weather?.condition || 'N/A'}</span> conditions.
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Activities */}
                    <motion.div variants={containerVariants} className="space-y-4">
                      <h4 className="text-2xl font-bold text-white mb-6 flex items-center">
                        <Tag className="h-6 w-6 mr-3 text-pink-400" />
                        Daily Activities
                      </h4>
                      {day.activities.length === 0 ? (
                        <p className="text-indigo-200/60 italic text-center py-8 bg-white/5 rounded-2xl border border-white/10">No activities planned for this day.</p>
                      ) : (
                        day.activities.map((activity: { time?: string; description?: string; location: string; cost?: number }, index: number) => (
                          <motion.div
                            key={index}
                            variants={itemVariants}
                            whileHover={{ scale: 1.01 }}
                            className="bg-white/5 p-5 rounded-2xl border border-white/10 hover:border-indigo-500/50 hover:bg-white/10 transition-all duration-300"
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0 text-indigo-300 font-bold bg-indigo-500/20 px-4 py-2.5 rounded-xl border border-indigo-500/20">
                                {activity.time || 'N/A'}
                              </div>
                              <div className="flex-grow ml-5">
                                <h5 className="text-xl font-bold text-white mb-2">{activity.description || 'No description'}</h5>
                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 mt-1">
                                  <div className="flex items-center text-indigo-200">
                                    <MapPin className="h-4 w-4 mr-2 text-pink-400" />
                                    <span>{activity.location || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center text-indigo-200">
                                    <DollarSign className="h-4 w-4 mr-1 text-emerald-400" />
                                    <span className="font-medium">{activity.cost || 0}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </motion.div>
                  </motion.div>
                ))}
            </motion.div>

            {/* Footer Section */}
            <motion.div variants={itemVariants} className="mt-8 flex flex-col md:flex-row justify-between items-center p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl gap-6">
              <div>
                <p className="text-indigo-200/60 text-sm font-medium uppercase tracking-wider">Total Estimated Cost</p>
                <p className="text-4xl font-extrabold text-white mt-1 drop-shadow-md flex items-center">
                  <span className="text-emerald-400 mr-1">$</span>{itinerary.totalCost || 0}
                </p>
              </div>
              <div className="flex flex-wrap space-x-4">
                <Link
                  to="/create-trip"
                  className="px-8 py-4 rounded-xl border border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/10 transition-all font-bold text-center"
                >
                  Modify Trip
                </Link>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBookNow}
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold shadow-lg shadow-indigo-500/30 hover:from-indigo-600 hover:to-purple-700 transition-all"
                  disabled={isUserIdLoading || !userId}
                >
                  {isUserIdLoading ? 'Loading...' : 'Save & Book Now'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
      {mapError && <p className="text-red-600 text-center mt-2">{mapError}</p>}
    </div>
  );
};

export default TripDetails;