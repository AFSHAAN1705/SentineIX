const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InvestigationNote = sequelize.define('InvestigationNote', {
  note_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  incident_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'incidents', key: 'incident_id' }
  },
  analyst_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'user_id' }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: { len: [1, 10000] }
  },
  note_type: {
    type: DataTypes.ENUM('observation', 'finding', 'action', 'recommendation', 'evidence_analysis'),
    defaultValue: 'observation'
  },
  is_internal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'investigation_notes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = InvestigationNote;
