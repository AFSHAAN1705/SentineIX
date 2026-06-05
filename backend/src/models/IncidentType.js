const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const IncidentType = sequelize.define('IncidentType', {
  type_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  severity_weight: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: { min: 1, max: 10 }
  },
  icon: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'incident_types',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = IncidentType;
