/**
 * errorHandler — Centralized Express error-handling middleware.
 *
 * Mounted LAST in server.js. Catches all errors passed via next(error).
 *
 * Handles:
 *   - Mongoose ValidationError  → 400 with field-level messages
 *   - Mongoose CastError        → 400 "Invalid ID format"
 *   - MongoDB duplicate key 11000 → 409 "Duplicate value for {field}"
 *   - Service-thrown { code, message } → uses code as HTTP status
 *   - All others                → 500 "Internal Server Error"
 *
 * Always returns: { success: false, message, data: null }
 */
const { createAuditLog } = require('../utils/auditLogger');

const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal Server Error';

  // ─── Mongoose ValidationError ───
  if (err.name === 'ValidationError') {
    statusCode = 400;
    // Collect field-level messages
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join(', ');
  }

  // ─── Mongoose CastError (bad ObjectId, etc.) ───
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  // ─── MongoDB duplicate key (code 11000) ───
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {}).join(', ');
    message = `Duplicate value for ${field}`;
  }

  // ─── Service-thrown errors with { code, message } ───
  else if (err.code && typeof err.code === 'number' && err.message && err.code >= 100 && err.code <= 599) {
    statusCode = err.code;
    message = err.message;
  }

  // ─── All other errors ───
  else if (err.message) {
    message = err.message;
  }

  // Log stack trace in development
  if (process.env.NODE_ENV === 'development') {
    console.error('ERROR:', err);
  }

  if (!err.code || err.code >= 500) {
    createAuditLog({
      action: 'SYSTEM_ERROR',
      entityType: null,
      stackTrace: err.stack,
      newValue: { path: req.path, method: req.method, message: err.message },
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    data: null,
  });
};

module.exports = errorHandler;
