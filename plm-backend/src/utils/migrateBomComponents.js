const mongoose = require('mongoose');
const dotenv = require('dotenv');

const BoM = require('../models/BoM');
const Product = require('../models/Product');

dotenv.config();

const normalizeName = (value) => (value || '').trim().toLowerCase();

async function getOrCreateComponentProduct(partName, fallbackCost = 0) {
  const normalized = normalizeName(partName);
  if (!normalized) return null;

  const existing = await Product.findOne({
    isDeleted: false,
    $expr: {
      $eq: [{ $toLower: '$name' }, normalized],
    },
  }).sort({ createdAt: -1 });

  if (existing) {
    if (existing.status !== 'ACTIVE') {
      existing.status = 'ACTIVE';
      await existing.save();
    }
    return existing;
  }

  const created = await Product.create({
    name: partName,
    sku: `CMP-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    salePrice: Number(fallbackCost || 0),
    costPrice: Number(fallbackCost || 0),
    version: 1,
    status: 'ACTIVE',
  });

  return created;
}

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB for BoM components migration.');

  const boms = await BoM.find({ isDeleted: false });
  let migratedCount = 0;
  let untouchedCount = 0;

  for (const bom of boms) {
    const originalComponents = Array.isArray(bom.components) ? bom.components : [];

    const needsMigration = originalComponents.some(
      (item) => item && !item.componentProductId && item.partName
    );

    if (!needsMigration) {
      untouchedCount += 1;
      continue;
    }

    const nextComponents = [];

    for (const component of originalComponents) {
      if (component.componentProductId) {
        nextComponents.push({
          componentProductId: component.componentProductId,
          quantity: Number(component.quantity || 0),
        });
        continue;
      }

      const componentProduct = await getOrCreateComponentProduct(component.partName, component.unitCost);
      if (!componentProduct) {
        continue;
      }

      nextComponents.push({
        componentProductId: componentProduct._id,
        quantity: Number(component.quantity || 0),
      });
    }

    bom.components = nextComponents;
    await bom.save();
    migratedCount += 1;
  }

  console.log(`BoM migration completed. Migrated: ${migratedCount}, untouched: ${untouchedCount}`);
  await mongoose.disconnect();
}

migrate()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('BoM migration failed:', err);
    try {
      await mongoose.disconnect();
    } catch (_) {
      // no-op
    }
    process.exit(1);
  });
