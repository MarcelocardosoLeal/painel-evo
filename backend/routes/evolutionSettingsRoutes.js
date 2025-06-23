const express = require('express');
const router = express.Router();
const { getEvolutionSettings, upsertEvolutionSettings } = require('../controllers/evolutionSettingsController');
const { protect, superAdmin } = require('../middlewares/authMiddleware');

// @route   GET /api/evolution-settings
// @desc    Get Evolution API settings (global)
// @access  Private (All authenticated users)
router.get('/', protect, getEvolutionSettings);

// @route   POST /api/evolution-settings
// @desc    Create or Update Evolution API settings (global)
// @access  Private (Super Admin only)
router.post('/', protect, superAdmin, upsertEvolutionSettings);

module.exports = router;