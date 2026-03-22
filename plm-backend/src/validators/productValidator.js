const { z } = require('zod');

const createProductSchema = z.object({
  name: z
    .string({ required_error: 'Product name is required' })
    .trim()
    .min(1, 'Product name is required'),
  description: z.string().optional(),
  salePrice: z.number().min(0, 'Sale price must be ≥ 0').optional(),
  costPrice: z.number().min(0, 'Cost price must be ≥ 0').optional(),
  sku: z.string().trim().optional(),
  attachments: z
    .array(
      z.object({
        fileName: z.string(),
        url: z.string(),
      })
    )
    .optional(),
});

const updateProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name cannot be empty').optional(),
  description: z.string().optional(),
  salePrice: z.number().min(0, 'Sale price must be ≥ 0').optional(),
  costPrice: z.number().min(0, 'Cost price must be ≥ 0').optional(),
  attachments: z
    .array(
      z.object({
        fileName: z.string(),
        url: z.string(),
        uploadedAt: z.string().optional(),
      })
    )
    .optional(),
});

module.exports = { createProductSchema, updateProductSchema };
