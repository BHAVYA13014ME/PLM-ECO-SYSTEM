const ECOStage = require('../models/ECOStage');
const ECO = require('../models/ECO');
const { createAuditLog } = require('../utils/auditLogger');

/**
 * stageService — Manage ECO Stages pipeline.
 */

// ──────────────────────────────────────────────────
// GET ALL
// ──────────────────────────────────────────────────
const getAll = async () => {
  return await ECOStage.find()
    .sort({ order: 1 })
    .populate('approvers', 'name email role')
    .lean();
};

// ──────────────────────────────────────────────────
// SEED DEFAULTS (runs on startup)
// ──────────────────────────────────────────────────
const seedDefaultStages = async () => {
  const count = await ECOStage.countDocuments();
  if (count === 0) {
    await ECOStage.create([
      { name: 'NEW', order: 1, isDefault: true, requiresApproval: false },
      { name: 'APPROVAL', order: 2, requiresApproval: true, approvers: [] },
      { name: 'DONE', order: 3, isFinal: true, requiresApproval: false },
    ]);
    console.log('✅ Seeded default ECO Stages');
  }
};

// ──────────────────────────────────────────────────
// CREATE
// ──────────────────────────────────────────────────
const create = async ({ name, order, requiresApproval, approvers, isFinal, isDefault }) => {
  if (isDefault) {
    await ECOStage.updateMany({ isDefault: true }, { $set: { isDefault: false } });
  }
  if (isFinal) {
    await ECOStage.updateMany({ isFinal: true }, { $set: { isFinal: false } });
  }

  const stage = await ECOStage.create({
    name,
    order,
    requiresApproval,
    approvers: requiresApproval ? approvers : [],
    isFinal,
    isDefault,
  });

  createAuditLog({
    action: 'STAGE_CREATED',
    entityType: 'STAGE',
    entityId: stage._id,
    entityName: stage.name,
    oldValue: null,
    newValue: stage,
  });

  return stage;
};

// ──────────────────────────────────────────────────
// UPDATE
// ──────────────────────────────────────────────────
const update = async (id, updates) => {
  const stage = await ECOStage.findById(id);
  if (!stage) {
    throw { code: 404, message: 'Stage not found' };
  }

  // GUARD: order change
  if (updates.order !== undefined && updates.order !== stage.order) {
    const activeECOs = await ECO.exists({ stage: id, status: { $nin: ['APPROVED', 'REJECTED'] } });
    if (activeECOs) {
      throw { code: 400, message: 'Cannot change order of a stage with active ECOs' };
    }
  }

  if (updates.isDefault) {
    await ECOStage.updateMany({ _id: { $ne: id }, isDefault: true }, { $set: { isDefault: false } });
  }
  if (updates.isFinal) {
    await ECOStage.updateMany({ _id: { $ne: id }, isFinal: true }, { $set: { isFinal: false } });
  }

  const oldValue = stage.toObject();

  Object.assign(stage, updates);
  if (!stage.requiresApproval) {
    stage.approvers = [];
  }

  await stage.save();

  createAuditLog({
    action: 'STAGE_UPDATED',
    entityType: 'STAGE',
    entityId: stage._id,
    entityName: stage.name,
    oldValue,
    newValue: stage,
  });

  return stage;
};

// ──────────────────────────────────────────────────
// DELETE
// ──────────────────────────────────────────────────
const remove = async (id) => {
  const stage = await ECOStage.findById(id);
  if (!stage) {
    throw { code: 404, message: 'Stage not found' };
  }

  if (stage.isDefault || stage.isFinal) {
    throw { code: 400, message: 'Cannot delete default or final stage' };
  }

  const hasECOs = await ECO.exists({
    $or: [{ stage: id }, { 'stageHistory.stageId': id }],
  });

  if (hasECOs) {
    throw { code: 400, message: 'Cannot delete a stage referenced by any ECO' };
  }

  await ECOStage.findByIdAndDelete(id);

  createAuditLog({
    action: 'STAGE_DELETED',
    entityType: 'STAGE',
    entityId: stage._id,
    entityName: stage.name,
  });

  return { success: true };
};

// ──────────────────────────────────────────────────
// GET NEXT
// ──────────────────────────────────────────────────
const getNext = async (currentStageId) => {
  const current = await ECOStage.findById(currentStageId).lean();
  if (!current) throw { code: 404, message: 'Current stage not found' };

  const nextStage = await ECOStage.findOne({ order: { $gt: current.order } })
    .sort({ order: 1 })
    .lean();

  return nextStage || null;
};

module.exports = {
  getAll,
  create,
  update,
  delete: remove,
  getNext,
  seedDefaultStages,
};
