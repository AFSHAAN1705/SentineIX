const sequelize = require('../config/database');
const Role = require('./Role');
const User = require('./User');
const IncidentType = require('./IncidentType');
const Incident = require('./Incident');
const Assignment = require('./Assignment');
const InvestigationNote = require('./InvestigationNote');
const Evidence = require('./Evidence');
const StatusLog = require('./StatusLog');
const Notification = require('./Notification');
const AuditLog = require('./AuditLog');
const ThreatFeed = require('./ThreatFeed');
const Resolution = require('./Resolution');

// Role -> User
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

// User -> Incident (reporter)
User.hasMany(Incident, { foreignKey: 'reporter_id', as: 'reportedIncidents' });
Incident.belongsTo(User, { foreignKey: 'reporter_id', as: 'reporter' });

// IncidentType -> Incident
IncidentType.hasMany(Incident, { foreignKey: 'type_id', as: 'incidents' });
Incident.belongsTo(IncidentType, { foreignKey: 'type_id', as: 'incidentType' });

// Incident -> Assignment
Incident.hasMany(Assignment, { foreignKey: 'incident_id', as: 'assignments' });
Assignment.belongsTo(Incident, { foreignKey: 'incident_id', as: 'incident' });

// User -> Assignment (analyst)
User.hasMany(Assignment, { foreignKey: 'analyst_id', as: 'analystAssignments' });
Assignment.belongsTo(User, { foreignKey: 'analyst_id', as: 'analyst' });

// User -> Assignment (assigner)
User.hasMany(Assignment, { foreignKey: 'assigned_by', as: 'madeAssignments' });
Assignment.belongsTo(User, { foreignKey: 'assigned_by', as: 'assigner' });

// Incident -> InvestigationNote
Incident.hasMany(InvestigationNote, { foreignKey: 'incident_id', as: 'notes' });
InvestigationNote.belongsTo(Incident, { foreignKey: 'incident_id', as: 'incident' });

// User -> InvestigationNote
User.hasMany(InvestigationNote, { foreignKey: 'analyst_id', as: 'notes' });
InvestigationNote.belongsTo(User, { foreignKey: 'analyst_id', as: 'analyst' });

// Incident -> Evidence
Incident.hasMany(Evidence, { foreignKey: 'incident_id', as: 'evidence' });
Evidence.belongsTo(Incident, { foreignKey: 'incident_id', as: 'incident' });

// User -> Evidence
User.hasMany(Evidence, { foreignKey: 'uploaded_by', as: 'uploadedEvidence' });
Evidence.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// Incident -> StatusLog
Incident.hasMany(StatusLog, { foreignKey: 'incident_id', as: 'statusLogs' });
StatusLog.belongsTo(Incident, { foreignKey: 'incident_id', as: 'incident' });

// User -> StatusLog
User.hasMany(StatusLog, { foreignKey: 'changed_by', as: 'statusChanges' });
StatusLog.belongsTo(User, { foreignKey: 'changed_by', as: 'changedBy' });

// User -> Notification
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Incident -> Notification
Incident.hasMany(Notification, { foreignKey: 'incident_id', as: 'notifications' });
Notification.belongsTo(Incident, { foreignKey: 'incident_id', as: 'incident' });

// User -> AuditLog
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User -> ThreatFeed
User.hasMany(ThreatFeed, { foreignKey: 'created_by', as: 'threatFeeds' });
ThreatFeed.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Incident -> Resolution
Incident.hasOne(Resolution, { foreignKey: 'incident_id', as: 'resolution' });
Resolution.belongsTo(Incident, { foreignKey: 'incident_id', as: 'incident' });

// User -> Resolution
User.hasMany(Resolution, { foreignKey: 'resolved_by', as: 'resolutions' });
Resolution.belongsTo(User, { foreignKey: 'resolved_by', as: 'resolver' });

module.exports = {
  sequelize,
  Role,
  User,
  IncidentType,
  Incident,
  Assignment,
  InvestigationNote,
  Evidence,
  StatusLog,
  Notification,
  AuditLog,
  ThreatFeed,
  Resolution
};
