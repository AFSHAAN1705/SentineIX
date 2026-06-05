const authService = require('../services/authService');
const { createAuditLog } = require('../middleware/auditLogger');

const register = async (req, res, next) => {
  try {
    const { fullName, email, password, phone, department } = req.body;
    const { user, accessToken, refreshToken } = await authService.register({
      fullName, email, password, phone, department
    });
    await createAuditLog({
      userId: user.user_id, action: 'REGISTER', entityType: 'user',
      entityId: user.user_id, ipAddress: req.ip, userAgent: req.get('User-Agent')
    });
    res.status(201).json({ success: true, message: 'Registration successful', data: { user, accessToken, refreshToken } });
  } catch (error) { next(error); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login({
      email, password, ipAddress: req.ip, userAgent: req.get('User-Agent')
    });
    res.json({ success: true, message: 'Login successful', data: { user, accessToken, refreshToken } });
  } catch (error) { next(error); }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });
    const tokens = await authService.refreshTokens(refreshToken);
    res.json({ success: true, data: tokens });
  } catch (error) { next(error); }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.user_id);
    await createAuditLog({
      userId: req.user.user_id, action: 'LOGOUT', entityType: 'auth',
      ipAddress: req.ip, userAgent: req.get('User-Agent')
    });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) { next(error); }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email, process.env.CLIENT_URL);
    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (error) { next(error); }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, token, password } = req.body;
    await authService.resetPassword(email, token, password);
    res.json({ success: true, message: 'Password reset successful. You can now log in.' });
  } catch (error) { next(error); }
};

const getMe = async (req, res) => {
  res.json({ success: true, data: req.user });
};

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword, getMe };
