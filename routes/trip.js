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

    const { destination, duration, budget, companions, activities, baseCurrency, expenses, predictions } = req.body;
    const updates = {};
    if (destination !== undefined) updates.destination = destination;
    if (duration !== undefined) updates.duration = duration;
    if (budget !== undefined) updates.budget = budget;
    if (companions !== undefined) updates.companions = companions;
    if (activities !== undefined) updates.activities = activities;
    if (baseCurrency !== undefined) updates.baseCurrency = baseCurrency;
    if (expenses !== undefined) updates.expenses = expenses;
    if (predictions !== undefined) updates.predictions = predictions;

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

module.exports = router;