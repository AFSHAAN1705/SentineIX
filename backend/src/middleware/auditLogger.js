const { AuditLog } = require('../models');

const createAuditLog = async ({ userId, action, entityType, entityId, oldValues, newValues, ipAddress, userAgent, status = 'success' }) => {
  try {
    await AuditLog.create({
      user_id: userId || null,
      action,
      entity_type: entityType || null,
      entity_id: entityId ? String(entityId) : null,
      old_values: oldValues || null,
      new_values: newValues || null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      status
    });
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
};

const auditMiddleware = (action, entityType) => {
  return (req, res, next) => {
    const originalSend = res.json.bind(res);
    res.json = async (data) => {
      if (data && data.success !== false) {
        await createAuditLog({
          userId: req.user?.user_id,
          action,
          entityType,
          entityId: req.params?.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          status: 'success'
        });
      }
      return originalSend(data);
    };
    next();
  };
};

module.exports = { createAuditLog, auditMiddleware };
