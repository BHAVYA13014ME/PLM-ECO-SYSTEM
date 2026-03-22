require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Product = require('./src/models/Product');
const BoM = require('./src/models/BoM');
const Archive = require('./src/models/Archive');
const ecoService = require('./src/services/ecoService');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const admin = await User.findOne({ role: 'ADMIN' });
  if (!admin) throw new Error('ADMIN user not found');

  const product = await Product.findOne({ name: /iphone\s*17/i, status: 'ACTIVE', isDeleted: false }).sort({ createdAt: -1 });
  if (!product) throw new Error('Active iPhone 17 product not found');

  const activeBom = await BoM.findOne({ productId: product._id, status: 'ACTIVE', isDeleted: false }).sort({ createdAt: -1 });
  if (!activeBom) throw new Error('Active BoM for iPhone 17 not found');

  const originalQty = Number(activeBom.components?.[0]?.quantity || 0);
  const newQty = Math.max(0, originalQty - 1);

  const ecoBom = await ecoService.create({
    title: 'Scenario 1 - BoM quantity adjustment',
    ecoType: 'BOM',
    targetProductId: product._id,
    targetBomId: activeBom._id,
    targetVersion: activeBom.bomVersion,
    versionUpdate: true,
    effectiveDate: new Date(),
    proposedChanges: {
      fields: [
        { fieldName: 'components.0.quantity', changeType: 'UPDATE', oldValue: originalQty, newValue: newQty },
      ],
    },
    userId: admin._id,
  });

  await ecoService.advance(ecoBom._id, admin._id, 'ADMIN');
  await ecoService.advance(ecoBom._id, admin._id, 'ADMIN');

  const bomRecords = await BoM.find({ productId: product._id, isDeleted: false }).sort({ createdAt: -1 }).lean();
  const activeBoms = bomRecords.filter((b) => b.status === 'ACTIVE');
  const archivedBoms = bomRecords.filter((b) => b.status === 'ARCHIVED');
  const latestActiveBom = activeBoms[0];

  const ecoProduct = await ecoService.create({
    title: 'Scenario 2 - Product pricing update',
    ecoType: 'PRODUCT',
    targetProductId: product._id,
    targetVersion: product.version,
    versionUpdate: true,
    effectiveDate: new Date(),
    proposedChanges: {
      fields: [
        { fieldName: 'salePrice', changeType: 'UPDATE', oldValue: product.salePrice, newValue: Number(product.salePrice || 0) + 50 },
        { fieldName: 'costPrice', changeType: 'UPDATE', oldValue: product.costPrice, newValue: Number(product.costPrice || 0) + 25 },
      ],
    },
    userId: admin._id,
  });

  await ecoService.advance(ecoProduct._id, admin._id, 'ADMIN');
  await ecoService.advance(ecoProduct._id, admin._id, 'ADMIN');

  const productRecords = await Product.find({ sku: product.sku, isDeleted: false }).sort({ createdAt: -1 }).lean();
  const activeProducts = productRecords.filter((p) => p.status === 'ACTIVE');
  const archivedProducts = productRecords.filter((p) => p.status === 'ARCHIVED');
  const latestActiveProduct = activeProducts[0];

  const bomArchiveCount = await Archive.countDocuments({ entityType: 'BOM', originalEntityId: activeBom._id });
  const productArchiveCount = await Archive.countDocuments({ entityType: 'PRODUCT', originalEntityId: product._id });

  console.log('SCENARIO_1', JSON.stringify({
    bomActiveCount: activeBoms.length,
    bomArchivedCount: archivedBoms.length,
    oldBomArchived: archivedBoms.some((b) => String(b._id) === String(activeBom._id)),
    newBomVersion: latestActiveBom?.bomVersion,
    quantityBefore: originalQty,
    quantityAfter: latestActiveBom?.components?.[0]?.quantity,
    archiveSnapshotsForOldBom: bomArchiveCount,
  }));

  console.log('SCENARIO_2', JSON.stringify({
    productActiveCount: activeProducts.length,
    productArchivedCount: archivedProducts.length,
    oldProductArchived: archivedProducts.some((p) => String(p._id) === String(product._id)),
    newProductVersion: latestActiveProduct?.version,
    salePriceBefore: product.salePrice,
    salePriceAfter: latestActiveProduct?.salePrice,
    costPriceBefore: product.costPrice,
    costPriceAfter: latestActiveProduct?.costPrice,
    archiveSnapshotsForOldProduct: productArchiveCount,
  }));

  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('SCENARIO_RUN_FAILED', err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
