const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/authorize');

router.get('/', homeController.renderHomePage);

// Tourist Dashboard & Profile Management
router.get('/dashboard', requireAuth, authorizeRoles('tourist', 'admin'), authController.renderTouristDashboard);
router.post('/dashboard/profile', requireAuth, authorizeRoles('tourist', 'admin'), authController.updateProfile);

module.exports = router;