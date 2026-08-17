/**
 * fullDemoSeeder.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Inserts rich demo data for EVERY module:
 *   • Users (4 roles — already seeded, re-use)
 *   • ECOStages (3 stages)
 *   • Products (5 main + ~20 component products)
 *   • BoMs (5 BOMs with components + operations)
 *   • ECOs (6 ECOs — NEW, IN_PROGRESS, APPROVED x2, REJECTED x2)
 *   • Archives (archived product/BOM snapshots)
 *   • AuditLogs (10+ entries across all entity types)
 *
 * Run: node src/utils/fullDemoSeeder.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User      = require('../models/User');
const ECOStage  = require('../models/ECOStage');
const Product   = require('../models/Product');
const BoM       = require('../models/BoM');
const ECO       = require('../models/ECO');
const Archive   = require('../models/Archive');
const AuditLog  = require('../models/AuditLog');

// ─── Helper ───────────────────────────────────────────────────────────────────
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const log = (msg) => console.log(`  ➜ ${msg}`);

// ─── Main Seeder ──────────────────────────────────────────────────────────────
const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\n✅ Connected to MongoDB\n');

    // ══════════════════════════════════════════════════════════════════════════
    // 1. USERS  (4 roles)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('━━━ 1. USERS ━━━');
    const passwordHash = await bcrypt.hash('Admin@1234', 10);

    const userDefs = [
      { name: 'Admin User',      email: 'admin@plm.com',    role: 'ADMIN' },
      { name: 'Engineer User',   email: 'engineer@plm.com', role: 'ENGINEER' },
      { name: 'Approver User',   email: 'approver@plm.com', role: 'APPROVER' },
      { name: 'Operations User', email: 'ops@plm.com',      role: 'OPERATIONS' },
    ];

    const U = {};
    for (const def of userDefs) {
      let u = await User.findOne({ email: def.email });
      if (!u) {
        u = await User.create({ ...def, passwordHash });
        log(`Created user: ${def.email} (${def.role})`);
      } else {
        log(`Exists: ${def.email}`);
      }
      U[def.role] = u;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2. ECO STAGES  (3 workflow stages)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n━━━ 2. ECO STAGES ━━━');
    const stageDefs = [
      { name: 'Technical Review',    order: 1, requiresApproval: false, isFinal: false, isDefault: true  },
      { name: 'Management Approval', order: 2, requiresApproval: true,  isFinal: false, isDefault: false },
      { name: 'Implementation Done', order: 3, requiresApproval: false, isFinal: true,  isDefault: false },
    ];

    const S = {};
    for (const def of stageDefs) {
      let s = await ECOStage.findOne({ name: def.name });
      if (!s) {
        const extra = def.requiresApproval ? { approvers: [U['APPROVER']._id] } : {};
        s = await ECOStage.create({ ...def, ...extra });
        log(`Created stage: ${def.name}`);
      } else {
        log(`Exists: ${def.name}`);
      }
      S[def.name] = s;
    }
    // Convenience aliases
    const stageS1 = S['Technical Review'];
    const stageS2 = S['Management Approval'];
    const stageS3 = S['Implementation Done'];

    // ══════════════════════════════════════════════════════════════════════════
    // 3. PRODUCTS — Component catalog (raw materials / sub-parts)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n━━━ 3. COMPONENT PRODUCTS (raw parts catalog) ━━━');
    const compDefs = [
      // Electronics
      { name: '4K OLED Display Panel',     sku: 'CMP-OLED-01', costPrice: 180, salePrice: 220, status: 'ACTIVE' },
      { name: 'Snapdragon 8 Gen 3 SoC',    sku: 'CMP-SOC-01',  costPrice: 210, salePrice: 260, status: 'ACTIVE' },
      { name: '5000mAh Li-Ion Battery',    sku: 'CMP-BAT-01',  costPrice:  40, salePrice:  60, status: 'ACTIVE' },
      { name: '50MP Camera Module',        sku: 'CMP-CAM-01',  costPrice:  90, salePrice: 120, status: 'ACTIVE' },
      { name: 'Gorilla Glass 7 Cover',     sku: 'CMP-GLS-01',  costPrice:  25, salePrice:  40, status: 'ACTIVE' },
      { name: 'USB-C 3.2 Port Assembly',   sku: 'CMP-USB-01',  costPrice:   8, salePrice:  14, status: 'ACTIVE' },
      { name: 'Fingerprint Sensor Module', sku: 'CMP-FPS-01',  costPrice:  18, salePrice:  28, status: 'ACTIVE' },
      // Mechanical
      { name: 'Steel Leg Set (4 pcs)',     sku: 'CMP-LEG-01',  costPrice:  35, salePrice:  55, status: 'ACTIVE' },
      { name: 'MDF Desktop Board 180x80',  sku: 'CMP-TOP-01',  costPrice:  55, salePrice:  80, status: 'ACTIVE' },
      { name: 'M8 Bolt Set (20 pcs)',      sku: 'CMP-BLT-01',  costPrice:   3, salePrice:   6, status: 'ACTIVE' },
      { name: 'Epoxy Lacquer Coat',        sku: 'CMP-LAC-01',  costPrice:  12, salePrice:  20, status: 'ACTIVE' },
      { name: 'Cable Management Clip Set', sku: 'CMP-CBL-01',  costPrice:   5, salePrice:   9, status: 'ACTIVE' },
      // Motor
      { name: 'Stator Core (5kW)',         sku: 'CMP-STA-01',  costPrice: 310, salePrice: 390, status: 'ACTIVE' },
      { name: 'Rotor Assembly (5kW)',      sku: 'CMP-ROT-01',  costPrice: 275, salePrice: 350, status: 'ACTIVE' },
      { name: 'Copper Winding Wire 2mm',   sku: 'CMP-COP-01',  costPrice:  44, salePrice:  68, status: 'ACTIVE' },
      { name: 'Deep Groove Ball Bearing',  sku: 'CMP-BRN-01',  costPrice:  30, salePrice:  50, status: 'ACTIVE' },
      { name: 'IP55 Aluminium Casing',     sku: 'CMP-CSG-01',  costPrice: 115, salePrice: 160, status: 'ACTIVE' },
      { name: 'Terminal Block 4-way',      sku: 'CMP-TBK-01',  costPrice:  22, salePrice:  38, status: 'ACTIVE' },
      // Safety Equipment
      { name: 'ABS Hard Shell (Size L)',   sku: 'CMP-ABS-01',  costPrice:  20, salePrice:  35, status: 'ACTIVE' },
      { name: 'EPS Foam Liner',            sku: 'CMP-EPS-01',  costPrice:   8, salePrice:  14, status: 'ACTIVE' },
      { name: 'Retention Strap 50mm',      sku: 'CMP-RST-01',  costPrice:   4, salePrice:   8, status: 'ACTIVE' },
      { name: 'Ventilation Duct Kit',      sku: 'CMP-VDK-01',  costPrice:   6, salePrice:  11, status: 'ACTIVE' },
      // Packaging
      { name: 'Corrugated Box 30x30x15',   sku: 'CMP-BOX-01',  costPrice:   2, salePrice:   4, status: 'ACTIVE' },
      { name: 'Bubble Wrap Roll 50m',      sku: 'CMP-BUB-01',  costPrice:   8, salePrice:  14, status: 'ACTIVE' },
      { name: 'Silica Gel Sachet 5g',      sku: 'CMP-SGS-01',  costPrice:   0.5, salePrice:   1, status: 'ACTIVE' },
    ];

    const C = {};
    for (const def of compDefs) {
      let p = await Product.findOne({ sku: def.sku, isDeleted: false });
      if (!p) {
        p = await Product.create({ ...def, version: 1, createdBy: U['ADMIN']._id });
        log(`Created component: ${def.name}`);
      } else {
        log(`Exists component: ${def.name}`);
      }
      C[def.sku] = p;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 4. MAIN PRODUCTS  (5 finished goods)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n━━━ 4. MAIN PRODUCTS (finished goods) ━━━');
    const mainProdDefs = [
      {
        sku: 'PRD-PHONE-X1', name: 'Galaxy UltraX Smartphone', version: 3,
        salePrice: 1099, costPrice: 680, status: 'ACTIVE',
        description: 'Flagship smartphone with 200MP camera, 6.8" AMOLED display, and 5G capability.',
      },
      {
        sku: 'PRD-DESK-S2', name: 'ErgoStand Pro Desk', version: 2,
        salePrice: 549, costPrice: 210, status: 'ACTIVE',
        description: 'Height-adjustable ergonomic standing desk for modern workspaces.',
      },
      {
        sku: 'PRD-MOTOR-M5', name: 'IndustrialDrive 5kW Motor', version: 1,
        salePrice: 3200, costPrice: 1900, status: 'ACTIVE',
        description: 'Three-phase induction motor for industrial conveyor and pump applications.',
      },
      {
        sku: 'PRD-HELMET-H1', name: 'SafeGuard Pro Helmet', version: 1,
        salePrice: 199, costPrice: 80, status: 'ACTIVE',
        description: 'EN-397 certified industrial safety helmet with full ventilation.',
      },
      {
        sku: 'PRD-PKG-P1', name: 'EcoPack Shipping Kit', version: 1,
        salePrice: 25, costPrice: 10, status: 'DRAFT',
        description: 'Sustainable packaging kit for fragile product shipments.',
      },
    ];

    const P = {};
    for (const def of mainProdDefs) {
      let p = await Product.findOne({ sku: def.sku, isDeleted: false });
      if (!p) {
        p = await Product.create({ ...def, createdBy: U['ENGINEER']._id });
        log(`Created product: ${def.name} (${def.status})`);
      } else {
        log(`Exists product: ${def.name}`);
      }
      P[def.sku] = p;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 5. BILLS OF MATERIALS  (one per main product)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n━━━ 5. BOMs ━━━');

    const bomDefs = [
      {
        key: 'PHONE', productSku: 'PRD-PHONE-X1', bomVersion: 3, status: 'ACTIVE',
        components: [
          { sku: 'CMP-OLED-01', qty: 1 },
          { sku: 'CMP-SOC-01',  qty: 1 },
          { sku: 'CMP-BAT-01',  qty: 1 },
          { sku: 'CMP-CAM-01',  qty: 3 },
          { sku: 'CMP-GLS-01',  qty: 1 },
          { sku: 'CMP-USB-01',  qty: 1 },
          { sku: 'CMP-FPS-01',  qty: 1 },
        ],
        operations: [
          { name: 'SMT Assembly',         duration: 120, workCenter: 'SMT-Line-A' },
          { name: 'Camera Module Install', duration:  30, workCenter: 'Assembly-B' },
          { name: 'Final QC & Test',       duration:  45, workCenter: 'QC-Lab' },
        ],
      },
      {
        key: 'DESK', productSku: 'PRD-DESK-S2', bomVersion: 2, status: 'ACTIVE',
        components: [
          { sku: 'CMP-LEG-01', qty: 1 },
          { sku: 'CMP-TOP-01', qty: 1 },
          { sku: 'CMP-BLT-01', qty: 1 },
          { sku: 'CMP-LAC-01', qty: 2 },
          { sku: 'CMP-CBL-01', qty: 1 },
        ],
        operations: [
          { name: 'Frame Welding',   duration:  90, workCenter: 'Welding-Bay' },
          { name: 'Surface Coating', duration:  60, workCenter: 'Paint-Line' },
          { name: 'Final Assembly',  duration:  45, workCenter: 'Assembly-C' },
        ],
      },
      {
        key: 'MOTOR', productSku: 'PRD-MOTOR-M5', bomVersion: 1, status: 'ACTIVE',
        components: [
          { sku: 'CMP-STA-01', qty: 1 },
          { sku: 'CMP-ROT-01', qty: 1 },
          { sku: 'CMP-COP-01', qty: 3 },
          { sku: 'CMP-BRN-01', qty: 2 },
          { sku: 'CMP-CSG-01', qty: 1 },
          { sku: 'CMP-TBK-01', qty: 1 },
        ],
        operations: [
          { name: 'Winding Insertion',   duration: 180, workCenter: 'Motor-Line-1' },
          { name: 'Rotor Balancing',     duration:  60, workCenter: 'Balancing-Bay' },
          { name: 'Hi-Pot Test',         duration:  30, workCenter: 'Test-Bay' },
        ],
      },
      {
        key: 'HELMET', productSku: 'PRD-HELMET-H1', bomVersion: 1, status: 'ACTIVE',
        components: [
          { sku: 'CMP-ABS-01', qty: 1 },
          { sku: 'CMP-EPS-01', qty: 1 },
          { sku: 'CMP-RST-01', qty: 2 },
          { sku: 'CMP-VDK-01', qty: 1 },
        ],
        operations: [
          { name: 'Shell Injection Moulding', duration:  25, workCenter: 'Injection-M' },
          { name: 'Liner Bonding',            duration:  15, workCenter: 'Assembly-D' },
          { name: 'EN-397 Certification Test',duration:  30, workCenter: 'Cert-Lab' },
        ],
      },
      {
        key: 'PKG', productSku: 'PRD-PKG-P1', bomVersion: 1, status: 'DRAFT',
        components: [
          { sku: 'CMP-BOX-01', qty: 1 },
          { sku: 'CMP-BUB-01', qty: 1 },
          { sku: 'CMP-SGS-01', qty: 3 },
        ],
        operations: [
          { name: 'Box Cutting & Folding', duration: 10, workCenter: 'Pack-Line' },
        ],
      },
    ];

    const B = {};
    for (const def of bomDefs) {
      const prod = P[def.productSku];
      let bom = await BoM.findOne({ productId: prod._id, bomVersion: def.bomVersion, isDeleted: false });
      if (!bom) {
        const components = def.components.map(c => ({
          componentProductId: C[c.sku]._id,
          quantity: c.qty,
        }));
        bom = await BoM.create({
          productId:      prod._id,
          productVersion: prod.version,
          bomVersion:     def.bomVersion,
          status:         def.status,
          components,
          operations: def.operations,
          createdBy: U['ENGINEER']._id,
        });
        log(`Created BOM: ${prod.name} v${def.bomVersion} (${def.status})`);
      } else {
        log(`Exists BOM: ${prod.name} v${def.bomVersion}`);
      }
      B[def.key] = bom;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 6. ARCHIVE — Previous versions of Products & BOMs
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n━━━ 6. ARCHIVES ━━━');

    const archiveDefs = [
      // Galaxy UltraX v1
      {
        entityType: 'PRODUCT', originalEntityId: P['PRD-PHONE-X1']._id, version: 1,
        snapshotData: {
          sku: 'PRD-PHONE-X1', name: 'Galaxy UltraX Smartphone', version: 1,
          salePrice: 899, costPrice: 560, status: 'ARCHIVED',
          description: 'Original launch variant with 108MP camera.',
        },
      },
      // Galaxy UltraX v2
      {
        entityType: 'PRODUCT', originalEntityId: P['PRD-PHONE-X1']._id, version: 2,
        snapshotData: {
          sku: 'PRD-PHONE-X1', name: 'Galaxy UltraX Smartphone', version: 2,
          salePrice: 999, costPrice: 620, status: 'ARCHIVED',
          description: 'Upgraded to 150MP camera module.',
        },
      },
      // ErgoStand Pro v1 BOM
      {
        entityType: 'BOM', originalEntityId: B['DESK']._id, version: 1,
        snapshotData: {
          bomVersion: 1, status: 'ARCHIVED',
          components: [
            { componentProductId: C['CMP-LEG-01']._id, quantity: 1 },
            { componentProductId: C['CMP-TOP-01']._id, quantity: 1 },
            { componentProductId: C['CMP-BLT-01']._id, quantity: 1 },
            { componentProductId: C['CMP-LAC-01']._id, quantity: 1 }, // was 1 coat, upgraded to 2
          ],
          operations: [
            { name: 'Frame Welding', duration: 90, workCenter: 'Welding-Bay' },
            { name: 'Final Assembly', duration: 45, workCenter: 'Assembly-C' },
          ],
        },
      },
      // Galaxy UltraX BOM v2 (before camera upgrade)
      {
        entityType: 'BOM', originalEntityId: B['PHONE']._id, version: 2,
        snapshotData: {
          bomVersion: 2, status: 'ARCHIVED',
          components: [
            { componentProductId: C['CMP-OLED-01']._id, quantity: 1 },
            { componentProductId: C['CMP-SOC-01']._id,  quantity: 1 },
            { componentProductId: C['CMP-BAT-01']._id,  quantity: 1 },
            { componentProductId: C['CMP-CAM-01']._id,  quantity: 2 }, // was 2 cameras, now 3
            { componentProductId: C['CMP-GLS-01']._id,  quantity: 1 },
            { componentProductId: C['CMP-USB-01']._id,  quantity: 1 },
          ],
          operations: [
            { name: 'SMT Assembly', duration: 120, workCenter: 'SMT-Line-A' },
            { name: 'Final QC & Test', duration: 45, workCenter: 'QC-Lab' },
          ],
        },
      },
    ];

    for (const def of archiveDefs) {
      const exists = await Archive.findOne({
        originalEntityId: def.originalEntityId,
        version: def.version,
        entityType: def.entityType,
      });
      if (!exists) {
        await Archive.create(def);
        log(`Created Archive: ${def.entityType} v${def.version} for entity ${def.originalEntityId}`);
      } else {
        log(`Exists Archive: ${def.entityType} v${def.version}`);
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 7. ECOs — 6 ECOs covering all statuses and both types
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n━━━ 7. ECOs ━━━');

    const ecoDefs = [
      // ── ECO-1: APPROVED — Phone camera upgrade (BOM)
      {
        title: 'Upgrade Galaxy UltraX camera from 2 to 3 modules',
        ecoType: 'BOM',
        targetProductId: P['PRD-PHONE-X1']._id,
        targetBomId:     B['PHONE']._id,
        targetVersion:   B['PHONE'].bomVersion,
        effectiveDate:   daysAgo(10),
        status:          'APPROVED',
        stage:           stageS3._id,
        versionUpdate:   true,
        appliedAt:       daysAgo(8),
        createdBy:       U['ENGINEER']._id,
        assignedTo:      U['APPROVER']._id,
        proposedChanges: {
          fields: [
            { fieldName: 'components[3].quantity', oldValue: 2, newValue: 3, changeType: 'UPDATE' },
          ],
        },
        stageHistory: [
          { stageId: stageS1._id, stageName: 'Technical Review',    action: 'MOVED',    enteredBy: U['ENGINEER']._id, enteredAt: daysAgo(10) },
          { stageId: stageS2._id, stageName: 'Management Approval', action: 'VALIDATED', enteredBy: U['ENGINEER']._id, enteredAt: daysAgo(9) },
          { stageId: stageS3._id, stageName: 'Implementation Done', action: 'APPROVED',  enteredBy: U['APPROVER']._id, enteredAt: daysAgo(8) },
        ],
      },

      // ── ECO-2: APPROVED — Phone price bump (PRODUCT)
      {
        title: 'Increase Galaxy UltraX sale price: $999 → $1099 post camera upgrade',
        ecoType: 'PRODUCT',
        targetProductId: P['PRD-PHONE-X1']._id,
        targetVersion:   P['PRD-PHONE-X1'].version,
        effectiveDate:   daysAgo(7),
        status:          'APPROVED',
        stage:           stageS3._id,
        versionUpdate:   true,
        appliedAt:       daysAgo(6),
        createdBy:       U['ENGINEER']._id,
        assignedTo:      U['APPROVER']._id,
        proposedChanges: {
          fields: [
            { fieldName: 'salePrice', oldValue: 999,  newValue: 1099, changeType: 'UPDATE' },
            { fieldName: 'costPrice', oldValue: 620,  newValue: 680,  changeType: 'UPDATE' },
          ],
        },
        stageHistory: [
          { stageId: stageS1._id, stageName: 'Technical Review',    action: 'MOVED',    enteredBy: U['ENGINEER']._id, enteredAt: daysAgo(7) },
          { stageId: stageS2._id, stageName: 'Management Approval', action: 'VALIDATED', enteredBy: U['ENGINEER']._id, enteredAt: daysAgo(7) },
          { stageId: stageS3._id, stageName: 'Implementation Done', action: 'APPROVED',  enteredBy: U['ADMIN']._id,   enteredAt: daysAgo(6) },
        ],
      },

      // ── ECO-3: IN_PROGRESS — Desk lacquer upgrade (BOM)
      {
        title: 'ErgoStand Pro: Upgrade lacquer coat from 1 to 2 layers for durability',
        ecoType: 'BOM',
        targetProductId: P['PRD-DESK-S2']._id,
        targetBomId:     B['DESK']._id,
        targetVersion:   B['DESK'].bomVersion,
        effectiveDate:   daysAgo(-5), // Future date
        status:          'IN_PROGRESS',
        stage:           stageS2._id,
        versionUpdate:   true,
        createdBy:       U['ENGINEER']._id,
        assignedTo:      U['APPROVER']._id,
        proposedChanges: {
          fields: [
            { fieldName: 'components[3].quantity', oldValue: 1, newValue: 2, changeType: 'UPDATE' },
          ],
        },
        stageHistory: [
          { stageId: stageS1._id, stageName: 'Technical Review',    action: 'MOVED',    enteredBy: U['ENGINEER']._id, enteredAt: daysAgo(3) },
          { stageId: stageS2._id, stageName: 'Management Approval', action: 'VALIDATED', enteredBy: U['ENGINEER']._id, enteredAt: daysAgo(2) },
        ],
      },

      // ── ECO-4: IN_PROGRESS — Helmet add chin strap (BOM)
      {
        title: 'SafeGuard Helmet: Add chin strap retention to BOM for EN-397 v2 compliance',
        ecoType: 'BOM',
        targetProductId: P['PRD-HELMET-H1']._id,
        targetBomId:     B['HELMET']._id,
        targetVersion:   B['HELMET'].bomVersion,
        effectiveDate:   daysAgo(-10),
        status:          'IN_PROGRESS',
        stage:           stageS1._id,
        versionUpdate:   false,
        createdBy:       U['ENGINEER']._id,
        proposedChanges: {
          fields: [
            {
              fieldName: 'components[4]',
              oldValue: null,
              newValue: { componentProductId: C['CMP-RST-01']._id, quantity: 1 },
              changeType: 'ADD',
            },
          ],
        },
        stageHistory: [
          { stageId: stageS1._id, stageName: 'Technical Review', action: 'MOVED', enteredBy: U['ENGINEER']._id, enteredAt: daysAgo(1) },
        ],
      },

      // ── ECO-5: NEW — Motor product description update (PRODUCT)
      {
        title: 'IndustrialDrive 5kW: Update product description with IP55 rating info',
        ecoType: 'PRODUCT',
        targetProductId: P['PRD-MOTOR-M5']._id,
        targetVersion:   P['PRD-MOTOR-M5'].version,
        effectiveDate:   daysAgo(-15),
        status:          'NEW',
        stage:           stageS1._id,
        versionUpdate:   false,
        createdBy:       U['ENGINEER']._id,
        proposedChanges: {
          fields: [
            {
              fieldName: 'description',
              oldValue: 'Three-phase induction motor for industrial conveyor and pump applications.',
              newValue: 'Three-phase induction motor, IP55 rated, for industrial conveyor, pump and compressor applications. Suitable for -20°C to +50°C ambient temperature.',
              changeType: 'UPDATE',
            },
          ],
        },
        stageHistory: [
          { stageId: stageS1._id, stageName: 'Technical Review', action: 'MOVED', enteredBy: U['ENGINEER']._id, enteredAt: new Date() },
        ],
      },

      // ── ECO-6: REJECTED — EcoPack price reduction (PRODUCT)
      {
        title: 'EcoPack Shipping Kit: Reduce sale price $25 → $18 for volume order incentive',
        ecoType: 'PRODUCT',
        targetProductId: P['PRD-PKG-P1']._id,
        targetVersion:   P['PRD-PKG-P1'].version,
        effectiveDate:   daysAgo(5),
        status:          'REJECTED',
        stage:           stageS2._id,
        versionUpdate:   false,
        createdBy:       U['ENGINEER']._id,
        assignedTo:      U['APPROVER']._id,
        proposedChanges: {
          fields: [
            { fieldName: 'salePrice', oldValue: 25, newValue: 18, changeType: 'UPDATE' },
          ],
        },
        stageHistory: [
          { stageId: stageS1._id, stageName: 'Technical Review',    action: 'MOVED',    enteredBy: U['ENGINEER']._id, enteredAt: daysAgo(6) },
          { stageId: stageS2._id, stageName: 'Management Approval', action: 'VALIDATED', enteredBy: U['ENGINEER']._id, enteredAt: daysAgo(5) },
          { stageId: stageS2._id, stageName: 'Management Approval', action: 'REJECTED',  enteredBy: U['ADMIN']._id,   enteredAt: daysAgo(4) },
        ],
      },
    ];

    const createdEcos = [];
    for (const def of ecoDefs) {
      let eco = await ECO.findOne({ title: def.title });
      if (!eco) {
        eco = await ECO.create(def);
        log(`Created ECO: [${def.status}] ${def.title.substring(0, 60)}...`);
      } else {
        log(`Exists ECO: ${def.title.substring(0, 50)}...`);
      }
      createdEcos.push(eco);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 8. AUDIT LOGS — Activity trail for all entities
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n━━━ 8. AUDIT LOGS ━━━');

    const auditDefs = [
      // Products
      { action: 'PRODUCT_CREATED',   entityType: 'PRODUCT', entityId: P['PRD-PHONE-X1']._id,  entityName: 'Galaxy UltraX Smartphone',   performedBy: U['ENGINEER']._id, newValue: { status: 'DRAFT' },                                    timestamp: daysAgo(30) },
      { action: 'PRODUCT_ACTIVATED', entityType: 'PRODUCT', entityId: P['PRD-PHONE-X1']._id,  entityName: 'Galaxy UltraX Smartphone',   performedBy: U['ADMIN']._id,    oldValue: { status: 'DRAFT' }, newValue: { status: 'ACTIVE' },     timestamp: daysAgo(28) },
      { action: 'PRODUCT_CREATED',   entityType: 'PRODUCT', entityId: P['PRD-DESK-S2']._id,   entityName: 'ErgoStand Pro Desk',         performedBy: U['ENGINEER']._id, newValue: { status: 'DRAFT' },                                    timestamp: daysAgo(25) },
      { action: 'PRODUCT_ACTIVATED', entityType: 'PRODUCT', entityId: P['PRD-DESK-S2']._id,   entityName: 'ErgoStand Pro Desk',         performedBy: U['ADMIN']._id,    oldValue: { status: 'DRAFT' }, newValue: { status: 'ACTIVE' },     timestamp: daysAgo(24) },
      { action: 'PRODUCT_CREATED',   entityType: 'PRODUCT', entityId: P['PRD-MOTOR-M5']._id,  entityName: 'IndustrialDrive 5kW Motor',  performedBy: U['ENGINEER']._id, newValue: { status: 'DRAFT' },                                    timestamp: daysAgo(20) },
      { action: 'PRODUCT_ACTIVATED', entityType: 'PRODUCT', entityId: P['PRD-MOTOR-M5']._id,  entityName: 'IndustrialDrive 5kW Motor',  performedBy: U['ADMIN']._id,    oldValue: { status: 'DRAFT' }, newValue: { status: 'ACTIVE' },     timestamp: daysAgo(19) },
      { action: 'PRODUCT_CREATED',   entityType: 'PRODUCT', entityId: P['PRD-HELMET-H1']._id, entityName: 'SafeGuard Pro Helmet',       performedBy: U['ENGINEER']._id, newValue: { status: 'DRAFT' },                                    timestamp: daysAgo(15) },
      { action: 'PRODUCT_ACTIVATED', entityType: 'PRODUCT', entityId: P['PRD-HELMET-H1']._id, entityName: 'SafeGuard Pro Helmet',       performedBy: U['ADMIN']._id,    oldValue: { status: 'DRAFT' }, newValue: { status: 'ACTIVE' },     timestamp: daysAgo(14) },
      // BOMs
      { action: 'BOM_CREATED',       entityType: 'BOM',     entityId: B['PHONE']._id,          entityName: 'BOM: Galaxy UltraX v3',      performedBy: U['ENGINEER']._id, newValue: { bomVersion: 3 },                                     timestamp: daysAgo(22) },
      { action: 'BOM_ACTIVATED',     entityType: 'BOM',     entityId: B['PHONE']._id,          entityName: 'BOM: Galaxy UltraX v3',      performedBy: U['ADMIN']._id,    oldValue: { status: 'DRAFT' }, newValue: { status: 'ACTIVE' },    timestamp: daysAgo(21) },
      { action: 'BOM_CREATED',       entityType: 'BOM',     entityId: B['DESK']._id,           entityName: 'BOM: ErgoStand Pro v2',      performedBy: U['ENGINEER']._id, newValue: { bomVersion: 2 },                                     timestamp: daysAgo(18) },
      { action: 'BOM_ACTIVATED',     entityType: 'BOM',     entityId: B['DESK']._id,           entityName: 'BOM: ErgoStand Pro v2',      performedBy: U['ADMIN']._id,    oldValue: { status: 'DRAFT' }, newValue: { status: 'ACTIVE' },    timestamp: daysAgo(17) },
      // ECOs
      { action: 'ECO_CREATED',       entityType: 'ECO',     entityId: createdEcos[0]._id,      entityName: 'Camera Upgrade ECO',         performedBy: U['ENGINEER']._id, newValue: { status: 'NEW' },                                     timestamp: daysAgo(10) },
      { action: 'ECO_ADVANCED',      entityType: 'ECO',     entityId: createdEcos[0]._id,      entityName: 'Camera Upgrade ECO',         performedBy: U['ENGINEER']._id, oldValue: { stage: 'Technical Review' }, newValue: { stage: 'Management Approval' }, timestamp: daysAgo(9) },
      { action: 'ECO_APPROVED',      entityType: 'ECO',     entityId: createdEcos[0]._id,      entityName: 'Camera Upgrade ECO',         performedBy: U['APPROVER']._id, oldValue: { status: 'IN_PROGRESS' }, newValue: { status: 'APPROVED' }, timestamp: daysAgo(8) },
      { action: 'ECO_APPLIED',       entityType: 'ECO',     entityId: createdEcos[0]._id,      entityName: 'Camera Upgrade ECO',         performedBy: U['ADMIN']._id,    newValue: { appliedAt: daysAgo(8) },                             timestamp: daysAgo(8) },
      { action: 'ECO_CREATED',       entityType: 'ECO',     entityId: createdEcos[5]._id,      entityName: 'EcoPack Price Reduction ECO',performedBy: U['ENGINEER']._id, newValue: { status: 'NEW' },                                     timestamp: daysAgo(6) },
      { action: 'ECO_REJECTED',      entityType: 'ECO',     entityId: createdEcos[5]._id,      entityName: 'EcoPack Price Reduction ECO',performedBy: U['ADMIN']._id,    oldValue: { status: 'IN_PROGRESS' }, newValue: { status: 'REJECTED' }, timestamp: daysAgo(4) },
      // Stages
      { action: 'STAGE_CREATED',     entityType: 'STAGE',   entityId: stageS1._id,             entityName: 'Technical Review',           performedBy: U['ADMIN']._id,    newValue: { order: 1 },                                          timestamp: daysAgo(60) },
      { action: 'STAGE_CREATED',     entityType: 'STAGE',   entityId: stageS2._id,             entityName: 'Management Approval',        performedBy: U['ADMIN']._id,    newValue: { order: 2 },                                          timestamp: daysAgo(60) },
      { action: 'STAGE_CREATED',     entityType: 'STAGE',   entityId: stageS3._id,             entityName: 'Implementation Done',        performedBy: U['ADMIN']._id,    newValue: { order: 3 },                                          timestamp: daysAgo(60) },
    ];

    let auditCount = 0;
    for (const def of auditDefs) {
      const exists = await AuditLog.findOne({ action: def.action, entityId: def.entityId });
      if (!exists) {
        await AuditLog.create(def);
        auditCount++;
      }
    }
    log(`Created ${auditCount} new audit log entries`);

    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n🎉 ════════════════════════════════════════════════════════');
    console.log('   Full Demo Seeder completed successfully!');
    console.log('   ┌────────────────────────────────────────────┐');
    console.log('   │  Module          │ Records                 │');
    console.log('   ├────────────────────────────────────────────┤');
    console.log('   │  Users           │ 4  (ADMIN/ENG/APP/OPS)  │');
    console.log('   │  ECO Stages      │ 3  (S1 → S2 → S3)       │');
    console.log('   │  Component Parts │ 25 (raw materials)       │');
    console.log('   │  Main Products   │ 5  (3 ACTIVE + 1 DRAFT) │');
    console.log('   │  BOMs            │ 5  (4 ACTIVE + 1 DRAFT) │');
    console.log('   │  Archives        │ 4  (old versions)        │');
    console.log('   │  ECOs            │ 6  (2✅ 2🔄 1🆕 1❌)     │');
    console.log('   │  Audit Logs      │ 22 (full activity trail) │');
    console.log('   └────────────────────────────────────────────┘');
    console.log('════════════════════════════════════════════════════════\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Seeder Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

run();
