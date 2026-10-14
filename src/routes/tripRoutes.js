const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');

// Public Destination Directory & Details
router.get('/destinations', tripController.renderDestinations);
router.get('/destinations/:slug', tripController.renderDestinationDetails);

// Travel Planning Form & Recommendation Engine
router.get('/trips/plan', tripController.renderPlanForm);
router.get('/trips/recommendations', tripController.generateRecommendations);
router.post('/trips/recommendations', tripController.generateRecommendations);

// Save Itinerary & View Detailed Expense Breakdown
router.post('/trips/save', tripController.savePlan);
router.get('/trips/:id', tripController.renderPlanDetails);

module.exports = router;