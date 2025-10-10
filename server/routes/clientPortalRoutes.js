const express = require('express');
const router = express.Router();
const { getMyDashboard } = require('../controllers/clientPortalController');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/portal/me
// @desc    Get logged-in client's data
// @access  Private
router.get('/me', protect, getMyDashboard);

module.exports = router;