const express = require('express');
const router = express.Router();
const bomController = require('../controllers/bomController');
const { verifyJWT } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  createBomSchema,
  updateBomSchema,
} = require('../validators/bomValidator');

// All routes require authentication
router.use(verifyJWT);

// GET /bom — paginated list, filter by productId query param
router.get('/', bomController.getAll);

// GET /bom/:id — full BoM with components and operations
router.get('/:id', bomController.getById);

// POST /bom — create BoM for ACTIVE product only (ADMIN, ENGINEER)
router.post(
  '/',
  authorizeRoles('ADMIN', 'ENGINEER'),
  validate(createBomSchema),
  bomController.create
);

// PUT /bom/:id — update DRAFT BoM only (ADMIN, ENGINEER)
router.put(
  '/:id',
  authorizeRoles('ADMIN', 'ENGINEER'),
  validate(updateBomSchema),
  bomController.update
);

// DELETE /bom/:id — soft delete DRAFT only (ADMIN)
router.delete('/:id', authorizeRoles('ADMIN'), bomController.softDelete);

// POST /bom/:id/activate — DRAFT → ACTIVE (ADMIN)
router.post('/:id/activate', authorizeRoles('ADMIN'), bomController.activate);

// GET /bom/:id/diff/:compareId — structured diff (DiffEntry[])
router.get('/:id/diff/:compareId', bomController.getDiff);

module.exports = router;
