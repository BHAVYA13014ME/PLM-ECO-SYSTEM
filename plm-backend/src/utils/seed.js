const User = require('../models/User');

/**
 * Seed 4 base users (one per role) with password "Admin@1234".
 * Only creates a user if one with that email doesn't already exist.
 * Callable from server.js on startup.
 */
const seedUsers = async () => {
  const users = [
    { name: 'Admin User', email: 'admin@plm.com', role: 'ADMIN' },
    { name: 'Engineer User', email: 'engineer@plm.com', role: 'ENGINEER' },
    { name: 'Approver User', email: 'approver@plm.com', role: 'APPROVER' },
    { name: 'Operations User', email: 'ops@plm.com', role: 'OPERATIONS' },
  ];

  const defaultPassword = 'Admin@1234';

  for (const userData of users) {
    const exists = await User.findOne({ email: userData.email });
    if (!exists) {
      await User.create({
        name: userData.name,
        email: userData.email,
        passwordHash: defaultPassword, // Will be hashed by pre-save hook
        role: userData.role,
      });
      console.log(`  ✅ Seeded: ${userData.email} (${userData.role})`);
    }
  }
};

module.exports = { seedUsers };
