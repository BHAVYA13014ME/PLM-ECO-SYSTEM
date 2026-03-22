const productService = require('../services/productService');
const ApiResponse = require('../utils/ApiResponse');

// ──────────────────────────────────────────────────
// GET /products
// ──────────────────────────────────────────────────
const getAll = async (req, res) => {
  const { status, search, page, limit } = req.query;
  const result = await productService.getAll({
    status,
    search,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    userRole: req.user.role,
  });
  new ApiResponse(res, 200, 'Products fetched successfully', result);
};

// ──────────────────────────────────────────────────
// GET /products/:id
// ──────────────────────────────────────────────────
const getById = async (req, res) => {
  const product = await productService.getById(req.params.id, req.user.role);
  new ApiResponse(res, 200, 'Product fetched successfully', product);
};

// ──────────────────────────────────────────────────
// POST /products
// ──────────────────────────────────────────────────
const create = async (req, res) => {
  const { name, description, salePrice, costPrice, sku, attachments } = req.body;
  const product = await productService.create({
    name,
    description,
    salePrice,
    costPrice,
    sku,
    attachments,
    userId: req.user._id,
  });
  new ApiResponse(res, 201, 'Product created successfully', product);
};

// ──────────────────────────────────────────────────
// PUT /products/:id
// ──────────────────────────────────────────────────
const update = async (req, res) => {
  const product = await productService.update(req.params.id, req.body, req.user._id);
  new ApiResponse(res, 200, 'Product updated successfully', product);
};

// ──────────────────────────────────────────────────
// DELETE /products/:id (soft delete)
// ──────────────────────────────────────────────────
const softDelete = async (req, res) => {
  await productService.softDelete(req.params.id, req.user._id);
  new ApiResponse(res, 200, 'Product deleted successfully');
};

// ──────────────────────────────────────────────────
// POST /products/:id/activate
// ──────────────────────────────────────────────────
const activate = async (req, res) => {
  const product = await productService.activate(req.params.id, req.user._id);
  new ApiResponse(res, 200, 'Product activated successfully', product);
};

// ──────────────────────────────────────────────────
// GET /products/:id/diff/:compareId
// ──────────────────────────────────────────────────
const getDiff = async (req, res) => {
  const result = await productService.getDiff(req.params.id, req.params.compareId);
  new ApiResponse(res, 200, 'Product diff computed successfully', result);
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  softDelete,
  activate,
  getDiff,
};
