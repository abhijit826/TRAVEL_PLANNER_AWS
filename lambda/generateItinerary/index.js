const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const axios = require('axios');

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'ap-south-1' });

// Amazon Nova Pro — available natively in ap-south-1, no marketplace/payment needed!
// Options: amazon.nova-micro-v1:0 | amazon.nova-lite-v1:0 | amazon.nova-pro-v1:0
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'amazon.nova-pro-v1:0';

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
            temperature: Math.round(item.main.temp),
            condition: item.weather[0].main,
            rainProbability: item.rain ? Math.round((item.rain['3h'] || 0) * 10) : 0,
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

// ── Smart Bedrock Invoker — auto-detects format by model prefix ───────────────
const invokeModel = async (modelId, prompt) => {
  let body;

  if (modelId.startsWith('anthropic.')) {
    body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });
  } else if (modelId.includes('nova')) {
    // Amazon Nova (direct: amazon.nova-pro-v1:0 OR inference profile: ap.amazon.nova-pro-v1:0)
    body = JSON.stringify({
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: {
        max_new_tokens: 4096,
        temperature: 0.7,
        top_p: 0.9,
      },
    });
  } else if (modelId.includes('titan')) {
    body = JSON.stringify({
      inputText: prompt,
      textGenerationConfig: { maxTokenCount: 4096, temperature: 0.7, topP: 0.9 },
    });
  } else if (modelId.includes('llama')) {
    body = JSON.stringify({ prompt, max_gen_len: 2048, temperature: 0.7 });
  } else {
    throw new Error(`Unsupported model: ${modelId}`);
  }

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body,
  });

  const response = await bedrock.send(command);
  const decoded = JSON.parse(Buffer.from(response.body).toString('utf-8'));

  if (modelId.startsWith('anthropic.'))   return decoded.content[0].text;
  if (modelId.includes('nova'))            return decoded.output.message.content[0].text;
  if (modelId.includes('titan'))           return decoded.results[0].outputText;
  if (modelId.includes('llama'))           return decoded.generation;
};

// ── Lambda Handler ────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  let preferences;
  try {
    preferences = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ message: 'Invalid JSON body' }) };
  }

  const { origin, destination, maxPrice, departureDate, duration } = preferences;
  if (!origin || !destination || !maxPrice || !departureDate || !duration) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Missing required fields' }),
    };
  }

  try {
    const { crowdLevel, durationDays } = estimateCrowdLevel(departureDate, duration);
    const weatherData = await getWeatherForecast(destination, departureDate, durationDays);

    if (!weatherData) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ message: 'Failed to fetch weather data. Check OPENWEATHERMAP_API_KEY.' }),
      };
    }

    const weatherSummary = weatherData
      .map((w) => `${w.date}: ${w.temperature}°F, ${w.condition}, ${w.rainProbability}% rain`)
      .join('; ');

    const prompt = `You are an expert travel planner. Generate a detailed travel itinerary as valid JSON only (no markdown, no explanation, just raw JSON).

Trip details:
- From: ${origin}
- To: ${destination}
- Budget: $${maxPrice} USD total
- Departure: ${departureDate}
- Duration: ${duration} (${durationDays} days)
- Travel companions: ${preferences.companions || 'not specified'}
- Crowd level: ${crowdLevel}
- Weather forecast: ${weatherSummary}

Rules:
- Avoid outdoor activities if rain probability > 50%
- Avoid outdoor activities if temperature < 32°F or > 95°F
- Keep total costs within the $${maxPrice} budget
- Include realistic activity costs

Return ONLY this JSON structure (no markdown fences, no extra text):
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
      "weather": {
        "temperature": number,
        "condition": "string",
        "rainProbability": number
      },
      "activities": [
        {
          "time": "HH:MM AM/PM",
          "description": "string",
          "location": "string",
          "cost": number
        }
      ]
    }
  ]
}`;

    const rawText = await invokeModel(MODEL_ID, prompt);

    let itinerary;
    try {
      const clean = rawText.replace(/```json\n?|\n?```/g, '').trim();
      itinerary = JSON.parse(clean);
    } catch {
      console.warn('Could not parse JSON — returning raw text');
      itinerary = { rawText };
    }

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
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: error.message }),
    };
  }
};
