const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyJWT } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

// All report routes require authentication and specific roles
// OPERATIONS users map to 403 unconditionally for all reporting analytics per specs.
router.use(verifyJWT, authorizeRoles('ADMIN', 'ENGINEER', 'APPROVER'));

// GET /reports/eco-summary
router.get('/eco-summary', reportController.getEcoSummary);

// GET /reports/eco-list
router.get('/eco-list', reportController.getEcoList);

// GET /reports/product-version-history/:productId
router.get('/product-version-history/:productId', reportController.getProductVersionHistory);

// GET /reports/bom-change-history/:productId
router.get('/bom-change-history/:productId', reportController.getBomChangeHistory);

// GET /reports/audit-trail
router.get('/audit-trail', reportController.getAuditTrail);

// GET /reports/active-matrix
router.get('/active-matrix', reportController.getActiveMatrix);

// GET /reports/admin-dashboard
router.get('/admin-dashboard', reportController.getAdminDashboard);

module.exports = router;
