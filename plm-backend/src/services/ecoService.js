const ECO = require('../models/ECO');
const Product = require('../models/Product');
const BoM = require('../models/BoM');
const ECOStage = require('../models/ECOStage');
const User = require('../models/User');
const stageService = require('./stageService');
const ecoExecutionEngine = require('./ecoExecutionEngine');
const { createAuditLog } = require('../utils/auditLogger');

/**
 * ecoService — ECO business logic and workflow movement.
 */

// ──────────────────────────────────────────────────
// GET ALL
// ──────────────────────────────────────────────────
const getAll = async ({ status, ecoType, targetProductId, page = 1, limit = 20, userId, userRole }) => {
  if (userRole === 'OPERATIONS') {
    throw { code: 403, message: 'OPERATIONS not authorized to view ECOs.' };
  }

  const filter = {};
  const normalizedStatus = status === 'DRAFT' ? 'NEW' : status;
  if (normalizedStatus) filter.status = normalizedStatus;
  if (ecoType) filter.ecoType = ecoType;
  if (targetProductId) filter.targetProductId = targetProductId;

  if (userRole === 'ENGINEER') {
    filter.$or = [{ createdBy: userId }, { assignedTo: userId }];
  } else if (userRole === 'APPROVER') {
    // Approvers can review NEW ECOs and all ECOs currently in approval-required stages.
    const approvalStages = await ECOStage.find({ requiresApproval: true }).select('_id');
    const stageIds = approvalStages.map((s) => s._id);
    filter.$or = [{ status: 'NEW' }, { stage: { $in: stageIds } }];
  }

  const skip = (page - 1) * limit;

  const [ecos, total] = await Promise.all([
    ECO.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('targetProductId', 'name version status')
      .populate('stage', 'name order requiresApproval approvers')
      .populate('createdBy', 'name email')
      .lean(),
    ECO.countDocuments(filter),
  ]);

  return { ecos, total, page: Number(page), totalPages: Math.ceil(total / limit) };
};

// ──────────────────────────────────────────────────
// GET BY ID
// ──────────────────────────────────────────────────
const getById = async (id, userRole, userId) => {
  if (userRole === 'OPERATIONS') {
    throw { code: 403, message: 'OPERATIONS not authorized to view ECOs.' };
  }

  const eco = await ECO.findById(id)
    .populate('targetProductId', 'name version status')
    .populate('targetBomId', 'bomVersion status')
    .populate('stage', 'name order requiresApproval approvers')
    .populate('createdBy', 'name email')
    .populate('assignedTo', 'name email')
    .populate('stageHistory.enteredBy', 'name email')
    .lean();

  if (!eco) throw { code: 404, message: 'ECO not found' };

  if (userRole === 'ENGINEER' && eco.createdBy._id.toString() !== userId.toString() && (!eco.assignedTo || eco.assignedTo._id.toString() !== userId.toString())) {
    throw { code: 403, message: 'You are not assigned to this ECO' };
  }

  return eco;
};

// ──────────────────────────────────────────────────
// CREATE
// ──────────────────────────────────────────────────
const create = async ({ title, ecoType, targetProductId, targetBomId, targetVersion, versionUpdate = true, effectiveDate, proposedChanges, userId }) => {
  const product = await Product.findById(targetProductId);
  if (!product || product.isDeleted) throw { code: 404, message: 'Target product not found.' };
  if (product.status !== 'ACTIVE') throw { code: 400, message: 'Target product must be ACTIVE.' };

  const target = await (ecoType === 'PRODUCT' ? Product : BoM).findById(ecoType === 'PRODUCT' ? targetProductId : targetBomId);
  if (!target || target.isDeleted) throw { code: 404, message: `Target ${ecoType} not found.` };
  
  if (ecoType === 'BOM') {
    if (target.productId.toString() !== targetProductId.toString()) throw { code: 400, message: 'BoM does not belong to specified Product.' };
    if (target.status !== 'ACTIVE') throw { code: 400, message: 'Target BoM must be ACTIVE.' };
  }

  if (target.isLocked) throw { code: 423, message: 'Target is locked by another operation.' };

  const defaultStage = await ECOStage.findOne({ isDefault: true });
  if (!defaultStage) throw { code: 500, message: 'System configuration error: No default stage found.' };

  let assignedTo = null;
  const nextStage = await stageService.getNext(defaultStage._id);
  if (nextStage?.requiresApproval) {
    if (Array.isArray(nextStage.approvers) && nextStage.approvers.length > 0) {
      assignedTo = nextStage.approvers[0];
    } else {
      const approver = await User.findOne({ role: 'APPROVER' }).select('_id').lean();
      if (approver?._id) {
        assignedTo = approver._id;
      } else {
        const admin = await User.findOne({ role: 'ADMIN' }).select('_id').lean();
        assignedTo = admin?._id || null;
      }
    }
  }

  const eco = await ECO.create({
    title,
    ecoType,
    targetProductId,
    targetBomId,
    targetVersion,
    versionUpdate,
    effectiveDate,
    proposedChanges,
    stage: defaultStage._id,
    status: 'NEW',
    assignedTo,
    createdBy: userId,
    stageHistory: [
      {
        stageId: defaultStage._id,
        stageName: defaultStage.name,
        enteredAt: new Date(),
        enteredBy: userId,
        action: 'MOVED',
      },
    ],
  });

  createAuditLog({
    action: 'ECO_CREATED',
    entityType: 'ECO',
    entityId: eco._id,
    entityName: eco.title,
    performedBy: userId,
    oldValue: null,
    newValue: eco,
  });

  return eco;
};

// ──────────────────────────────────────────────────
// UPDATE (Only for NEW ECOs)
// ──────────────────────────────────────────────────
const update = async (id, updates, userId) => {
  const eco = await ECO.findById(id);
  if (!eco) throw { code: 404, message: 'ECO not found' };

  if (eco.status !== 'NEW') {
    throw { code: 403, message: 'ECO cannot be edited after workflow has started.' };
  }

  const allowedFields = ['title', 'proposedChanges', 'effectiveDate', 'versionUpdate'];
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      eco[field] = updates[field];
    }
  });

  await eco.save();

  createAuditLog({
    action: 'ECO_UPDATED',
    entityType: 'ECO',
    entityId: eco._id,
    entityName: eco.title,
    performedBy: userId,
  });

  return eco;
};

// ──────────────────────────────────────────────────
// ADVANCE TO NEXT STAGE
// ──────────────────────────────────────────────────
const advance = async (id, userId, userRole) => {
  const eco = await ECO.findById(id);
  if (!eco) throw { code: 404, message: 'ECO not found' };

  if (eco.status === 'APPROVED' || eco.status === 'REJECTED') {
    throw { code: 403, message: 'ECO is in a terminal state.' };
  }

  const currentStage = await ECOStage.findById(eco.stage);
  if (!currentStage) throw { code: 404, message: 'Current stage not found.' };

  // RECOVERY FEATURE: If the ECO is already at the final stage but stuck in IN_PROGRESS 
  // (e.g., executeECO previously failed), just re-run executeECO instead of advancing.
  if (currentStage.isFinal) {
    if (!['ENGINEER', 'ADMIN', 'APPROVER'].includes(userRole)) {
      throw { code: 403, message: 'Only authorized roles can execute this ECO.' };
    }
    return await ecoExecutionEngine.executeECO(eco._id, userId);
  }

  if (currentStage.requiresApproval) {
    if (!['APPROVER', 'ADMIN'].includes(userRole)) {
      throw { code: 403, message: 'Only an APPROVER or ADMIN can advance this approval stage.' };
    }
  } else if (!['ENGINEER', 'ADMIN', 'APPROVER'].includes(userRole)) {
    throw { code: 403, message: 'Only an ENGINEER, APPROVER, or ADMIN can advance this stage.' };
  }

  const nextStage = await stageService.getNext(currentStage._id);
  if (!nextStage) throw { code: 400, message: 'No next stage in pipeline.' };

  const action = currentStage.requiresApproval ? 'APPROVED' : 'VALIDATED';

  eco.status = 'IN_PROGRESS';
  eco.stage = nextStage._id;
  eco.stageHistory.push({
    stageId: nextStage._id,
    stageName: nextStage.name,
    enteredAt: new Date(),
    enteredBy: userId,
    action,
  });

  await eco.save();

  createAuditLog({
    action: 'ECO_STAGE_ADVANCED',
    entityType: 'ECO',
    entityId: eco._id,
    entityName: eco.title,
    performedBy: userId,
    oldValue: currentStage.name,
    newValue: nextStage.name,
  });

  if (nextStage.isFinal) {
    return await ecoExecutionEngine.executeECO(eco._id, userId);
  }

  return eco;
};

// ──────────────────────────────────────────────────
// REJECT
// ──────────────────────────────────────────────────
const reject = async (id, userId, userRole) => {
  if (!['APPROVER', 'ADMIN'].includes(userRole)) {
    throw { code: 403, message: 'Only an APPROVER or ADMIN can reject an ECO.' };
  }

  const eco = await ECO.findById(id);
  if (!eco) throw { code: 404, message: 'ECO not found' };

  const currentStage = await ECOStage.findById(eco.stage);
  if (!currentStage.requiresApproval) {
    throw { code: 400, message: 'Can only reject at approval stages.' };
  }

  eco.status = 'REJECTED';
  eco.stageHistory.push({
    stageId: currentStage._id,
    stageName: currentStage.name,
    enteredAt: new Date(),
    enteredBy: userId,
    action: 'REJECTED',
  });

  await eco.save();

  const TargetModel = eco.ecoType === 'PRODUCT' ? require('../models/Product') : require('../models/BoM');
  const targetId = eco.ecoType === 'PRODUCT' ? eco.targetProductId : eco.targetBomId;
  if(targetId) {
    await TargetModel.findByIdAndUpdate(targetId, { $set: { isLocked: false } });
  }

  createAuditLog({
    action: 'ECO_REJECTED',
    entityType: 'ECO',
    entityId: eco._id,
    entityName: eco.title,
    performedBy: userId,
    oldValue: currentStage.name,
    newValue: 'REJECTED',
  });

  return eco;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  advance,
  reject,
};
