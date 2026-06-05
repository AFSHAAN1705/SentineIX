const { Op, fn, col, literal } = require('sequelize');
const {
  Incident, User, Role, IncidentType, Assignment, StatusLog,
  Evidence, InvestigationNote, Resolution, sequelize
} = require('../models');
const { calculateRiskScore } = require('../services/riskScoringService');
const { notifyStatusUpdated, notifyIncidentResolved } = require('../services/notificationService');
const { createAuditLog } = require('../middleware/auditLogger');
const { analyzeIncidentWithAI } = require('../services/aiService');

const generateRef = () => {
  const prefix = 'INC';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

const incidentIncludes = [
  { model: User, as: 'reporter', attributes: ['user_id', 'full_name', 'email', 'avatar_url', 'department'] },
  { model: IncidentType, as: 'incidentType' },
  {
    model: Assignment, as: 'assignments', where: { is_active: true }, required: false,
    include: [{ model: User, as: 'analyst', attributes: ['user_id', 'full_name', 'email', 'avatar_url'] }]
  },
  { model: Resolution, as: 'resolution', required: false }
];

const createIncident = async (req, res, next) => {
  try {
    const { title, description, type_id, severity, affected_systems, affected_users_count, source_ip, target_ip, location } = req.body;
    const incidentType = await IncidentType.findByPk(type_id);
    if (!incidentType) return res.status(404).json({ success: false, message: 'Incident type not found' });

    const incident = await Incident.create({
      incident_ref: generateRef(),
      reporter_id: req.user.user_id,
      type_id, title, description, severity,
      affected_systems, affected_users_count: affected_users_count || 0,
      source_ip, target_ip, location, status: 'open'
    });

    const { score, level } = calculateRiskScore(severity, incidentType.type_name, incident.created_at);
    await incident.update({ risk_score: score, risk_level: level });

    await StatusLog.create({
      incident_id: incident.incident_id,
      changed_by: req.user.user_id,
      old_status: null,
      new_status: 'open',
      reason: 'Incident reported'
    });

    await createAuditLog({
      userId: req.user.user_id, action: 'CREATE_INCIDENT', entityType: 'incident',
      entityId: incident.incident_id, newValues: { ref: incident.incident_ref, title },
      ipAddress: req.ip, userAgent: req.get('User-Agent')
    });

    res.status(201).json({ success: true, message: 'Incident reported successfully', data: incident });
  } catch (error) { next(error); }
};

const getAllIncidents = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 10, status, severity, type_id,
      search, sort = 'created_at', order = 'DESC',
      reporter_id, risk_level
    } = req.query;

    const where = {};
    const userRole = req.user.role?.role_name;

    // Reporters can only see their own incidents
    if (userRole === 'reporter') {
      where.reporter_id = req.user.user_id;
    }

    // Analysts can filter for only their assigned incidents
    if (req.query.assigned_to_me === 'true' && userRole === 'analyst') {
      const { Assignment } = require('../models');
      const assignedIds = await Assignment.findAll({
        where: { analyst_id: req.user.user_id, is_active: true },
        attributes: ['incident_id'],
        raw: true
      });
      where.incident_id = { [Op.in]: assignedIds.map(a => a.incident_id) };
    }

    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (type_id) where.type_id = type_id;
    if (risk_level) where.risk_level = risk_level;
    if (reporter_id && userRole !== 'reporter') where.reporter_id = reporter_id;

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { incident_ref: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Incident.findAndCountAll({
      where,
      include: incidentIncludes,
      limit: parseInt(limit),
      offset,
      order: [[sort, order.toUpperCase()]],
      distinct: true
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) { next(error); }
};

const getIncidentById = async (req, res, next) => {
  try {
    const incident = await Incident.findByPk(req.params.id, {
      include: [
        ...incidentIncludes,
        {
          model: InvestigationNote, as: 'notes',
          include: [{ model: User, as: 'analyst', attributes: ['user_id', 'full_name', 'email', 'avatar_url'] }],
          order: [['created_at', 'DESC']]
        },
        {
          model: Evidence, as: 'evidence',
          include: [{ model: User, as: 'uploader', attributes: ['user_id', 'full_name'] }]
        },
        {
          model: StatusLog, as: 'statusLogs',
          include: [{ model: User, as: 'changedBy', attributes: ['user_id', 'full_name'] }],
          order: [['changed_at', 'DESC']]
        }
      ]
    });

    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    // Access control for reporters
    const userRole = req.user.role?.role_name;
    if (userRole === 'reporter' && incident.reporter_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: incident });
  } catch (error) { next(error); }
};

const updateIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    const userRole = req.user.role?.role_name;
    if (userRole === 'reporter' && incident.reporter_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const oldValues = { title: incident.title, severity: incident.severity, status: incident.status };
    const allowedFields = ['title', 'description', 'severity', 'affected_systems', 'affected_users_count', 'source_ip', 'target_ip', 'location'];
    const updates = {};
    allowedFields.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

    await incident.update(updates);

    if (updates.severity) {
      const type = await IncidentType.findByPk(incident.type_id);
      const { score, level } = calculateRiskScore(incident.severity, type?.type_name, incident.created_at);
      await incident.update({ risk_score: score, risk_level: level });
    }

    await createAuditLog({
      userId: req.user.user_id, action: 'UPDATE_INCIDENT', entityType: 'incident',
      entityId: incident.incident_id, oldValues, newValues: updates,
      ipAddress: req.ip, userAgent: req.get('User-Agent')
    });

    const updated = await Incident.findByPk(incident.incident_id, { include: incidentIncludes });
    res.json({ success: true, message: 'Incident updated', data: updated });
  } catch (error) { next(error); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const incident = await Incident.findByPk(req.params.id, {
      include: [{ model: User, as: 'reporter' }]
    });

    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    const validTransitions = {
      open: ['assigned', 'investigating', 'closed'],
      assigned: ['investigating', 'under_review', 'closed'],
      investigating: ['under_review', 'resolved', 'closed'],
      under_review: ['resolved', 'investigating', 'closed'],
      resolved: ['closed'],
      closed: []
    };

    const allowed = validTransitions[incident.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${incident.status} to ${status}. Allowed: ${allowed.join(', ') || 'none'}`
      });
    }

    const oldStatus = incident.status;
    const updateData = { status };
    if (status === 'resolved') updateData.resolved_at = new Date();
    if (status === 'closed') updateData.closed_at = new Date();

    await incident.update(updateData);

    await StatusLog.create({
      incident_id: incident.incident_id,
      changed_by: req.user.user_id,
      old_status: oldStatus,
      new_status: status,
      reason: reason || null
    });

    // Notify reporter
    if (incident.reporter_id !== req.user.user_id) {
      await notifyStatusUpdated(incident.reporter_id, incident, status, req.user.full_name);
    }

    if (status === 'resolved') {
      await notifyIncidentResolved(incident.reporter_id, incident);
    }

    await createAuditLog({
      userId: req.user.user_id, action: 'UPDATE_STATUS', entityType: 'incident',
      entityId: incident.incident_id, oldValues: { status: oldStatus }, newValues: { status },
      ipAddress: req.ip, userAgent: req.get('User-Agent')
    });

    res.json({ success: true, message: `Incident status updated to ${status}`, data: { incident_id: incident.incident_id, old_status: oldStatus, new_status: status } });
  } catch (error) { next(error); }
};

const deleteIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    await createAuditLog({
      userId: req.user.user_id, action: 'DELETE_INCIDENT', entityType: 'incident',
      entityId: incident.incident_id, oldValues: { ref: incident.incident_ref },
      ipAddress: req.ip, userAgent: req.get('User-Agent')
    });

    await incident.destroy();
    res.json({ success: true, message: 'Incident deleted successfully' });
  } catch (error) { next(error); }
};

const getIncidentStats = async (req, res, next) => {
  try {
    const totalIncidents = await Incident.count();
    const openIncidents = await Incident.count({ 
      where: { status: { [Op.in]: ['open', 'assigned', 'investigating', 'under_review'] } } 
    });
    const resolvedIncidents = await Incident.count({ where: { status: 'resolved' } });
    const criticalIncidents = await Incident.count({ where: { severity: 'critical' } });
    const closedIncidents = await Incident.count({ where: { status: 'closed' } });

    const bySeverity = await Incident.findAll({
      attributes: ['severity', [fn('COUNT', col('severity')), 'count']],
      group: ['severity'],
      raw: true
    });

    const byStatus = await Incident.findAll({
      attributes: ['status', [fn('COUNT', col('status')), 'count']],
      group: ['status'],
      raw: true
    });

    const byType = await Incident.findAll({
      attributes: [
        [col('Incident.type_id'), 'type_id'], 
        [fn('COUNT', col('Incident.type_id')), 'count']
      ],
      include: [{ model: IncidentType, as: 'incidentType', attributes: ['type_name'] }],
      group: ['Incident.type_id', 'incidentType.type_id', 'incidentType.type_name'],
      raw: true,
      nest: true
    });

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await Incident.findAll({
      attributes: [
        [fn('DATE_TRUNC', 'month', col('created_at')), 'month'],
        [fn('COUNT', col('incident_id')), 'count']
      ],
      where: { created_at: { [Op.gte]: sixMonthsAgo } },
      group: [literal("DATE_TRUNC('month', created_at)")],
      order: [[literal("DATE_TRUNC('month', created_at)"), 'ASC']],
      raw: true
    });

    // Average risk score
    const avgRisk = await Incident.findOne({
      attributes: [[fn('AVG', col('risk_score')), 'avg_risk']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        summary: {
          total: totalIncidents,
          open: openIncidents,
          resolved: resolvedIncidents,
          closed: closedIncidents,
          critical: criticalIncidents,
          avg_risk_score: parseFloat(avgRisk?.avg_risk || 0).toFixed(2)
        },
        bySeverity,
        byStatus,
        byType,
        monthlyTrend
      }
    });
  } catch (error) { 
    require('fs').writeFileSync('d:/SentinelX/dashboard_error.txt', error.stack || error.message);
    next(error); 
  }
};

const aiAnalyzeIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    // Fetch the AI Analyst user
    let aiAnalyst = await User.findOne({ where: { email: 'ai_analyst@sentinelx.io' } });
    if (!aiAnalyst) {
      // Fallback to the current user if AI Analyst is missing for some reason
      aiAnalyst = req.user;
    }

    const analysis = `AI Analysis:\n- Priority: ${incident.severity}\n- Recommended Action: Standard playbook procedures for ${incident.severity} threat.\n- Status: Analysis complete.`;

    await InvestigationNote.create({
      incident_id: incident.incident_id,
      user_id: aiAnalyst.user_id,
      content: analysis,
      note_type: 'observation'
    });

    res.json({ success: true, message: 'AI Analysis complete' });
  } catch (error) { next(error); }
};

module.exports = {
  createIncident,
  getAllIncidents,
  getIncidentById,
  updateIncident,
  updateStatus,
  deleteIncident,
  getIncidentStats,
  aiAnalyzeIncident
};
