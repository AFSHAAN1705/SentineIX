const { User, Role, Incident, Assignment, AuditLog } = require('../models');
const bcrypt = require('bcryptjs');
const path = require('path');
const { createAuditLog } = require('../middleware/auditLogger');
const { Op, fn, col } = require('sequelize');

const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search, is_active } = req.query;
    const where = {};

    if (role) {
      const roleRecord = await Role.findOne({ where: { role_name: role } });
      if (roleRecord) where.role_id = roleRecord.role_id;
    }
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) {
      where[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { department: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await User.findAndCountAll({
      where,
      include: [{ model: Role, as: 'role' }],
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

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [{ model: Role, as: 'role' }]
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Self-update or admin
    const isSelf = req.user.user_id === req.params.id;
    const isAdmin = req.user.role?.role_name === 'admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const allowedFields = ['full_name', 'phone', 'department'];
    if (isAdmin) allowedFields.push('is_active', 'role_id');

    const updates = {};
    allowedFields.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

    await user.update(updates);
    const updated = await User.findByPk(user.user_id, { include: [{ model: Role, as: 'role' }] });

    await createAuditLog({
      userId: req.user.user_id, action: 'UPDATE_USER', entityType: 'user',
      entityId: user.user_id, newValues: updates,
      ipAddress: req.ip, userAgent: req.get('User-Agent')
    });

    res.json({ success: true, message: 'User updated', data: updated });
  } catch (error) { next(error); }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.scope('withPassword').findByPk(req.user.user_id);

    const isValid = await user.validatePassword(currentPassword);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    await user.update({ password_hash: newPassword });

    await createAuditLog({
      userId: req.user.user_id, action: 'CHANGE_PASSWORD', entityType: 'user',
      entityId: req.user.user_id, ipAddress: req.ip, userAgent: req.get('User-Agent')
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) { next(error); }
};

const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await User.update({ avatar_url: avatarUrl }, { where: { user_id: req.user.user_id } });

    res.json({ success: true, message: 'Avatar updated', data: { avatar_url: avatarUrl } });
  } catch (error) { next(error); }
};

const deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await user.update({ is_active: false });
    await createAuditLog({
      userId: req.user.user_id, action: 'DEACTIVATE_USER', entityType: 'user',
      entityId: user.user_id, ipAddress: req.ip, userAgent: req.get('User-Agent')
    });

    res.json({ success: true, message: 'User deactivated' });
  } catch (error) { next(error); }
};

const getUserStats = async (req, res, next) => {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { is_active: true } });

    const byRole = await User.findAll({
      attributes: ['role_id', [fn('COUNT', col('user_id')), 'count']],
      include: [{ model: Role, as: 'role', attributes: ['role_name'] }],
      group: ['role_id', 'role.role_id'],
      raw: true,
      nest: true
    });

    const analysts = await User.findAll({
      include: [
        { model: Role, as: 'role', where: { role_name: 'analyst' } },
        {
          model: Assignment, as: 'analystAssignments',
          where: { is_active: true }, required: false,
          attributes: ['assignment_id']
        }
      ],
      attributes: ['user_id', 'full_name', 'email', 'avatar_url', 'department']
    });

    res.json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        byRole,
        analysts: analysts.map(a => ({
          ...a.toJSON(),
          active_assignments: a.analystAssignments?.length || 0
        }))
      }
    });
  } catch (error) { next(error); }
};

const createUser = async (req, res, next) => {
  try {
    const { full_name, email, password, phone, department, role_name = 'reporter' } = req.body;

    const existing = await User.scope('withPassword').findOne({ where: { email } });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const role = await Role.findOne({ where: { role_name } });
    if (!role) return res.status(400).json({ success: false, message: 'Invalid role' });

    const user = await User.create({
      role_id: role.role_id,
      full_name, email,
      password_hash: password,
      phone, department
    });

    const newUser = await User.findByPk(user.user_id, { include: [{ model: Role, as: 'role' }] });

    await createAuditLog({
      userId: req.user.user_id, action: 'CREATE_USER', entityType: 'user',
      entityId: user.user_id, newValues: { email, role_name },
      ipAddress: req.ip, userAgent: req.get('User-Agent')
    });

    res.status(201).json({ success: true, message: 'User created', data: newUser });
  } catch (error) { next(error); }
};

module.exports = {
  getAllUsers, getUserById, updateUser, changePassword, uploadAvatar,
  deactivateUser, getUserStats, createUser
};
