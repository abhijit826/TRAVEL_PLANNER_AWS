import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit, Save, ArrowLeft } from 'lucide-react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const EditProfile: React.FC = () => {
  const [user, setUser] = useState({ name: '', email: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get('/api/profile');
        setUser({ name: response.data.name, email: response.data.email });
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setError('Failed to load profile data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch('/api/profile', user);
      alert('Profile updated successfully!');
      navigate('/profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
    hover: { scale: 1.02, boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)', transition: { duration: 0.3 } },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-teal-50 to-purple-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Edit className="h-12 w-12 text-indigo-600" />
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
    <div className="min-h-screen bg-gradient-to-br from-teal-100 via-purple-100 to-indigo-100 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover="hover"
          className="bg-white/90 backdrop-blur-md rounded-xl p-8 shadow-xl border border-indigo-100"
        >
          <motion.div
            className="flex items-center justify-between mb-6"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold text-gray-800">Edit Profile</h2>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/profile')}
              className="text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              <ArrowLeft className="h-5 w-5 mr-1" /> Back
            </motion.button>
          </motion.div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                name="name"
                value={user.name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={user.email}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-gradient-to-r from-indigo-600 to-teal-600 text-white py-2 rounded-lg hover:from-indigo-700 hover:to-teal-700 transition-all duration-300"
            >
              <Save className="inline-block mr-2 h-5 w-5" /> Save Changes
            </motion.button>
          </form>
          {error && (
            <motion.p
              className="mt-4 text-red-600 text-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {error}
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default EditProfile;