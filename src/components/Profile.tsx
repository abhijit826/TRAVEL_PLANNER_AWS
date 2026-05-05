import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Plane, Loader, Edit, Calendar, Mail, MapPin, Wallet, ChevronRight, Star } from 'lucide-react';
import api from '../utils/api';
import { useNavigate, Link } from 'react-router-dom';

const Profile: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [tripCount, setTripCount] = useState<number>(0);
  const [docCount, setDocCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch profile
        const profileRes = await api.get('/api/profile');
        const userData = profileRes.data;
        setUser(userData);

        // Fetch real trip count
        try {
          const tripsRes = await api.get(`/api/users/${userData._id}/trips`);
          setTripCount(Array.isArray(tripsRes.data) ? tripsRes.data.length : 0);
        } catch { setTripCount(0); }

        // Fetch wallet doc count
        try {
          const docsRes = await api.get('/api/travel-wallet/documents');
          setDocCount(Array.isArray(docsRes.data) ? docsRes.data.length : 0);
        } catch { setDocCount(0); }

      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile.');
        navigate('/auth');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [navigate]);

  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        <Loader className="h-12 w-12 text-indigo-400" />
      </motion.div>
    </div>
  );

  if (error || !user) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex items-center justify-center">
      <p className="text-red-400 text-lg">{error}</p>
    </div>
  );

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'N/A';

  const initials = user.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 py-10 px-4">

      {/* Background orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">

        {/* ── Hero Card ────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative bg-white/10 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/20 shadow-2xl mb-6"
        >
          {/* Gradient banner */}
          <div className="h-28 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-mosaic.png')] opacity-20" />
            {/* Edit button */}
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/edit-profile')}
              className="absolute top-4 right-4 flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white px-3 py-1.5 rounded-xl text-sm font-medium transition"
            >
              <Edit className="h-4 w-4" /> Edit Profile
            </motion.button>
          </div>

          {/* Avatar + info */}
          <div className="px-8 pb-8">
            <div className="flex items-end gap-5 -mt-12 mb-5">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-xl border-4 border-slate-900"
              >
                {initials}
              </motion.div>
              <div className="pb-1">
                <h1 className="text-2xl font-extrabold text-white">{user.name}</h1>
                <div className="flex items-center gap-2 text-indigo-300 text-sm mt-1">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{user.email}</span>
                </div>
              </div>
            </div>

            {/* Member since + badge */}
            <div className="flex flex-wrap gap-3">
              <span className="flex items-center gap-1.5 bg-white/10 text-white/80 text-xs px-3 py-1.5 rounded-full border border-white/20">
                <Calendar className="h-3.5 w-3.5 text-indigo-300" />
                Member since {memberSince}
              </span>
              <span className="flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1.5 rounded-full border border-indigo-500/30">
                <Star className="h-3.5 w-3.5" />
                Travel Enthusiast
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Stats Row ────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="grid grid-cols-3 gap-4 mb-6"
        >
          {[
            { label: 'Trips Planned', value: tripCount, icon: <Plane className="h-5 w-5 text-indigo-400" />, link: '/mytrips', color: 'from-indigo-500/20 to-indigo-600/10' },
            { label: 'Wallet Docs', value: docCount, icon: <Wallet className="h-5 w-5 text-purple-400" />, link: '/wallet', color: 'from-purple-500/20 to-purple-600/10' },
            { label: 'Countries', value: Math.min(tripCount, tripCount > 0 ? tripCount : 0), icon: <MapPin className="h-5 w-5 text-pink-400" />, link: '/mytrips', color: 'from-pink-500/20 to-pink-600/10' },
          ].map(({ label, value, icon, link, color }) => (
            <Link to={link} key={label}>
              <motion.div
                whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                className={`bg-gradient-to-br ${color} backdrop-blur-xl rounded-2xl p-5 border border-white/10 shadow-lg cursor-pointer text-center`}
              >
                <div className="flex justify-center mb-2">{icon}</div>
                <p className="text-3xl font-extrabold text-white">{value}</p>
                <p className="text-xs text-white/60 mt-1">{label}</p>
              </motion.div>
            </Link>
          ))}
        </motion.div>

        {/* ── Quick Actions ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl overflow-hidden mb-6"
        >
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Quick Actions</h2>
          </div>
          {[
            { label: 'Plan a New Trip', sub: 'Create an AI-generated itinerary', icon: <Plane className="h-5 w-5 text-indigo-400" />, link: '/create-trip', color: 'bg-indigo-500/10 group-hover:bg-indigo-500/20' },
            { label: 'My Saved Trips', sub: `${tripCount} trip${tripCount !== 1 ? 's' : ''} saved`, icon: <MapPin className="h-5 w-5 text-purple-400" />, link: '/mytrips', color: 'bg-purple-500/10 group-hover:bg-purple-500/20' },
            { label: 'Travel Wallet', sub: `${docCount} document${docCount !== 1 ? 's' : ''} stored`, icon: <Wallet className="h-5 w-5 text-pink-400" />, link: '/wallet', color: 'bg-pink-500/10 group-hover:bg-pink-500/20' },
            { label: 'Edit Profile', sub: 'Update your name and email', icon: <User className="h-5 w-5 text-teal-400" />, link: '/edit-profile', color: 'bg-teal-500/10 group-hover:bg-teal-500/20' },
          ].map(({ label, sub, icon, link, color }) => (
            <Link to={link} key={label}>
              <motion.div
                whileHover={{ x: 4 }}
                className="group flex items-center gap-4 px-6 py-4 border-b border-white/10 last:border-0 cursor-pointer transition"
              >
                <div className={`p-2.5 rounded-xl transition ${color}`}>{icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{label}</p>
                  <p className="text-white/50 text-xs mt-0.5 truncate">{sub}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white/60 transition" />
              </motion.div>
            </Link>
          ))}
        </motion.div>

        {/* ── Account Info ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Account Details</h2>
          </div>
          <div className="divide-y divide-white/10">
            {[
              { label: 'Full Name', value: user.name, icon: <User className="h-4 w-4 text-indigo-400" /> },
              { label: 'Email Address', value: user.email, icon: <Mail className="h-4 w-4 text-indigo-400" /> },
              { label: 'Member Since', value: memberSince, icon: <Calendar className="h-4 w-4 text-indigo-400" /> },
              { label: 'Account ID', value: user._id?.slice(0, 8) + '...', icon: <Star className="h-4 w-4 text-indigo-400" /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-center gap-4 px-6 py-4">
                <div className="p-2 bg-white/10 rounded-lg">{icon}</div>
                <div>
                  <p className="text-white/50 text-xs">{label}</p>
                  <p className="text-white font-medium text-sm mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Profile;