const Product = require('../models/Product');
const { createAuditLog } = require('../utils/auditLogger');
const diffService = require('./diffService');

/**
 * productService — Pure business logic for Products.
 *
 * No req, res, next — accepts structured input, returns data or throws { code, message }.
 */

// ──────────────────────────────────────────────────
// GET ALL (paginated, filtered)
// ──────────────────────────────────────────────────
const getAll = async ({ status, search, page = 1, limit = 20, userRole }) => {
  // OPERATIONS users can only see ACTIVE products
  if (userRole === 'OPERATIONS') {
    status = 'ACTIVE';
  }

  const filter = { isDeleted: false };

  if (status) {
    filter.status = status;
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .lean(),
    Product.countDocuments(filter),
  ]);

  return {
    products,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit),
  };
};

// ──────────────────────────────────────────────────
// GET BY ID
// ──────────────────────────────────────────────────
const getById = async (id, userRole) => {
  const product = await Product.findById(id)
    .populate('createdBy', 'name email')
    .lean();

  if (!product || product.isDeleted) {
    throw { code: 404, message: 'Product not found' };
  }

  // OPERATIONS can only see ACTIVE products
  if (userRole === 'OPERATIONS' && product.status !== 'ACTIVE') {
    throw { code: 403, message: 'Access denied' };
  }

  return product;
};

// ──────────────────────────────────────────────────
// CREATE (DRAFT)
// ──────────────────────────────────────────────────
const create = async ({ name, description, salePrice, costPrice, sku, attachments, userId }) => {
  const product = await Product.create({
    name,
    description,
    salePrice,
    costPrice,
    attachments: Array.isArray(attachments) ? attachments : [],
    sku: sku || `PRD-${Date.now()}`,
    status: 'DRAFT',
    version: 1,
    createdBy: userId,
  });

  // Fire-and-forget audit log
  createAuditLog({
    action: 'PRODUCT_CREATED',
    entityType: 'PRODUCT',
    entityId: product._id,
    entityName: product.name,
    performedBy: userId,
    oldValue: null,
    newValue: product,
  });

  return product;
};

// ──────────────────────────────────────────────────
// UPDATE (DRAFT only)
// ──────────────────────────────────────────────────
const update = async (id, updates, userId) => {
  const product = await Product.findById(id);

  if (!product || product.isDeleted) {
    throw { code: 404, message: 'Product not found' };
  }

  // GUARD: only DRAFT products can be edited directly
  if (product.status !== 'DRAFT') {
    throw {
      code: 403,
      message: 'Cannot edit ACTIVE or ARCHIVED product. Create an ECO to propose changes.',
    };
  }

  // GUARD: locked by ECO
  if (product.isLocked) {
    throw { code: 423, message: 'Product is locked by an active ECO.' };
  }

  // Capture old values for audit
  const oldValue = {
    name: product.name,
    description: product.description,
    salePrice: product.salePrice,
    costPrice: product.costPrice,
    attachments: product.attachments,
  };

  // Apply only allowed fields
  const allowedFields = ['name', 'description', 'salePrice', 'costPrice', 'attachments'];
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      product[field] = updates[field];
    }
  });

  await product.save();

  // Fire-and-forget audit log
  createAuditLog({
    action: 'PRODUCT_UPDATED',
    entityType: 'PRODUCT',
    entityId: product._id,
    entityName: product.name,
    performedBy: userId,
    oldValue,
    newValue: updates,
  });

  return product;
};

// ──────────────────────────────────────────────────
// SOFT DELETE (DRAFT only)
// ──────────────────────────────────────────────────
const softDelete = async (id, userId) => {
  const product = await Product.findById(id);

  if (!product || product.isDeleted) {
    throw { code: 404, message: 'Product not found' };
  }

  // GUARD: only DRAFT products can be deleted
  if (product.status !== 'DRAFT') {
    throw { code: 403, message: 'Cannot delete ACTIVE or ARCHIVED product.' };
  }

  product.isDeleted = true;
  await product.save();

  // Fire-and-forget audit log
  createAuditLog({
    action: 'PRODUCT_DELETED',
    entityType: 'PRODUCT',
    entityId: product._id,
    entityName: product.name,
    performedBy: userId,
    oldValue: { isDeleted: false },
    newValue: { isDeleted: true },
  });

  return product;
};

// ──────────────────────────────────────────────────
// ACTIVATE (DRAFT → ACTIVE)
// ──────────────────────────────────────────────────
const activate = async (id, userId) => {
  const product = await Product.findById(id);

  if (!product || product.isDeleted) {
    throw { code: 404, message: 'Product not found' };
  }

  // GUARD: only DRAFT products can be activated
  if (product.status !== 'DRAFT') {
    throw { code: 400, message: 'Only DRAFT products can be activated.' };
  }

  // Keep exactly one ACTIVE version per product family (sku).
  await Product.updateMany(
    {
      _id: { $ne: product._id },
      sku: product.sku,
      status: 'ACTIVE',
      isDeleted: false,
    },
    { $set: { status: 'ARCHIVED' } }
  );

  product.status = 'ACTIVE';
  await product.save();

  // Fire-and-forget audit log
  createAuditLog({
    action: 'PRODUCT_ACTIVATED',
    entityType: 'PRODUCT',
    entityId: product._id,
    entityName: product.name,
    performedBy: userId,
    oldValue: { status: 'DRAFT' },
    newValue: { status: 'ACTIVE' },
  });

  return product;
};

// ──────────────────────────────────────────────────
// GET DIFF between two Products
// ──────────────────────────────────────────────────
const getDiff = async (id, compareId) => {
  const [productA, productB] = await Promise.all([
    Product.findById(id).lean(),
    Product.findById(compareId).lean(),
  ]);

  if (!productA) throw { code: 404, message: `Product ${id} not found` };
  if (!productB) throw { code: 404, message: `Product ${compareId} not found` };

  const diff = diffService.compute(productA, productB);

  return {
    productA: { _id: productA._id, version: productA.version },
    productB: { _id: productB._id, version: productB.version },
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
