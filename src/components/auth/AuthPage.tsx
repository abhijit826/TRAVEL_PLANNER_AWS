import React, { useState } from 'react';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';

const AuthPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
      const data = isSignUp ? { name, email, password } : { email, password };
      const response = await api.post(endpoint, data);
      localStorage.setItem('token', response.data.token);
      navigate('/'); // Redirect to the homepage
    } catch (error) {
      console.error('Error during authentication:', error);
      alert('Failed to authenticate. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-3xl font-bold mb-6">{isSignUp ? 'Sign Up' : 'Login'}</h1>
      <form onSubmit={handleAuth} className="space-y-4">
        {isSignUp && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">
          {isSignUp ? 'Sign Up' : 'Login'}
        </button>
      </form>
      <div className="mt-4 text-center">
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-indigo-600 hover:underline"
        >
          {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
};

export default AuthPage;