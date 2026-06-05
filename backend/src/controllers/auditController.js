const { AuditLog, User } = require('../models');
const { Op } = require('sequelize');

const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, action, entity_type, user_id, status, from, to } = req.query;
    const where = {};

    if (action) where.action = { [Op.iLike]: `%${action}%` };
    if (entity_type) where.entity_type = entity_type;
    if (user_id) where.user_id = user_id;
    if (status) where.status = status;
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp[Op.gte] = new Date(from);
      if (to) where.timestamp[Op.lte] = new Date(to);
    }
    
    const { search } = req.query;
    if (search) {
      where[Op.or] = [
        { entity_id: { [Op.iLike]: `%${search}%` } },
        { '$user.full_name$': { [Op.iLike]: `%${search}%` } },
        { '$user.email$': { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['user_id', 'full_name', 'email'] }],
      limit: parseInt(limit),
      offset,
      order: [['timestamp', 'DESC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) { next(error); }
};

module.exports = { getAuditLogs };
