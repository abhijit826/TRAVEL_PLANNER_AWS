import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, Globe, Plane, Loader, Edit } from 'lucide-react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get('/api/profile');
        setUser(response.data);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setError('Failed to load profile. Please log in again.');
        navigate('/auth');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: 'easeOut' } },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
    hover: { scale: 1.03, boxShadow: '0 15px 30px rgba(0, 0, 0, 0.15)', transition: { duration: 0.3 } },
  };

  const statVariants = {
    hover: { scale: 1.1, color: '#4C51BF', transition: { duration: 0.2 } },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-teal-50 to-purple-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader className="h-12 w-12 text-indigo-600" />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-teal-50 to-purple-50 flex items-center justify-center">
        <motion.p
          className="text-xl text-red-600 font-semibold bg-white/80 p-4 rounded-lg shadow-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {error}
        </motion.p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-100 via-purple-100 to-indigo-100 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/world-map.png')] opacity-10"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center text-center"
        >
          <div className="flex items-center justify-center space-x-4 mb-6">
            <Plane className="h-10 w-10 text-indigo-600 animate-pulse" />
            <motion.h2
              className="text-xl sm:text-2xl text-indigo-600 font-semibold tracking-wide uppercase"
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              User Profile
            </motion.h2>
          </div>
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white/90 backdrop-blur-md rounded-xl p-8 shadow-xl border border-indigo-100 overflow-hidden w-full max-w-3xl"
          >
            <div className="relative flex flex-col items-center">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-teal-500 rounded-lg blur opacity-75"></div>
                <div className="relative bg-white rounded-full p-2 shadow-md">
                  <User className="h-20 w-20 text-indigo-600" />
                </div>
              </div>
              <div className="mt-6 text-center">
                <h3 className="text-2xl font-bold text-gray-900">{user.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                <div className="mt-4 flex justify-center space-x-6">
                  <motion.div
                    className="flex items-center space-x-2 text-gray-700"
                    variants={statVariants}
                    whileHover="hover"
                  >
                    <MapPin className="h-6 w-6" />
                    <span className="text-lg font-medium">{user.location || 'N/A'}</span>
                  </motion.div>
                  <motion.div
                    className="flex items-center space-x-2 text-gray-700"
                    variants={statVariants}
                    whileHover="hover"
                    onClick={() => navigate('/my-trips')}
                  >
                    <Plane className="h-6 w-6" />
                    <span className="text-lg font-medium">{user.trips || 0} Trips</span>
                  </motion.div>
                  <motion.div
                    className="flex items-center space-x-2 text-gray-700"
                    variants={statVariants}
                    whileHover="hover"
                  >
                    <Globe className="h-6 w-6" />
                    <span className="text-lg font-medium">{user.favoriteDestination || 'N/A'}</span>
                  </motion.div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-8 w-full max-w-xs bg-gradient-to-r from-indigo-600 to-teal-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-teal-700 transition-all duration-300"
                onClick={() => navigate('/edit-profile')}
              >
                <Edit className="inline-block mr-2 h-5 w-5" /> Edit Profile
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;