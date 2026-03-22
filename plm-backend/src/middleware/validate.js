/**
 * validate — Zod validation middleware factory.
 *
 * Usage:
 *   router.post('/products', validate(createProductSchema), controller.create);
 *
 * Validates req.body against the provided Zod schema.
 * On failure, returns 400 with field-level error messages.
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const issues = result.error.issues || result.error.errors || [];
    const errors = issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors,
    });
  }

  // Replace body with the parsed (cleaned) data
  req.body = result.data;
  next();
};

module.exports = { validate };
