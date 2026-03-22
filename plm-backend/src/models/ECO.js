const mongoose = require('mongoose');

const proposedChangeFieldSchema = new mongoose.Schema(
  {
    fieldName: {
      type: String, // Supports dot/bracket notation: "components[0].quantity"
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    changeType: {
      type: String,
      enum: ['ADD', 'UPDATE', 'REMOVE'],
    },
  },
  { _id: false }
);

const stageHistoryEntrySchema = new mongoose.Schema(
  {
    stageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ECOStage',
    },
    stageName: {
      type: String,
    },
    enteredAt: {
      type: Date,
      default: Date.now,
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    action: {
      type: String,
      enum: ['MOVED', 'APPROVED', 'VALIDATED', 'REJECTED'],
    },
  },
  { _id: false }
);

const ecoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'ECO title is required'],
    },
    ecoType: {
      type: String,
      enum: {
        values: ['PRODUCT', 'BOM'],
        message: 'ECO type must be PRODUCT or BOM',
      },
      required: [true, 'ECO type is required'],
    },
    targetProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Target product ID is required'],
    },
    targetBomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BoM',
    },
    targetVersion: {
      type: Number,
      required: [true, 'Target version is required'],
    },
    versionUpdate: {
      type: Boolean,
      default: true,
    },
    effectiveDate: {
      type: Date,
    },
    proposedChanges: {
      fields: [proposedChangeFieldSchema],
    },
    stage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ECOStage',
    },
    stageHistory: [stageHistoryEntrySchema],
    status: {
      type: String,
      enum: {
        values: ['NEW', 'IN_PROGRESS', 'APPROVED', 'REJECTED'],
        message: 'Status must be one of: NEW, IN_PROGRESS, APPROVED, REJECTED',
      },
      default: 'NEW',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    appliedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// ─── Indexes ───
ecoSchema.index({ targetProductId: 1, status: 1 }); // All ECOs for a product by status
ecoSchema.index({ stage: 1, status: 1 }); // Approver dashboard — pending ECOs per stage

const ECO = mongoose.model('ECO', ecoSchema);

module.exports = ECO;
