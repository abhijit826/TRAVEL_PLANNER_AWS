import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Calendar, MapPin, Plus, Trash2, X, Clock, Tag } from 'lucide-react';
import api from '../utils/api';
import { Link } from 'react-router-dom';

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
}

const MyTrips: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  useEffect(() => {
    const fetchTrips = async () => {
      setIsLoading(true);
      try {
        const profileRes = await api.get('/api/profile');
        const userId = profileRes.data._id;
        const tripsResponse = await api.get(`/api/users/${userId}/trips`);
        setTrips(tripsResponse.data);
      } catch (error) {
        console.error('Error fetching trips:', error);
        alert('Failed to fetch trips');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrips();
  }, []);

  const cardVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6 } },
    hover: { scale: 1.05, boxShadow: '0 10px 20px rgba(0,0,0,0.2)', transition: { duration: 0.3 } },
  };

  const emptyVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.8, type: 'spring' } },
  };

  const handleDelete = async (tripId: string) => {
    if (window.confirm('Are you sure you want to delete this trip?')) {
      try {
        await api.delete(`/api/trips/${tripId}`);
        setTrips(trips.filter(t => t._id !== tripId));
        if (selectedTrip?._id === tripId) setSelectedTrip(null);
      } catch (error) {
        console.error('Error deleting trip:', error);
        alert('Failed to delete trip');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-100 via-purple-100 to-indigo-100 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/world-map.png')] opacity-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="lg:text-center">
          <motion.h2
            className="text-base text-indigo-600 font-semibold tracking-wide uppercase"
            initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            My Adventures
          </motion.h2>
          <motion.p
            className="mt-2 text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent"
            initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          >
            Your Travel Memories
          </motion.p>
        </div>

        <div className="mt-12">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <motion.div className="text-indigo-600" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Plane className="h-12 w-12" />
              </motion.div>
            </div>
          ) : (
            <AnimatePresence>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {trips.map((trip) => (
                  <motion.div
                    key={trip._id}
                    className="bg-white/80 backdrop-blur-md rounded-xl p-6 shadow-xl border border-indigo-100 hover:border-indigo-300 transition-all duration-300"
                    variants={cardVariants} initial="hidden" animate="visible" whileHover="hover"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-800">{trip.destination}</h3>
                      <Plane className="h-6 w-6 text-indigo-600 animate-pulse" />
                    </div>
                    <div className="mt-3 flex items-center text-gray-600">
                      <Calendar className="h-5 w-5 mr-2" />
                      <span className="text-sm">{trip.date || trip.createdAt?.split('T')[0] || 'N/A'}</span>
                    </div>
                    <p className="mt-2 text-gray-600 line-clamp-2">{trip.activities?.slice(0, 3).join(', ') || 'No activities'}</p>
                    <div className="mt-4 flex items-center text-gray-600">
                      <MapPin className="h-5 w-5 mr-2" />
                      <span className="text-sm">{trip.destination}</span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <motion.button
                        className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex-1"
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedTrip(trip)}
                      >
                        View Details
                      </motion.button>
                      <motion.button
                        className="bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(trip._id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}

                {trips.length === 0 && (
                  <motion.div
                    className="col-span-full flex flex-col items-center justify-center h-64 bg-white/80 backdrop-blur-md rounded-xl p-6 shadow-xl border border-indigo-100"
                    variants={emptyVariants} initial="hidden" animate="visible"
                  >
                    <Plus className="h-16 w-16 text-indigo-400 animate-bounce" />
                    <p className="mt-4 text-xl text-gray-600">No trips saved yet.</p>
                    <p className="text-gray-500">Start planning your next adventure!</p>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link to="/create-trip" className="mt-4 inline-block bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
                        Create Trip
                      </Link>
                    </motion.div>
                  </motion.div>
                )}
              </div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── Trip Details Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedTrip && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedTrip(null)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-t-2xl p-6 text-white relative">
                <button onClick={() => setSelectedTrip(null)} className="absolute top-4 right-4 text-white/80 hover:text-white">
                  <X className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-3">
                  <Plane className="h-8 w-8" />
                  <div>
                    <h2 className="text-2xl font-bold">{selectedTrip.destination}</h2>
                    <p className="text-indigo-200 text-sm">Trip Details</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <p className="text-xs text-indigo-400 uppercase font-semibold">Date</p>
                    <p className="text-gray-800 font-medium flex items-center gap-1 mt-1">
                      <Calendar className="h-4 w-4 text-indigo-500" />
                      {selectedTrip.date || selectedTrip.createdAt?.split('T')[0] || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-purple-400 uppercase font-semibold">Duration</p>
                    <p className="text-gray-800 font-medium flex items-center gap-1 mt-1">
                      <Clock className="h-4 w-4 text-purple-500" />
                      {selectedTrip.duration || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-400 uppercase font-semibold">Budget</p>
                    <p className="text-gray-800 font-medium mt-1">{selectedTrip.budget || 'N/A'}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-xs text-orange-400 uppercase font-semibold">Companions</p>
                    <p className="text-gray-800 font-medium mt-1">{selectedTrip.companions || 'N/A'}</p>
                  </div>
                </div>

                {selectedTrip.activities?.length > 0 && (
                  <div>
                    <h3 className="text-gray-700 font-semibold flex items-center gap-2 mb-3">
                      <Tag className="h-4 w-4 text-indigo-500" /> Activities
                    </h3>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {selectedTrip.activities.map((activity, i) => (
                        <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
                          <span className="text-indigo-500 font-bold text-sm min-w-[20px]">{i + 1}.</span>
                          <span className="text-gray-700 text-sm">{activity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedTrip(null)}
                    className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => handleDelete(selectedTrip._id)}
                    className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" /> Delete Trip
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyTrips;