import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Calendar, MapPin, Plus, Trash2 } from 'lucide-react';
import api from '../utils/api';
import { Link } from 'react-router-dom';

// Trip type matching DynamoDB model
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

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6 } },
    hover: { scale: 1.05, boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)', transition: { duration: 0.3 } },
  };

  const emptyVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.8, type: 'spring' } },
  };

  const handleDelete = async (tripId: string) => {
    if (window.confirm('Are you sure you want to delete this trip?')) {
      try {
        await api.delete(`/api/trips/${tripId}`);
        setTrips(trips.filter(trip => trip._id !== tripId));
        alert('Trip deleted successfully');
      } catch (error) {
        console.error('Error deleting trip:', error);
        alert('Failed to delete trip');
      }
    }
  };

  const handleViewDetails = (trip: Trip) => {
    // Opens backend-generated PDF
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    window.open(`${base}/api/trips/${trip._id}/pdf`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-100 via-purple-100 to-indigo-100 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/world-map.png')] opacity-10"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="lg:text-center">
          <motion.h2 
            className="text-base text-indigo-600 font-semibold tracking-wide uppercase"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            My Adventures
          </motion.h2>
          <motion.p 
            className="mt-2 text-4xl md:text-5xl leading-10 font-extrabold tracking-tight text-gray-900 bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          >
            Your Travel Memories
          </motion.p>
        </div>

        <div className="mt-12">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <motion.div
                className="text-indigo-600"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
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
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-800">{trip.destination}</h3>
                      <Plane className="h-6 w-6 text-indigo-600 animate-pulse" />
                    </div>
                    <div className="mt-3 flex items-center text-gray-600">
                      <Calendar className="h-5 w-5 mr-2" />
                      <span className="text-sm">{trip.date || trip.createdAt?.split('T')[0] || 'N/A'}</span>
                    </div>
                    <p className="mt-2 text-gray-600 line-clamp-2">{trip.activities.join(', ') || 'No activities'}</p>
                    <div className="mt-4 flex items-center text-gray-600">
                      <MapPin className="h-5 w-5 mr-2" />
                      <span className="text-sm">{trip.destination}</span>
                    </div>
                    <div className="mt-4 flex justify-between">
                      <motion.button
                        className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex-1 mr-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleViewDetails(trip)}
                      >
                        View Details
                      </motion.button>
                      <motion.button
                        className="bg-red-600 text-white py-2 px-2 rounded-lg hover:bg-red-700 transition-colors flex-1 flex justify-center items-center"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(trip._id)}
                      >
                        Delete <Trash2 className="h-5 w-5 ml-1" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
                {trips.length === 0 && (
                  <motion.div
                    className="col-span-full flex flex-col items-center justify-center h-64 bg-white/80 backdrop-blur-md rounded-xl p-6 shadow-xl border border-indigo-100"
                    variants={emptyVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Plus className="h-16 w-16 text-indigo-400 animate-bounce" />
                    <p className="mt-4 text-xl text-gray-600">No trips saved yet.</p>
                    <p className="text-gray-500">Start planning your next adventure!</p>
                    <motion.button
                      className="mt-4 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link to="/create-trip">Create Trip</Link>
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyTrips;