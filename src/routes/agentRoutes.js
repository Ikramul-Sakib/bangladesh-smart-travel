const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { requireAuth } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/authorize');

router.get('/agents', agentController.renderAgentDirectory);
router.get('/agents/:id', agentController.renderAgentProfile);

router.get('/agent/dashboard', requireAuth, authorizeRoles('agent'), agentController.renderAgentDashboard);
router.post('/agent/profile', requireAuth, authorizeRoles('agent'), agentController.updateProfile);
router.post('/agent/destinations', requireAuth, authorizeRoles('agent'), agentController.addDestination);
router.post('/agent/destinations/:id/delete', requireAuth, authorizeRoles('agent'), agentController.removeDestination);
router.post('/agent/availabilities', requireAuth, authorizeRoles('agent'), agentController.addAvailability);
router.post('/agent/availabilities/:id/delete', requireAuth, authorizeRoles('agent'), agentController.deleteAvailability);
router.post('/agent/packages', requireAuth, authorizeRoles('agent'), agentController.createPackage);
router.post('/agent/packages/:id/delete', requireAuth, authorizeRoles('agent'), agentController.deletePackage);

module.exports = router;
