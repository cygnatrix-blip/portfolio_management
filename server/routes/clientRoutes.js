const express = require('express');
const router = express.Router();

// Import all five functions from the controller
const {
  getAllClients,
  createClient,
  clientDeposit,
  clientWithdrawal,
  getClientById 
} = require('../controllers/clientController');

// @route   GET /api/clients
// @desc    Get a list of all clients
router.get('/', getAllClients);

// @route   POST /api/clients
// @desc    Create a new client (for admin use)
router.post('/', createClient);

// @route   POST /api/clients/deposit
// @desc    Log a new deposit for a client
router.post('/deposit', clientDeposit);

// @route   POST /api/clients/withdraw
// @desc    Log a new withdrawal for a client
router.post('/withdraw', clientWithdrawal);

// @route   GET /api/clients/:id
// @desc    Get a single client's details by their ID
// IMPORTANT: This route must be last to avoid conflicts with other routes like /deposit
router.get('/:id', getClientById);

module.exports = router;

