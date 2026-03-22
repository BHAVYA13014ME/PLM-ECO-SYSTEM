const BoM = require('../models/BoM');
const Product = require('../models/Product');
const { createAuditLog } = require('../utils/auditLogger');
const diffService = require('./diffService');

const validateComponentProducts = async (components = []) => {
  const componentProductIds = [...new Set((components || []).map((item) => item.componentProductId).filter(Boolean).map(String))];
  if (componentProductIds.length === 0) {
    return;
  }

  const products = await Product.find({
    _id: { $in: componentProductIds },
    status: 'ACTIVE',
    isDeleted: false,
  })
    .select('_id')
    .lean();

  if (products.length !== componentProductIds.length) {
    throw { code: 400, message: 'All BoM components must reference ACTIVE products.' };
  }
};

/**
 * bomService — Pure business logic for Bills of Materials.
 *
 * No req, res, next — accepts structured input, returns data or throws { code, message }.
 */

// ──────────────────────────────────────────────────
// GET ALL (paginated, filtered by productId)
// ──────────────────────────────────────────────────
const getAll = async ({ productId, status, page = 1, limit = 20, userRole }) => {
  const filter = { isDeleted: false };

  if (productId) {
    filter.productId = productId;
  }

  if (status) {
    filter.status = status;
  }

  // OPERATIONS can only see ACTIVE BoMs
  if (userRole === 'OPERATIONS') {
    filter.status = 'ACTIVE';
  }

  const skip = (page - 1) * limit;

  const [boms, total] = await Promise.all([
    BoM.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('productId', 'name sku status version')
      .populate('components.componentProductId', 'name sku status version')
      .populate('createdBy', 'name email')
      .lean(),
    BoM.countDocuments(filter),
  ]);

  return {
    boms,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit),
  };
};

// ──────────────────────────────────────────────────
// GET BY ID
// ──────────────────────────────────────────────────
const getById = async (id, userRole) => {
  const bom = await BoM.findById(id)
    .populate('productId', 'name sku status version')
    .populate('components.componentProductId', 'name sku status version')
    .populate('createdBy', 'name email')
    .lean();

  if (!bom || bom.isDeleted) {
    throw { code: 404, message: 'BoM not found' };
  }

  if (userRole === 'OPERATIONS' && bom.status !== 'ACTIVE') {
    throw { code: 403, message: 'Access denied' };
  }

  return bom;
};

// ──────────────────────────────────────────────────
// CREATE (for ACTIVE products only)
// ──────────────────────────────────────────────────
const create = async ({ productId, components, operations, userId }) => {
  // GUARD: product must exist and be ACTIVE
  const product = await Product.findById(productId);
  if (!product || product.isDeleted) {
    throw { code: 404, message: 'Product not found' };
  }
  if (product.status !== 'ACTIVE') {
    throw { code: 400, message: 'BoM can only be created for ACTIVE products.' };
  }

  await validateComponentProducts(components || []);

  // Determine next bomVersion for this product
  const latestBom = await BoM.findOne({ productId })
    .sort({ bomVersion: -1 })
    .lean();
  const bomVersion = latestBom ? latestBom.bomVersion + 1 : 1;

  const bom = await BoM.create({
    productId,
    productVersion: product.version, // Snapshot of product version
    bomVersion,
    components: components || [],
    operations: operations || [],
    status: 'DRAFT',
    createdBy: userId,
  });

  // Fire-and-forget audit log
  createAuditLog({
    action: 'BOM_CREATED',
    entityType: 'BOM',
    entityId: bom._id,
    entityName: `BoM v${bomVersion} for ${product.name}`,
    performedBy: userId,
    oldValue: null,
    newValue: bom,
  });

  return bom;
};

// ──────────────────────────────────────────────────
// UPDATE (DRAFT only)
// ──────────────────────────────────────────────────
const update = async (id, updates, userId) => {
  const bom = await BoM.findById(id);

  if (!bom || bom.isDeleted) {
    throw { code: 404, message: 'BoM not found' };
  }

  // GUARD: only DRAFT BoMs can be edited directly
  if (bom.status !== 'DRAFT') {
    throw {
      code: 403,
      message: 'Use an ECO to modify ACTIVE or ARCHIVED BoM.',
    };
  }

  // GUARD: locked by ECO
  if (bom.isLocked) {
    throw { code: 423, message: 'BoM is locked by an active ECO.' };
  }

  // Capture old values for audit
  const oldValue = {
    components: bom.components,
    operations: bom.operations,
  };

  // Apply only allowed fields
  if (updates.components !== undefined) {
    await validateComponentProducts(updates.components || []);
    bom.components = updates.components;
  }
  if (updates.operations !== undefined) {
    bom.operations = updates.operations;
  }

  await bom.save();

  // Fire-and-forget audit log
  createAuditLog({
    action: 'BOM_UPDATED',
    entityType: 'BOM',
    entityId: bom._id,
    entityName: `BoM v${bom.bomVersion}`,
    performedBy: userId,
    oldValue,
    newValue: updates,
  });

  return bom;
};

// ──────────────────────────────────────────────────
// SOFT DELETE (DRAFT only)
// ──────────────────────────────────────────────────
const softDelete = async (id, userId) => {
  const bom = await BoM.findById(id);

  if (!bom || bom.isDeleted) {
    throw { code: 404, message: 'BoM not found' };
  }

  if (bom.status !== 'DRAFT') {
    throw { code: 403, message: 'Cannot delete ACTIVE or ARCHIVED BoM.' };
  }

  bom.isDeleted = true;
  await bom.save();

  createAuditLog({
    action: 'BOM_DELETED',
    entityType: 'BOM',
    entityId: bom._id,
    entityName: `BoM v${bom.bomVersion}`,
    performedBy: userId,
  });

  return bom;
};

// ──────────────────────────────────────────────────
// ACTIVATE (DRAFT → ACTIVE)
// ──────────────────────────────────────────────────
const activate = async (id, userId) => {
  const bom = await BoM.findById(id);

  if (!bom || bom.isDeleted) {
    throw { code: 404, message: 'BoM not found' };
  }

  if (bom.status !== 'DRAFT') {
    throw { code: 400, message: 'Only DRAFT BoMs can be activated.' };
  }

  await BoM.updateMany(
    {
      _id: { $ne: bom._id },
      productId: bom.productId,
      productVersion: bom.productVersion,
      status: 'ACTIVE',
      isDeleted: false,
    },
    { $set: { status: 'ARCHIVED' } }
  );

  bom.status = 'ACTIVE';
  await bom.save();

  createAuditLog({
    action: 'BOM_ACTIVATED',
    entityType: 'BOM',
    entityId: bom._id,
    entityName: `BoM v${bom.bomVersion}`,
    performedBy: userId,
    oldValue: { status: 'DRAFT' },
    newValue: { status: 'ACTIVE' },
  });

  return bom;
};

// ──────────────────────────────────────────────────
// GET DIFF between two BoMs
// ──────────────────────────────────────────────────
const getDiff = async (id, compareId) => {
  const [bomA, bomB] = await Promise.all([
    BoM.findById(id).lean(),
    BoM.findById(compareId).lean(),
  ]);

  if (!bomA) throw { code: 404, message: `BoM ${id} not found` };
  if (!bomB) throw { code: 404, message: `BoM ${compareId} not found` };

  const diff = diffService.compute(bomA, bomB);

  return {
    bomA: { _id: bomA._id, bomVersion: bomA.bomVersion },
    bomB: { _id: bomB._id, bomVersion: bomB.bomVersion },
    changes: diff,
  };
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
