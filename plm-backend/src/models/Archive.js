const mongoose = require('mongoose');

const archiveSchema = new mongoose.Schema(
  {
    originalEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Original entity ID is required'],
    },
    entityType: {
      type: String,
      enum: {
        values: ['PRODUCT', 'BOM'],
        message: 'Entity type must be PRODUCT or BOM',
      },
      required: [true, 'Entity type is required'],
    },
    version: {
      type: Number,
      required: [true, 'Version is required'],
    },
    snapshotData: {
      type: mongoose.Schema.Types.Mixed, // Complete deep copy via .toObject()
    },
    archivedAt: {
      type: Date,
      default: Date.now,
    },
    archivedByEcoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ECO',
    },
  },
  { timestamps: true }
);

// ─── Indexes ───
archiveSchema.index({ originalEntityId: 1, version: -1 }); // Version history for any entity

// ─── Write-once enforcement: no update or delete operations ───
// This is enforced at the service/controller layer — Archive documents are immutable.

const Archive = mongoose.model('Archive', archiveSchema);

module.exports = Archive;
