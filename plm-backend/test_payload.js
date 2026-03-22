const mongoose = require('mongoose');
const ECO = require('./src/models/ECO');
const Product = require('./src/models/Product');
const User = require('./src/models/User');
const ecoService = require('./src/services/ecoService');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');
  
  const admin = await User.findOne({ role: 'ADMIN' });
  const product = await Product.findOne({ status: 'ACTIVE' });
  
  if (!product) { console.log('No active product found.'); process.exit(1); }
  
  const eco = await ecoService.create({
    title: 'Test React Crash',
    ecoType: 'PRODUCT',
    targetProductId: product._id,
    targetVersion: product.version,
    userId: admin._id
  });
  
  console.log('Created ECO:', eco._id);
  
  const advanced = await ecoService.advance(eco._id, admin._id, 'ADMIN');
  console.log('Advanced ECO status:', advanced.status);
  console.log('Advanced ECO stage:', advanced.stage);
  
  // Now fetch it as the frontend would:
  const populated = await ecoService.getById(eco._id, 'ADMIN', admin._id);
  // Stringify and parse it to simulate HTTP transport
  const serialized = JSON.parse(JSON.stringify(populated));
  
  require('fs').writeFileSync('simulated_eco.json', JSON.stringify(serialized, null, 2));
  console.log('Wrote simulated_eco.json');
  
  process.exit(0);
}

run().catch(console.error);
