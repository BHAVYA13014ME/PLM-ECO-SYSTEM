const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    salePrice: {
      type: Number,
      default: 0,
    },
    costPrice: {
      type: Number,
      default: 0,
    },
    attachments: [
      {
        fileName: { type: String },
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: {
        values: ['DRAFT', 'ACTIVE', 'ARCHIVED'],
        message: 'Status must be one of: DRAFT, ACTIVE, ARCHIVED',
      },
      default: 'DRAFT',
    },
    version: {
      type: Number,
      default: 1,
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
productSchema.index({ name: 'text' }); // Full-text search
productSchema.index({ status: 1, isDeleted: 1 }); // Status filter queries
productSchema.index({ sku: 1, version: 1 }, { unique: true }); // Versioned uniqueness

// ─── Pre-save: auto-generate SKU if not provided ───
productSchema.pre('save', function () {
  if (!this.sku) {
    this.sku = `PRD-${Date.now()}`;
  }
});

// ─── Static: findActive() ───
productSchema.statics.findActive = function () {
  return this.find({ status: 'ACTIVE', isDeleted: false });
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
