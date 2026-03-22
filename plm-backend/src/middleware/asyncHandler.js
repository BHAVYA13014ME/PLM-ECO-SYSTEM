/**
 * asyncHandler — Wraps an async Express route handler so that
 * any rejected promise is automatically forwarded to next(error).
 *
 * Usage:
 *   router.get('/products', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
