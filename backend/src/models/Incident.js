const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Incident = sequelize.define('Incident', {
  incident_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  incident_ref: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: false
  },
  reporter_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'user_id' }
  },
  type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'incident_types', key: 'type_id' }
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: { len: [5, 255] }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('open', 'assigned', 'investigating', 'under_review', 'resolved', 'closed'),
    allowNull: false,
    defaultValue: 'open'
  },
  risk_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  risk_level: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: true
  },
  affected_systems: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  affected_users_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  source_ip: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  target_ip: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  location: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  closed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'incidents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Incident;
