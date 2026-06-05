const { IncidentType } = require('../models');
const { createAuditLog } = require('../middleware/auditLogger');

const getAllTypes = async (req, res, next) => {
  try {
    const types = await IncidentType.findAll({ order: [['type_name', 'ASC']] });
    res.json({ success: true, data: types });
  } catch (error) { next(error); }
};

const createType = async (req, res, next) => {
  try {
    const { type_name, description, severity_weight, icon } = req.body;
    const existing = await IncidentType.findOne({ where: { type_name } });
    if (existing) return res.status(409).json({ success: false, message: 'Incident type already exists' });

    const type = await IncidentType.create({ type_name, description, severity_weight, icon });

    await createAuditLog({
      userId: req.user.user_id, action: 'CREATE_INCIDENT_TYPE', entityType: 'incident_type',
      entityId: type.type_id, newValues: { type_name },
      ipAddress: req.ip, userAgent: req.get('User-Agent')
    });

    res.status(201).json({ success: true, message: 'Incident type created', data: type });
  } catch (error) { next(error); }
};

const updateType = async (req, res, next) => {
  try {
    const type = await IncidentType.findByPk(req.params.id);
    if (!type) return res.status(404).json({ success: false, message: 'Type not found' });

    await type.update(req.body);
    res.json({ success: true, message: 'Type updated', data: type });
  } catch (error) { next(error); }
};

const deleteType = async (req, res, next) => {
  try {
    const type = await IncidentType.findByPk(req.params.id);
    if (!type) return res.status(404).json({ success: false, message: 'Type not found' });

    await type.destroy();
    res.json({ success: true, message: 'Incident type deleted' });
  } catch (error) { next(error); }
};

module.exports = { getAllTypes, createType, updateType, deleteType };
