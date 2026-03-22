const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyJWT } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  createProductSchema,
  updateProductSchema,
} = require('../validators/productValidator');

// All routes require authentication
router.use(verifyJWT);

// GET /products — paginated, filtered list
router.get('/', productController.getAll);

// GET /products/:id — single product
router.get('/:id', productController.getById);

// POST /products — create DRAFT product (ADMIN, ENGINEER)
router.post(
  '/',
  authorizeRoles('ADMIN', 'ENGINEER'),
  validate(createProductSchema),
  productController.create
);

// PUT /products/:id — update DRAFT only (ADMIN, ENGINEER)
router.put(
  '/:id',
  authorizeRoles('ADMIN', 'ENGINEER'),
  validate(updateProductSchema),
  productController.update
);

// DELETE /products/:id — soft delete DRAFT only (ADMIN)
router.delete('/:id', authorizeRoles('ADMIN'), productController.softDelete);

// POST /products/:id/activate — DRAFT → ACTIVE (ADMIN)
router.post('/:id/activate', authorizeRoles('ADMIN'), productController.activate);

// GET /products/:id/diff/:compareId — structured diff (DiffEntry[])
router.get('/:id/diff/:compareId', productController.getDiff);

module.exports = router;
