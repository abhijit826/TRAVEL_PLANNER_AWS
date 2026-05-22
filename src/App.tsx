
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LoadScript } from '@react-google-maps/api';
import HomePage from './pages/HomePage';
import CreateTripPage from './pages/CreateTripPage';
import TripDetailsPage from './pages/TripDetailsPage';
import GeoGuidePage from './pages/GeoGuidePage';
import WalletPage from './pages/WalletPage';
import ConciergePage from './pages/ConciergePage';
import BudgetPage from './pages/BudgetPage';
import Profile from './components/Profile';
import MyTrips from './components/MyTrips';
import Navbar from './components/Navbar';
import AuthPage from './components/auth/AuthPage';
import Logout from './components/auth/Logout';
import ProtectedRoute from './components/ProtectedRoute';
import EditProfile from './components/EditProfile';

const GMAPS_LIBRARIES: ('places')[] = ['places'];

function App() {
  return (
    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''}
      libraries={GMAPS_LIBRARIES}
    >
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create-trip" element={<ProtectedRoute><CreateTripPage /></ProtectedRoute>} />
          <Route path="/trip-details" element={<TripDetailsPage />} />
          <Route path="/geo-guide" element={<GeoGuidePage />} />
          <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
          <Route path="/concierge" element={<ProtectedRoute><ConciergePage /></ProtectedRoute>} />
          <Route path="/budget" element={<ProtectedRoute><BudgetPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/mytrips" element={<ProtectedRoute><MyTrips /></ProtectedRoute>} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          {/* Route aliases for both URL formats */}
          <Route path="/my-trips" element={<ProtectedRoute><MyTrips /></ProtectedRoute>} />
          <Route path="/travel-wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
        </Routes>
      </Router>
    </LoadScript>
  );
}

export default App;