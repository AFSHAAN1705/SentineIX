const { ThreatFeed, User } = require('../models');
const { createNotification } = require('../services/notificationService');
const { createAuditLog } = require('../middleware/auditLogger');
const { Op } = require('sequelize');

const createThreat = async (req, res, next) => {
  try {
    const { title, description, threat_type, severity, source, indicators, cve_id, affected_platforms, published_date } = req.body;

    const payload = {
      created_by: req.user.user_id,
      title, description, threat_type, severity,
      source: source || null,
    };
    if (indicators) payload.indicators = indicators;
    if (cve_id) payload.cve_id = cve_id;
    if (affected_platforms && affected_platforms.length > 0) payload.affected_platforms = affected_platforms;
    if (published_date) payload.published_date = published_date;

    const threat = await ThreatFeed.create(payload);

    await createAuditLog({
      userId: req.user.user_id, action: 'CREATE_THREAT', entityType: 'threat',
      entityId: threat.threat_id, newValues: { title, threat_type, severity },
      ipAddress: req.ip, userAgent: req.get('User-Agent')
    });

    res.status(201).json({ success: true, message: 'Threat intelligence added', data: threat });
  } catch (error) { next(error); }
};

const getAllThreats = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, threat_type, severity, is_active, search } = req.query;
    const where = {};

    if (threat_type) where.threat_type = threat_type;
    if (severity) where.severity = severity;
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { cve_id: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await ThreatFeed.findAndCountAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['user_id', 'full_name', 'email'] }],
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) { next(error); }
};

const getThreatById = async (req, res, next) => {
  try {
    const threat = await ThreatFeed.findByPk(req.params.id, {
      include: [{ model: User, as: 'creator', attributes: ['user_id', 'full_name', 'email'] }]
    });
    if (!threat) return res.status(404).json({ success: false, message: 'Threat not found' });
    res.json({ success: true, data: threat });
  } catch (error) { next(error); }
};

const updateThreat = async (req, res, next) => {
  try {
    const threat = await ThreatFeed.findByPk(req.params.id);
    if (!threat) return res.status(404).json({ success: false, message: 'Threat not found' });

    const allowedFields = ['title', 'description', 'threat_type', 'severity', 'source', 'indicators', 'cve_id', 'affected_platforms', 'is_active', 'published_date'];
    const updates = {};
    allowedFields.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

    await threat.update(updates);
    res.json({ success: true, message: 'Threat updated', data: threat });
  } catch (error) { next(error); }
};

const deleteThreat = async (req, res, next) => {
  try {
    const threat = await ThreatFeed.findByPk(req.params.id);
    if (!threat) return res.status(404).json({ success: false, message: 'Threat not found' });

    await threat.destroy();
    res.json({ success: true, message: 'Threat deleted' });
  } catch (error) { next(error); }
};

module.exports = { createThreat, getAllThreats, getThreatById, updateThreat, deleteThreat };
