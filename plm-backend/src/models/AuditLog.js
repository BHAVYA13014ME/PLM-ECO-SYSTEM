const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: [true, 'Action is required'],
    },
    entityType: {
      type: String,
      enum: ['PRODUCT', 'BOM', 'ECO', 'STAGE', 'USER'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    entityName: {
      type: String,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    stackTrace: {
      type: String, // Populated only for SYSTEM_ERROR entries
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false } // We use our own timestamp field
);

// ─── Indexes ───
auditLogSchema.index({ entityId: 1, timestamp: -1 }); // Audit trail for an entity, newest first

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
