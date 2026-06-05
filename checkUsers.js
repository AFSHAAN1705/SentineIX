const { User, sequelize } = require('./backend/src/models');

const checkUsers = async () => {
  try {
    await sequelize.authenticate();
    const users = await User.findAll({ attributes: ['user_id', 'email', 'full_name', 'role_id'] });
    console.log('Users in DB:');
    users.forEach(u => console.log(`- ${u.email} (${u.full_name}) Role: ${u.role_id}`));
    process.exit(0);
  } catch (err) {
    console.error('Error fetching users:', err);
    process.exit(1);
  }
};

checkUsers();
