const mongoose = require('mongoose');

const componentSchema = new mongoose.Schema(
  {
    componentProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Component product ID is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },
  },
  { _id: true }
);

const operationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Operation name is required'],
    },
    duration: {
      type: Number, // minutes
    },
    workCenter: {
      type: String,
    },
  },
  { _id: true }
);

const bomSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    productVersion: {
      type: Number,
      required: [true, 'Product version is required'],
    },
    bomVersion: {
      type: Number,
      default: 1,
    },
    components: [componentSchema],
    operations: [operationSchema],
    status: {
      type: String,
      enum: {
        values: ['DRAFT', 'ACTIVE', 'ARCHIVED'],
        message: 'Status must be one of: DRAFT, ACTIVE, ARCHIVED',
      },
      default: 'DRAFT',
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// ─── Indexes ───
bomSchema.index({ productId: 1, bomVersion: -1 }); // All versions for a product, newest first

const BoM = mongoose.model('BoM', bomSchema);

module.exports = BoM;
