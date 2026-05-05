import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Plane, Mail, Lock, User, ArrowRight, Loader } from 'lucide-react';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';

const DESTINATIONS = ['Bali', 'Paris', 'Tokyo', 'Santorini', 'Maldives', 'Dubai'];

const AuthPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
      const data = isSignUp ? { name, email, password } : { email, password };
      const response = await api.post(endpoint, data);
      localStorage.setItem('token', response.data.token);
      navigate('/');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Authentication failed. Please try again.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setErrorMsg('');
    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex">

      {/* ── Left Panel (decorative) ────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12">
        {/* Animated orbs */}
        <div className="absolute top-20 left-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-indigo-500 p-2.5 rounded-xl">
            <Plane className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-extrabold text-white">TravelAI</span>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl font-extrabold text-white leading-tight mb-6"
          >
            Your AI Travel<br />
            <span className="bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
              Companion
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-indigo-300 text-lg leading-relaxed mb-10"
          >
            Generate personalized itineraries, manage your travel documents,
            and explore the world — all powered by Amazon Nova AI.
          </motion.p>

          {/* Floating destination chips */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-2"
          >
            {DESTINATIONS.map((dest, i) => (
              <motion.span
                key={dest}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-1.5 bg-white/10 backdrop-blur text-white/80 text-sm px-3 py-1.5 rounded-full border border-white/20"
              >
                ✈️ {dest}
              </motion.span>
            ))}
          </motion.div>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 grid grid-cols-3 gap-4"
        >
          {[['10K+', 'Itineraries'], ['150+', 'Countries'], ['AI', 'Powered']].map(([val, label]) => (
            <div key={label} className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10 text-center">
              <p className="text-2xl font-extrabold text-white">{val}</p>
              <p className="text-indigo-300 text-xs mt-1">{label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Right Panel (form) ─────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 justify-center mb-8">
            <div className="bg-indigo-500 p-2 rounded-xl"><Plane className="h-5 w-5 text-white" /></div>
            <span className="text-xl font-extrabold text-white">TravelAI</span>
          </div>

          {/* Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">

            {/* Tab switcher */}
            <div className="flex border-b border-white/10">
              {['Login', 'Sign Up'].map((tab) => {
                const active = tab === 'Sign Up' ? isSignUp : !isSignUp;
                return (
                  <button key={tab} onClick={() => tab === 'Sign Up' ? !isSignUp && switchMode() : isSignUp && switchMode()}
                    className={`flex-1 py-4 text-sm font-semibold transition-all ${active ? 'text-white border-b-2 border-indigo-400 bg-white/5' : 'text-white/40 hover:text-white/70'}`}>
                    {tab}
                  </button>
                );
              })}
            </div>

            <div className="p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isSignUp ? 'signup' : 'login'}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className="text-2xl font-extrabold text-white mb-1">
                    {isSignUp ? 'Create account' : 'Welcome back'}
                  </h2>
                  <p className="text-indigo-300 text-sm mb-7">
                    {isSignUp ? 'Start planning your dream trips today' : 'Sign in to access your travel plans'}
                  </p>

                  <form onSubmit={handleAuth} className="space-y-4">
                    {/* Name field (signup only) */}
                    <AnimatePresence>
                      {isSignUp && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <label className="block text-sm font-medium text-indigo-300 mb-1.5">Full Name</label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                            <input
                              type="text" value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="John Doe"
                              required={isSignUp}
                              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-indigo-300 mb-1.5">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                        <input
                          type="email" value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-indigo-300 mb-1.5">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                        <input
                          type={showPassword ? 'text' : 'password'} value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-white transition">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Error message */}
                    <AnimatePresence>
                      {errorMsg && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="bg-red-500/20 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3"
                        >
                          ⚠️ {errorMsg}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      whileHover={{ scale: isLoading ? 1 : 1.02 }}
                      whileTap={{ scale: isLoading ? 1 : 0.98 }}
                      className="w-full py-3.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                    >
                      {isLoading ? (
                        <><Loader className="h-4 w-4 animate-spin" /> {isSignUp ? 'Creating account...' : 'Signing in...'}</>
                      ) : (
                        <>{isSignUp ? 'Create Account' : 'Sign In'} <ArrowRight className="h-4 w-4" /></>
                      )}
                    </motion.button>
                  </form>

                  {/* Switch mode */}
                  <p className="text-center text-white/50 text-sm mt-6">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button onClick={switchMode} className="text-indigo-400 hover:text-indigo-300 font-semibold transition">
                      {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <p className="text-center text-white/30 text-xs mt-6">
            Secured with JWT · Powered by Amazon Nova Pro AI
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;