const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ThreatFeed = sequelize.define('ThreatFeed', {
  threat_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'user_id' }
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  threat_type: {
    type: DataTypes.ENUM(
      'malware', 'ransomware', 'phishing', 'botnet',
      'zero_day', 'credential_attack', 'ddos', 'apt', 'other'
    ),
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium'
  },
  source: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  indicators: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'IPs, domains, hashes, etc.'
  },
  cve_id: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  affected_platforms: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  published_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'threat_feeds',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ThreatFeed;
