const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const incidentRoutes = require('./incidents');
const userRoutes = require('./users');
const assignmentRoutes = require('./assignments');
const threatRoutes = require('./threats');
const notificationRoutes = require('./notifications');
const auditRoutes = require('./audit');
const reportRoutes = require('./reports');
const incidentTypeRoutes = require('./incidentTypes');
const aiRoutes = require('./ai');

router.use('/auth', authRoutes);
router.use('/incidents', incidentRoutes);
router.use('/users', userRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/threats', threatRoutes);
router.use('/notifications', notificationRoutes);
router.use('/audit', auditRoutes);
router.use('/reports', reportRoutes);
router.use('/incident-types', incidentTypeRoutes);
router.use('/ai', aiRoutes);

module.exports = router;
