require('dotenv').config();
const app = require('./src/app');
const { sequelize } = require('./src/models');
const { seedDatabase } = require('./src/seeders/initialSeed');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected successfully.');

    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized.');

    await seedDatabase();

    // Force seed AI Analyst if missing
    const { User, Role } = require('./src/models');
    const bcrypt = require('bcryptjs');
    const analystRole = await Role.findOne({ where: { role_name: 'analyst' } });
    if (analystRole) {
      let aiAnalyst = await User.findOne({ where: { email: 'ai.analyst@sentinelx.local' } });
      if (!aiAnalyst) {
        const passwordHash = await bcrypt.hash('Demo@1234', 12);
        await User.create({
          role_id: analystRole.role_id,
          full_name: 'AI Analyst',
          email: 'ai.analyst@sentinelx.local',
          password_hash: passwordHash,
          department: 'Automated Response'
        });
        console.log('✅ AI Analyst forcibly seeded.');
      }
    }

    app.listen(PORT, () => {
      console.log(`🚀 SentinelX API running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
