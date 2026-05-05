import React from 'react';
import { Compass } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center">
              <Compass className="h-8 w-8 text-indigo-400" />
              <span className="ml-2 text-xl font-bold">TravelAI</span>
            </div>
            <p className="mt-2 text-sm text-gray-300">
              Your AI-powered travel companion. Plan, explore, and experience the world like never before.
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-200 tracking-wider uppercase"></h3>
            <ul className="mt-4 space-y-4">
              {/* <li><a href="#" className="text-base text-gray-300 hover:text-white">Trip Planning</a></li>
              <li><a href="#" className="text-base text-gray-300 hover:text-white">Geo-Guide</a></li>
              <li><a href="#" className="text-base text-gray-300 hover:text-white">AR Immersion</a></li>
              <li><a href="#" className="text-base text-gray-300 hover:text-white">Virtual Agent</a></li> */}
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-200 tracking-wider uppercase"></h3>
            <ul className="mt-4 space-y-4">
              {/* <li><a href="#" className="text-base text-gray-300 hover:text-white">About</a></li>
              <li><a href="#" className="text-base text-gray-300 hover:text-white">Blog</a></li>
              <li><a href="#" className="text-base text-gray-300 hover:text-white">Careers</a></li>
              <li><a href="#" className="text-base text-gray-300 hover:text-white">Contact</a></li> */}
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-200 tracking-wider uppercase"></h3>
            <div className="flex space-x-6 mt-4">
              {/* <a href="#" className="text-gray-400 hover:text-white">
                <Facebook className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Twitter className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Instagram className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Mail className="h-6 w-6" />
              </a> */}
            </div>
          </div>
        </div>
        
        <div className="mt-8 border-t border-gray-700 pt-8 md:flex md:items-center md:justify-between">
          <div className="flex space-x-6 md:order-2">
            {/* <a href="#" className="text-gray-400 hover:text-gray-300">Privacy</a>
            <a href="#" className="text-gray-400 hover:text-gray-300">Terms</a> */}
          </div>
          <p className="mt-8 text-base text-gray-400 md:mt-0 md:order-1">
          TEAM ~ SAKSHAM  &copy; 2025 . All rights reserved[Made at IIIT Sricity].
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;