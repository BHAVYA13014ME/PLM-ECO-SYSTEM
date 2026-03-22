const mongoose = require('mongoose');
const _ = require('lodash');
const ECO = require('../models/ECO');
const Product = require('../models/Product');
const BoM = require('../models/BoM');
const Archive = require('../models/Archive');
const { createAuditLog } = require('../utils/auditLogger');

/**
 * executeECO — 8-Step Atomic Transaction Engine
 */
async function executeECO(ecoId, approvedByUserId) {
  // IDEMPOTENCY GUARD
  const eco = await ECO.findById(ecoId);
  if (!eco) throw { code: 404, message: 'ECO not found' };

  if (eco.status === 'APPROVED') {
    return { success: true, message: 'ECO already applied.' };
  }

  // STEP 1 — START SESSION
  const session = await mongoose.startSession();
  session.startTransaction();

  let TargetModel = eco.ecoType === 'PRODUCT' ? Product : BoM;
  const versionField = eco.ecoType === 'PRODUCT' ? 'version' : 'bomVersion';
  const targetId = eco.ecoType === 'PRODUCT' ? eco.targetProductId : eco.targetBomId;
  const fields = Array.isArray(eco.proposedChanges?.fields) ? eco.proposedChanges.fields : [];

  try {
    // STEP 2 — FETCH & ATOMIC CHECK-AND-LOCK
    const pre = await TargetModel.findOneAndUpdate(
      { _id: targetId, isLocked: false }, // only succeeds if NOT locked
      { $set: { isLocked: true } },
      { returnDocument: 'before', session }
    );

    if (!pre) {
      throw { code: 423, message: 'Target entity is locked by another concurrent operation.' };
    }

    // STEP 3
    const target = await TargetModel.findById(targetId).session(session);

    // STEP 4 — ARCHIVE CURRENT VERSION
    const snapshot = target.toObject();
    delete snapshot._id;
    delete snapshot.__v;

    await Archive.create(
      [
        {
          originalEntityId: target._id,
          entityType: eco.ecoType,
          version: target[versionField],
          snapshotData: snapshot,
          archivedAt: new Date(),
          archivedByEcoId: eco._id,
        },
      ],
      { session }
    );

    // STEP 5 — APPLY PROPOSED CHANGES TO NEXT VERSION PAYLOAD
    const nextPayload = { ...snapshot };
    for (const field of fields) {
      if (field.changeType === 'ADD' || field.changeType === 'UPDATE') {
        _.set(nextPayload, field.fieldName, field.newValue);
      } else if (field.changeType === 'REMOVE') {
        _.unset(nextPayload, field.fieldName);
      }
    }

    // STEP 6 — APPLY AS SAME VERSION OR CREATE A NEW VERSION
    const originalVersion = target[versionField];
    const nextVersion = eco.versionUpdate === true ? originalVersion + 1 : originalVersion;
    let newTarget = target;

    if (eco.versionUpdate === true) {
      if (eco.ecoType === 'PRODUCT') {
        await TargetModel.updateMany(
          { sku: target.sku, status: 'ACTIVE', isDeleted: false },
          { $set: { status: 'ARCHIVED', isLocked: false } },
          { session }
        );
      } else if (eco.ecoType === 'BOM') {
        await TargetModel.updateMany(
          {
            productId: target.productId,
            productVersion: target.productVersion,
            status: 'ACTIVE',
            isDeleted: false,
          },
          { $set: { status: 'ARCHIVED', isLocked: false } },
          { session }
        );
      }

      nextPayload[versionField] = nextVersion;
      nextPayload.status = 'ACTIVE';
      nextPayload.isLocked = false;
      nextPayload.isDeleted = false;

      [newTarget] = await TargetModel.create([nextPayload], { session });
    } else {
      for (const field of fields) {
        if (field.changeType === 'ADD' || field.changeType === 'UPDATE') {
          _.set(target, field.fieldName, field.newValue);
        } else if (field.changeType === 'REMOVE') {
          _.unset(target, field.fieldName);
        }
      }

      target.markModified('components');
      target.markModified('operations');
      target[versionField] = nextVersion;
      target.status = 'ACTIVE';
      target.isLocked = false;

      await target.save({ session });
      newTarget = target;
    }

    // STEP 7 — COMPLETE ECO
    eco.status = 'APPROVED';
    eco.appliedAt = new Date();
    eco.targetVersion = newTarget[versionField];
    if (eco.ecoType === 'PRODUCT') {
      eco.targetProductId = newTarget._id;
    } else {
      eco.targetBomId = newTarget._id;
      eco.targetProductId = newTarget.productId;
    }
    eco.stageHistory.push({
      stageId: eco.stage,
      stageName: 'DONE',
      enteredAt: new Date(),
      enteredBy: approvedByUserId,
      action: 'APPROVED',
    });

    await eco.save({ session });

    // STEP 8 — COMMIT
    await session.commitTransaction();

    createAuditLog({
      action: 'ECO_APPLIED',
      entityType: 'ECO',
      entityId: eco._id,
      performedBy: approvedByUserId,
      oldValue: originalVersion,
      newValue: newTarget[versionField],
    });

    return { success: true, message: 'ECO applied. New version is now ACTIVE.' };
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    
    await TargetModel.findByIdAndUpdate(targetId, { $set: { isLocked: false } }).catch(() => {});
    if (err.code === 20 || /Transaction numbers are only allowed on a replica set member or mongos/i.test(err.message || '')) {
      return await executeECOWithoutTransaction(eco, approvedByUserId, TargetModel, targetId, fields);
    }
    
    throw err;
  } finally {
    await session.endSession();
  }
}

async function executeECOWithoutTransaction(eco, approvedByUserId, TargetModel, targetId, fields) {
  const versionField = eco.ecoType === 'PRODUCT' ? 'version' : 'bomVersion';
  const pre = await TargetModel.findOneAndUpdate(
    { _id: targetId, isLocked: false },
    { $set: { isLocked: true } },
    { returnDocument: 'before' }
  );

  if (!pre) {
    throw { code: 423, message: 'Target entity is locked by another concurrent operation.' };
  }

  try {
    const target = await TargetModel.findById(targetId);
    const snapshot = target.toObject();
    delete snapshot._id;
    delete snapshot.__v;

    await Archive.create({
      originalEntityId: target._id,
      entityType: eco.ecoType,
      version: target[versionField],
      snapshotData: snapshot,
      archivedAt: new Date(),
      archivedByEcoId: eco._id,
    });

    const nextPayload = { ...snapshot };
    for (const field of fields) {
      if (field.changeType === 'ADD' || field.changeType === 'UPDATE') {
        _.set(nextPayload, field.fieldName, field.newValue);
      } else if (field.changeType === 'REMOVE') {
        _.unset(nextPayload, field.fieldName);
      }
    }

    const originalVersion = target[versionField];
    const nextVersion = eco.versionUpdate === true ? originalVersion + 1 : originalVersion;
    let newTarget = target;

    if (eco.versionUpdate === true) {
      if (eco.ecoType === 'PRODUCT') {
        await TargetModel.updateMany(
          { sku: target.sku, status: 'ACTIVE', isDeleted: false },
          { $set: { status: 'ARCHIVED', isLocked: false } }
        );
      } else if (eco.ecoType === 'BOM') {
        await TargetModel.updateMany(
          {
            productId: target.productId,
            productVersion: target.productVersion,
            status: 'ACTIVE',
            isDeleted: false,
          },
          { $set: { status: 'ARCHIVED', isLocked: false } }
        );
      }

      nextPayload[versionField] = nextVersion;
      nextPayload.status = 'ACTIVE';
      nextPayload.isLocked = false;
      nextPayload.isDeleted = false;

      newTarget = await TargetModel.create(nextPayload);
    } else {
      for (const field of fields) {
        if (field.changeType === 'ADD' || field.changeType === 'UPDATE') {
          _.set(target, field.fieldName, field.newValue);
        } else if (field.changeType === 'REMOVE') {
          _.unset(target, field.fieldName);
        }
      }

      target[versionField] = nextVersion;
      target.status = 'ACTIVE';
      target.isLocked = false;

      await target.save();
      newTarget = target;
    }

    eco.status = 'APPROVED';
    eco.appliedAt = new Date();
    eco.targetVersion = newTarget[versionField];
    if (eco.ecoType === 'PRODUCT') {
      eco.targetProductId = newTarget._id;
    } else {
      eco.targetBomId = newTarget._id;
      eco.targetProductId = newTarget.productId;
    }
    eco.stageHistory.push({
      stageId: eco.stage,
      stageName: 'DONE',
      enteredAt: new Date(),
      enteredBy: approvedByUserId,
      action: 'APPROVED',
    });

    await eco.save();

    createAuditLog({
      action: 'ECO_APPLIED',
      entityType: 'ECO',
      entityId: eco._id,
      performedBy: approvedByUserId,
      oldValue: originalVersion,
      newValue: newTarget[versionField],
    });

    return { success: true, message: 'ECO applied. New version is now ACTIVE.' };
  } catch (err) {
    await TargetModel.findByIdAndUpdate(targetId, { $set: { isLocked: false } }).catch(() => {});
    throw err;
  }
}

module.exports = { executeECO };
