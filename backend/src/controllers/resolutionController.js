const { Resolution, Incident, User, StatusLog, IncidentType } = require('../models');
const { notifyIncidentResolved } = require('../services/notificationService');
const { createAuditLog } = require('../middleware/auditLogger');

const createResolution = async (req, res, next) => {
  try {
    const { resolution_summary, root_cause, actions_taken, lessons_learned, resolution_type } = req.body;
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    const existing = await Resolution.findOne({ where: { incident_id: incident.incident_id } });
    if (existing) return res.status(409).json({ success: false, message: 'Resolution already exists for this incident' });

    const resolvedAt = incident.resolved_at || new Date();
    const timeToResolveHours = incident.created_at
      ? parseFloat(((resolvedAt - new Date(incident.created_at)) / (1000 * 60 * 60)).toFixed(2))
      : null;

    const resolution = await Resolution.create({
      incident_id: incident.incident_id,
      resolved_by: req.user.user_id,
      resolution_summary,
      root_cause,
      actions_taken,
      lessons_learned,
      time_to_resolve_hours: timeToResolveHours,
      resolution_type: resolution_type || 'mitigated'
    });

    // Update incident status
    await incident.update({ status: 'resolved', resolved_at: resolvedAt });
    await StatusLog.create({
      incident_id: incident.incident_id,
      changed_by: req.user.user_id,
      old_status: incident.status,
      new_status: 'resolved',
      reason: 'Resolution submitted'
    });

    // Notify reporter
    if (incident.reporter_id !== req.user.user_id) {
      await notifyIncidentResolved(incident.reporter_id, incident);
    }

    await createAuditLog({
      userId: req.user.user_id, action: 'CREATE_RESOLUTION', entityType: 'resolution',
      entityId: resolution.resolution_id, newValues: { incident_id: incident.incident_id, resolution_type },
      ipAddress: req.ip, userAgent: req.get('User-Agent')
    });

    const fullResolution = await Resolution.findByPk(resolution.resolution_id, {
      include: [{ model: User, as: 'resolver', attributes: ['user_id', 'full_name', 'email'] }]
    });

    res.status(201).json({ success: true, message: 'Resolution submitted successfully', data: fullResolution });
  } catch (error) { next(error); }
};

const getResolution = async (req, res, next) => {
  try {
    const resolution = await Resolution.findOne({
      where: { incident_id: req.params.id },
      include: [{ model: User, as: 'resolver', attributes: ['user_id', 'full_name', 'email', 'avatar_url'] }]
    });
    if (!resolution) return res.status(404).json({ success: false, message: 'No resolution found' });
    res.json({ success: true, data: resolution });
  } catch (error) { next(error); }
};

const updateResolution = async (req, res, next) => {
  try {
    const resolution = await Resolution.findOne({ where: { incident_id: req.params.id } });
    if (!resolution) return res.status(404).json({ success: false, message: 'Resolution not found' });

    const { resolution_summary, root_cause, actions_taken, lessons_learned, resolution_type } = req.body;
    await resolution.update({ resolution_summary, root_cause, actions_taken, lessons_learned, resolution_type });

    res.json({ success: true, message: 'Resolution updated', data: resolution });
  } catch (error) { next(error); }
};

module.exports = { createResolution, getResolution, updateResolution };
