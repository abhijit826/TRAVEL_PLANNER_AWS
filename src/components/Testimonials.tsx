import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface Testimonial { name: string; role: string; image: string; quote: string; }
const testimonials: Testimonial[] = [
  // {
  //   name: 'Sarah Johnson',
  //   role: 'Adventure Traveler',
  //   image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  //   quote: 'TravelAI transformed how I plan my adventures. The personalized itineraries are spot-on, and the AR features helped me discover hidden gems I would have missed otherwise.',
  // },
  // {
  //   name: 'Michael Chen',
  //   role: 'Business Traveler',
  //   image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  //   quote: 'As someone who travels frequently for work, the digital wallet feature has been a game-changer. Having all my documents securely stored and easily accessible saves me so much time.',
  // },
  // {
  //   name: 'Elena Rodriguez',
  //   role: 'Family Vacation Planner',
  //   image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  //   quote: 'Planning family trips used to be stressful, but TravelAI makes it fun! The AI suggestions are perfect for keeping both kids and adults entertained, and the budget planning is incredibly helpful.',
  // },
];

const Testimonials: React.FC = () => {
  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* <h2 className="text-base font-semibold text-indigo-600 tracking-wide uppercase">Testimonials</h2>
          <p className="mt-1 text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Travelers love TravelAI
          </p>
          <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
            See what our users have to say about their experiences with our AI-powered travel platform.
          </p> */}
        </div>
        <div className="mt-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                className="bg-gray-50 rounded-lg shadow-md overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
              >
                <div className="px-6 py-8">
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6">"{testimonial.quote}"</p>
                  <div className="flex items-center">
                    <img className="h-12 w-12 rounded-full" src={testimonial.image} alt={testimonial.name} />
                    <div className="ml-4">
                      <h4 className="text-lg font-bold text-gray-900">{testimonial.name}</h4>
                      <p className="text-gray-600">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;