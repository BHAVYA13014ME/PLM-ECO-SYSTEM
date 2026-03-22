const express = require('express');
const router = express.Router();
const ecoService = require('../services/ecoService');
const { verifyJWT } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { createEcoSchema, updateEcoSchema } = require('../validators/ecoValidator');
const ApiResponse = require('../utils/ApiResponse');

// All routes require authentication
router.use(verifyJWT);

// GET /eco — list ECOs
router.get('/', authorizeRoles('ADMIN', 'ENGINEER', 'APPROVER'), async (req, res) => {
  const { status, ecoType, targetProductId, page, limit } = req.query;
  const result = await ecoService.getAll({
    status,
    ecoType,
    targetProductId,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    userId: req.user._id,
    userRole: req.user.role,
  });
  new ApiResponse(res, 200, 'ECOs fetched successfully', result);
});

// GET /eco/:id — single ECO
router.get('/:id', authorizeRoles('ADMIN', 'ENGINEER', 'APPROVER'), async (req, res) => {
  const eco = await ecoService.getById(req.params.id, req.user.role, req.user._id);
  new ApiResponse(res, 200, 'ECO fetched successfully', eco);
});

// POST /eco — create ECO (ADMIN, ENGINEER)
router.post('/', authorizeRoles('ADMIN', 'ENGINEER'), validate(createEcoSchema), async (req, res) => {
  const eco = await ecoService.create({ ...req.body, userId: req.user._id });
  new ApiResponse(res, 201, 'ECO created successfully', eco);
});

// PUT /eco/:id — update ECO (ADMIN, ENGINEER)
router.put('/:id', authorizeRoles('ADMIN', 'ENGINEER'), validate(updateEcoSchema), async (req, res) => {
  const eco = await ecoService.update(req.params.id, req.body, req.user._id);
  new ApiResponse(res, 200, 'ECO updated successfully', eco);
});

// POST /eco/:id/advance — move to next stage (RBAC handled in service)
router.post('/:id/advance', authorizeRoles('ADMIN', 'ENGINEER', 'APPROVER'), async (req, res) => {
  const result = await ecoService.advance(req.params.id, req.user._id, req.user.role);
  new ApiResponse(res, 200, 'ECO advanced successfully', result);
});

// POST /eco/:id/reject — reject ECO (ADMIN, APPROVER)
router.post('/:id/reject', authorizeRoles('ADMIN', 'APPROVER'), async (req, res) => {
  const eco = await ecoService.reject(req.params.id, req.user._id, req.user.role);
  new ApiResponse(res, 200, 'ECO rejected successfully', eco);
});

module.exports = router;
