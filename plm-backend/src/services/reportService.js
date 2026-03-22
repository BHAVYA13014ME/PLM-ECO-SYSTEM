const AuditLog = require('../models/AuditLog');
const ECO = require('../models/ECO');
const Product = require('../models/Product');
const BoM = require('../models/BoM');
const Archive = require('../models/Archive');

/**
 * reportService — Handles analytics, timelines, and audit queries using Aggregation.
 */

// ──────────────────────────────────────────────────
// 1. GET /reports/eco-summary — Dashboard aggregation
// ──────────────────────────────────────────────────
const getEcoSummary = async () => {
  const result = await ECO.aggregate([
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byType: [{ $group: { _id: '$ecoType', count: { $sum: 1 } } }],
        total: [{ $count: 'count' }],
        recent: [
          { $sort: { createdAt: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'products',
              localField: 'targetProductId',
              foreignField: '_id',
              as: 'product',
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              as: 'creator',
            },
          },
        ],
      },
    },
  ]);

  const facet = result[0];
  return {
    total: facet.total.length > 0 ? facet.total[0].count : 0,
    byStatus: facet.byStatus.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
    byType: facet.byType.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
    recentECOs: facet.recent,
  };
};

// ──────────────────────────────────────────────────
// 2. GET /reports/eco-list — Paginated ECO report table
// ──────────────────────────────────────────────────
const getEcoList = async ({ dateFrom, dateTo, status, ecoType, productId, page = 1, limit = 20 }) => {
  const match = {};
  if (status) match.status = status;
  if (ecoType) match.ecoType = ecoType;
  if (productId) match.targetProductId = new (require('mongoose').Types.ObjectId)(productId);

  if (dateFrom || dateTo) {
    match.createdAt = {};
    if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
    if (dateTo) match.createdAt.$lte = new Date(dateTo);
  }

  const skip = (page - 1) * limit;

  const pipeline = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'products',
        localField: 'targetProductId',
        foreignField: '_id',
        as: 'productDetails',
      },
    },
    { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'ecostages',
        localField: 'stage',
        foreignField: '_id',
        as: 'stageDetails',
      },
    },
    { $unwind: { path: '$stageDetails', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'creatorDetails',
      },
    },
    { $unwind: { path: '$creatorDetails', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        ecoTitle: '$title',
        ecoType: 1,
        productName: '$productDetails.name',
        currentStage: '$stageDetails.name',
        status: 1,
        createdBy: '$creatorDetails.name',
        createdAt: 1,
        appliedAt: 1,
      },
    },
  ];

  const countPipeline = [{ $match: match }, { $count: 'count' }];

  const [ecos, countResult] = await Promise.all([
    ECO.aggregate(pipeline),
    ECO.aggregate(countPipeline),
  ]);

  const total = countResult.length > 0 ? countResult[0].count : 0;

  return { ecos, total, page: Number(page), totalPages: Math.ceil(total / limit) };
};

// ──────────────────────────────────────────────────
// 3. GET /reports/product-version-history/:productId
// ──────────────────────────────────────────────────
const getProductVersionHistory = async (productId) => {
  // Query 1: Archival versions
  const archives = await Archive.find({ originalEntityId: productId, entityType: 'PRODUCT' })
    .populate('archivedByEcoId', 'title')
    .sort({ version: -1 })
    .lean();

  // Query 2: Active version
  const activeProduct = await Product.findById(productId).lean();
  let currentVersion = null;
  if (activeProduct) {
    currentVersion = {
      version: activeProduct.version,
      status: activeProduct.status,
      createdAt: activeProduct.createdAt,
      archivedByEcoId: null, // Because it's currently active
      data: activeProduct,
    };
  }

  const history = archives.map((a) => ({
    version: a.version,
    status: 'ARCHIVED',
    createdAt: a.createdAt,
    archivedByEcoId: a.archivedByEcoId, // populated
    data: a.snapshotData,
  }));

  if (currentVersion) {
    history.unshift(currentVersion);
  }

  return history;
};

// ──────────────────────────────────────────────────
// 4. GET /reports/bom-change-history/:productId
// ──────────────────────────────────────────────────
const getBomChangeHistory = async (productId) => {
  // We locate all BoMs for this Product.
  const boms = await BoM.find({ productId }).sort({ bomVersion: -1 }).lean();

  const history = boms.map((bom) => ({
    bomVersion: bom.bomVersion,
    productVersion: bom.productVersion,
    componentsCount: bom.components.length,
    operationsCount: bom.operations.length,
    status: bom.status,
    createdAt: bom.createdAt,
  }));

  // Link ECOs if generated via one
  // An ECO created a new version if targetBomId points to a BoM or if targetProductId points to it
  // Actually tracking which ECO made a BoM version is via AuditLogs or Archival
  for (let record of history) {
    const audit = await AuditLog.findOne({
      entityType: 'ECO',
      action: 'ECO_APPLIED',
      'newValue.version': record.bomVersion,
    })
      .populate('entityId', 'title targetBomId targetProductId')
      .lean();

    if (audit && audit.entityId && (String(audit.entityId.targetProductId) === String(productId))) {
      record.ecoTitle = audit.entityId.title;
    } else {
      record.ecoTitle = 'INITIAL/MANUAL';
    }
  }

  return history;
};

// ──────────────────────────────────────────────────
// 5. GET /reports/audit-trail
// ──────────────────────────────────────────────────
const getAuditTrail = async ({ entityType, entityId, action, performedBy, dateFrom, dateTo, page = 1, limit = 20 }) => {
  const filter = {};

  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = entityId;
  if (action) filter.action = action;
  if (performedBy) filter.performedBy = performedBy;

  if (dateFrom || dateTo) {
    filter.timestamp = {};
    if (dateFrom) filter.timestamp.$gte = new Date(dateFrom);
    if (dateTo) filter.timestamp.$lte = new Date(dateTo);
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('performedBy', 'name email')
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    logs,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit),
  };
};

// ──────────────────────────────────────────────────
// 6. GET /reports/active-matrix
// ──────────────────────────────────────────────────
const getActiveMatrix = async () => {
  const result = await Product.aggregate([
    { $match: { status: 'ACTIVE', isDeleted: false } },
    {
      $lookup: {
        from: 'boms',
        localField: '_id',
        foreignField: 'productId',
        pipeline: [{ $match: { status: 'ACTIVE', isDeleted: false } }],
        as: 'activeBom',
      },
    },
    { $unwind: { path: '$activeBom', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        productName: '$name',
        productVersion: '$version',
        sku: 1,
        bomVersion: '$activeBom.bomVersion',
        componentsCount: {
          $size: { $ifNull: ['$activeBom.components', []] },
        },
      },
    },
  ]);

  return result;
};

// ──────────────────────────────────────────────────
// 7. GET /reports/admin-dashboard
// ──────────────────────────────────────────────────
const getAdminDashboard = async () => {
  const [totalProducts, activeProducts, totalBoms, openEcos, recentActivityDocs, ecoPipelineRaw] = await Promise.all([
    Product.countDocuments({ isDeleted: false }),
    Product.countDocuments({ status: 'ACTIVE', isDeleted: false }),
    BoM.countDocuments({ isDeleted: false }),
    ECO.countDocuments({ status: { $in: ['NEW', 'IN_PROGRESS'] } }),
    AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(15)
      .populate('performedBy', 'name role')
      .lean(),
    ECO.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const recentActivity = recentActivityDocs.map(log => ({
    id: log._id,
    action: log.action,
    entityName: log.entityName || 'Unknown',
    user: log.performedBy?.name || (log.action === 'SYSTEM_ERROR' ? 'System' : 'Unknown'),
    timestamp: log.timestamp,
  }));

  const ecoPipeline = { NEW: 0, IN_PROGRESS: 0, APPROVED: 0, REJECTED: 0, DRAFT: 0 };
  ecoPipelineRaw.forEach(item => {
    if (ecoPipeline[item._id] !== undefined) {
      ecoPipeline[item._id] = item.count;
    }
  });

  return {
    metrics: { totalProducts, activeProducts, totalBoms, openEcos },
    recentActivity,
    ecoPipeline,
  };
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
