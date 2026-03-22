const AuditLog = require('../models/AuditLog');

/**
 * createAuditLog — Non-blocking audit log writer.
 *
 * Called as fire-and-forget. Do NOT await this in the main request path.
 * Audit write failures are caught and logged to console — they NEVER
 * propagate to the API response or break the main flow.
 *
 * @param {Object} params
 * @param {string} params.action       - e.g. "ECO_APPLIED", "PRODUCT_CREATED"
 * @param {string} params.entityType   - "PRODUCT" | "BOM" | "ECO" | "STAGE" | "USER"
 * @param {ObjectId} params.entityId
 * @param {string} params.entityName
 * @param {ObjectId} params.performedBy
 * @param {*} params.oldValue
 * @param {*} params.newValue
 * @param {string} params.stackTrace   - populated only for SYSTEM_ERROR entries
 */
async function createAuditLog({
  action,
  entityType,
  entityId,
  entityName,
  performedBy,
  oldValue,
  newValue,
  stackTrace,
}) {
  try {
    await AuditLog.create({
      action,
      entityType,
      entityId,
      entityName,
      performedBy,
      oldValue,
      newValue,
      stackTrace,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('AuditLog write failed silently:', err.message);
    // NEVER throws — audit failures must not affect the main API response
  }
}

module.exports = { createAuditLog };
