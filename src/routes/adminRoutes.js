const express = require('express');
const multer = require('multer');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/authorize');

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files (.csv) are allowed for cost imports.'));
    }
  }
});

router.use(requireAuth, authorizeRoles('admin'));

router.get('/dashboard', adminController.renderDashboard);

router.get('/destinations', adminController.renderDestinations);
router.post('/destinations', adminController.createDestination);
router.post('/destinations/:id/update', adminController.updateDestination);
router.post('/destinations/:id/delete', adminController.deleteDestination);
router.post('/attractions', adminController.createAttraction);
router.post('/attractions/:id/delete', adminController.deleteAttraction);

router.get('/transport', adminController.renderTransport);
router.post('/transport', adminController.createTransport);
router.post('/transport/:id/update', adminController.updateTransport);
router.post('/transport/:id/delete', adminController.deleteTransport);

router.get('/hotels', adminController.renderHotels);
router.post('/hotels', adminController.createHotel);
router.post('/hotels/:id/delete', adminController.deleteHotel);
router.post('/rooms', adminController.createRoomType);
router.post('/rooms/:id/update', adminController.updateRoomType);
router.post('/rooms/:id/delete', adminController.deleteRoomType);

router.get('/expenses', adminController.renderExpenses);
router.post('/expenses/food', adminController.upsertFoodCost);
router.post('/expenses/food/:id/delete', adminController.deleteFoodCost);
router.post('/expenses/additional', adminController.createAdditionalExpense);
router.post('/expenses/additional/:id/delete', adminController.deleteAdditionalExpense);
router.post('/packages', adminController.createTourPackage);
router.post('/packages/:id/delete', adminController.deleteTourPackage);

router.get('/users', adminController.renderUsers);
router.post('/users/:id/status', adminController.updateUserStatus);
router.post('/agents/:agentProfileId/verify', adminController.verifyAgent);

router.get('/bookings', adminController.renderBookings);

router.get('/csv/export/:type', adminController.exportCostCSV);
router.post('/csv/import/:type', csvUpload.single('csv_file'), adminController.importCostCSV);

module.exports = router;
