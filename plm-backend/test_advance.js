// test_advance.js
const mongoose = require('mongoose');
const ECO = require('./src/models/ECO');
const ecoService = require('./src/services/ecoService');
// require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
  console.log('Connected to DB');
  const ecoId = '69bed4776b3a8c9fbe0e00ac';
  
  const eco = await ECO.findById(ecoId);
  console.log('--- BEFORE ADVANCE ---');
  console.log(JSON.stringify(eco, null, 2));

  // In the real system, user _id and role are required.
  // We'll mock an ADMIN user
  const adminId = new mongoose.Types.ObjectId();
  
  try {
    const result = await ecoService.advance(ecoId, adminId, 'ADMIN');
    require('fs').writeFileSync('result_clean.json', JSON.stringify(result, null, 2));    
    // Check if the result produces any dangerous Object shapes that React can't render
    const plain = JSON.parse(JSON.stringify(result));
    console.log('Check parsed values:', Object.keys(plain));

  } catch (err) {
    console.error('--- ADVANCE FAILED ---');
    console.error(err);
  }
  process.exit(0);
})
.catch(err => {
  console.error(err);
  process.exit(1);
});
