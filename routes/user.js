const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// ── POST /api/users  (public — create user directly, legacy endpoint) ─────────
router.post('/users', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const user = await User.create({ name, email, password });
    res.status(201).json(user);
  } catch (error) {
    if (error.code === 'DUPLICATE_EMAIL') {
      return res.status(400).json({ error: 'User already exists' });
    }
    res.status(400).json({ error: error.message });
  }
});

// ── GET /api/users/:id  (public — get user by ID) ────────────────────────────
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── GET /api/profile  (protected) ────────────────────────────────────────────
router.get('/profile', protect, async (req, res) => {
  try {
    // req.user is already set by the protect middleware (without password)
    if (!req.user) return res.status(404).json({ message: 'User not found' });
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PATCH /api/profile  (protected) ──────────────────────────────────────────
router.patch('/profile', protect, async (req, res) => {
  const { name, email } = req.body;
  try {
    const updated = await User.update(req.user.userId, { name, email });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;