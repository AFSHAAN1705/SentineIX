const { Notification } = require('../models');
const { Op } = require('sequelize');

const getMyNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, is_read } = req.query;
    const where = { user_id: req.user.user_id };
    if (is_read !== undefined) where.is_read = is_read === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Notification.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    const unreadCount = await Notification.count({
      where: { user_id: req.user.user_id, is_read: false }
    });

    res.json({
      success: true,
      data: rows,
      unread_count: unreadCount,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) { next(error); }
};

const markAsRead = async (req, res, next) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { notification_id: req.params.id, user_id: req.user.user_id } }
    );
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) { next(error); }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.user.user_id, is_read: false } }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) { next(error); }
};

const deleteNotification = async (req, res, next) => {
  try {
    const notif = await Notification.findOne({
      where: { notification_id: req.params.id, user_id: req.user.user_id }
    });
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
    await notif.destroy();
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) { next(error); }
};

module.exports = { getMyNotifications, markAsRead, markAllAsRead, deleteNotification };
