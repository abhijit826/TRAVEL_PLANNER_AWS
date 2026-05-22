import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Award,
  Download,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  RefreshCw,
  Info,
  ChevronRight,
  TrendingDown,
  Coins,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import api from '../utils/api';

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  convertedAmount: number;
  category: string;
  date: string;
}

interface AIPredictions {
  prediction: string;
  predictedTotal: number;
  categoryBreakdown: Record<string, number>;
  recommendations: string[];
  alerts: string[];
}

interface Trip {
  _id: string;
  userId: string;
  destination: string;
  duration: string; // e.g. "5 days"
  budget: string; // e.g. "1500" or number
  companions: string;
  activities: string[];
  baseCurrency?: string;
  expenses?: Expense[];
  predictions?: AIPredictions;
  date?: string;
}

const CATEGORIES = [
  { name: 'Accommodation', color: '#6366f1', bg: 'bg-indigo-500/20', text: 'text-indigo-300' },
  { name: 'Food & Dining', color: '#ec4899', bg: 'bg-pink-500/20', text: 'text-pink-300' },
  { name: 'Transportation', color: '#06b6d4', bg: 'bg-cyan-500/20', text: 'text-cyan-300' },
  { name: 'Sightseeing & Activities', color: '#10b981', bg: 'bg-emerald-500/20', text: 'text-emerald-300' },
  { name: 'Shopping', color: '#f59e0b', bg: 'bg-amber-500/20', text: 'text-amber-300' },
  { name: 'Miscellaneous', color: '#8b5cf6', bg: 'bg-purple-500/20', text: 'text-purple-300' },
];

const STATIC_EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  JPY: 155.0,
  INR: 83.5,
  GBP: 0.79,
};

const BudgetOptimizer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Parse tripId from URL query (?tripId=xxx)
  const queryParams = new URLSearchParams(location.search);
  const initialTripId = queryParams.get('tripId');

  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Expense Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('Accommodation');
  const [expenseDate, setExpenseDate] = useState('');

  // Currency Converter Widget State
  const [convAmount, setConvAmount] = useState('100');
  const [convFrom, setConvFrom] = useState('EUR');
  const [convTo, setConvTo] = useState('USD');

  // Load Trips
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

        // Auto-select trip from query parameter, or select the first trip, or set null
        if (initialTripId) {
          const trip = userTrips.find((t) => t._id === initialTripId);
          if (trip) {
            setSelectedTrip(trip);
          } else if (userTrips.length > 0) {
            setSelectedTrip(userTrips[0]);
          }
        } else if (userTrips.length > 0) {
          setSelectedTrip(userTrips[0]);
        }
      } catch (err) {
        console.error('Error loading trips for budget optimizer:', err);
        setErrorMsg('Failed to load trips. Please ensure you are logged in.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrips();
  }, [initialTripId]);

  // Derived Variables
  const expenses = selectedTrip?.expenses || [];
  const baseCurrency = selectedTrip?.baseCurrency || 'USD';
  const totalBudget = parseFloat(selectedTrip?.budget || '0') || 0;
  
  // Extract number of days from duration string (e.g. "5 days" or "5")
  const tripDurationDays = useMemo(() => {
    if (!selectedTrip?.duration) return 1;
    const match = selectedTrip.duration.match(/\d+/);
    return match ? Math.max(parseInt(match[0]), 1) : 1;
  }, [selectedTrip]);

  const totalSpent = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + (exp.convertedAmount || 0), 0);
  }, [expenses]);

  const remainingBudget = totalBudget - totalSpent;
  const percentSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  
  const dailyLimit = totalBudget / tripDurationDays;
  const dailyAverageSpent = totalSpent / tripDurationDays;
  const pacingStatus = dailyAverageSpent > dailyLimit ? 'over' : 'safe';

  // Aggregate category totals
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.forEach((exp) => {
      const cat = exp.category;
      totals[cat] = (totals[cat] || 0) + exp.convertedAmount;
    });
    return totals;
  }, [expenses]);

  // Calculate coordinates for SVG Donut segments
  const donutData = useMemo(() => {
    let accumulatedPercent = 0;
    const radius = 50;
    const circumference = 2 * Math.PI * radius; // ~314.159
    
    return CATEGORIES.map((cat) => {
      const amount = categoryTotals[cat.name] || 0;
      const percent = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
      
      const segment = {
        ...cat,
        amount,
        percent,
        strokeDasharray: `${circumference}`,
        strokeDashoffset: `${circumference - (percent / 100) * circumference}`,
        rotationAngle: (accumulatedPercent * 360) / 100 - 90, // Rotate starting from top
      };
      accumulatedPercent += percent;
      return segment;
    }).filter(seg => seg.amount > 0);
  }, [categoryTotals, totalSpent]);

  // SVG Bar Chart Data - Expenses by Date
  const dateTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.forEach((exp) => {
      // Keep only short date (MM/DD)
      const dateStr = exp.date ? exp.date.substring(5, 10) : 'N/A';
      totals[dateStr] = (totals[dateStr] || 0) + exp.convertedAmount;
    });

    const sortedDates = Object.keys(totals).sort();
    return sortedDates.map(date => ({
      date,
      amount: totals[date]
    })).slice(-7); // Last 7 unique logged dates
  }, [expenses]);

  // Dynamic Badges & Achievements
  const achievements = useMemo(() => {
    const list = [];
    if (totalBudget > 0 && totalSpent < totalBudget) {
      list.push({
        id: 'smart_saver',
        title: 'Smart Saver',
        desc: 'Keeping your overall expenditures under the budgeted limit.',
        icon: Award,
        color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      });
    }
    if (dailyAverageSpent < dailyLimit && expenses.length > 0) {
      list.push({
        id: 'pacing_master',
        title: 'Pacing Master',
        desc: 'Daily average spending is lower than the trip pacing limit.',
        icon: TrendingDown,
        color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
      });
    }
    if (expenses.length >= 5) {
      list.push({
        id: 'active_logger',
        title: 'Active Logger',
        desc: 'Consistently logging detailed transactions to track funds.',
        icon: CheckCircle2,
        color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
      });
    }
    return list;
  }, [totalSpent, totalBudget, dailyAverageSpent, dailyLimit, expenses]);

  // Handle Trip Selection
  const handleTripChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const trip = trips.find((t) => t._id === e.target.value);
    if (trip) {
      setSelectedTrip(trip);
      navigate(`/budget?tripId=${trip._id}`, { replace: true });
    }
  };

  // Convert Currencies Locally
  const convertCurrency = (amountVal: number, from: string, to: string) => {
    const rateFrom = STATIC_EXCHANGE_RATES[from] || 1.0;
    const rateTo = STATIC_EXCHANGE_RATES[to] || 1.0;
    // Convert to USD first, then to target currency
    const inUSD = amountVal / rateFrom;
    return inUSD * rateTo;
  };

  // Add Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip || !description || !amount) return;

    setIsSubmitting(true);
    try {
      const expAmount = parseFloat(amount);
      const converted = convertCurrency(expAmount, currency, baseCurrency);

      const newExpense: Expense = {
        id: crypto.randomUUID(),
        description,
        amount: expAmount,
        currency,
        convertedAmount: parseFloat(converted.toFixed(2)),
        category,
        date: expenseDate || new Date().toISOString().split('T')[0],
      };

      const updatedExpenses = [...expenses, newExpense];
      
      const response = await api.put(`/api/trips/${selectedTrip._id}`, {
        expenses: updatedExpenses,
      });

      setSelectedTrip(response.data);
      setDescription('');
      setAmount('');
      setExpenseDate('');
    } catch (err) {
      console.error('Error logging expense:', err);
      alert('Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (!selectedTrip) return;
    if (!window.confirm('Delete this expense?')) return;

    try {
      const updatedExpenses = expenses.filter((exp) => exp.id !== expenseId);
      const response = await api.put(`/api/trips/${selectedTrip._id}`, {
        expenses: updatedExpenses,
      });
      setSelectedTrip(response.data);
    } catch (err) {
      console.error('Error deleting expense:', err);
      alert('Failed to delete expense.');
    }
  };

  // Trigger AI Optimization Insights
  const triggerAIOptimizer = async () => {
    if (!selectedTrip) return;
    setIsOptimizing(true);
    try {
      const response = await api.post(`/api/trips/${selectedTrip._id}/optimize`);
      setSelectedTrip({
        ...selectedTrip,
        predictions: response.data,
      });
    } catch (err) {
      console.error('Error requesting AI insights:', err);
      alert('Bedrock is unavailable or overloaded right now. Please try again in a few moments.');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Export Expenses as CSV
  const handleExportCSV = () => {
    if (!selectedTrip || expenses.length === 0) return;
    const headers = ['Description', 'Amount', 'Currency', `Converted (${baseCurrency})`, 'Category', 'Date'];
    const rows = expenses.map((exp) => [
      exp.description,
      exp.amount,
      exp.currency,
      exp.convertedAmount,
      exp.category,
      exp.date,
    ]);
    
    const csvContent = [headers, ...rows].map((e) => e.map(val => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses_${selectedTrip.destination.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Currency Converter calculation
  const convResult = useMemo(() => {
    const amt = parseFloat(convAmount) || 0;
    return convertCurrency(amt, convFrom, convTo).toFixed(2);
  }, [convAmount, convFrom, convTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex justify-center items-center">
        <motion.div 
          className="text-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw className="h-16 w-16 text-indigo-500" />
          <p className="text-indigo-200 mt-4 font-semibold tracking-wider">Loading dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex justify-center items-center px-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl text-center max-w-md w-full">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Error</h2>
          <p className="text-indigo-200 mb-6">{errorMsg}</p>
          <button onClick={() => navigate('/auth')} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex justify-center items-center px-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl text-center max-w-md w-full">
          <Award className="h-16 w-16 text-indigo-400 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-white mb-2">No Saved Trips Found</h2>
          <p className="text-indigo-200 mb-6">You need to have at least one saved trip to configure a budget. Build your itinerary and save it first!</p>
          <button onClick={() => navigate('/create-trip')} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all">
            Plan a Trip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 px-4 py-12 text-white relative overflow-hidden">
      {/* Background radial blurs */}
      <div className="absolute top-0 left-10 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        
        {/* Header Dashboard Selector */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-3xl gap-4">
          <div>
            <span className="text-indigo-400 font-semibold uppercase tracking-wider text-xs">Financial Intelligence</span>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1 flex items-center">
              AI Budget Optimizer <Sparkles className="h-6 w-6 ml-2 text-indigo-400 animate-pulse" />
            </h1>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-sm text-indigo-200 whitespace-nowrap">Selected Trip:</span>
            <select
              value={selectedTrip?._id || ''}
              onChange={handleTripChange}
              className="bg-slate-900/60 border border-white/20 rounded-xl px-4 py-2.5 text-white font-bold focus:outline-none focus:border-indigo-500 w-full md:w-64"
            >
              {trips.map((t) => (
                <option key={t._id} value={t._id} className="bg-slate-950">
                  {t.destination} ({t.duration})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedTrip && (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Total Budget */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-indigo-500/20 p-2.5 rounded-xl">
                  <DollarSign className="h-6 w-6 text-indigo-400" />
                </div>
                <p className="text-indigo-200/60 text-xs font-semibold uppercase tracking-wider">Total Budget Limit</p>
                <h3 className="text-3xl font-extrabold mt-2">
                  {totalBudget.toLocaleString()} <span className="text-sm font-normal text-indigo-300">{baseCurrency}</span>
                </h3>
                <p className="text-indigo-200/50 text-xs mt-3">Duration: {selectedTrip.duration}</p>
              </div>

              {/* Total Spent */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-pink-500/20 p-2.5 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-pink-400" />
                </div>
                <p className="text-indigo-200/60 text-xs font-semibold uppercase tracking-wider">Total Actual Spent</p>
                <h3 className="text-3xl font-extrabold mt-2">
                  {totalSpent.toLocaleString()} <span className="text-sm font-normal text-indigo-300">{baseCurrency}</span>
                </h3>
                <div className="w-full bg-white/10 h-2.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      percentSpent > 100 ? 'bg-red-500' : percentSpent > 80 ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(percentSpent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Remaining Budget */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-emerald-500/20 p-2.5 rounded-xl">
                  <DollarSign className="h-6 w-6 text-emerald-400" />
                </div>
                <p className="text-indigo-200/60 text-xs font-semibold uppercase tracking-wider">Remaining Balance</p>
                <h3 className={`text-3xl font-extrabold mt-2 ${remainingBudget < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {remainingBudget.toLocaleString()} <span className="text-sm font-normal">{baseCurrency}</span>
                </h3>
                <p className="text-indigo-200/50 text-xs mt-3">
                  {remainingBudget < 0 ? 'Over budget limit!' : 'Under budget limit'}
                </p>
              </div>

              {/* Daily Pacing Limit */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-cyan-500/20 p-2.5 rounded-xl">
                  <Coins className="h-6 w-6 text-cyan-400" />
                </div>
                <p className="text-indigo-200/60 text-xs font-semibold uppercase tracking-wider">Daily Pacing Limit</p>
                <h3 className="text-3xl font-extrabold mt-2">
                  {dailyLimit.toFixed(0)} <span className="text-sm font-normal text-indigo-300">{baseCurrency}/day</span>
                </h3>
                <p className={`text-xs mt-3 flex items-center ${pacingStatus === 'over' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {pacingStatus === 'over' ? (
                    <>
                      <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0" />
                      Spending Pace: {dailyAverageSpent.toFixed(0)} {baseCurrency}/day (High)
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1 flex-shrink-0" />
                      Spending Pace: {dailyAverageSpent.toFixed(0)} {baseCurrency}/day (Safe)
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Daily Pacing Notification Banner */}
            {percentSpent > 80 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border flex items-center gap-3 ${
                  percentSpent > 100
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">
                  {percentSpent > 100
                    ? `Caution: You have exceeded your budgeted limit of ${totalBudget} ${baseCurrency} by ${(totalSpent - totalBudget).toFixed(2)} ${baseCurrency}!`
                    : `Warning: You have used ${percentSpent.toFixed(1)}% of your trip budget. Consider cutting down on shopping or dining expenses.`}
                </span>
              </motion.div>
            )}

            {/* Dashboard Analytics & Visualizations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Category Breakdown (SVG Donut) */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl lg:col-span-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    Category Breakdown
                  </h3>
                  {expenses.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-56 border border-dashed border-white/20 rounded-2xl text-indigo-200/50">
                      <TrendingUp className="h-10 w-10 mb-2 opacity-50" />
                      <p className="text-sm italic">No spending data to display.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4">
                      {/* SVG Donut */}
                      <div className="relative w-44 h-44">
                        <svg className="w-full h-full" viewBox="0 0 120 120">
                          {/* Inner Gray Ring */}
                          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                          {/* Donut Segments */}
                          {donutData.map((seg, i) => (
                            <circle
                              key={i}
                              cx="60"
                              cy="60"
                              r="50"
                              fill="none"
                              stroke={seg.color}
                              strokeWidth="12"
                              strokeDasharray={seg.strokeDasharray}
                              strokeDashoffset={seg.strokeDashoffset}
                              transform={`rotate(${seg.rotationAngle} 60 60)`}
                              strokeLinecap="round"
                              className="transition-all duration-500 hover:stroke-[14px] cursor-pointer"
                            />
                          ))}
                        </svg>
                        <div className="absolute inset-0 flex flex-col justify-center items-center">
                          <p className="text-2xl font-black">{totalSpent.toFixed(0)}</p>
                          <p className="text-xs text-indigo-200/60 font-semibold">{baseCurrency} Total</p>
                        </div>
                      </div>

                      {/* Donut Legend */}
                      <div className="w-full mt-6 space-y-2 max-h-44 overflow-y-auto pr-1">
                        {CATEGORIES.map((cat, i) => {
                          const amt = categoryTotals[cat.name] || 0;
                          const pct = totalSpent > 0 ? (amt / totalSpent) * 100 : 0;
                          if (amt === 0) return null;
                          return (
                            <div key={i} className="flex justify-between items-center text-xs">
                              <div className="flex items-center">
                                <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: cat.color }} />
                                <span className="text-indigo-200">{cat.name}</span>
                              </div>
                              <span className="font-semibold text-white">
                                {amt.toFixed(1)} {baseCurrency} ({pct.toFixed(0)}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Side-by-Side Spending Comparison (Actual vs. AI Predicted Optimal) */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl lg:col-span-2 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold flex items-center">
                      Spending Analysis vs. AI Predicted Targets
                    </h3>
                    {selectedTrip.predictions && (
                      <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-full flex items-center gap-1 font-bold">
                        <Sparkles className="h-3 w-3" /> AI Target Model
                      </span>
                    )}
                  </div>

                  {!selectedTrip.predictions ? (
                    <div className="flex flex-col justify-center items-center h-64 border border-dashed border-white/20 rounded-2xl text-center p-6">
                      <Sparkles className="h-12 w-12 text-indigo-400 mb-3 animate-pulse" />
                      <h4 className="text-lg font-bold text-white">Run AI Optimizer Target Predictions</h4>
                      <p className="text-sm text-indigo-200/60 max-w-sm mt-1 mb-5">
                        Ask our Bedrock AI Travel Guide to generate predicted spending targets and category allocations optimized for your trip details.
                      </p>
                      <button
                        onClick={triggerAIOptimizer}
                        disabled={isOptimizing}
                        className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all flex items-center gap-2"
                      >
                        {isOptimizing ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                        <span>{isOptimizing ? 'Analyzing Trip Details...' : 'Request AI Budget targets'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 py-2">
                      <p className="text-xs text-indigo-200/60">
                        Compare your actual spending (top color bar) with the AI-optimized recommended budget target (bottom gray bar) in each category:
                      </p>
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                        {CATEGORIES.map((cat, i) => {
                          const actual = categoryTotals[cat.name] || 0;
                          const predicted = selectedTrip.predictions?.categoryBreakdown[cat.name] || 0;
                          
                          // Determine max scale for comparison
                          const maxVal = Math.max(actual, predicted, 100);
                          const actualPercent = (actual / maxVal) * 100;
                          const predictedPercent = (predicted / maxVal) * 100;

                          if (actual === 0 && predicted === 0) return null;

                          return (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-indigo-100">{cat.name}</span>
                                <span className="text-indigo-200/80">
                                  Spent: <strong className="text-white">{actual.toFixed(0)} {baseCurrency}</strong> vs Target: <strong className="text-white">{predicted.toFixed(0)} {baseCurrency}</strong>
                                </span>
                              </div>
                              <div className="space-y-1.5 bg-white/5 p-2 rounded-xl border border-white/5">
                                {/* Actual Spent Bar */}
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] w-8 text-indigo-200 font-bold uppercase">Actual</span>
                                  <div className="flex-1 bg-slate-900/60 h-2.5 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{ width: `${actualPercent}%`, backgroundColor: cat.color }}
                                    />
                                  </div>
                                </div>
                                {/* Predicted / Recommended Bar */}
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] w-8 text-indigo-200/40 font-bold uppercase">Target</span>
                                  <div className="flex-1 bg-slate-900/60 h-2.5 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-slate-600 rounded-full transition-all duration-500"
                                      style={{ width: `${predictedPercent}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Main Operational Section: Logger Form & Detailed Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Daily Expense Form */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl lg:col-span-1">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-indigo-400" /> Log Trip Expense
                </h3>
                <form onSubmit={handleAddExpense} className="space-y-4">
                  
                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-1.5">Description</label>
                    <input
                      type="text"
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Taxi to Eiffel Tower, Dinner, Hotel Stay"
                      className="w-full bg-slate-900/60 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Amount and Original Currency */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-1.5">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-900/60 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-1.5">Currency</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-slate-900/60 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                      >
                        {Object.keys(STATIC_EXCHANGE_RATES).map((curr) => (
                          <option key={curr} value={curr} className="bg-slate-950">
                            {curr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Category Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-1.5">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-900/60 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.name} value={cat.name} className="bg-slate-950">
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Input */}
                  <div>
                    <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-1.5">Date</label>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full bg-slate-900/60 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Form Submission */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-5 w-5" /> Add Log Entry
                      </>
                    )}
                  </button>

                  {/* Exchange rate helper text */}
                  {currency !== baseCurrency && amount && (
                    <div className="text-[11px] text-indigo-300 italic text-center mt-2 flex items-center justify-center gap-1">
                      <Info className="h-3.5 w-3.5" /> Converts to approx.{' '}
                      <strong>
                        {convertCurrency(parseFloat(amount) || 0, currency, baseCurrency).toFixed(2)} {baseCurrency}
                      </strong>
                    </div>
                  )}

                </form>
              </div>

              {/* Expense List Tabular Log */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl lg:col-span-2 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-pink-400" /> Spending Log Ledger
                    </h3>
                    {expenses.length > 0 && (
                      <button
                        onClick={handleExportCSV}
                        className="text-xs bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white hover:bg-white/20 flex items-center gap-1 font-semibold transition-all"
                      >
                        <Download className="h-4 w-4" /> Export CSV
                      </button>
                    )}
                  </div>

                  {expenses.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-64 border border-dashed border-white/20 rounded-2xl text-indigo-200/50">
                      <Coins className="h-12 w-12 mb-3 opacity-40 animate-pulse" />
                      <p className="text-sm italic">No expenses logged yet for this trip.</p>
                      <p className="text-xs text-indigo-200/40 mt-1">Fill out the left form to insert transaction details.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-white/10 rounded-2xl max-h-[300px] overflow-y-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-white/10 text-indigo-200 font-semibold border-b border-white/15">
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3 text-right">Original Amount</th>
                            <th className="px-4 py-3 text-right">Converted ({baseCurrency})</th>
                            <th className="px-4 py-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {expenses
                            .slice()
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((exp) => {
                              const catMeta = CATEGORIES.find(c => c.name === exp.category);
                              return (
                                <tr key={exp.id} className="hover:bg-white/5 transition-colors">
                                  <td className="px-4 py-3 whitespace-nowrap text-indigo-200">{exp.date}</td>
                                  <td className="px-4 py-3 font-semibold text-white truncate max-w-[120px]">{exp.description}</td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${catMeta?.bg || 'bg-white/10'} ${catMeta?.text || 'text-white'}`}>
                                      {exp.category}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right text-indigo-300">
                                    {exp.amount.toFixed(2)} <span className="text-[10px]">{exp.currency}</span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-extrabold text-white">
                                    {exp.convertedAmount.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      onClick={() => handleDeleteExpense(exp.id)}
                                      className="text-red-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-all"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* SVG Daily Spending Trend Bar Chart (renders only if data exists) */}
                {dateTotals.length > 0 && (
                  <div className="mt-6 border-t border-white/10 pt-4">
                    <h4 className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-3">Daily Expense Trends (Last 7 Logged Dates)</h4>
                    <div className="h-28 w-full flex items-end justify-between px-2 bg-slate-950/40 rounded-xl p-3 border border-white/5">
                      {dateTotals.map((dt, idx) => {
                        const maxAmt = Math.max(...dateTotals.map(d => d.amount), 50);
                        const pctHeight = (dt.amount / maxAmt) * 80; // Scale to fit comfortably
                        return (
                          <div key={idx} className="flex flex-col items-center flex-1 group relative">
                            {/* Hover tooltip */}
                            <span className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 bg-slate-900 border border-white/20 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-lg pointer-events-none transition-opacity duration-200">
                              {dt.amount.toFixed(1)} {baseCurrency}
                            </span>
                            <div 
                              className="w-8 bg-gradient-to-t from-indigo-600 to-pink-500 rounded-t-md hover:opacity-85 transition-all shadow-lg shadow-indigo-500/10"
                              style={{ height: `${Math.max(pctHeight, 4)}px` }}
                            />
                            <span className="text-[9px] text-indigo-300/60 mt-1 font-semibold">{dt.date}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Bottom Layout Grid: AI Savings Insights Panel & Side widgets (Currency Calc & Achievements) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Bedrock AI Insights & Savings Recommendations Panel */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl lg:col-span-2 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-300 animate-spin" /> Powered by Amazon Nova Pro
                      </span>
                      <h3 className="text-xl font-bold text-white mt-2 flex items-center">
                        AI Savings Recommendations
                      </h3>
                    </div>
                    {selectedTrip.predictions && (
                      <button
                        onClick={triggerAIOptimizer}
                        disabled={isOptimizing}
                        className="text-xs text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg px-3 py-1.5 font-bold flex items-center gap-1.5 transition-all"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
                        <span>Refresh AI</span>
                      </button>
                    )}
                  </div>

                  {!selectedTrip.predictions ? (
                    <div className="flex flex-col justify-center items-center h-64 text-center p-6 border border-dashed border-white/20 rounded-2xl">
                      <Sparkles className="h-10 w-10 text-indigo-400 mb-2 opacity-50" />
                      <p className="text-sm text-indigo-200/60 max-w-sm mt-1 mb-4">
                        Request personalized AI budget review advice, warnings, and localized saving suggestions tailored specifically to your expenses.
                      </p>
                      <button
                        onClick={triggerAIOptimizer}
                        disabled={isOptimizing}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center gap-2"
                      >
                        {isOptimizing ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                        <span>{isOptimizing ? 'Reviewing Log...' : 'Get AI Savings Review'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Text Summary */}
                      <div className="bg-indigo-950/30 p-4 rounded-xl border border-indigo-500/10 text-indigo-200 text-xs leading-relaxed">
                        <p>{selectedTrip.predictions.prediction}</p>
                      </div>

                      {/* Warnings / Alerts */}
                      {selectedTrip.predictions.alerts?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-red-300 uppercase tracking-wider mb-2 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-1 text-red-400" /> AI Warnings & Anomalies
                          </h4>
                          <div className="space-y-2">
                            {selectedTrip.predictions.alerts.map((alert, idx) => (
                              <div key={idx} className="bg-red-500/5 text-red-200 border border-red-500/10 px-3 py-2 rounded-lg text-xs flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                                <span>{alert}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {selectedTrip.predictions.recommendations?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center">
                            <Sparkles className="h-4 w-4 mr-1 text-indigo-400" /> Actionable Optimization Tips
                          </h4>
                          <div className="space-y-2">
                            {selectedTrip.predictions.recommendations.map((rec, idx) => (
                              <div key={idx} className="bg-white/5 text-indigo-100 border border-white/5 px-3 py-2.5 rounded-lg text-xs flex items-start gap-2">
                                <ChevronRight className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                                <span>{rec}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              </div>

              {/* Side Panels: Achievements Badge board & Mini Converter */}
              <div className="space-y-8 lg:col-span-1">
                
                {/* Gamified Achievements/Badges */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-400" /> Savings Achievements
                  </h3>
                  {achievements.length === 0 ? (
                    <p className="text-xs text-indigo-200/50 italic py-4 text-center bg-white/5 rounded-xl border border-white/5">
                      Log transactions to unlock budgeting accomplishments!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {achievements.map((ach) => {
                        const IconComponent = ach.icon;
                        return (
                          <div key={ach.id} className={`flex items-start border p-3 rounded-xl gap-3 ${ach.color}`}>
                            <div className="bg-white/10 p-2 rounded-lg flex-shrink-0 mt-0.5">
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-wider">{ach.title}</h4>
                              <p className="text-[10px] text-white/70 mt-1 leading-normal">{ach.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick Currency Converter widget */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Coins className="h-5 w-5 text-cyan-400" /> Currency Quick Convert
                  </h3>
                  <div className="space-y-3.5">
                    
                    {/* Amount Input */}
                    <div className="bg-slate-900/60 border border-white/20 rounded-xl px-3 py-2 flex items-center">
                      <input
                        type="number"
                        value={convAmount}
                        onChange={(e) => setConvAmount(e.target.value)}
                        className="bg-transparent border-none text-white text-sm font-semibold focus:outline-none w-full"
                        placeholder="100"
                      />
                      <span className="text-indigo-400 text-xs font-bold uppercase">{convFrom}</span>
                    </div>

                    {/* From/To selectors */}
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={convFrom}
                        onChange={(e) => setConvFrom(e.target.value)}
                        className="bg-slate-900/60 border border-white/20 rounded-lg px-2 py-1 text-xs text-white focus:outline-none flex-1"
                      >
                        {Object.keys(STATIC_EXCHANGE_RATES).map((curr) => (
                          <option key={curr} value={curr} className="bg-slate-950">
                            {curr}
                          </option>
                        ))}
                      </select>
                      <ArrowRight className="h-4 w-4 text-indigo-400" />
                      <select
                        value={convTo}
                        onChange={(e) => setConvTo(e.target.value)}
                        className="bg-slate-900/60 border border-white/20 rounded-lg px-2 py-1 text-xs text-white focus:outline-none flex-1"
                      >
                        {Object.keys(STATIC_EXCHANGE_RATES).map((curr) => (
                          <option key={curr} value={curr} className="bg-slate-950">
                            {curr}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Result */}
                    <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl text-center">
                      <p className="text-[10px] text-indigo-300 uppercase tracking-widest">Converted Amount</p>
                      <p className="text-xl font-black mt-1 text-white">
                        {parseFloat(convResult).toLocaleString()} <span className="text-xs font-medium text-indigo-300">{convTo}</span>
                      </p>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default BudgetOptimizer;
