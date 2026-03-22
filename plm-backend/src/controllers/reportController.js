const reportService = require('../services/reportService');
const ApiResponse = require('../utils/ApiResponse');

// GET /reports/eco-summary
const getEcoSummary = async (req, res) => {
  const result = await reportService.getEcoSummary();
  new ApiResponse(res, 200, 'ECO Summary fetched successfully', result);
};

// GET /reports/eco-list
const getEcoList = async (req, res) => {
  const { dateFrom, dateTo, status, ecoType, productId, page, limit } = req.query;
  const result = await reportService.getEcoList({
    dateFrom,
    dateTo,
    status,
    ecoType,
    productId,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });
  new ApiResponse(res, 200, 'ECO List fetched successfully', result);
};

// GET /reports/product-version-history/:productId
const getProductVersionHistory = async (req, res) => {
  const result = await reportService.getProductVersionHistory(req.params.productId);
  new ApiResponse(res, 200, 'Product Version History fetched successfully', result);
};

// GET /reports/bom-change-history/:productId
const getBomChangeHistory = async (req, res) => {
  const result = await reportService.getBomChangeHistory(req.params.productId);
  new ApiResponse(res, 200, 'BoM Change History fetched successfully', result);
};

// GET /reports/audit-trail
const getAuditTrail = async (req, res) => {
  const { entityType, entityId, action, performedBy, dateFrom, dateTo, page, limit } = req.query;
  const result = await reportService.getAuditTrail({
    entityType,
    entityId,
    action,
    performedBy,
    dateFrom,
    dateTo,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });
  new ApiResponse(res, 200, 'Audit trail fetched successfully', result);
};

// GET /reports/active-matrix
const getActiveMatrix = async (req, res) => {
  const result = await reportService.getActiveMatrix();
  new ApiResponse(res, 200, 'Active Matrix fetched successfully', result);
};

// GET /reports/admin-dashboard
const getAdminDashboard = async (req, res) => {
  const result = await reportService.getAdminDashboard();
  new ApiResponse(res, 200, 'Admin Dashboard fetched successfully', result);
};

module.exports = {
  getEcoSummary,
  getEcoList,
  getProductVersionHistory,
  getBomChangeHistory,
  getAuditTrail,
  getActiveMatrix,
  getAdminDashboard,
};
