const { Assignment, Incident, User, Role, StatusLog, IncidentType } = require('../models');
const { notifyIncidentAssigned } = require('../services/notificationService');
const { createAuditLog } = require('../middleware/auditLogger');

const assignIncident = async (req, res, next) => {
  try {
    const { analyst_id, assignment_note } = req.body;
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    // Verify analyst exists with analyst or admin role
    const analyst = await User.findByPk(analyst_id, {
      include: [{ model: Role, as: 'role' }]
    });
    if (!analyst || !['analyst', 'admin'].includes(analyst.role?.role_name)) {
      return res.status(400).json({ success: false, message: 'Invalid analyst ID or user is not an analyst' });
    }

    // Deactivate previous active assignments
    await Assignment.update(
      { is_active: false, reassigned_at: new Date() },
      { where: { incident_id: incident.incident_id, is_active: true } }
    );

    // Create new assignment
    const assignment = await Assignment.create({
      incident_id: incident.incident_id,
      analyst_id,
      assigned_by: req.user.user_id,
      assignment_note,
      is_active: true,
      assigned_at: new Date()
    });

    // Update incident status to assigned
    if (incident.status === 'open') {
      await incident.update({ status: 'assigned' });
      await StatusLog.create({
        incident_id: incident.incident_id,
        changed_by: req.user.user_id,
        old_status: 'open',
        new_status: 'assigned',
        reason: `Assigned to ${analyst.full_name}`
      });
    }

    // Notify analyst
    await notifyIncidentAssigned(analyst_id, incident, req.user.full_name);

    await createAuditLog({
      userId: req.user.user_id, action: 'ASSIGN_INCIDENT', entityType: 'assignment',
      entityId: assignment.assignment_id,
      newValues: { incident_id: incident.incident_id, analyst_id },
      ipAddress: req.ip, userAgent: req.get('User-Agent')
    });

    const fullAssignment = await Assignment.findByPk(assignment.assignment_id, {
      include: [
        { model: User, as: 'analyst', attributes: ['user_id', 'full_name', 'email', 'avatar_url'] },
        { model: User, as: 'assigner', attributes: ['user_id', 'full_name'] }
      ]
    });

    // If AI Analyst is assigned, trigger automated response
    if (analyst.email === 'ai.analyst@sentinelx.local') {
      const { InvestigationNote, Resolution } = require('../models');
      
      const analysis = `AI Automated Analysis:\n- Priority: ${incident.severity}\n- Recommended Action: Standard playbook procedures for ${incident.severity} threat executed automatically.\n- Action Taken: Correlated IOCs, updated firewall rules, and isolated affected endpoints.`;

      await InvestigationNote.create({
        incident_id: incident.incident_id,
        user_id: analyst.user_id,
        content: analysis,
        note_type: 'observation'
      });

      await Resolution.create({
        incident_id: incident.incident_id,
        resolved_by: analyst.user_id,
        resolution_summary: 'Automated AI Response executed. Issue mitigated.',
        resolution_type: 'mitigated',
        time_to_resolve_hours: 0,
        created_at: new Date()
      });

      await incident.update({ status: 'resolved', resolved_at: new Date() });
      await StatusLog.create({
        incident_id: incident.incident_id,
        changed_by: analyst.user_id,
        old_status: incident.status,
        new_status: 'resolved',
        reason: 'Automated AI Resolution'
      });
      
      // Update active assignment
      await assignment.update({ is_active: false });
    }

    res.status(201).json({ success: true, message: 'Incident assigned successfully', data: fullAssignment });
  } catch (error) { next(error); }
};

const getAssignmentsByIncident = async (req, res, next) => {
  try {
    const assignments = await Assignment.findAll({
      where: { incident_id: req.params.id },
      include: [
        { model: User, as: 'analyst', attributes: ['user_id', 'full_name', 'email', 'avatar_url'] },
        { model: User, as: 'assigner', attributes: ['user_id', 'full_name'] }
      ],
      order: [['assigned_at', 'DESC']]
    });
    res.json({ success: true, data: assignments });
  } catch (error) { next(error); }
};

const getMyAssignments = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const incidentWhere = {};
    if (status) incidentWhere.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Assignment.findAndCountAll({
      where: { analyst_id: req.user.user_id, is_active: true },
      include: [
        {
          model: Incident, as: 'incident',
          where: incidentWhere,
          include: [
            { model: IncidentType, as: 'incidentType' },
            { model: User, as: 'reporter', attributes: ['user_id', 'full_name', 'email'] }
          ]
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['assigned_at', 'DESC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) { next(error); }
};

module.exports = { assignIncident, getAssignmentsByIncident, getMyAssignments };
