const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Never returned by default
    },
    role: {
      type: String,
      enum: {
        values: ['ADMIN', 'ENGINEER', 'APPROVER', 'OPERATIONS'],
        message: 'Role must be one of: ADMIN, ENGINEER, APPROVER, OPERATIONS',
      },
      required: [true, 'Role is required'],
    },
    refreshToken: {
      type: String,
      default: null,
      select: false, // Never returned by default
    },
  },
  { timestamps: true }
);

// ─── Pre-save Hook: Hash password when modified ───
userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;

  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// ─── Instance Methods ───

/**
 * Compare a candidate password against the stored hash.
 * @param {string} candidatePassword - The plaintext password to check
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Generate a short-lived JWT access token.
 * Payload: { _id, email, role }
 * @returns {string}
 */
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { _id: this._id, email: this.email, role: this.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' }
  );
};

/**
 * Generate a long-lived JWT refresh token.
 * Payload: { _id }
 * @returns {string}
 */
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { _id: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
  );
};

const User = mongoose.model('User', userSchema);

module.exports = User;
