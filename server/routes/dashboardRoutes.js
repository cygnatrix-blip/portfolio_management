const express = require('express');
const router = express.Router();
const { getDashboardData } = require('../controllers/dashboardController');

// @route   GET /api/dashboard
router.get('/', getDashboardData);

module.exports = router;