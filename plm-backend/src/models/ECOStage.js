const mongoose = require('mongoose');

const ecoStageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Stage name is required'],
      trim: true,
    },
    order: {
      type: Number,
      required: [true, 'Stage order is required'],
    },
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    approvers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isFinal: {
      type: Boolean,
      default: false,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const ECOStage = mongoose.model('ECOStage', ecoStageSchema);

module.exports = ECOStage;
