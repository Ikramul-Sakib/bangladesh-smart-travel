const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireAuth } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/authorize');

// Tourist Booking Flow
router.get('/bookings', requireAuth, authorizeRoles('tourist', 'admin'), bookingController.renderTouristBookings);
router.get('/bookings/new', requireAuth, authorizeRoles('tourist', 'admin'), bookingController.renderNewBookingForm);
router.post('/bookings', requireAuth, authorizeRoles('tourist', 'admin'), bookingController.submitBookingRequest);
router.post('/bookings/:id/review', requireAuth, authorizeRoles('tourist'), bookingController.submitReview);

// Agent / Admin Booking Confirmation & Rejection
router.post('/bookings/:id/status', requireAuth, authorizeRoles('agent', 'admin'), bookingController.updateBookingStatus);

module.exports = router;