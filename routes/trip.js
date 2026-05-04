const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const PDFDocument = require('pdfkit');

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

module.exports = router;