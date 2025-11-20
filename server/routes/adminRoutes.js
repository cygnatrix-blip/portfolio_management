const express = require('express');
const router = express.Router();
const { 
    getAdminDashboard,
    getAllInvestors,
    createInvestor,
    resetInvestorPassword,
    deleteInvestor
} = require('../controllers/adminController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// All routes in this file are for ADMINS ONLY
router.use(protect, isAdmin);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard stats (total users)
router.get('/dashboard', getAdminDashboard);

// @route   GET /api/admin/users
// @desc    Get a list of all investors
router.get('/users', getAllInvestors);

// @route   POST /api/admin/users
// @desc    Admin creates a new investor
router.post('/users', createInvestor);

// @route   PUT /api/admin/users/reset-password
// @desc    Admin resets an investor's password
router.put('/users/reset-password', resetInvestorPassword);

// @route   DELETE /api/admin/users/:id
// @desc    Admin deletes an investor (and all their data)
router.delete('/users/:id', deleteInvestor);

module.exports = router;