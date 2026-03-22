const { z } = require('zod');

const proposedChangeFieldSchema = z.object({
  fieldName: z.string({ required_error: 'Field name is required' }),
  oldValue: z.any().optional(),
  newValue: z.any().optional(),
  changeType: z.enum(['ADD', 'UPDATE', 'REMOVE']),
});

const createEcoSchema = z.object({
  title: z
    .string({ required_error: 'ECO title is required' })
    .min(1, 'ECO title cannot be empty'),
  ecoType: z.enum(['PRODUCT', 'BOM']),
  targetProductId: z.string({ required_error: 'Target product ID is required' }),
  targetBomId: z.string().optional(),
  targetVersion: z.number({ required_error: 'Target version is required' }),
  versionUpdate: z.boolean().default(true).optional(),
  effectiveDate: z.string().optional(),
  proposedChanges: z
    .object({
      fields: z.array(proposedChangeFieldSchema).default([]),
    })
    .default({ fields: [] }),
});

const updateEcoSchema = z.object({
  title: z.string().min(1).optional(),
  versionUpdate: z.boolean().optional(),
  effectiveDate: z.string().optional(),
  proposedChanges: z
    .object({
      fields: z.array(proposedChangeFieldSchema).default([]),
    })
    .optional(),
});

module.exports = { createEcoSchema, updateEcoSchema };
