const { z } = require('zod');

const componentSchema = z.object({
  componentProductId: z
    .string({ required_error: 'Component product ID is required' })
    .min(1, 'Component product ID is required'),
  quantity: z
    .number({ required_error: 'Quantity is required' })
    .min(0, 'Quantity cannot be negative'),
});

const operationSchema = z.object({
  name: z
    .string({ required_error: 'Operation name is required' })
    .min(1, 'Operation name is required'),
  duration: z.number().min(0).optional(),
  workCenter: z.string().optional(),
});

const createBomSchema = z.object({
  productId: z
    .string({ required_error: 'Product ID is required' })
    .min(1, 'Product ID is required'),
  components: z.array(componentSchema).optional().default([]),
  operations: z.array(operationSchema).optional().default([]),
});

const updateBomSchema = z.object({
  components: z.array(componentSchema).optional(),
  operations: z.array(operationSchema).optional(),
});

module.exports = { createBomSchema, updateBomSchema };
