const bomService = require('../services/bomService');
const ApiResponse = require('../utils/ApiResponse');

// ──────────────────────────────────────────────────
// GET /bom
// ──────────────────────────────────────────────────
const getAll = async (req, res) => {
  const { productId, status, page, limit } = req.query;
  const result = await bomService.getAll({
    productId,
    status,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    userRole: req.user.role,
  });
  new ApiResponse(res, 200, 'BoMs fetched successfully', result);
};

// ──────────────────────────────────────────────────
// GET /bom/:id
// ──────────────────────────────────────────────────
const getById = async (req, res) => {
  const bom = await bomService.getById(req.params.id, req.user.role);
  new ApiResponse(res, 200, 'BoM fetched successfully', bom);
};

// ──────────────────────────────────────────────────
// POST /bom
// ──────────────────────────────────────────────────
const create = async (req, res) => {
  const { productId, components, operations } = req.body;
  const bom = await bomService.create({
    productId,
    components,
    operations,
    userId: req.user._id,
  });
  new ApiResponse(res, 201, 'BoM created successfully', bom);
};

// ──────────────────────────────────────────────────
// PUT /bom/:id
// ──────────────────────────────────────────────────
const update = async (req, res) => {
  const bom = await bomService.update(req.params.id, req.body, req.user._id);
  new ApiResponse(res, 200, 'BoM updated successfully', bom);
};

// ──────────────────────────────────────────────────
// DELETE /bom/:id (soft delete)
// ──────────────────────────────────────────────────
const softDelete = async (req, res) => {
  await bomService.softDelete(req.params.id, req.user._id);
  new ApiResponse(res, 200, 'BoM deleted successfully');
};

// ──────────────────────────────────────────────────
// POST /bom/:id/activate
// ──────────────────────────────────────────────────
const activate = async (req, res) => {
  const bom = await bomService.activate(req.params.id, req.user._id);
  new ApiResponse(res, 200, 'BoM activated successfully', bom);
};

// ──────────────────────────────────────────────────
// GET /bom/:id/diff/:compareId
// ──────────────────────────────────────────────────
const getDiff = async (req, res) => {
  const result = await bomService.getDiff(req.params.id, req.params.compareId);
  new ApiResponse(res, 200, 'BoM diff computed successfully', result);
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
