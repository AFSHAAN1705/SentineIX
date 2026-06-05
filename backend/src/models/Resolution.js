const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Resolution = sequelize.define('Resolution', {
  resolution_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  incident_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'incidents', key: 'incident_id' }
  },
  resolved_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'user_id' }
  },
  resolution_summary: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  root_cause: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  actions_taken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  lessons_learned: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  time_to_resolve_hours: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  resolution_type: {
    type: DataTypes.ENUM('mitigated', 'contained', 'eradicated', 'false_positive', 'other'),
    allowNull: false,
    defaultValue: 'mitigated'
  }
}, {
  tableName: 'resolutions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Resolution;
