const axios = require('axios');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/forecast';

// ── Weather Helper ────────────────────────────────────────────────────────────
const getWeatherForecast = async (city, startDate, durationDays) => {
  try {
    const response = await axios.get(WEATHER_API_URL, {
      params: {
        q: city,
        appid: process.env.OPENWEATHERMAP_API_KEY,
        units: 'imperial',
        cnt: durationDays * 8,
      },
    });

    const forecast = response.data.list
      .filter((item) => new Date(item.dt * 1000).toISOString().split('T')[0] >= startDate)
      .reduce((acc, item) => {
        const date = new Date(item.dt * 1000).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            temperature: item.main.temp,
            condition: item.weather[0].main,
            rainProbability: item.rain ? (item.rain['3h'] ? item.rain['3h'] * 10 : 0) : 0,
          };
        }
        return acc;
      }, {});

    return Object.values(forecast).slice(0, durationDays);
  } catch (error) {
    console.error('Weather fetch error:', error.message);
    return null;
  }
};

// ── Crowd Level Helper ────────────────────────────────────────────────────────
const estimateCrowdLevel = (date, duration) => {
  const dayOfWeek = new Date(date).getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const durationDaysMap = {
    'weekend-getaway-(1-3-days)': 3,
    'short-trip-(4-7-days)': 7,
    'medium-trip-(1-2-weeks)': 14,
    'long-trip-(2+-weeks)': 21,
  };

  return {
    crowdLevel: isWeekend ? 'high' : 'moderate',
    durationDays: durationDaysMap[duration] || 3,
  };
};

// ── Lambda Handler ────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  let preferences;
  try {
    preferences = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Invalid JSON body' }),
    };
  }

  const { origin, destination, maxPrice, departureDate, duration } = preferences;
  if (!origin || !destination || !maxPrice || !departureDate || !duration) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Missing required preferences' }),
    };
  }

  try {
    const { crowdLevel, durationDays } = estimateCrowdLevel(departureDate, duration);
    const weatherData = await getWeatherForecast(destination, departureDate, durationDays);

    if (!weatherData) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ message: 'Failed to fetch weather data' }),
      };
    }

    const prompt = `
      Generate a travel itinerary for a trip from ${origin} to ${destination}
      with a budget of ${maxPrice} dollars, departing on ${departureDate}
      for a duration of ${duration} (${durationDays} days).
      Constraints:
      - Weather: ${weatherData.map(w => `${w.date}: ${w.temperature}°F, ${w.condition}, ${w.rainProbability}% rain`).join('; ')}
      - Avoid outdoor activities if rain > 50% or temp < 32°F or > 90°F
      - Crowd level: ${crowdLevel}
      Return ONLY valid JSON (no markdown fences) with this structure:
      {
        "destination": "string",
        "startDate": "YYYY-MM-DD",
        "durationDays": number,
        "totalCost": number,
        "crowdLevel": "string",
        "dailyPlans": [
          {
            "day": number,
            "date": "YYYY-MM-DD",
            "weather": { "temperature": number, "condition": "string", "rainProbability": number },
            "activities": [{ "time": "string", "description": "string", "location": "string", "cost": number }]
          }
        ]
      }
    `;

    const geminiResponse = await axios.post(
      `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const rawText = geminiResponse.data.candidates[0].content.parts[0].text;
    let itinerary;
    try {
      const clean = rawText.replace(/```json\n?|\n?```/g, '').trim();
      itinerary = JSON.parse(clean);
    } catch {
      itinerary = { rawText };
    }

    // Backfill weather if Gemini didn't include it
    if (itinerary.dailyPlans) {
      itinerary.dailyPlans.forEach((day, i) => {
        if (!day.weather && weatherData[i]) day.weather = weatherData[i];
      });
      itinerary.crowdLevel = itinerary.crowdLevel || crowdLevel;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, itinerary }),
    };
  } catch (error) {
    console.error('Lambda error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: error.message }),
    };
  }
};
