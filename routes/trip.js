const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const PDFDocument = require('pdfkit');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

// Validate required trip fields
const validateTrip = (req, res, next) => {
  const { destination, duration, budget, companions, activities } = req.body;
  if (!destination || !duration || !budget || !companions || !activities) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  next();
};

// ── POST /api/trips ───────────────────────────────────────────────────────────
router.post('/trips', validateTrip, async (req, res) => {
  try {
    const trip = await Trip.create({
      userId: req.user.userId, // from protect middleware
      destination: req.body.destination,
      duration: req.body.duration,
      budget: req.body.budget,
      companions: req.body.companions,
      activities: req.body.activities,
    });
    res.status(201).json(trip);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── GET /api/users/:userId/trips ──────────────────────────────────────────────
router.get('/users/:userId/trips', async (req, res) => {
  try {
    const trips = await Trip.findByUserId(req.params.userId);
    res.json(trips);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── DELETE /api/trips/:id ─────────────────────────────────────────────────────
router.delete('/trips/:id', async (req, res) => {
  try {
    const deleted = await Trip.findByIdAndDelete(req.user.userId, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Trip not found' });
    res.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── GET /api/trips/:id/pdf ────────────────────────────────────────────────────
router.get('/trips/:id/pdf', async (req, res) => {
  try {
    const trip = await Trip.findById(req.user.userId, req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const doc = new PDFDocument();
    res.setHeader('Content-Disposition', 'attachment; filename="trip-details.pdf"');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(20).text(`Trip Details: ${trip.destination}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Duration: ${trip.duration}`);
    doc.text(`Budget: $${trip.budget}`);
    doc.text(`Companions: ${trip.companions}`);
    doc.text('Activities:');
    trip.activities.forEach((activity) => doc.text(`  - ${activity}`));
    doc.end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'apac.amazon.nova-pro-v1:0';

// ── PUT /api/trips/:id ──────────────────────────────────────────────────────────
router.put('/trips/:id', async (req, res) => {
  try {
    const trip = await Trip.findById(req.user.userId, req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const { destination, duration, budget, companions, activities, baseCurrency, expenses, predictions, packingList } = req.body;
    const updates = {};
    if (destination !== undefined) updates.destination = destination;
    if (duration !== undefined) updates.duration = duration;
    if (budget !== undefined) updates.budget = budget;
    if (companions !== undefined) updates.companions = companions;
    if (activities !== undefined) updates.activities = activities;
    if (baseCurrency !== undefined) updates.baseCurrency = baseCurrency;
    if (expenses !== undefined) updates.expenses = expenses;
    if (predictions !== undefined) updates.predictions = predictions;
    if (packingList !== undefined) updates.packingList = packingList;

    const updatedTrip = await Trip.update(req.user.userId, req.params.id, updates);
    res.json(updatedTrip);
  } catch (error) {
    console.error('Update trip error:', error);
    res.status(400).json({ error: error.message });
  }
});

// ── POST /api/trips/:id/optimize ──────────────────────────────────────────────
router.post('/trips/:id/optimize', async (req, res) => {
  try {
    const trip = await Trip.findById(req.user.userId, req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const expensesList = trip.expenses || [];
    const baseCurrency = trip.baseCurrency || 'USD';
    const totalSpent = expensesList.reduce((sum, exp) => sum + (Number(exp.convertedAmount) || 0), 0);

    const systemPrompt = `You are the "AI Budget Optimizer" for the TravelAI application.
Analyze the user's trip details and their logged expenses. Provide:
1. An expense prediction: estimate how much they will spend on this trip based on destination, companions, duration, and current spending pace.
2. Actionable savings recommendations: 3-4 specific ways to save money based on their categories and logged expenses.
3. Budget alerts/warnings: point out if they are overspending in any category, or pacing to exceed their budget.

You MUST respond strictly with a valid JSON object matching the following structure. Do NOT include markdown code blocks, backticks, or any conversational text outside of the JSON object:
{
  "prediction": "General prediction summary...",
  "predictedTotal": 1200,
  "categoryBreakdown": {
    "Accommodation": 400,
    "Food": 300,
    "Transport": 200,
    "Activities": 150,
    "Shopping": 100,
    "Misc": 50
  },
  "recommendations": [
    "Specific savings tip 1...",
    "Specific savings tip 2..."
  ],
  "alerts": [
    "Alert 1...",
    "Alert 2..."
  ]
}`;

    const userMessage = `Trip Details:
Destination: ${trip.destination}
Duration: ${trip.duration}
Budget Limit: ${trip.budget} ${baseCurrency}
Companions: ${trip.companions}
Planned Activities: ${trip.activities ? trip.activities.join(', ') : 'None'}

Logged Expenses:
${expensesList.length === 0 ? 'No expenses logged yet.' : expensesList.map(exp => `- [${exp.category}] ${exp.description}: ${exp.amount} ${exp.currency} (Converted: ${exp.convertedAmount} ${baseCurrency}) on ${exp.date}`).join('\n')}

Total Spent So Far: ${totalSpent} ${baseCurrency}`;

    const body = JSON.stringify({
      system: [{ text: systemPrompt }],
      messages: [{
        role: 'user',
        content: [{ text: userMessage }]
      }],
      inferenceConfig: {
        max_new_tokens: 2048,
        temperature: 0.5,
      },
    });

    console.log(`🤖 [${new Date().toISOString()}] [Bedrock Request] Invoking model: ${MODEL_ID}`);
    console.log(`   System Prompt Length: ${systemPrompt.length} chars`);
    console.log(`   User Message Length: ${userMessage.length} chars`);
    console.log(`   Payload:`, body);

    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body,
    });

    const startTime = Date.now();
    const response = await bedrock.send(command);
    const duration = Date.now() - startTime;
    const decoded = JSON.parse(Buffer.from(response.body).toString('utf-8'));
    const responseText = decoded.output.message.content[0].text.trim();

    console.log(`✅ [${new Date().toISOString()}] [Bedrock Response] Succeeded in ${duration}ms`);
    console.log(`   Response Text:`, responseText);

    let parsedData;
    try {
      let cleanText = responseText;
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      }
      parsedData = JSON.parse(cleanText);
    } catch (parseError) {
      console.warn('Failed to parse Bedrock JSON response:', responseText);
      parsedData = {
        prediction: responseText,
        predictedTotal: Number(trip.budget) || 1000,
        categoryBreakdown: { Accommodation: 0, Food: 0, Transport: 0, Activities: 0, Shopping: 0, Misc: 0 },
        recommendations: ["Review your expense categories to find savings opportunities."],
        alerts: ["Could not format AI warnings."]
      };
    }

    await Trip.update(req.user.userId, req.params.id, { predictions: parsedData });

    res.json(parsedData);
  } catch (error) {
    console.error('Optimize budget error:', error);
    res.status(500).json({ error: 'Failed to optimize budget', details: error.message });
  }
});

// ── POST /api/trips/:id/packing/generate ─────────────────────────────────────────
router.post('/trips/:id/packing/generate', async (req, res) => {
  try {
    const trip = await Trip.findById(req.user.userId, req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const { transitMode, baggageOption, weather } = req.body;

    const systemPrompt = `You are the "AI Packing Assistant" for the TravelAI application.
Generate a comprehensive travel packing checklist based on the destination, duration, weather, companions, activities, transit mode, and baggage rules.

Include transit-specific tips:
- For Flights: Liquid limitations (3-1-1 rule), carry-on vs checked baggage security advice.
- For Trains: Luggage storage security (e.g. securing bags to overhead racks, anti-theft locks), easy access to tickets/ID, snacking options.
- For Buses: Under-bus compartment safety, keeping valuables in a daypack, motion sickness.
- For Cars: Road trip essentials, emergency kits, accessibility of items.

Also, add category-specific checklists. You MUST respond strictly with a valid JSON object matching the following structure. Do NOT include markdown code blocks, backticks, or any conversational text outside of the JSON object:
{
  "categories": [
    {
      "name": "Clothing",
      "items": [
        { "id": "item1", "name": "5x T-shirts", "packed": false },
        { "id": "item2", "name": "2x Jeans", "packed": false }
      ]
    },
    {
      "name": "Toiletries",
      "items": [
        { "id": "item3", "name": "Toothbrush & Toothpaste", "packed": false }
      ]
    },
    {
      "name": "Documents & Money",
      "items": [
        { "id": "item4", "name": "Passport / ID card", "packed": false }
      ]
    },
    {
      "name": "Electronics",
      "items": [
        { "id": "item5", "name": "Phone charger", "packed": false }
      ]
    },
    {
      "name": "Transit Essentials",
      "items": [
        { "id": "item6", "name": "Noise-cancelling headphones", "packed": false }
      ]
    }
  ],
  "baggageRulesSummary": "Summary of rules or advice for the selected transit mode and baggage limit.",
  "transitTips": [
    "Specific tip 1...",
    "Specific tip 2..."
  ]
}`;

    const userMessage = `Trip Details:
Destination: ${trip.destination}
Duration: ${trip.duration}
Companions: ${trip.companions}
Planned Activities: ${trip.activities ? trip.activities.join(', ') : 'None'}

Packing Preferences:
Transit Mode: ${transitMode || 'Not specified'}
Baggage Option: ${baggageOption || 'Not specified'}
Expected Weather: ${weather || 'Not specified'}`;

    const body = JSON.stringify({
      system: [{ text: systemPrompt }],
      messages: [{
        role: 'user',
        content: [{ text: userMessage }]
      }],
      inferenceConfig: {
        max_new_tokens: 2048,
        temperature: 0.5,
      },
    });

    console.log(`🤖 [${new Date().toISOString()}] [Bedrock Request] Invoking model for packing assistant: ${MODEL_ID}`);
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body,
    });

    const response = await bedrock.send(command);
    const decoded = JSON.parse(Buffer.from(response.body).toString('utf-8'));
    const responseText = decoded.output.message.content[0].text.trim();

    let parsedData;
    try {
      let cleanText = responseText;
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      }
      parsedData = JSON.parse(cleanText);
    } catch (parseError) {
      console.warn('Failed to parse Bedrock JSON response for packing:', responseText);
      parsedData = {
        categories: [
          {
            name: "Clothing",
            items: [{ id: "c1", name: "Shirts & Pants", packed: false }]
          },
          {
            name: "Toiletries",
            items: [{ id: "t1", name: "Basic toiletries kit", packed: false }]
          },
          {
            name: "Documents & Money",
            items: [{ id: "d1", name: "ID & Tickets", packed: false }]
          }
        ],
        baggageRulesSummary: "No specific rules found. Please check with your travel operator.",
        transitTips: ["Keep your valuables secure and close at all times."]
      };
    }

    // Ensure all items have unique IDs
    if (parsedData.categories) {
      parsedData.categories = parsedData.categories.map((cat, catIdx) => ({
        ...cat,
        items: (cat.items || []).map((item, itemIdx) => ({
          ...item,
          id: item.id || `item_${catIdx}_${itemIdx}_${Date.now()}`,
          packed: !!item.packed
        }))
      }));
    }

    // Update the trip with the generated packing list
    await Trip.update(req.user.userId, req.params.id, { packingList: parsedData });

    res.json(parsedData);
  } catch (error) {
    console.error('Generate packing checklist error:', error);
    res.status(500).json({ error: 'Failed to generate packing list', details: error.message });
  }
});

module.exports = router;