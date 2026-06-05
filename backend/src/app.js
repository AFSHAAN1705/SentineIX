const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting
app.use('/api/', rateLimiter);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

// Routes
app.use('/api/v1', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'SentinelX API' });
});

app.get('/test-bug', async (req, res) => {
  try {
    const { User, ThreatFeed } = require('./models');
    const admin = await User.findOne({ where: { email: 'admin@sentinelx.io' } });
    const cReq = {
      user: admin, ip: '127.0.0.1', get: () => 'Test',
      body: { title: 'Test', description: 'Test', threat_type: 'ransomware', severity: 'critical', source: 'CISA Advisory', cve_id: 'CVE-2025-1048' }
    };
    let capturedErr = null;
    const next = (err) => { capturedErr = err; };
    const threatController = require('./controllers/threatController');
    await threatController.createThreat(cReq, { status: () => ({ json: (d) => d }), json: (d) => d }, next);
    if (capturedErr) return res.json({ error: capturedErr.message, stack: capturedErr.stack });
    res.json({ success: true, message: 'No error' });
  } catch (err) {
    res.json({ error: err.message, stack: err.stack });
  }
});

app.get('/test-ai-error', async (req, res) => {
  try {
    const { Incident, IncidentType } = require('./models');
    const { Op } = require('sequelize');
    const criticalIncidents = await Incident.findAll({
      where: { severity: { [Op.in]: ['Critical', 'High'] }, status: { [Op.notIn]: ['Resolved', 'Closed'] } },
      limit: 3,
      include: [{ model: IncidentType, as: 'incidentType' }]
    });
    res.json({ success: true, count: criticalIncidents.length });
  } catch (err) {
    res.json({ error: err.message, stack: err.stack });
  }
});

app.get('/test-stats', async (req, res) => {
  try {
    const { Incident, IncidentType } = require('./models');
    const { fn, col, literal } = require('sequelize');

    const byType = await Incident.findAll({
      attributes: ['type_id', [fn('COUNT', col('Incident.type_id')), 'count']],
      include: [{ model: IncidentType, as: 'incidentType', attributes: ['type_name'] }],
      group: ['Incident.type_id', 'incidentType.type_id', 'incidentType.type_name'],
      raw: true,
      nest: true
    });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await Incident.findAll({
      attributes: [
        [fn('DATE_TRUNC', 'month', col('created_at')), 'month'],
        [fn('COUNT', col('incident_id')), 'count']
      ],
      where: { created_at: { [require('sequelize').Op.gte]: sixMonthsAgo } },
      group: [literal("DATE_TRUNC('month', created_at)")],
      order: [[literal("DATE_TRUNC('month', created_at)"), 'ASC']],
      raw: true
    });

    res.json({ success: true, byType, monthlyTrend });
  } catch (err) {
    res.json({ error: err.message, stack: err.stack });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use(errorHandler);

module.exports = app;
