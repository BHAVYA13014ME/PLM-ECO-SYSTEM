const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const User = require('../models/User');
const ECOStage = require('../models/ECOStage');
const Product = require('../models/Product');
const BoM = require('../models/BoM');
const ECO = require('../models/ECO');
const Archive = require('../models/Archive');

const runDemoSeeder = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for Demo Seeder.');

    // 1. Seed Users
    const users = [
      { name: 'Admin User', email: 'admin@plm.com', role: 'ADMIN' },
      { name: 'Engineer User', email: 'engineer@plm.com', role: 'ENGINEER' },
      { name: 'Approver User', email: 'approver@plm.com', role: 'APPROVER' },
      { name: 'Ops User', email: 'ops@plm.com', role: 'OPERATIONS' },
    ];

    const passwordHash = await bcrypt.hash('Demo@1234', 10);
    const createdUsers = {};

    for (const u of users) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = await User.create({ ...u, passwordHash });
        console.log(`Created user: ${u.email}`);
      }
      createdUsers[u.role] = user;
    }

    // 2. Seed ECO Stages
    let stageNew = await ECOStage.findOne({ name: 'NEW' });
    if (!stageNew) {
      stageNew = await ECOStage.create({ name: 'NEW', order: 1, isDefault: true, requiresApproval: false, isFinal: false });
      console.log('Created stage: NEW');
    }

    let stageApp = await ECOStage.findOne({ name: 'APPROVAL' });
    if (!stageApp) {
      // Must map explicitly to the created APPROVER id
      const approverId = createdUsers['APPROVER']._id;
      stageApp = await ECOStage.create({ name: 'APPROVAL', order: 2, isDefault: false, requiresApproval: true, approvers: [approverId], isFinal: false });
      console.log('Created stage: APPROVAL');
    }

    let stageDone = await ECOStage.findOne({ name: 'DONE' });
    if (!stageDone) {
      stageDone = await ECOStage.create({ name: 'DONE', order: 3, isDefault: false, requiresApproval: false, isFinal: true });
      console.log('Created stage: DONE');
    }

    // 3. Seed Products
    const productsData = [
      { name: 'iPhone 17 Pro', sku: 'PRD-001', version: 2, salePrice: 1299, costPrice: 890, status: 'ACTIVE' },
      { name: 'Wooden Table', sku: 'PRD-002', version: 1, salePrice: 450, costPrice: 220, status: 'ACTIVE' },
      { name: 'Electric Motor X200', sku: 'PRD-003', version: 1, salePrice: 2800, costPrice: 1750, status: 'ACTIVE' }
    ];

    const createdProds = {};
    for (const p of productsData) {
      let prod = await Product.findOne({ sku: p.sku, version: p.version, isDeleted: false });
      if (!prod) {
        prod = await Product.create({ ...p, createdBy: createdUsers['ADMIN']._id });
        console.log(`Created product: ${p.name}`);
      }
      createdProds[p.sku] = prod;
    }

    // 3.1 Seed component products for BoM components
    const componentCatalog = [
      { name: 'OLED Display', costPrice: 210, salePrice: 250 },
      { name: 'Li-Ion Battery', costPrice: 45, salePrice: 65 },
      { name: 'A18 Pro Chip', costPrice: 180, salePrice: 230 },
      { name: '48MP Camera Module', costPrice: 95, salePrice: 125 },
      { name: 'Titanium Frame', costPrice: 65, salePrice: 90 },
      { name: 'USB-C Port', costPrice: 8, salePrice: 15 },
      { name: 'Face ID Sensor Array', costPrice: 35, salePrice: 50 },
      { name: 'Taptic Engine', costPrice: 22, salePrice: 35 },
      { name: 'Screws M1', costPrice: 0.1, salePrice: 0.2 },
      { name: 'Wooden Legs', costPrice: 15, salePrice: 22 },
      { name: 'Wooden Tabletop', costPrice: 80, salePrice: 120 },
      { name: 'Screws M8', costPrice: 0.5, salePrice: 1.2 },
      { name: 'Varnish', costPrice: 18, salePrice: 26 },
      { name: 'Stator Core', costPrice: 320, salePrice: 390 },
      { name: 'Rotor Assembly', costPrice: 280, salePrice: 350 },
      { name: 'Copper Windings', costPrice: 45, salePrice: 70 },
      { name: 'Bearings', costPrice: 35, salePrice: 55 },
      { name: 'Housing Casing', costPrice: 120, salePrice: 160 },
      { name: 'Terminal Block', costPrice: 25, salePrice: 40 },
    ];

    const componentProducts = {};
    for (const item of componentCatalog) {
      let componentProduct = await Product.findOne({ name: item.name, isDeleted: false }).sort({ createdAt: -1 });
      if (!componentProduct) {
        componentProduct = await Product.create({
          name: item.name,
          sku: `CMP-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
          version: 1,
          salePrice: item.salePrice,
          costPrice: item.costPrice,
          status: 'ACTIVE',
          createdBy: createdUsers['ADMIN']._id,
        });
      }
      componentProducts[item.name] = componentProduct;
    }

    // 4. Seed BoMs
    const bomsData = [
      {
        productSku: 'PRD-001', bomVersion: 2, status: 'ACTIVE',
        components: [
          { componentProductId: componentProducts['OLED Display']._id, quantity: 1 },
          { componentProductId: componentProducts['Li-Ion Battery']._id, quantity: 1 },
          { componentProductId: componentProducts['A18 Pro Chip']._id, quantity: 1 },
          { componentProductId: componentProducts['48MP Camera Module']._id, quantity: 1 },
          { componentProductId: componentProducts['Titanium Frame']._id, quantity: 1 },
          { componentProductId: componentProducts['USB-C Port']._id, quantity: 1 },
          { componentProductId: componentProducts['Face ID Sensor Array']._id, quantity: 1 },
          { componentProductId: componentProducts['Taptic Engine']._id, quantity: 1 },
          { componentProductId: componentProducts['Screws M1']._id, quantity: 6 }
        ],
        operations: []
      },
      {
        productSku: 'PRD-002', bomVersion: 1, status: 'ACTIVE',
        components: [
          { componentProductId: componentProducts['Wooden Legs']._id, quantity: 4 },
          { componentProductId: componentProducts['Wooden Tabletop']._id, quantity: 1 },
          { componentProductId: componentProducts['Screws M8']._id, quantity: 12 },
          { componentProductId: componentProducts['Varnish']._id, quantity: 1 }
        ],
        operations: [
          { name: 'Assembly', duration: 60, workCenter: 'Woodshop' },
          { name: 'Painting/Varnishing', duration: 30, workCenter: 'Paint Station' }
        ]
      },
      {
        productSku: 'PRD-003', bomVersion: 1, status: 'ACTIVE',
        components: [
          { componentProductId: componentProducts['Stator Core']._id, quantity: 1 },
          { componentProductId: componentProducts['Rotor Assembly']._id, quantity: 1 },
          { componentProductId: componentProducts['Copper Windings']._id, quantity: 1 },
          { componentProductId: componentProducts['Bearings']._id, quantity: 2 },
          { componentProductId: componentProducts['Housing Casing']._id, quantity: 1 },
          { componentProductId: componentProducts['Terminal Block']._id, quantity: 1 }
        ],
        operations: []
      }
    ];

    const createdBoms = {};
    for (const b of bomsData) {
      const prodId = createdProds[b.productSku]._id;
      let bom = await BoM.findOne({ productId: prodId, bomVersion: b.bomVersion, status: 'ACTIVE' });
      if (!bom) {
        bom = await BoM.create({
          productId: prodId, productVersion: createdProds[b.productSku].version, bomVersion: b.bomVersion, status: 'ACTIVE',
          components: b.components, operations: b.operations, createdBy: createdUsers['ADMIN']._id
        });
        console.log(`Created BoM for ${b.productSku} v${b.bomVersion}`);
      }
      createdBoms[b.productSku] = bom;
    }

    // 5. Seed Archived Versions
    // Simulate iPhone v1 and Bom v1
    const iphoneProd = createdProds['PRD-001'];
    let archProd = await Archive.findOne({ originalEntityId: iphoneProd._id, version: 1 });
    if (!archProd) {
      await Archive.create({
        entityType: 'PRODUCT', originalEntityId: iphoneProd._id, version: 1,
        snapshotData: { name: 'iPhone 17 Pro', sku: 'PRD-001', version: 1, salePrice: 1299, costPrice: 890, status: 'ARCHIVED' }
      });
      console.log('Created Archive: iPhone PRD-001 v1');
    }

    const iphoneBom = createdBoms['PRD-001'];
    let archBom = await Archive.findOne({ originalEntityId: iphoneBom._id, version: 1 });
    if (!archBom) {
      const activeData = JSON.parse(JSON.stringify(iphoneBom));
      activeData.components = activeData.components.map(c => {
        if (String(c.componentProductId) === String(componentProducts['Screws M1']._id)) return { ...c, quantity: 8 }; // Before ECO
         return c;
      });
      await Archive.create({
        entityType: 'BOM', originalEntityId: iphoneBom._id, version: 1,
        snapshotData: { ...activeData, bomVersion: 1, status: 'ARCHIVED' }
      });
      console.log('Created Archive: iPhone BoM v1');
    }

    // 6. Seed Specific ECOs
    const pastDate = new Date(); pastDate.setDate(pastDate.getDate() - 5);
    
    // ECO 1: Approved iPhone screws
    let eco1 = await ECO.findOne({ title: 'Reduce iPhone screw quantity from 8 to 6' });
    if (!eco1) {
      await ECO.create({
        title: 'Reduce iPhone screw quantity from 8 to 6',
        ecoType: 'BOM', targetProductId: iphoneProd._id, targetBomId: iphoneBom._id, targetVersion: iphoneBom.bomVersion,
        stage: stageDone._id, status: 'APPROVED', createdBy: createdUsers['ENGINEER']._id,
        appliedAt: pastDate,
        proposedChanges: { fields: [{ fieldName: "components[8].quantity", oldValue: 8, newValue: 6, changeType: "UPDATE" }] },
        stageHistory: [
          { stageId: stageNew._id, stageName: 'NEW', action: 'MOVED', enteredBy: createdUsers['ENGINEER']._id, enteredAt: pastDate },
          { stageId: stageApp._id, stageName: 'APPROVAL', action: 'VALIDATED', enteredBy: createdUsers['ENGINEER']._id, enteredAt: pastDate },
          { stageId: stageDone._id, stageName: 'DONE', action: 'APPROVED', enteredBy: createdUsers['APPROVER']._id, enteredAt: pastDate }
        ]
      });
      console.log('Created ECO 1 (APPROVED)');
    }

    // ECO 2: In Progress Wooden Table screws
    let eco2 = await ECO.findOne({ title: 'Update Wooden Table screw count from 12 to 16' });
    if (!eco2) {
      await ECO.create({
        title: 'Update Wooden Table screw count from 12 to 16',
        ecoType: 'BOM', targetProductId: createdProds['PRD-002']._id, targetBomId: createdBoms['PRD-002']._id, targetVersion: createdBoms['PRD-002'].bomVersion,
        stage: stageApp._id, status: 'IN_PROGRESS', createdBy: createdUsers['ENGINEER']._id,
        proposedChanges: { fields: [{ fieldName: "components[2].quantity", oldValue: 12, newValue: 16, changeType: "UPDATE" }] },
        stageHistory: [
          { stageId: stageNew._id, stageName: 'NEW', action: 'MOVED', enteredBy: createdUsers['ENGINEER']._id, enteredAt: new Date() },
          { stageId: stageApp._id, stageName: 'APPROVAL', action: 'VALIDATED', enteredBy: createdUsers['ENGINEER']._id, enteredAt: new Date() }
        ]
      });
      console.log('Created ECO 2 (IN_PROGRESS)');
    }

    // ECO 3: New iPhone Price Adjust
    let eco3 = await ECO.findOne({ title: 'iPhone 17 Pro price adjustment — salePrice 1199 to 1299' });
    if (!eco3) {
      await ECO.create({
        title: 'iPhone 17 Pro price adjustment — salePrice 1199 to 1299',
        ecoType: 'PRODUCT', targetProductId: iphoneProd._id, targetVersion: iphoneProd.version,
        stage: stageNew._id, status: 'NEW', createdBy: createdUsers['ENGINEER']._id,
        proposedChanges: { fields: [{ fieldName: "salePrice", oldValue: 1199, newValue: 1299, changeType: "UPDATE" }] },
        stageHistory: [
          { stageId: stageNew._id, stageName: 'NEW', action: 'MOVED', enteredBy: createdUsers['ENGINEER']._id, enteredAt: new Date() }
        ]
      });
      console.log('Created ECO 3 (NEW)');
    }

    // ECO 4: Rejected Wooden Table Ops
    let eco4 = await ECO.findOne({ title: 'Add final quality inspection operation to Wooden Table BoM' });
    if (!eco4) {
      await ECO.create({
        title: 'Add final quality inspection operation to Wooden Table BoM',
        ecoType: 'BOM', targetProductId: createdProds['PRD-002']._id, targetBomId: createdBoms['PRD-002']._id, targetVersion: createdBoms['PRD-002'].bomVersion,
        stage: stageApp._id, status: 'REJECTED', createdBy: createdUsers['ENGINEER']._id,
        proposedChanges: { fields: [{ fieldName: "operations", oldValue: null, newValue: { name: 'Quality Inspection & Packing', duration: 20, workCenter: 'QC Station' }, changeType: "ADD" }] },
        stageHistory: [
          { stageId: stageNew._id, stageName: 'NEW', action: 'MOVED', enteredBy: createdUsers['ENGINEER']._id, enteredAt: new Date() },
          { stageId: stageApp._id, stageName: 'APPROVAL', action: 'VALIDATED', enteredBy: createdUsers['ENGINEER']._id, enteredAt: new Date() },
          { stageId: stageApp._id, stageName: 'APPROVAL', action: 'REJECTED', enteredBy: createdUsers['APPROVER']._id, enteredAt: new Date() }
        ]
      });
      console.log('Created ECO 4 (REJECTED)');
    }

    console.log('\n✅ Demo Seeder executed successfully. All system states simulated.');
    process.exit(0);

  } catch (err) {
    console.error('❌ Demo Seeder Error:', err);
    process.exit(1);
  }
};

runDemoSeeder();
