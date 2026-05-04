const express = require('express');
const router = express.Router();
const TravelDocument = require('../models/TravelDocument');
const { protect } = require('../middleware/authMiddleware');

// ── GET /api/travel-wallet/documents ─────────────────────────────────────────
router.get('/documents', protect, async (req, res) => {
  try {
    const documents = await TravelDocument.findByUserId(req.user.userId);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/travel-wallet/documents ────────────────────────────────────────
router.post('/documents', protect, async (req, res) => {
  try {
    const document = await TravelDocument.create(req.user.userId, req.body);
    res.status(201).json(document);
  } catch (error) {
    console.error('Error adding document:', error);
    res.status(400).json({ message: 'Failed to add document', error: error.message });
  }
});

// ── PUT /api/travel-wallet/documents/:id ─────────────────────────────────────
router.put('/documents/:id', protect, async (req, res) => {
  try {
    const document = await TravelDocument.findOneAndUpdate(
      req.user.userId,
      req.params.id,
      req.body
    );
    if (!document) return res.status(404).json({ message: 'Document not found' });
    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(400).json({ message: 'Failed to update document', error: error.message });
  }
});

// ── DELETE /api/travel-wallet/documents/:id ───────────────────────────────────
router.delete('/documents/:id', protect, async (req, res) => {
  try {
    const document = await TravelDocument.findOneAndDelete(req.user.userId, req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });
    res.json({ message: 'Document deleted' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;