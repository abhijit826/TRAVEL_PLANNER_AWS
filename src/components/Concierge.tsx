import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Bot, User, Compass, Loader, Layers } from 'lucide-react';
import api from '../utils/api';

interface SavedTrip {
  _id: string;
  destination: string;
  duration: string;
  budget: string;
  companions: string;
  activities: string[];
  date?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const Concierge: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hi there! I am **Aria**, your AI Travel Concierge. 🌟\n\nI can help you explore destinations, find local food spots, suggest custom activities, answer transit questions, or help with packing lists. If you select one of your saved trips, I will instantly adapt my recommendations to it!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [loadingTrips, setLoadingTrips] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch saved trips for context selection
  useEffect(() => {
    const fetchTrips = async () => {
      setLoadingTrips(true);
      try {
        const profileRes = await api.get('/api/profile');
        const userId = profileRes.data._id;
        const tripsRes = await api.get(`/api/users/${userId}/trips`);
        setTrips(tripsRes.data || []);
      } catch (err) {
        console.error('Error fetching trips for concierge:', err);
      } finally {
        setLoadingTrips(false);
      }
    };
    fetchTrips();
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const activeTrip = trips.find(t => t._id === selectedTripId);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // Map history to server format
      const history = messages
        .filter(m => m.id !== 'welcome') // exclude initial welcome message
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));

      const payload = {
        message: textToSend,
        history,
        tripContext: activeTrip
          ? {
              destination: activeTrip.destination,
              duration: activeTrip.duration,
              budget: activeTrip.budget,
              companions: activeTrip.companions,
              activities: activeTrip.activities,
              date: activeTrip.date,
            }
          : undefined,
      };

      const response = await api.post('/api/concierge/chat', payload);

      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        sender: 'assistant',
        text: response.data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        sender: 'assistant',
        text: 'Sorry, I encountered an issue connecting to Bedrock. Please ensure model access is enabled or try again shortly.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggest = (topic: string) => {
    let promptText = '';
    if (activeTrip) {
      if (topic === 'food') promptText = `Recommend the top 5 dining spots or local dishes I must try in ${activeTrip.destination}.`;
      else if (topic === 'sights') promptText = `Suggest the top sights and hidden gems in ${activeTrip.destination} for a ${activeTrip.companions || 'solo'} trip.`;
      else if (topic === 'pack') promptText = `Can you generate a tailored packing list for a ${activeTrip.duration} trip to ${activeTrip.destination}?`;
      else if (topic === 'transit') promptText = `What is the best way to get around in ${activeTrip.destination}? Details on public transit/cabs.`;
    } else {
      if (topic === 'food') promptText = 'What are some famous local dishes I should try when traveling?';
      else if (topic === 'sights') promptText = 'Give me ideas for unique travel destinations and hidden gems.';
      else if (topic === 'pack') promptText = 'What are the absolute essentials to pack for any international trip?';
      else if (topic === 'transit') promptText = 'What are the best apps for navigating public transport abroad?';
    }
    handleSend(promptText);
  };

  // Helper to format text with bold (**text**) and bullet lists
  const formatMessageText = (text: string) => {
    return text.split('\n').map((line, i) => {
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      let content = isBullet ? line.trim().substring(2) : line;

      // Parse **bold** tags
      const parts = content.split(/(\*\*[^*]+\*\*)/g);
      const parsedContent = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} className="font-bold text-indigo-200">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={i} className="ml-4 list-disc text-white/90 my-1 text-sm leading-relaxed">
            {parsedContent}
          </li>
        );
      }

      return (
        <p key={i} className="text-white/90 text-sm leading-relaxed my-1 min-h-[1rem]">
          {parsedContent}
        </p>
      );
    });
  };

  const suggestions = [
    { label: '🍽️ local Dining', id: 'food' },
    { label: '📸 Sights & Gems', id: 'sights' },
    { label: '🧳 Packing List', id: 'pack' },
    { label: '🚇 Public Transit', id: 'transit' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex flex-col justify-between py-12 px-4 relative overflow-hidden">
      {/* Glow Orbs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto flex flex-col flex-1 relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/20">
              <Bot className="h-6 w-6 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Aria <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-normal">AI Concierge</span>
              </h1>
              <p className="text-xs text-white/50">Your 24/7 Intelligent Travel Companion</p>
            </div>
          </div>

          {/* Trip Selector Context */}
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-400" />
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="bg-slate-950/60 border border-white/10 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition cursor-pointer max-w-[200px]"
            >
              <option value="">No Active Trip Context</option>
              {trips.map(trip => (
                <option key={trip._id} value={trip._id}>
                  Context: {trip.destination}
                </option>
              ))}
            </select>
            {loadingTrips && <Loader className="h-4.5 w-4.5 text-indigo-400 animate-spin" />}
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[55vh] min-h-[40vh] scrollbar-thin scrollbar-thumb-white/10">
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isAssistant = msg.sender === 'assistant';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 max-w-[85%] ${isAssistant ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isAssistant ? 'bg-indigo-600 text-white' : 'bg-purple-600 text-white'
                  }`}>
                    {isAssistant ? <Compass className="h-4.5 w-4.5" /> : <User className="h-4.5 w-4.5" />}
                  </div>
                  
                  <div className="space-y-1">
                    <div className={`p-4 rounded-2xl ${
                      isAssistant 
                        ? 'bg-white/10 border border-white/5 text-white' 
                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                    }`}>
                      {formatMessageText(msg.text)}
                    </div>
                    <p className={`text-[10px] text-white/30 ${isAssistant ? 'text-left' : 'text-right'}`}>
                      {msg.timestamp}
                    </p>
                  </div>
                </motion.div>
              );
            })}

            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 mr-auto"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                  <Compass className="h-4.5 w-4.5 text-white animate-spin" />
                </div>
                <div className="bg-white/10 border border-white/5 p-4 rounded-2xl flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="px-6 py-3 border-t border-white/5 bg-slate-950/20 flex flex-wrap gap-2">
          {suggestions.map((sug) => (
            <button
              key={sug.id}
              onClick={() => handleSuggest(sug.id)}
              className="text-xs bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500/30 text-white/80 hover:text-white px-3 py-1.5 rounded-full transition-all flex items-center gap-1"
            >
              {sug.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-6 border-t border-white/10 bg-white/5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputText);
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                activeTrip
                  ? `Ask Aria about your trip to ${activeTrip.destination}...`
                  : 'Ask Aria anything about travel...'
              }
              className="flex-1 bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/15 focus:border-indigo-500 rounded-2xl px-5 py-3.5 text-white placeholder-white/30 text-sm focus:outline-none transition"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className={`p-3.5 rounded-2xl flex items-center justify-center transition-all ${
                inputText.trim() && !isTyping
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:scale-[1.03]'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
          {activeTrip && (
            <p className="mt-2 text-[10px] text-indigo-300 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Chat linked to <strong>{activeTrip.destination}</strong> context. Aria will adapt suggestions accordingly.
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

export default Concierge;
